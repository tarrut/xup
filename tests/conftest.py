import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from xup.config import settings
from xup.database import Base, get_db
from xup.main import app, limiter

# Derive test DB URL by replacing the DB name
TEST_DATABASE_URL = settings.DATABASE_URL.rsplit("/", 1)[0] + "/xup_test"


@pytest_asyncio.fixture
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db(test_engine) -> AsyncSession:
    session_maker = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_maker() as session:
        yield session


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncClient:
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    limiter.reset()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ── Helpers ──────────────────────────────────────────────────────────────────

async def register(client: AsyncClient, username: str, password: str = "password123") -> dict:
    """Register a user and return their auth cookie."""
    r = await client.post(
        "/auth/register",
        data={"username": username, "password": password},
    )
    assert r.status_code == 200, f"Register failed: {r.text}"
    return {"xup_token": r.cookies["xup_token"]}


async def login(client: AsyncClient, username: str, password: str = "password123") -> dict:
    """Login and return auth cookie."""
    r = await client.post(
        "/auth/login",
        data={"username": username, "password": password},
    )
    assert r.status_code == 200, f"Login failed: {r.text}"
    return {"xup_token": r.cookies["xup_token"]}
