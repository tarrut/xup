import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / ".env")

BASE_DIR = Path(__file__).parent


class Settings:
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    WS_TICKET_EXPIRE_SECONDS: int = 60
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "postgresql+asyncpg://localhost/xup")
    COOKIE_NAME: str = "xup_token"


settings = Settings()

if not settings.SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")
