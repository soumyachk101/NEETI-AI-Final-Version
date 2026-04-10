# Development Guide

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker Desktop (recommended for local infra)
- Git

## 1) Initial Setup

```powershell
git clone https://github.com/sukrit-89/Anti-cheat-interview-system.git
cd Anti-cheat-interview-system
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Frontend:

```powershell
cd frontend
npm install
cd ..
```

## 2) Environment

Create `.env` in repo root. Minimum local values:

```env
ENVIRONMENT=development
DEBUG=True
HOST=0.0.0.0
PORT=8000

POSTGRES_USER=interview_user
POSTGRES_PASSWORD=interview_pass
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=interview_platform

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000

SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_WS_URL=wss://...
```

Notes:
- `DATABASE_URL` can be used instead of discrete postgres vars.
- In development, if host is left as `postgres`, backend now falls back to `localhost`.

## 3) Start Local Dependencies

```powershell
docker compose up -d postgres redis
```

Optional services:

```powershell
docker compose up -d minio ollama
```

## 4) Run Backend

```powershell
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/health
```

## 5) Run Frontend

```powershell
cd frontend
npm run dev
```

Frontend default URL: `http://localhost:5173`

## 6) Database Init and Migration Scripts

```powershell
python init_db.py
```

Useful helpers:

```powershell
python cleanup_database.py
python reset_all.py
```

## 7) Daily Workflow

1. Pull latest changes.
2. Activate venv.
3. Ensure `postgres` and `redis` are up.
4. Run backend + frontend.
5. Run tests and lint before commit.

## 8) Testing

Backend:

```powershell
pytest
pytest tests/test_sessions.py
pytest --cov=app --cov-report=term-missing
```

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

## 9) Troubleshooting

### Browser error: CORS request did not succeed, status null

This usually means API is down/unreachable.

Check sequence:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/health
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -eq 8000 }
```

If backend fails at startup, inspect env and dependency logs.

### Health is degraded

`/health` may return:

```json
{"status":"degraded","database":"disconnected","redis":"disconnected"}
```

Bring dependencies up and retry.

### Port already in use

```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 8000,5173,5432,6379 }
```

## 10) Code Standards

- Python: type hints, async-aware patterns, explicit error handling
- Frontend: strict TypeScript, predictable Zustand state updates
- API contracts: update [API_REFERENCE.md](API_REFERENCE.md) on route/schema changes

Last updated: 2026-04-07

 
