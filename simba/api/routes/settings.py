"""Organization settings routes."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from simba.api.middleware.auth import OrganizationContext, get_current_org, get_optional_org
from simba.models import get_db
from simba.services.prompt_service import get_default_prompts
from simba.services.settings_service import SettingsService

router = APIRouter(prefix="/settings")


# --- Schemas ---


class SettingsResponse(BaseModel):
    """Organization settings response."""

    organization_id: str
    app_name: str
    app_description: str | None
    system_prompt_en: str | None
    system_prompt_zh: str | None
    retrieval_limit: int | None
    retrieval_min_score: float | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    """Organization settings update request."""

    app_name: str | None = Field(None, min_length=1, max_length=100)
    app_description: str | None = Field(None, max_length=500)
    system_prompt_en: str | None = Field(None, max_length=10000)
    system_prompt_zh: str | None = Field(None, max_length=10000)
    retrieval_limit: int | None = Field(None, ge=1, le=50)
    retrieval_min_score: float | None = Field(None, ge=0.0, le=1.0)


class DefaultPromptsResponse(BaseModel):
    """Default prompt templates response."""

    en: str
    zh: str


# --- Routes ---


@router.get("", response_model=SettingsResponse)
async def get_settings(
    db: Session = Depends(get_db),
    org: OrganizationContext | None = Depends(get_optional_org),
):
    """Get current organization settings.

    Returns the settings for the current organization. If no settings exist,
    default settings will be created automatically. If no organization is
    provided, returns default settings.
    """
    if org is None:
        # Return defaults for unauthenticated requests
        now = datetime.utcnow()
        return SettingsResponse(
            organization_id="default",
            app_name="Simba",
            app_description="AI-powered assistant",
            system_prompt_en=None,
            system_prompt_zh=None,
            retrieval_limit=None,
            retrieval_min_score=None,
            created_at=now,
            updated_at=now,
        )

    service = SettingsService(db)
    settings = service.get_settings(org.organization_id)
    return SettingsResponse(
        organization_id=settings.organization_id,
        app_name=settings.app_name,
        app_description=settings.app_description,
        system_prompt_en=settings.system_prompt_en,
        system_prompt_zh=settings.system_prompt_zh,
        retrieval_limit=settings.retrieval_limit,
        retrieval_min_score=settings.retrieval_min_score,
        created_at=settings.created_at,
        updated_at=settings.updated_at,
    )


@router.put("", response_model=SettingsResponse)
async def update_settings(
    data: SettingsUpdate,
    db: Session = Depends(get_db),
    org: OrganizationContext | None = Depends(get_optional_org),
):
    """Update organization settings.

    Only provided fields will be updated. Pass null/None to clear a field.
    Requires authentication with an active organization.
    """
    if org is None:
        raise HTTPException(
            status_code=401,
            detail="Please log in and select an organization to save settings",
        )
    service = SettingsService(db)

    # Build update dict, excluding None values (unless explicitly clearing)
    update_data = {}
    for key, value in data.model_dump(exclude_unset=True).items():
        update_data[key] = value

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    try:
        settings = service.update_settings(org.organization_id, **update_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return SettingsResponse(
        organization_id=settings.organization_id,
        app_name=settings.app_name,
        app_description=settings.app_description,
        system_prompt_en=settings.system_prompt_en,
        system_prompt_zh=settings.system_prompt_zh,
        retrieval_limit=settings.retrieval_limit,
        retrieval_min_score=settings.retrieval_min_score,
        created_at=settings.created_at,
        updated_at=settings.updated_at,
    )


@router.get("/prompts/default", response_model=DefaultPromptsResponse)
async def get_default_prompt_templates():
    """Get default prompt templates for reference.

    Returns the default system prompts in both English and Chinese.
    These can be used as starting points for customization.
    """
    prompts = get_default_prompts()
    return DefaultPromptsResponse(en=prompts["en"], zh=prompts["zh"])
