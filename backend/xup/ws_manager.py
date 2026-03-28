import json
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, list[tuple[WebSocket, str, str]]] = defaultdict(list)

    async def connect(self, party_code: str, websocket: WebSocket, user_id: str, username: str) -> None:
        await websocket.accept()
        self._connections[party_code].append((websocket, user_id, username))

    def disconnect(self, party_code: str, websocket: WebSocket) -> None:
        self._connections[party_code] = [
            (ws, uid, uname)
            for ws, uid, uname in self._connections[party_code]
            if ws is not websocket
        ]

    async def broadcast(self, party_code: str, message: dict) -> None:
        payload = json.dumps(message)
        dead: list[WebSocket] = []
        for ws, _, _ in list(self._connections.get(party_code, [])):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(party_code, ws)

    def online_user_ids(self, party_code: str) -> set[str]:
        return {uid for _, uid, _ in self._connections.get(party_code, [])}


manager = ConnectionManager()
