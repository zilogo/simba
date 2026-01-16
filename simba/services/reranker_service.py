"""Reranker service with pluggable backends (local CrossEncoder or OpenAI-compatible API)."""

import logging
import platform
from abc import ABC, abstractmethod
from functools import lru_cache
from typing import TYPE_CHECKING

import httpx

from simba.core.config import settings
from simba.services.metrics_service import RERANK_LATENCY, track_latency

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from simba.services.retrieval_service import RetrievedChunk


# --- Reranker Backend Interface ---


class RerankerBackend(ABC):
    """Abstract base class for reranker backends."""

    @abstractmethod
    def score(self, query: str, documents: list[str]) -> list[float]:
        """Score query-document pairs.

        Args:
            query: The search query.
            documents: List of document texts to score.

        Returns:
            List of relevance scores (higher is more relevant).
        """
        pass


class LocalRerankerBackend(RerankerBackend):
    """Local reranker using sentence-transformers CrossEncoder."""

    def __init__(self, model_name: str):
        from sentence_transformers import CrossEncoder

        self.model_name = model_name
        # Auto-detect device: MPS for macOS, CUDA for Linux/Windows with GPU, else CPU
        device = self._get_device()
        logger.info(f"Initializing local reranker: model={model_name}, device={device}")
        self._model = CrossEncoder(model_name, device=device)

    def _get_device(self) -> str:
        """Auto-detect the best available device."""
        import torch

        if torch.cuda.is_available():
            return "cuda"
        elif platform.system() == "Darwin" and torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    def score(self, query: str, documents: list[str]) -> list[float]:
        """Score using local CrossEncoder model."""
        pairs = [(query, doc) for doc in documents]
        scores = self._model.predict(pairs)
        return [float(s) for s in scores]


class APIRerankerBackend(RerankerBackend):
    """API-based reranker supporting multiple API formats.

    Supports:
    - SiliconFlow/Jina style: POST /v1/rerank with {"query", "documents"}
    - vLLM style: POST /v1/score with {"text_1", "text_2"}
    """

    def __init__(self, model_name: str, base_url: str, api_key: str | None = None):
        self.model_name = model_name
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self._api_style: str | None = None  # Will be detected on first call
        logger.info(f"Initializing API reranker: model={model_name}, base_url={base_url}")

    def _get_headers(self) -> dict[str, str]:
        """Get request headers."""
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _try_rerank_api(
        self, client: httpx.Client, query: str, documents: list[str]
    ) -> list[float] | None:
        """Try SiliconFlow/Jina style rerank API."""
        payload = {
            "model": self.model_name,
            "query": query,
            "documents": documents,
        }
        try:
            response = client.post(
                f"{self.base_url}/rerank",
                json=payload,
                headers=self._get_headers(),
            )
            if response.status_code == 200:
                data = response.json()
                # SiliconFlow returns: {"results": [{"index": 0, "relevance_score": 0.95}, ...]}
                results = sorted(data.get("results", []), key=lambda x: x["index"])
                return [item["relevance_score"] for item in results]
        except Exception as e:
            logger.debug(f"Rerank API failed: {e}")
        return None

    def _try_score_api(
        self, client: httpx.Client, query: str, documents: list[str]
    ) -> list[float] | None:
        """Try vLLM style score API."""
        payload = {
            "model": self.model_name,
            "text_1": query,
            "text_2": documents,
        }
        try:
            response = client.post(
                f"{self.base_url}/score",
                json=payload,
                headers=self._get_headers(),
            )
            if response.status_code == 200:
                data = response.json()
                # vLLM returns: {"data": [{"score": 0.95, "index": 0}, ...]}
                scores_data = sorted(data["data"], key=lambda x: x["index"])
                return [item["score"] for item in scores_data]
        except Exception as e:
            logger.debug(f"Score API failed: {e}")
        return None

    def score(self, query: str, documents: list[str]) -> list[float]:
        """Score query-document pairs using auto-detected API style."""
        with httpx.Client(timeout=60.0) as client:
            # Use cached API style if already detected
            if self._api_style == "rerank":
                result = self._try_rerank_api(client, query, documents)
                if result is not None:
                    return result
            elif self._api_style == "score":
                result = self._try_score_api(client, query, documents)
                if result is not None:
                    return result

            # Auto-detect: try rerank first (SiliconFlow), then score (vLLM)
            result = self._try_rerank_api(client, query, documents)
            if result is not None:
                self._api_style = "rerank"
                logger.info("Detected rerank API style (SiliconFlow/Jina)")
                return result

            result = self._try_score_api(client, query, documents)
            if result is not None:
                self._api_style = "score"
                logger.info("Detected score API style (vLLM)")
                return result

            raise RuntimeError(
                f"Failed to call reranker API at {self.base_url}. "
                "Tried both /rerank and /score endpoints."
            )


# --- Factory Function ---


def _parse_provider(provider_string: str) -> tuple[str, str]:
    """Parse provider string into (provider_type, model_name).

    Format: "provider:model" e.g. "local:BAAI/bge-reranker-v2-m3" or "api:BAAI/bge-reranker-v2-m3"
    """
    if ":" not in provider_string:
        # Backward compatibility: assume local provider
        return "local", provider_string

    parts = provider_string.split(":", 1)
    return parts[0].lower(), parts[1]


@lru_cache
def get_reranker_backend() -> RerankerBackend:
    """Get cached reranker backend instance based on configuration."""
    provider_type, model_name = _parse_provider(settings.reranker_provider)

    if provider_type == "local":
        return LocalRerankerBackend(model_name)
    elif provider_type == "api":
        if not settings.reranker_base_url:
            raise ValueError(
                "reranker_base_url is required when using API reranker provider. "
                "Set RERANKER_BASE_URL environment variable."
            )
        return APIRerankerBackend(
            model_name=model_name,
            base_url=settings.reranker_base_url,
            api_key=settings.reranker_api_key,
        )
    else:
        raise ValueError(
            f"Unknown reranker provider: {provider_type}. Supported providers: 'local', 'api'"
        )


# --- Public API ---


def rerank_chunks(
    query: str,
    chunks: list["RetrievedChunk"],
    top_k: int | None = None,
) -> list["RetrievedChunk"]:
    """Rerank chunks using configured reranker backend.

    Args:
        query: The search query.
        chunks: List of chunks to rerank.
        top_k: Number of top results to return. Defaults to settings.reranker_top_k.

    Returns:
        Reranked list of chunks, sorted by relevance.
    """
    if not chunks:
        return []

    top_k = top_k if top_k is not None else settings.reranker_top_k

    with track_latency(RERANK_LATENCY):
        backend = get_reranker_backend()

        # Extract document texts
        documents = [chunk.chunk_text for chunk in chunks]

        # Get scores from backend
        scores = backend.score(query, documents)

        # Combine chunks with new scores and sort
        scored_chunks = list(zip(chunks, scores))
        scored_chunks.sort(key=lambda x: x[1], reverse=True)

        # Update scores and return top_k
        from simba.services.retrieval_service import RetrievedChunk

        result = []
        for chunk, score in scored_chunks[:top_k]:
            result.append(
                RetrievedChunk(
                    document_id=chunk.document_id,
                    document_name=chunk.document_name,
                    chunk_text=chunk.chunk_text,
                    chunk_position=chunk.chunk_position,
                    score=float(score),
                )
            )

    return result
