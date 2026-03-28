import pytest
from httpx import AsyncClient

from tests.conftest import register, login


async def test_register_success(client: AsyncClient):
    r = await client.post(
        "/register",
        data={"username": "alice", "password": "password123"},
        follow_redirects=False,
    )
    assert r.status_code == 303
    assert r.headers["location"] == "/"
    assert "xup_token" in r.cookies


async def test_register_sets_httponly_cookie(client: AsyncClient):
    r = await client.post(
        "/register",
        data={"username": "alice", "password": "password123"},
        follow_redirects=False,
    )
    # httpx exposes Set-Cookie header — verify httponly flag is present
    set_cookie = r.headers.get("set-cookie", "")
    assert "httponly" in set_cookie.lower()


async def test_register_duplicate_username(client: AsyncClient):
    data = {"username": "alice", "password": "password123"}
    await client.post("/register", data=data, follow_redirects=False)
    r = await client.post("/register", data=data, follow_redirects=False)
    assert r.status_code == 400


async def test_register_username_too_short(client: AsyncClient):
    r = await client.post(
        "/register",
        data={"username": "a", "password": "password123"},
        follow_redirects=False,
    )
    assert r.status_code == 400


async def test_register_password_too_short(client: AsyncClient):
    r = await client.post(
        "/register",
        data={"username": "alice", "password": "abc"},
        follow_redirects=False,
    )
    assert r.status_code == 400


async def test_login_success(client: AsyncClient):
    await register(client, "alice")
    client.cookies.clear()

    r = await client.post(
        "/login",
        data={"username": "alice", "password": "password123"},
        follow_redirects=False,
    )
    assert r.status_code == 303
    assert "xup_token" in r.cookies


async def test_login_wrong_password(client: AsyncClient):
    await register(client, "alice")
    r = await client.post(
        "/login",
        data={"username": "alice", "password": "wrongpassword"},
        follow_redirects=False,
    )
    assert r.status_code == 401


async def test_login_unknown_user(client: AsyncClient):
    r = await client.post(
        "/login",
        data={"username": "ghost", "password": "password123"},
        follow_redirects=False,
    )
    assert r.status_code == 401


async def test_logout_clears_cookie(client: AsyncClient):
    await register(client, "alice")
    r = await client.post("/logout", follow_redirects=False)
    assert r.status_code == 303
    # Cookie should be deleted (empty value or absent)
    assert client.cookies.get("xup_token", "") == ""


async def test_unauthenticated_home_redirects_to_login(client: AsyncClient):
    r = await client.get("/", follow_redirects=False)
    assert r.status_code == 303
    assert "/login" in r.headers["location"]
