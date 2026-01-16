"""Application configuration."""

from functools import lru_cache

from dotenv import load_dotenv
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load .env into actual environment variables (required for init_chat_model)
load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "Simba"
    app_version: str = "0.5.0"
    debug: bool = False

    # API
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Database
    database_url: str = "postgresql://simba:simba_password@localhost:5432/simba"

    # LLM (provider-agnostic via init_chat_model)
    # Format: "provider:model" e.g. "openai:gpt-4o-mini", "anthropic:claude-3-opus"
    llm_model: str = "openai:gpt-4o-mini"
    llm_temperature: float = 0.1

    # LLM Reasoning (for models that support it: o1, o3, claude with thinking, etc.)
    # Values: None (disabled), "low", "medium", "high", "none", "default"
    # Groq only accepts "none" or "default" (others map to "default")
    llm_reasoning_effort: str | None = None
    # Anthropic thinking budget (only used when provider is anthropic and reasoning is enabled)
    llm_thinking_budget: int = 10000

    # Embedding configuration
    # Format: "provider:model" e.g. "local:BAAI/bge-m3", "api:BAAI/bge-m3"
    # Providers: "local" (FastEmbed), "api" (OpenAI-compatible API like sglang/vLLM)
    embedding_provider: str = "local:sentence-transformers/all-MiniLM-L6-v2"
    embedding_base_url: str | None = None  # API base URL for sglang/vLLM
    embedding_api_key: str | None = None  # API key (optional)
    embedding_dimensions: int = 384

    # Reranker configuration
    # Format: "provider:model" e.g. "local:BAAI/bge-reranker-v2-m3", "api:BAAI/bge-reranker-v2-m3"
    # Providers: "local" (sentence-transformers), "api" (OpenAI-compatible API)
    reranker_provider: str = "local:cross-encoder/ms-marco-MiniLM-L-6-v2"
    reranker_base_url: str | None = None  # API base URL for vLLM
    reranker_api_key: str | None = None  # API key (optional)
    reranker_top_k: int = 5

    # Chunking settings
    chunk_size: int = 400  # Max characters per chunk (400 for BGE models with 512 token limit)
    chunk_overlap: int = 50  # Overlap between chunks

    # Retrieval settings
    retrieval_min_score: float = 0.3  # Low threshold for multilingual queries
    retrieval_limit: int = 8
    retrieval_rerank: bool = True
    retrieval_hybrid: bool = False  # Enable hybrid search (dense + sparse/BM25)
    retrieval_sparse_model: str = "prithvida/Splade_PP_en_v1"  # For SPLADE sparse embeddings

    # Qdrant
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_api_key: str | None = None

    # MinIO (S3-compatible storage)
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = Field(
        default="minioadmin",
        validation_alias=AliasChoices("MINIO_ACCESS_KEY", "MINIO_ROOT_USER"),
    )
    minio_secret_key: str = Field(
        default="minioadmin",
        validation_alias=AliasChoices("MINIO_SECRET_KEY", "MINIO_ROOT_PASSWORD"),
    )
    minio_bucket: str = "simba-documents"
    minio_secure: bool = False

    # Celery
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # Document parsing
    # Options: "docling", "mistral", "unstructured"
    parser_backend: str = "docling"
    mistral_api_key: str | None = None
    unstructured_api_key: str | None = None
    unstructured_api_url: str = "https://api.unstructuredapp.io/general/v0/general"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
