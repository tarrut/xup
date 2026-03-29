# XUP

A party shot-gambling game. Players join a party, challenge each other, and the loser drinks.

## Stack

- **Backend:** FastAPI + SQLAlchemy (async) + PostgreSQL
- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS
- **Auth:** JWT via httponly cookies
- **Realtime:** WebSockets

## Local development

```bash
cp .env.example .env  # fill in values
docker compose up
```

Frontend: http://localhost
Backend API docs: http://localhost:8000/docs

## Running tests

```bash
docker compose up -d db backend
uv run pytest
```

## Production deployment

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Requires `DOMAIN`, `SECRET_KEY`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` to be set in `.env`.
