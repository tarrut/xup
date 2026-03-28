import random
import string

from fastapi import APIRouter, Body, Depends, Form, HTTPException, Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from xup.auth import create_token, get_current_user, hash_password, verify_password
from xup.config import settings
from xup.database import get_db
from xup.models import User
from xup.schemas import UserResponse

limiter = Limiter(key_func=get_remote_address)

GUEST_SESSION_SECONDS = 60 * 60 * 24  # 24 hours

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
@limiter.limit("10/minute")
async def register(
    request: Request,
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    username = username.strip()
    if len(username) < 2 or len(username) > 32:
        raise HTTPException(status_code=400, detail="Username must be 2–32 characters.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if len(password) > 128:
        raise HTTPException(status_code=400, detail="Password must be at most 128 characters.")
    if password.strip() == "":
        raise HTTPException(status_code=400, detail="Password cannot be only spaces.")

    existing = await db.execute(select(User).where(User.username == username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken.")

    user = User(username=username, hashed_password=hash_password(password))
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token({"sub": user.id, "type": "access"})
    response.set_cookie(
        settings.COOKIE_NAME, token,
        httponly=True, samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return user


@router.post("/login", response_model=UserResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == username.strip()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    token = create_token({"sub": user.id, "type": "access"})
    response.set_cookie(
        settings.COOKIE_NAME, token,
        httponly=True, samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return user


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(settings.COOKIE_NAME)
    return {"ok": True}


@router.post("/guest", response_model=UserResponse)
@limiter.limit("10/minute")
async def guest(
    request: Request,
    response: Response,
    username: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    username = username.strip()
    if len(username) < 1 or len(username) > 32:
        raise HTTPException(status_code=400, detail="Name must be 1–32 characters.")

    # Ensure uniqueness — append random suffix if taken
    candidate = username
    for _ in range(10):
        existing = await db.execute(select(User).where(User.username == candidate))
        if not existing.scalar_one_or_none():
            break
        suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
        candidate = f"{username}_{suffix}"
    else:
        raise HTTPException(status_code=500, detail="Could not generate a unique guest name.")

    user = User(username=candidate, hashed_password=None, is_guest=True)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token({"sub": user.id, "type": "access"}, expire_seconds=GUEST_SESSION_SECONDS)
    response.set_cookie(
        settings.COOKIE_NAME, token,
        httponly=True, samesite="lax",
        max_age=GUEST_SESSION_SECONDS,
    )
    return user


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
