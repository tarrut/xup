import random
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from xup.auth import create_token, get_current_user
from xup.config import settings
from xup.database import get_db
from xup.models import Challenge, Party, PartyMember, User
from xup.ws_manager import manager

router = APIRouter(prefix="/challenge", tags=["challenge"])


class ChallengeCreate(BaseModel):
    party_code: str
    target_id: str
    shots: int


class ChallengeRespond(BaseModel):
    accept: bool


@router.get("/ws-ticket")
async def ws_ticket(current_user: User = Depends(get_current_user)):
    ticket = create_token(
        {"sub": current_user.id, "type": "ws_ticket"},
        expire_seconds=settings.WS_TICKET_EXPIRE_SECONDS,
    )
    return {"ticket": ticket}


@router.post("/")
async def create_challenge(
    body: ChallengeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not (1 <= body.shots <= 10):
        raise HTTPException(status_code=400, detail="Shots must be between 1 and 10.")
    if body.target_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot challenge yourself.")

    party_code = body.party_code.upper()
    party_result = await db.execute(select(Party).where(Party.code == party_code))
    party = party_result.scalar_one_or_none()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found.")

    # Verify both users are members
    members_result = await db.execute(
        select(PartyMember).where(PartyMember.party_id == party.id)
    )
    member_ids = {m.user_id for m in members_result.scalars().all()}
    if current_user.id not in member_ids or body.target_id not in member_ids:
        raise HTTPException(status_code=403, detail="Both players must be in the party.")

    # Get target user info for the broadcast
    target_result = await db.execute(select(User).where(User.id == body.target_id))
    target = target_result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found.")

    challenge = Challenge(
        party_id=party.id,
        challenger_id=current_user.id,
        target_id=body.target_id,
        shots=body.shots,
        status="pending",
    )
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)

    await manager.broadcast(party_code, {
        "type": "challenge_issued",
        "challenge_id": challenge.id,
        "challenger_id": current_user.id,
        "challenger_username": current_user.username,
        "target_id": body.target_id,
        "target_username": target.username,
        "shots": body.shots,
    })

    return {"challenge_id": challenge.id}


@router.post("/{challenge_id}/respond")
async def respond_to_challenge(
    challenge_id: str,
    body: ChallengeRespond,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Challenge)
        .where(Challenge.id == challenge_id)
        .options(
            selectinload(Challenge.challenger),
            selectinload(Challenge.target),
        )
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found.")
    if challenge.target_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the target can respond.")
    if challenge.status != "pending":
        raise HTTPException(status_code=400, detail="Challenge already resolved.")

    # Get party code for broadcast
    party_result = await db.execute(select(Party).where(Party.id == challenge.party_id))
    party = party_result.scalar_one_or_none()

    if not body.accept:
        challenge.status = "declined"
        await db.commit()
        await manager.broadcast(party.code, {
            "type": "challenge_declined",
            "challenge_id": challenge.id,
            "decliner_username": current_user.username,
            "challenger_username": challenge.challenger.username,
        })
        return {"status": "declined"}

    # Coin flip
    winner = random.choice([challenge.challenger, challenge.target])
    loser = challenge.target if winner.id == challenge.challenger_id else challenge.challenger

    challenge.status = "accepted"
    challenge.winner_id = winner.id

    winner.shots_won += challenge.shots
    loser.shots_lost += challenge.shots

    await db.commit()

    await manager.broadcast(party.code, {
        "type": "challenge_result",
        "challenge_id": challenge.id,
        "winner_id": winner.id,
        "winner_username": winner.username,
        "loser_id": loser.id,
        "loser_username": loser.username,
        "shots": challenge.shots,
    })

    return {"status": "accepted", "winner_id": winner.id}
