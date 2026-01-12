"""Organization routes."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from simba.models.base import get_db

router = APIRouter(prefix="/organizations")


class OrganizationResponse(BaseModel):
    """Organization response model."""

    id: str
    name: str | None
    slug: str | None


class OrganizationListResponse(BaseModel):
    """Organization list response model."""

    organizations: list[OrganizationResponse]
    total: int


@router.get("", response_model=OrganizationListResponse)
async def list_organizations(db: Session = Depends(get_db)):
    """List all organizations."""
    result = db.execute(text("SELECT id, name, slug FROM organization ORDER BY created_at DESC"))
    rows = result.fetchall()

    organizations = [OrganizationResponse(id=row[0], name=row[1], slug=row[2]) for row in rows]

    return OrganizationListResponse(organizations=organizations, total=len(organizations))
