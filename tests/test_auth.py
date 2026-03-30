from httpx import AsyncClient

from tests.conftest import register


async def test_register_success(client: AsyncClient):
    r = await client.post(
        "/auth/register",
        data={"username": "alice", "password": "password123"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["username"] == "alice"
    assert "xup_token" in r.cookies


async def test_register_sets_httponly_cookie(client: AsyncClient):
    r = await client.post(
        "/auth/register",
        data={"username": "alice", "password": "password123"},
    )
    # httpx exposes Set-Cookie header — verify httponly flag is present
    set_cookie = r.headers.get("set-cookie", "")
    assert "httponly" in set_cookie.lower()


async def test_register_duplicate_username(client: AsyncClient):
    data = {"username": "alice", "password": "password123"}
    await client.post("/auth/register", data=data)
    r = await client.post("/auth/register", data=data)
    assert r.status_code == 400


async def test_register_username_too_short(client: AsyncClient):
    r = await client.post(
        "/auth/register",
        data={"username": "a", "password": "password123"},
    )
    assert r.status_code == 400


async def test_register_password_too_short(client: AsyncClient):
    r = await client.post(
        "/auth/register",
        data={"username": "alice", "password": "short"},  # 5 chars, below 8-char minimum
    )
    assert r.status_code == 400


async def test_login_success(client: AsyncClient):
    await register(client, "alice")
    client.cookies.clear()

    r = await client.post(
        "/auth/login",
        data={"username": "alice", "password": "password123"},
    )
    assert r.status_code == 200
    assert "xup_token" in r.cookies


async def test_login_wrong_password(client: AsyncClient):
    await register(client, "alice")
    r = await client.post(
        "/auth/login",
        data={"username": "alice", "password": "wrongpassword"},
    )
    assert r.status_code == 401


async def test_login_unknown_user(client: AsyncClient):
    r = await client.post(
        "/auth/login",
        data={"username": "ghost", "password": "password123"},
    )
    assert r.status_code == 401


async def test_logout_clears_cookie(client: AsyncClient):
    await register(client, "alice")
    r = await client.post("/auth/logout")
    assert r.status_code == 200
    # Cookie should be deleted (empty value or absent)
    assert client.cookies.get("xup_token", "") == ""


async def test_unauthenticated_me_returns_401(client: AsyncClient):
    r = await client.get("/auth/me")
    assert r.status_code == 401


async def test_me_returns_user(client: AsyncClient):
    await register(client, "alice")
    r = await client.get("/auth/me")
    assert r.status_code == 200
    assert r.json()["username"] == "alice"
