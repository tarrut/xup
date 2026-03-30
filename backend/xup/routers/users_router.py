from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from xup.auth import get_current_user
from xup.database import get_db
from xup.models import User
from xup.schemas import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


class UpdateDisplayName(BaseModel):
    display_name: str


@router.patch("/me", response_model=UserResponse)
async def update_display_name(
    body: UpdateDisplayName,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    name = body.display_name.strip()
    if len(name) < 1 or len(name) > 32:
        raise HTTPException(status_code=400, detail="Display name must be 1–32 characters.")
    current_user.display_name = name
    await db.commit()
    await db.refresh(current_user)
    return current_user
