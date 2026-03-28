from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from xup.auth import create_token, hash_password, verify_password, get_current_user
from xup.config import settings
from xup.database import get_db
from xup.models import User
from xup.templating import templates

router = APIRouter(tags=["auth"])


@router.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    return templates.TemplateResponse(request, "register.html")


@router.post("/register")
async def register(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    username = username.strip()
    if len(username) < 2 or len(username) > 32:
        return templates.TemplateResponse(
            request, "register.html",
            {"error": "Username must be 2–32 characters."},
            status_code=400,
        )
    if len(password) < 4:
        return templates.TemplateResponse(
            request, "register.html",
            {"error": "Password must be at least 4 characters."},
            status_code=400,
        )

    existing = await db.execute(select(User).where(User.username == username))
    if existing.scalar_one_or_none():
        return templates.TemplateResponse(
            request, "register.html",
            {"error": "Username already taken."},
            status_code=400,
        )

    user = User(username=username, hashed_password=hash_password(password))
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token({"sub": user.id, "type": "access"})
    response = RedirectResponse(url="/", status_code=303)
    response.set_cookie(
        settings.COOKIE_NAME, token,
        httponly=True, samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return response


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(request, "login.html")


@router.post("/login")
async def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == username.strip()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        return templates.TemplateResponse(
            request, "login.html",
            {"error": "Invalid username or password."},
            status_code=401,
        )

    token = create_token({"sub": user.id, "type": "access"})
    response = RedirectResponse(url="/", status_code=303)
    response.set_cookie(
        settings.COOKIE_NAME, token,
        httponly=True, samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return response


@router.post("/logout")
async def logout():
    response = RedirectResponse(url="/login", status_code=303)
    response.delete_cookie(settings.COOKIE_NAME)
    return response
