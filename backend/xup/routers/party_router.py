from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from xup.auth import get_current_user
from xup.database import get_db
from xup.models import Challenge, Party, PartyMember, User
from xup.schemas import ChallengeResponse, MemberResponse, PartyDetailResponse, PartyResponse
from xup.ws_manager import manager

router = APIRouter(prefix="/parties", tags=["parties"])


class JoinPartyBody(BaseModel):
    code: str


@router.post("", response_model=PartyResponse)
async def create_party(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can create parties.")
    from xup.models import _party_code
    for _ in range(5):
        code = _party_code()
        existing = await db.execute(select(Party).where(Party.code == code))
        if not existing.scalar_one_or_none():
            break

    party = Party(code=code, host_id=current_user.id)
    db.add(party)
    await db.flush()
    db.add(PartyMember(party_id=party.id, user_id=current_user.id))
    await db.commit()
    await db.refresh(party)
    return party


@router.post("/join", response_model=PartyResponse)
async def join_party(
    body: JoinPartyBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    code = body.code.strip().upper()
    result = await db.execute(select(Party).where(Party.code == code))
    party = result.scalar_one_or_none()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found.")

    existing = await db.execute(
        select(PartyMember).where(
            PartyMember.party_id == party.id,
            PartyMember.user_id == current_user.id,
        )
    )
    if not existing.scalar_one_or_none():
        db.add(PartyMember(party_id=party.id, user_id=current_user.id))
        await db.commit()
        await manager.broadcast(code, {
            "type": "member_joined",
            "user_id": current_user.id,
            "username": current_user.username,
            "is_guest": current_user.is_guest,
        })

    return party


@router.delete("/{code}/leave", status_code=204)
async def leave_party(
    code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    code = code.upper()
    result = await db.execute(select(Party).where(Party.code == code))
    party = result.scalar_one_or_none()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found.")

    membership = await db.execute(
        select(PartyMember).where(
            PartyMember.party_id == party.id,
            PartyMember.user_id == current_user.id,
        )
    )
    member = membership.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="You are not a member of this party.")

    await db.delete(member)
    await db.commit()
    await manager.broadcast(code, {
        "type": "member_left",
        "user_id": current_user.id,
        "username": current_user.username,
    })


@router.get("/{code}", response_model=PartyDetailResponse)
async def get_party(
    code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    code = code.upper()
    result = await db.execute(
        select(Party)
        .where(Party.code == code)
        .options(selectinload(Party.members).selectinload(PartyMember.user))
    )
    party = result.scalar_one_or_none()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found.")

    is_member = any(m.user_id == current_user.id for m in party.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this party.")

    challenges_result = await db.execute(
        select(Challenge)
        .where(Challenge.party_id == party.id, Challenge.status == "pending")
        .options(selectinload(Challenge.challenger), selectinload(Challenge.target))
    )
    pending = challenges_result.scalars().all()

    members = [
        MemberResponse(
            id=m.user.id,
            username=m.user.username,
            is_guest=m.user.is_guest,
            shots_won=m.user.shots_won,
            shots_lost=m.user.shots_lost,
        )
        for m in party.members
    ]

    challenges = [
        ChallengeResponse(
            id=ch.id,
            challenger_id=ch.challenger_id,
            challenger_username=ch.challenger.username,
            target_id=ch.target_id,
            target_username=ch.target.username,
            shots=ch.shots,
            status=ch.status,
        )
        for ch in pending
    ]

    return PartyDetailResponse(
        id=party.id,
        code=party.code,
        host_id=party.host_id,
        members=members,
        pending_challenges=challenges,
    )
