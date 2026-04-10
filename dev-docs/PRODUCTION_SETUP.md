# Production Setup Guide

This document covers production-oriented deployment and operations for Neeti AI.

## Deployment Model

Typical stack:

- API service (`app.main:app` via uvicorn/gunicorn)
- Worker services (`celery` queues)
- Redis
- PostgreSQL (local or managed; Supabase commonly used)
- Frontend static deployment (Vite build served by nginx or CDN)

## 1) Required Environment Variables

Minimum critical variables:

```env
ENVIRONMENT=production
DEBUG=False
HOST=0.0.0.0
PORT=8000
WORKERS=4

# Database (choose DATABASE_URL or discrete POSTGRES_*)
DATABASE_URL=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_HOST=
POSTGRES_PORT=5432
POSTGRES_DB=interview_platform

# Auth
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Realtime/cache
REDIS_HOST=
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# LiveKit
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_WS_URL=

# CORS
CORS_ORIGINS=https://your-frontend.example.com
```

## 2) Build and Start

Using compose baseline:

```powershell
docker compose up -d --build
```

Verify:

```powershell
docker compose ps
Invoke-WebRequest -UseBasicParsing http://localhost:8000/health
```

## 3) Database Initialization

```powershell
docker compose exec api python init_db.py
```

If managed Postgres is used externally, run the same migration/init step from a trusted runner with network access.

## 4) Health and Readiness

Use `/health` for service status:

- `healthy`: DB and Redis connected
- `degraded`: one or more dependencies unavailable

## 5) Logging and Observability

- Use structured app logs from backend.
- Persist container logs to centralized sink.
- Alert on:
  - sustained `5xx`
  - repeated `/health` degraded state
  - worker queue backlog growth

## 6) Security Checklist

- Enforce HTTPS at edge/load balancer.
- Restrict `CORS_ORIGINS` to known domains.
- Keep `.env` out of source control.
- Rotate Supabase and LiveKit secrets.
- Keep Judge0 isolated from public network if self-hosted.

## 7) Scaling

Horizontal scale candidates:

- API replicas behind reverse proxy.
- Celery workers by queue type (`agents`, `sessions`).

Example:

```powershell
docker compose up -d --scale worker_agents=3 --scale worker_sessions=2
```

## 8) Recovery Operations

- Restart affected services:

```powershell
docker compose restart api
```

- Rebuild after release:

```powershell
docker compose up -d --build
```

- Validate post-restart:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/health
```

Last updated: 2026-04-07

 
