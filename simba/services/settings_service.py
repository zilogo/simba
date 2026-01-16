"""Settings service for managing organization-level configuration."""

import logging
from typing import Any

from sqlalchemy.orm import Session

from simba.models.settings import OrganizationSettings

logger = logging.getLogger(__name__)


class SettingsService:
    """Service for managing organization settings.

    Provides methods to get and update settings with caching support.
    Settings are cached per-instance to avoid repeated database queries
    within the same request lifecycle.
    """

    def __init__(self, db: Session):
        """Initialize the settings service.

        Args:
            db: SQLAlchemy database session.
        """
        self.db = db
        self._cache: dict[str, OrganizationSettings] = {}

    def get_settings(self, organization_id: str) -> OrganizationSettings:
        """Get settings for an organization, creating defaults if not exists.

        Args:
            organization_id: The organization ID.

        Returns:
            OrganizationSettings instance for the organization.
        """
        # Check cache first
        if organization_id in self._cache:
            logger.debug(f"[Settings] Cache hit for org {organization_id}")
            return self._cache[organization_id]

        # Query database
        settings = (
            self.db.query(OrganizationSettings)
            .filter(OrganizationSettings.organization_id == organization_id)
            .first()
        )

        if not settings:
            # Create default settings for new organization
            logger.info(f"[Settings] Creating default settings for org {organization_id}")
            settings = OrganizationSettings(organization_id=organization_id)
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)

        # Cache the result
        self._cache[organization_id] = settings
        return settings

    def update_settings(
        self,
        organization_id: str,
        **kwargs: Any,
    ) -> OrganizationSettings:
        """Update settings for an organization.

        Args:
            organization_id: The organization ID.
            **kwargs: Fields to update. Only valid field names are applied.

        Returns:
            Updated OrganizationSettings instance.

        Raises:
            ValueError: If no valid fields are provided.
        """
        settings = self.get_settings(organization_id)

        # Track what was updated
        updated_fields = []
        for key, value in kwargs.items():
            if hasattr(settings, key) and key not in ("id", "organization_id", "created_at"):
                setattr(settings, key, value)
                updated_fields.append(key)

        if not updated_fields:
            raise ValueError("No valid fields to update")

        logger.info(f"[Settings] Updated org {organization_id}: {', '.join(updated_fields)}")

        self.db.commit()
        self.db.refresh(settings)

        # Invalidate cache
        self._cache.pop(organization_id, None)

        return settings

    def clear_cache(self, organization_id: str | None = None) -> None:
        """Clear settings cache.

        Args:
            organization_id: If provided, only clear cache for this org.
                           If None, clear all cached settings.
        """
        if organization_id:
            self._cache.pop(organization_id, None)
            logger.debug(f"[Settings] Cleared cache for org {organization_id}")
        else:
            self._cache.clear()
            logger.debug("[Settings] Cleared all cache")


def get_org_settings(db: Session, organization_id: str) -> OrganizationSettings:
    """Convenience function to get organization settings.

    Args:
        db: SQLAlchemy database session.
        organization_id: The organization ID.

    Returns:
        OrganizationSettings instance.
    """
    service = SettingsService(db)
    return service.get_settings(organization_id)
