import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from xup.models import Challenge, Party, PartyMember, User
from tests.conftest import register


async def _setup_party(client: AsyncClient, db: AsyncSession) -> tuple[str, str, str]:
    """Create alice, create a party, register bob and join. Returns (party_code, alice_id, bob_id)."""
    await register(client, "alice")
    r = await client.post("/parties")
    code = r.json()["code"]

    await register(client, "bob")
    await client.post("/parties/join", json={"code": code})

    result = await db.execute(select(User).where(User.username == "alice"))
    alice = result.scalar_one()
    result = await db.execute(select(User).where(User.username == "bob"))
    bob = result.scalar_one()

    return code, alice.id, bob.id


async def test_create_challenge(client: AsyncClient, db: AsyncSession):
    code, alice_id, bob_id = await _setup_party(client, db)

    # Log back in as alice to create the challenge
    result = await db.execute(select(User).where(User.username == "alice"))
    alice = result.scalar_one()
    from xup.auth import create_token
    token = create_token({"sub": alice.id, "type": "access"})
    client.cookies.set("xup_token", token)

    r = await client.post(
        "/challenge/",
        json={"party_code": code, "target_id": bob_id, "shots": 3},
    )
    assert r.status_code == 200
    data = r.json()
    assert "challenge_id" in data

    result = await db.execute(select(Challenge).where(Challenge.id == data["challenge_id"]))
    challenge = result.scalar_one()
    assert challenge.shots == 3
    assert challenge.status == "pending"
    assert challenge.challenger_id == alice.id
    assert challenge.target_id == bob_id


async def test_cannot_challenge_yourself(client: AsyncClient, db: AsyncSession):
    code, alice_id, _ = await _setup_party(client, db)

    result = await db.execute(select(User).where(User.username == "alice"))
    alice = result.scalar_one()
    from xup.auth import create_token
    token = create_token({"sub": alice.id, "type": "access"})
    client.cookies.set("xup_token", token)

    r = await client.post(
        "/challenge/",
        json={"party_code": code, "target_id": alice_id, "shots": 1},
    )
    assert r.status_code == 400


async def test_shots_must_be_between_1_and_10(client: AsyncClient, db: AsyncSession):
    code, alice_id, bob_id = await _setup_party(client, db)

    result = await db.execute(select(User).where(User.username == "alice"))
    alice = result.scalar_one()
    from xup.auth import create_token
    token = create_token({"sub": alice.id, "type": "access"})
    client.cookies.set("xup_token", token)

    r = await client.post(
        "/challenge/",
        json={"party_code": code, "target_id": bob_id, "shots": 0},
    )
    assert r.status_code == 400

    r = await client.post(
        "/challenge/",
        json={"party_code": code, "target_id": bob_id, "shots": 11},
    )
    assert r.status_code == 400


async def test_accept_challenge_resolves_with_winner(client: AsyncClient, db: AsyncSession):
    code, alice_id, bob_id = await _setup_party(client, db)
    from xup.auth import create_token

    # Alice creates challenge
    token = create_token({"sub": alice_id, "type": "access"})
    client.cookies.set("xup_token", token)
    r = await client.post(
        "/challenge/",
        json={"party_code": code, "target_id": bob_id, "shots": 2},
    )
    challenge_id = r.json()["challenge_id"]

    # Bob accepts
    token = create_token({"sub": bob_id, "type": "access"})
    client.cookies.set("xup_token", token)
    r = await client.post(f"/challenge/{challenge_id}/respond", json={"accept": True})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "accepted"
    assert data["winner_id"] in {alice_id, bob_id}

    # Challenge is no longer pending
    await db.reset()
    result = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
    challenge = result.scalar_one()
    assert challenge.status == "accepted"
    assert challenge.winner_id is not None

    # Stats updated
    result = await db.execute(select(User).where(User.id == challenge.winner_id))
    winner = result.scalar_one()
    assert winner.shots_won == 2


async def test_decline_challenge(client: AsyncClient, db: AsyncSession):
    code, alice_id, bob_id = await _setup_party(client, db)
    from xup.auth import create_token

    token = create_token({"sub": alice_id, "type": "access"})
    client.cookies.set("xup_token", token)
    r = await client.post(
        "/challenge/",
        json={"party_code": code, "target_id": bob_id, "shots": 1},
    )
    challenge_id = r.json()["challenge_id"]

    token = create_token({"sub": bob_id, "type": "access"})
    client.cookies.set("xup_token", token)
    r = await client.post(f"/challenge/{challenge_id}/respond", json={"accept": False})
    assert r.status_code == 200
    assert r.json()["status"] == "declined"

    await db.reset()
    result = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
    challenge = result.scalar_one()
    assert challenge.status == "declined"


async def test_challenger_cannot_respond(client: AsyncClient, db: AsyncSession):
    code, alice_id, bob_id = await _setup_party(client, db)
    from xup.auth import create_token

    token = create_token({"sub": alice_id, "type": "access"})
    client.cookies.set("xup_token", token)
    r = await client.post(
        "/challenge/",
        json={"party_code": code, "target_id": bob_id, "shots": 1},
    )
    challenge_id = r.json()["challenge_id"]

    # Alice (challenger) tries to accept their own challenge
    r = await client.post(f"/challenge/{challenge_id}/respond", json={"accept": True})
    assert r.status_code == 403


async def test_cannot_respond_to_resolved_challenge(client: AsyncClient, db: AsyncSession):
    code, alice_id, bob_id = await _setup_party(client, db)
    from xup.auth import create_token

    token = create_token({"sub": alice_id, "type": "access"})
    client.cookies.set("xup_token", token)
    r = await client.post(
        "/challenge/",
        json={"party_code": code, "target_id": bob_id, "shots": 1},
    )
    challenge_id = r.json()["challenge_id"]

    token = create_token({"sub": bob_id, "type": "access"})
    client.cookies.set("xup_token", token)
    await client.post(f"/challenge/{challenge_id}/respond", json={"accept": True})

    # Try to respond again
    r = await client.post(f"/challenge/{challenge_id}/respond", json={"accept": True})
    assert r.status_code == 400
