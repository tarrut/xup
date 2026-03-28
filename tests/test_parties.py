import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from xup.models import Party, PartyMember
from tests.conftest import register


async def test_create_party(client: AsyncClient, db: AsyncSession):
    await register(client, "alice")

    r = await client.post("/party/create", follow_redirects=False)

    assert r.status_code == 303
    assert "/lobby/" in r.headers["location"]

    # Party exists in DB
    result = await db.execute(select(Party))
    parties = result.scalars().all()
    assert len(parties) == 1
    assert len(parties[0].code) == 6


async def test_create_party_adds_host_as_member(client: AsyncClient, db: AsyncSession):
    await register(client, "alice")
    r = await client.post("/party/create", follow_redirects=False)
    code = r.headers["location"].split("/lobby/")[1]

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
    r = await client.post("/party/create", follow_redirects=False)
    code = r.headers["location"].split("/lobby/")[1]

    # Bob joins
    await register(client, "bob")
    r = await client.post("/party/join", data={"code": code}, follow_redirects=False)

    assert r.status_code == 303
    assert f"/lobby/{code}" in r.headers["location"]

    result = await db.execute(select(Party).where(Party.code == code))
    party = result.scalar_one()
    result = await db.execute(
        select(PartyMember).where(PartyMember.party_id == party.id)
    )
    assert len(result.scalars().all()) == 2


async def test_join_nonexistent_party(client: AsyncClient):
    await register(client, "alice")
    r = await client.post("/party/join", data={"code": "XXXXXX"}, follow_redirects=False)
    assert r.status_code == 404


async def test_join_party_is_idempotent(client: AsyncClient, db: AsyncSession):
    """Joining a party twice should not create duplicate membership."""
    await register(client, "alice")
    r = await client.post("/party/create", follow_redirects=False)
    code = r.headers["location"].split("/lobby/")[1]

    await client.post("/party/join", data={"code": code}, follow_redirects=False)
    await client.post("/party/join", data={"code": code}, follow_redirects=False)

    result = await db.execute(select(Party).where(Party.code == code))
    party = result.scalar_one()
    result = await db.execute(
        select(PartyMember).where(PartyMember.party_id == party.id)
    )
    assert len(result.scalars().all()) == 1


async def test_lobby_requires_auth(client: AsyncClient):
    r = await client.get("/lobby/ABC123", follow_redirects=False)
    assert r.status_code == 303
    assert "/login" in r.headers["location"]
