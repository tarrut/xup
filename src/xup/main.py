from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from sqlalchemy import text

from xup.auth import NotAuthenticatedException
from xup.database import engine
from xup.routers import auth_router, challenge_router, lobby_router, party_router, ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail fast if the DB is unreachable at startup
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    yield
    # Return all pooled connections to the DB on shutdown
    await engine.dispose()


app = FastAPI(title="XUP", lifespan=lifespan)

app.mount(
    "/static",
    StaticFiles(directory=Path(__file__).parent.parent.parent / "static"),
    name="static",
)

app.include_router(auth_router.router)
app.include_router(party_router.router)
app.include_router(lobby_router.router)
app.include_router(challenge_router.router)
app.include_router(ws_router.router)


@app.exception_handler(NotAuthenticatedException)
async def not_authenticated_handler(request: Request, exc: NotAuthenticatedException):
    return RedirectResponse(url="/login", status_code=303)
