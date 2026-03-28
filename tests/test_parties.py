import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from xup.models import Party, PartyMember
from tests.conftest import register


async def test_create_party(client: AsyncClient, db: AsyncSession):
    await register(client, "alice")

    r = await client.post("/parties")

    assert r.status_code == 200
    data = r.json()
    assert "code" in data
    assert len(data["code"]) == 6

    # Party exists in DB
    result = await db.execute(select(Party))
    parties = result.scalars().all()
    assert len(parties) == 1
    assert len(parties[0].code) == 6


async def test_create_party_adds_host_as_member(client: AsyncClient, db: AsyncSession):
    await register(client, "alice")
    r = await client.post("/parties")
    code = r.json()["code"]

    result = await db.execute(select(Party).where(Party.code == code))
    party = result.scalar_one()

    result = await db.execute(
        select(PartyMember).where(PartyMember.party_id == party.id)
    )
    members = result.scalars().all()
    assert len(members) == 1


async def test_join_party(client: AsyncClient, db: AsyncSession):
    # Alice creates party
    await register(client, "alice")
    r = await client.post("/parties")
    code = r.json()["code"]

    # Bob joins
    await register(client, "bob")
    r = await client.post("/parties/join", json={"code": code})

    assert r.status_code == 200
    assert r.json()["code"] == code

    result = await db.execute(select(Party).where(Party.code == code))
    party = result.scalar_one()
    result = await db.execute(
        select(PartyMember).where(PartyMember.party_id == party.id)
    )
    assert len(result.scalars().all()) == 2


async def test_join_nonexistent_party(client: AsyncClient):
    await register(client, "alice")
    r = await client.post("/parties/join", json={"code": "XXXXXX"})
    assert r.status_code == 404


async def test_join_party_is_idempotent(client: AsyncClient, db: AsyncSession):
    """Joining a party twice should not create duplicate membership."""
    await register(client, "alice")
    r = await client.post("/parties")
    code = r.json()["code"]

    await client.post("/parties/join", json={"code": code})
    await client.post("/parties/join", json={"code": code})

    result = await db.execute(select(Party).where(Party.code == code))
    party = result.scalar_one()
    result = await db.execute(
        select(PartyMember).where(PartyMember.party_id == party.id)
    )
    assert len(result.scalars().all()) == 1


async def test_get_party_detail(client: AsyncClient, db: AsyncSession):
    await register(client, "alice")
    r = await client.post("/parties")
    code = r.json()["code"]

    r = await client.get(f"/parties/{code}")
    assert r.status_code == 200
    data = r.json()
    assert data["code"] == code
    assert len(data["members"]) == 1
    assert data["members"][0]["username"] == "alice"


async def test_get_party_requires_membership(client: AsyncClient):
    await register(client, "alice")
    r = await client.post("/parties")
    code = r.json()["code"]

    await register(client, "bob")
    r = await client.get(f"/parties/{code}")
    assert r.status_code == 403


async def test_lobby_requires_auth(client: AsyncClient):
    r = await client.get("/parties/ABC123")
    assert r.status_code == 401
