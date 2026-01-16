"""Organization settings model for customization."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Float, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from simba.models.base import Base


class OrganizationSettings(Base):
    """Organization-level settings for customization.

    Stores per-organization configuration including:
    - Branding (app name, description)
    - System prompts (bilingual: English and Chinese)
    - RAG configuration overrides
    """

    __tablename__ = "organization_settings"
    __table_args__ = (
        UniqueConstraint("organization_id", name="uq_org_settings_org_id"),
        Index("idx_org_settings_org_id", "organization_id"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    organization_id: Mapped[str] = mapped_column(
        String(36), nullable=False, unique=True, index=True
    )  # References Better Auth organization table

    # Branding
    app_name: Mapped[str] = mapped_column(String(100), default="Simba", nullable=False)
    app_description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # System prompts (bilingual)
    system_prompt_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    system_prompt_zh: Mapped[str | None] = mapped_column(Text, nullable=True)

    # RAG configuration overrides (None means use global defaults)
    retrieval_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    retrieval_min_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def __repr__(self) -> str:
        return f"<OrganizationSettings(org={self.organization_id}, app_name={self.app_name})>"
