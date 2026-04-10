# End-to-End Setup (15 Minutes)

This guide gets a new machine from zero to a working local Neeti AI environment.

## 1) Prerequisites

Install:

- Docker Desktop
- Python 3.11+
- Node.js 18+
- Git

Accounts/services needed:

- Supabase project (Auth + DB credentials)
- LiveKit project (API key/secret + WS URL)

## 2) Clone and Install

```powershell
git clone https://github.com/sukrit-89/Anti-cheat-interview-system.git
cd Anti-cheat-interview-system
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd frontend
npm install
cd ..
```

## 3) Create `.env`

Use your real credentials and local infra defaults.

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

SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_WS_URL=wss://...

CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000
```

## 4) Start Infra

```powershell
docker compose up -d postgres redis
```

Optional:

```powershell
docker compose up -d minio ollama
```

## 5) Initialize Database

```powershell
.\venv\Scripts\Activate.ps1
python init_db.py
```

## 6) Start Backend

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/health
```

## 7) Start Frontend

In a second terminal:

```powershell
cd frontend
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- API docs: `http://localhost:8000/docs`

## 8) Smoke Test Flow

1. Register user via `/register`.
2. Login.
3. Create session.
4. Join session as candidate.
5. Open interview room and verify room token path works.
6. Trigger evaluation from recruiter flow.

## 9) If Something Fails

### CORS status null in browser

Treat as connectivity first:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/health
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -eq 8000 }
```

### Health shows degraded

Start missing services and retry:

```powershell
docker compose up -d postgres redis
```

### Port conflicts

```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 5173,8000,5432,6379 }
```

## 10) Useful Commands

```powershell
# reset local data
python reset_all.py

# cleanup stale rows
python cleanup_database.py

# backend tests
pytest

# frontend lint/build
cd frontend
npm run lint
npm run build
```

Last updated: 2026-04-07

 
