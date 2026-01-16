"""Embedding service with pluggable backends (local FastEmbed or OpenAI-compatible API)."""

import logging
import time
from abc import ABC, abstractmethod
from functools import lru_cache

import httpx
from cachetools import TTLCache
from fastembed import SparseTextEmbedding, TextEmbedding

from simba.core.config import settings
from simba.services.metrics_service import EMBEDDING_LATENCY, track_latency

logger = logging.getLogger(__name__)

# TTL cache for query embeddings (5 min TTL, max 1000 entries)
_embedding_cache: TTLCache = TTLCache(maxsize=1000, ttl=300)
_sparse_embedding_cache: TTLCache = TTLCache(maxsize=1000, ttl=300)


# --- Embedding Backend Interface ---


class EmbeddingBackend(ABC):
    """Abstract base class for embedding backends."""

    @abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts."""
        pass


class LocalEmbeddingBackend(EmbeddingBackend):
    """Local embedding using FastEmbed."""

    def __init__(self, model_name: str):
        self.model_name = model_name
        logger.info(f"Initializing local embedding model: {model_name}")
        self._model = TextEmbedding(model_name=model_name)

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings using local FastEmbed model."""
        embeddings_generator = self._model.embed(texts)
        return [embedding.tolist() for embedding in embeddings_generator]


class APIEmbeddingBackend(EmbeddingBackend):
    """API-based embedding using OpenAI-compatible API (sglang/vLLM/Ollama)."""

    # Batch size to avoid 413 Request Entity Too Large errors
    # SiliconFlow and similar APIs have request size limits
    BATCH_SIZE = 1

    def __init__(self, model_name: str, base_url: str, api_key: str | None = None):
        self.model_name = model_name
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        logger.info(f"Initializing API embedding: model={model_name}, base_url={base_url}")

    def _embed_batch(self, texts: list[str], headers: dict) -> list[list[float]]:
        """Embed a single batch of texts."""
        payload = {
            "model": self.model_name,
            "input": texts,
        }

        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{self.base_url}/embeddings",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()

        # OpenAI API returns: {"data": [{"embedding": [...], "index": 0}, ...]}
        embeddings_data = sorted(data["data"], key=lambda x: x["index"])
        return [item["embedding"] for item in embeddings_data]

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings using OpenAI-compatible API with batching."""
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        # Process in batches to avoid 413 Request Entity Too Large
        all_embeddings = []
        for i in range(0, len(texts), self.BATCH_SIZE):
            batch = texts[i : i + self.BATCH_SIZE]
            batch_embeddings = self._embed_batch(batch, headers)
            all_embeddings.extend(batch_embeddings)
            # Small delay to avoid rate limiting (403 Forbidden)
            if i + self.BATCH_SIZE < len(texts):
                time.sleep(0.1)

        return all_embeddings


# --- Factory Function ---


def _parse_provider(provider_string: str) -> tuple[str, str]:
    """Parse provider string into (provider_type, model_name).

    Format: "provider:model" e.g. "local:BAAI/bge-m3" or "api:BAAI/bge-m3"
    """
    if ":" not in provider_string:
        # Backward compatibility: assume local provider
        return "local", provider_string

    parts = provider_string.split(":", 1)
    return parts[0].lower(), parts[1]


@lru_cache
def get_embedding_backend() -> EmbeddingBackend:
    """Get cached embedding backend instance based on configuration."""
    provider_type, model_name = _parse_provider(settings.embedding_provider)

    if provider_type == "local":
        return LocalEmbeddingBackend(model_name)
    elif provider_type == "api":
        if not settings.embedding_base_url:
            raise ValueError(
                "embedding_base_url is required when using API embedding provider. "
                "Set EMBEDDING_BASE_URL environment variable."
            )
        return APIEmbeddingBackend(
            model_name=model_name,
            base_url=settings.embedding_base_url,
            api_key=settings.embedding_api_key,
        )
    else:
        raise ValueError(
            f"Unknown embedding provider: {provider_type}. Supported providers: 'local', 'api'"
        )


# --- Public API (unchanged interface) ---


def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of texts.

    Args:
        texts: List of text strings to embed.

    Returns:
        List of embedding vectors (each vector is a list of floats).
    """
    with track_latency(EMBEDDING_LATENCY):
        backend = get_embedding_backend()
        return backend.embed(texts)


def get_embedding(text: str) -> list[float]:
    """Generate embedding for a single text.

    Uses TTL cache to avoid recomputing embeddings for repeated queries.

    Args:
        text: Text string to embed.

    Returns:
        Embedding vector as a list of floats.
    """
    # Check cache first
    if text in _embedding_cache:
        return _embedding_cache[text]

    # Generate and cache
    embeddings = get_embeddings([text])
    embedding = embeddings[0]
    _embedding_cache[text] = embedding

    return embedding


# --- Sparse Embeddings (SPLADE) ---
# Note: Sparse embeddings currently only support local FastEmbed


@lru_cache
def get_sparse_embedding_model() -> SparseTextEmbedding:
    """Get cached sparse embedding model instance (SPLADE).

    The model is downloaded and cached on first use.
    """
    logger.info(f"Loading sparse embedding model: {settings.retrieval_sparse_model}")
    return SparseTextEmbedding(model_name=settings.retrieval_sparse_model)


def get_sparse_embeddings(texts: list[str]) -> list[tuple[list[int], list[float]]]:
    """Generate sparse embeddings for a list of texts.

    Args:
        texts: List of text strings to embed.

    Returns:
        List of (indices, values) tuples for sparse vectors.
    """
    model = get_sparse_embedding_model()

    # SparseTextEmbedding returns a generator of SparseEmbedding objects
    embeddings_generator = model.embed(texts)
    results = []

    for sparse_embedding in embeddings_generator:
        # SparseEmbedding has .indices and .values attributes
        results.append(
            (
                sparse_embedding.indices.tolist(),
                sparse_embedding.values.tolist(),
            )
        )

    return results


def get_sparse_embedding(text: str) -> tuple[list[int], list[float]]:
    """Generate sparse embedding for a single text.

    Uses TTL cache to avoid recomputing embeddings for repeated queries.

    Args:
        text: Text string to embed.

    Returns:
        Tuple of (indices, values) for sparse vector.
    """
    # Check cache first
    if text in _sparse_embedding_cache:
        return _sparse_embedding_cache[text]

    # Generate and cache
    embeddings = get_sparse_embeddings([text])
    embedding = embeddings[0]
    _sparse_embedding_cache[text] = embedding

    return embedding
