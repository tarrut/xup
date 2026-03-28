from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from xup.auth import NotAuthenticatedException
from xup.routers import auth_router, challenge_router, lobby_router, party_router, ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="XUP", lifespan=lifespan)

app.mount(
    "/static",
    StaticFiles(directory=Path(__file__).parent / "static"),
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
