from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from xup.auth import get_current_user_ws
from xup.database import async_session_maker
from xup.ws_manager import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/{party_code}")
async def websocket_endpoint(
    websocket: WebSocket,
    party_code: str,
    ticket: str = Query(...),
):
    async with async_session_maker() as db:
        user = await get_current_user_ws(ticket, db)

    if not user:
        await websocket.close(code=4001)
        return

    party_code = party_code.upper()
    display = user.display_name or user.username
    await manager.connect(party_code, websocket, user.id, display)
    try:
        while True:
            await websocket.receive_text()  # Keep alive; client sends pings
    except WebSocketDisconnect:
        manager.disconnect(party_code, websocket)
        await manager.broadcast(party_code, {
            "type": "member_offline",
            "user_id": user.id,
            "username": display,
        })
