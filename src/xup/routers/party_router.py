from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from xup.auth import get_current_user
from xup.database import get_db
from xup.models import Party, PartyMember, User
from xup.templating import templates

router = APIRouter(tags=["party"])


@router.get("/", response_class=HTMLResponse)
async def home(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    return templates.TemplateResponse(request, "home.html", {"user": current_user})


@router.post("/party/create")
async def create_party(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from xup.models import _party_code  # reuse the generator

    # Retry on collision (extremely rare with 6-char alphanumeric = 36^6 = 2.1B combinations)
    for _ in range(5):
        code = _party_code()
        existing = await db.execute(select(Party).where(Party.code == code))
        if not existing.scalar_one_or_none():
            break

    party = Party(code=code, host_id=current_user.id)
    db.add(party)
    await db.flush()

    member = PartyMember(party_id=party.id, user_id=current_user.id)
    db.add(member)
    await db.commit()

    return RedirectResponse(url=f"/lobby/{party.code}", status_code=303)


@router.post("/party/join")
async def join_party(
    request: Request,
    code: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    code = code.strip().upper()
    result = await db.execute(select(Party).where(Party.code == code))
    party = result.scalar_one_or_none()

    if not party:
        return templates.TemplateResponse(
            request, "home.html",
            {"user": current_user, "join_error": "Party not found. Check the code and try again."},
            status_code=404,
        )

    # Add member if not already in party
    existing = await db.execute(
        select(PartyMember).where(
            PartyMember.party_id == party.id,
            PartyMember.user_id == current_user.id,
        )
    )
    if not existing.scalar_one_or_none():
        db.add(PartyMember(party_id=party.id, user_id=current_user.id))
        await db.commit()

        from xup.ws_manager import manager
        await manager.broadcast(code, {
            "type": "member_joined",
            "user_id": current_user.id,
            "username": current_user.username,
        })

    return RedirectResponse(url=f"/lobby/{code}", status_code=303)
