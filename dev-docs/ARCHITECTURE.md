# Architecture Guide

## Overview

Neeti AI is a real-time technical interview platform with a FastAPI backend, React frontend, and background workers for AI-driven evaluation.

## Runtime Topology

```text
Frontend (Vite/React, :5173)
    |
    | HTTP + WebSocket
    v
FastAPI API (:8000)
    |-- PostgreSQL (sessions, candidates, events, evaluations)
    |-- Redis (pub/sub, rate-limit counters, worker broker)
    |-- LiveKit (room + token orchestration)
    |-- Judge0 (code execution)
    |-- AI providers (OpenAI / Anthropic / Ollama)
    |
    v
Celery workers (agent_tasks, session_tasks)
```

## Backend Structure

```text
app/
  api/            # Route handlers by domain
  core/           # config, auth, db, logging, redis, events
  models/         # SQLAlchemy ORM models
  schemas/        # Pydantic request/response schemas
  services/       # Integrations and orchestration services
  agents/         # Specialized interview analysis agents
  workers/        # Celery app + async task entrypoints
```

## Frontend Structure

```text
frontend/src/
  pages/          # Route-level screens
  components/     # Reusable UI components
  lib/            # API client, websocket helpers, utilities
  store/          # Zustand auth/session state
```

## Request and Event Flows

### Auth flow

1. Frontend calls `POST /api/auth/login`.
2. Supabase access token is returned.
3. Frontend attaches `Authorization: Bearer <token>`.
4. Backend validates token and role on protected routes.

### Session flow

1. Recruiter creates session with `POST /api/sessions`.
2. Backend creates LiveKit room and persists session record.
3. Candidate joins with `POST /api/sessions/join`.
4. Both participants get room tokens for the interview room.

### Coding flow

1. Frontend posts coding events to `POST /api/coding-events`.
2. Execute requests go to `POST /api/coding-events/execute`.
3. Backend runs Judge0 (or fallback path), stores output, publishes realtime event.

### Evaluation flow

1. Recruiter triggers `POST /api/evaluations/{session_id}/trigger`.
2. Celery `agent_tasks` fan out analysis work.
3. Aggregated evaluation is persisted.
4. Report is retrieved by `GET /api/evaluations/{session_id}`.

## Security Model

- Supabase-managed authentication.
- Role checks in route dependencies (`recruiter`, `candidate`, `admin`).
- CORS allowlist configured via `CORS_ORIGINS`.
- API rate limiting backed by Redis where available.
- Code execution isolated via Judge0 service.

## Reliability Notes

- API startup is intentionally tolerant of DB/Redis outages; health can return `degraded`.
- If Redis is unavailable, rate limiting and pub/sub paths degrade gracefully.
- LiveKit room creation failure blocks session creation with `503`.

## Data Domains

Core entities:

- `users`
- `sessions`
- `candidates`
- `coding_events`
- `evaluations`
- agent outputs and realtime telemetry records

## Operational Ports (Local Defaults)

- Backend API: `8000`
- Frontend dev: `5173`
- Postgres: `5432`
- Redis: `6379`
- MinIO API: `9000`
- MinIO console: `9001`
- Ollama: `11434`

Last updated: 2026-04-07

 
