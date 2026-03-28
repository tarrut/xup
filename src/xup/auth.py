from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, Request
import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from xup.config import settings
from xup.database import get_db

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(data: dict[str, Any], expire_seconds: int | None = None) -> str:
    payload = data.copy()
    minutes = expire_seconds / 60 if expire_seconds else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


class NotAuthenticatedException(Exception):
    pass


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    from xup.models import User  # local import avoids circular at module load

    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        raise NotAuthenticatedException()

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise NotAuthenticatedException()

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise NotAuthenticatedException()

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotAuthenticatedException()
    return user


async def get_current_user_ws(token: str, db: AsyncSession):
    from xup.models import User

    payload = decode_token(token)
    if not payload or payload.get("type") != "ws_ticket":
        return None

    user_id: str | None = payload.get("sub")
    if not user_id:
        return None

    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
