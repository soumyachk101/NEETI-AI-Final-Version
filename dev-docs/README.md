# Neeti AI Developer Docs

This folder contains the source-of-truth technical documentation for building, running, and deploying Neeti AI.

## Start Here

1. Read [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md) for platform goals and scope.
2. Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design.
3. Follow [DEVELOPMENT.md](DEVELOPMENT.md) to run locally.
4. Use [API_REFERENCE.md](API_REFERENCE.md) when integrating endpoints.
5. Use [END_TO_END_SETUP.md](END_TO_END_SETUP.md) for a guided 15-minute setup.
6. Use [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) and [SUPABASE_DEPLOYMENT.md](SUPABASE_DEPLOYMENT.md) for deployment.

## Document Map

| File | Purpose | Audience |
|---|---|---|
| [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md) | Product and business overview | Product, leadership, architects |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Runtime architecture and component boundaries | Backend, frontend, platform engineers |
| [API_REFERENCE.md](API_REFERENCE.md) | Endpoint contracts and examples | API consumers, frontend engineers |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Local setup and daily workflow | Contributors |
| [END_TO_END_SETUP.md](END_TO_END_SETUP.md) | Guided first-time bootstrap | New team members |
| [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) | Deployment and operations checklist | DevOps/SRE |
| [SUPABASE_DEPLOYMENT.md](SUPABASE_DEPLOYMENT.md) | Supabase-specific setup and hardening | Backend/DevOps |

## Quick Facts

- Backend: FastAPI + SQLAlchemy async + Celery + Redis
- Frontend: React 19 + TypeScript + Vite + Zustand
- Auth: Supabase Auth tokens validated by backend
- Realtime: WebSocket + Redis pub/sub
- Code execution: Judge0 service with fallback strategy

## Common Local Pitfall

If the browser shows:

- `CORS request did not succeed`
- `Status code: (null)`

it usually means the API process is unreachable, not that CORS headers are wrong.

Validate in this order:

1. `curl http://localhost:8000/health` (or PowerShell `Invoke-WebRequest`)
2. Check port listener on `8000`
3. Confirm backend startup logs for DB or Redis failures
4. Then inspect CORS origins

## Maintenance Policy

When behavior changes, update docs in this order:

1. [API_REFERENCE.md](API_REFERENCE.md)
2. [DEVELOPMENT.md](DEVELOPMENT.md)
3. [END_TO_END_SETUP.md](END_TO_END_SETUP.md)
4. Architecture and summary docs

Last updated: 2026-04-07

 
