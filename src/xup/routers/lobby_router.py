from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from xup.auth import get_current_user
from xup.database import get_db
from xup.models import Challenge, Party, PartyMember, User
from xup.templating import templates
from xup.ws_manager import manager

router = APIRouter(tags=["lobby"])


@router.get("/lobby/{party_code}", response_class=HTMLResponse)
async def lobby(
    party_code: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    party_code = party_code.upper()

    result = await db.execute(
        select(Party)
        .where(Party.code == party_code)
        .options(
            selectinload(Party.members).selectinload(PartyMember.user),
        )
    )
    party = result.scalar_one_or_none()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    is_member = any(m.user_id == current_user.id for m in party.members)
    if not is_member:
        return templates.TemplateResponse(
            request, "home.html",
            {
                "user": current_user,
                "join_error": f"You are not a member of party {party_code}. Join first.",
            },
        )

    # Load pending challenges for this party
    challenges_result = await db.execute(
        select(Challenge)
        .where(Challenge.party_id == party.id, Challenge.status == "pending")
        .options(
            selectinload(Challenge.challenger),
            selectinload(Challenge.target),
        )
    )
    pending_challenges = challenges_result.scalars().all()

    members = [m.user for m in party.members]
    online_ids = manager.online_user_ids(party_code)

    return templates.TemplateResponse(request, "lobby.html", {
        "user": current_user,
        "party": party,
        "members": members,
        "pending_challenges": pending_challenges,
        "online_ids": online_ids,
    })
