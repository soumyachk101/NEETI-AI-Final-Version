# Neeti AI — Full Codebase Audit Report

**Date:** 2026-04-10
**Auditor:** Automated multi-agent analysis
**Scope:** Backend (Python/FastAPI), Frontend (React/TypeScript), Infrastructure, Testing

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Issues](#critical-issues)
3. [Major Issues](#major-issues)
4. [Minor Issues](#minor-issues)
5. [Security Audit](#security-audit)
6. [Architecture & Design Issues](#architecture--design-issues)
7. [Testing & CI/CD](#testing--cicd)
8. [Infrastructure & Deployment](#infrastructure--deployment)
9. [Frontend Issues](#frontend-issues)
10. [Priority Fix Roadmap](#priority-fix-roadmap)

---

## Executive Summary

| Area | Rating | Key Finding |
|------|--------|-------------|
| **Security** | 5/10 | Auth role bypass via `user_metadata`, info leakage in errors, WebSocket rate limit bypass |
| **Architecture** | 6/10 | Good layering but dual-auth and dual-DB paths undermine consistency |
| **Backend Code** | 6/10 | Race conditions, sync-in-async blocking, hardcoded values |
| **Frontend Code** | 6/10 | Phantom routes, silent error swallowing, non-functional buttons, auth state leaks |
| **Testing** | 3/10 | Entire test suite is broken (missing `AuthService`), zero coverage for agents/workers/services |
| **Infrastructure** | 5/10 | No CI/CD, no `.dockerignore`, no migration state tracking, outdated dependencies |
| **API Design** | 7/10 | REST conventions mostly followed, good use of status codes |
| **Models/Schemas** | 7/10 | Well-indexed, naming inconsistencies (`meta_data`/`metadata`) |

**Total Issues Found: 80+**
- Critical: 16
- Major: 34
- Minor: 30+

---

## Critical Issues

### CRIT-1: Dual Authentication Systems with Privilege Escalation Risk
**Files:** `app/core/auth.py`, `app/core/supabase_auth.py`, `app/api/websocket.py`

Two separate authentication modules exist:
- `app/core/auth.py` — uses `SUPABASE_SERVICE_ROLE_KEY`, resolves role from `app_metadata` (server-controlled)
- `app/core/supabase_auth.py` — uses `SUPABASE_ANON_KEY`, resolves role from `user_metadata` (client-controlled)

Different API files import from different sources. Since `user_metadata` is client-set at signup, a user can register with `role: "recruiter"` in metadata and gain recruiter access through any endpoint using the weaker auth path. WebSocket auth at `app/api/websocket.py:42` has the same vulnerability.

**Impact:** Privilege escalation — any user can gain recruiter access.

---

### CRIT-2: WebSocket Creates New Supabase Client Per Connection
**File:** `app/api/websocket.py:30-33`

A fresh Supabase client is instantiated on every WebSocket connection. Under load, this exhausts connection pool limits and causes memory exhaustion. The singleton pattern from `core/auth.py` is not used.

---

### CRIT-3: Race Condition in Speech Service — Shared Temp File
**File:** `app/services/speech_service.py:79-80`

```python
temp_path = Path("/tmp/temp_audio.wav")
temp_path.write_bytes(audio_file)
```

All concurrent transcription requests write to the same file. Request A's audio gets overwritten by Request B before Whisper processes it. This causes data corruption under any concurrent load. Use `tempfile.NamedTemporaryFile()` instead.

---

### CRIT-4: Entire Test Suite is Broken
**Files:** `tests/conftest.py:17`, `tests/test_auth.py`, `tests/test_database.py`, `tests/test_sessions.py`, `tests/test_integration.py`

All tests import `from app.core.auth import AuthService`, but no `AuthService` class exists in `app/core/auth.py`. Every test will raise `ImportError` immediately. The entire test suite cannot run.

Additionally, test fixtures create records in the `User` model which is explicitly marked `DEPRECATED` in `app/models/models.py:60`. Tests validate a completely different auth path than what production uses.

---

### CRIT-5: No CI/CD Pipeline Exists
**Repository-wide**

No `.github/workflows/`, `.travis.yml`, `gitlab-ci.yml`, or any CI/CD configuration exists. There are zero automated checks on PRs or pushes, meaning:
- Broken imports (like the `AuthService` issue) are never caught
- No automated test runs
- No linting/formatting enforcement
- No security scanning
- No Docker build validation

---

### CRIT-6: No Migration State Tracking — Errors Silently Swallowed
**File:** `init_db.py:32-40`

The custom migration system applies `.sql` files in alphabetical order with all errors silently caught:
```python
except Exception as e:
    logger.warning(f"Migration {migration_file.name} skipped: {e}")
```
There is no migration state table, no idempotency guarantees, no rollback mechanism. Alembic is in `requirements.txt` but is never used. Migration `001` contains `TRUNCATE TABLE sessions CASCADE` which would delete all production data if re-run.

---

### CRIT-7: Unbounded Reconnect Loop in Frontend WebSocket
**File:** `frontend/src/lib/websocket.ts:40-48`

The `useWebSocket` hook reconnects unconditionally on every `onclose` event with a flat 3-second delay. No maximum attempt counter, no exponential backoff, no user-visible "connection failed" state. If the server is down, the tab reconnects forever.

---

### CRIT-8: Silent Error Swallowing in Critical UI Flows
**Files:** `frontend/src/pages/SessionDetail.tsx:33,36`, `frontend/src/pages/SessionJoin.tsx:28`

Three `catch {}` blocks with completely empty bodies. If `startSession`, `endSession`, or `joinSession` fails, the UI gives no feedback. Users have no way to know what went wrong.

---

### CRIT-9: Non-Functional Stub Buttons in Production UI
**Files:** `frontend/src/pages/SessionResults.tsx:129`, `frontend/src/pages/EvaluationReport.tsx:157-158`

"Download PDF" button has `onClick={() => console.log('Download PDF')}`. "Authorize Hire" button has no `onClick` at all. These are primary action buttons visible in production.

---

### CRIT-10: Phantom Legal Routes Mislead Users
**File:** `frontend/src/App.tsx:125-127`

`/privacy`, `/terms`, and `/cookies` all render the `<About />` page. Users clicking legal links from the Footer get the About page instead. No Privacy Policy, Terms of Service, or Cookie Policy content exists.

---

### CRIT-11: Auth Store Leaks Sensitive Data via localStorage
**File:** `frontend/src/store/useAuthStore.ts:184-189`

Zustand `persist` middleware stores `user` (including `role`) in `localStorage`. `ProtectedRoute` and `RecruiterRoute` read from this persisted store to gate routes. The Supabase validation in `fetchCurrentUser` is async and not awaited before routes render — stale localStorage values drive route guards on first render.

---

### CRIT-12: `asyncio.run()` Inside Celery Tasks
**File:** `app/workers/agent_tasks.py:52,87,122,157,207`

Every Celery task wraps an async function and calls `asyncio.run()`. If the worker pool uses gevent/eventlet, this raises `RuntimeError`. Each call creates and tears down an event loop and a fresh SQLAlchemy connection pool, which is very inefficient.

---

### CRIT-13: `database.py` NullPool + pool_size Incompatibility
**File:** `app/core/database.py:53-61`

```python
poolclass=NullPool if settings.ENVIRONMENT == "test" else None,
pool_size=10,
max_overflow=20,
```

`NullPool` does not accept `pool_size` or `max_overflow`. In test mode, SQLAlchemy raises `TypeError` at startup. The test environment cannot initialize.

---

### CRIT-14: Nixpacks Hardcoded Port Breaks Railway
**File:** `nixpacks.toml:8`

```
cmd = "uvicorn app.main:app --host 0.0.0.0 --port 8000"
```

Railway injects a dynamic `$PORT` variable. The hardcoded `8000` causes the app to bind to the wrong port and fail health checks.

---

### CRIT-15: `python-jose` Has Known CVE (Unmaintained)
**File:** `requirements.txt`

`python-jose[cryptography]==3.3.0` has CVE-2024-33664 (algorithm confusion). Last released 2022, effectively unmaintained.

---

### CRIT-16: Docker Workers Start Without Healthcheck Dependencies
**File:** `docker-compose.yml:80-124`

Workers use `depends_on: - postgres / - redis` (bare form) rather than `condition: service_healthy`. Celery workers can start before Postgres/Redis are ready and crash.

---

## Major Issues

### Backend Major Issues

| # | Issue | File:Line | Description |
|---|-------|-----------|-------------|
| 1 | Sync boto3 in async context | `services/storage_service.py:83-87` | All S3 operations block the event loop. Use `aiobotocore` or `run_in_executor`. |
| 2 | Sync Supabase in async methods | `core/supabase_auth.py:74,150,181` | All auth calls are synchronous blocking inside `async def` methods. |
| 3 | LiveKit RoomService created per call | `services/livekit_service.py:86,111` | New instance per call, no API URL passed. Should be a persistent singleton. |
| 4 | Infinite loop in session code generation | `api/sessions.py:45-51` | No `max_attempts` guard. Can hang forever if code space is exhausted. |
| 5 | No idempotency guards on agent tasks | `workers/agent_tasks.py:30-42` | Duplicate `AgentOutput` rows accumulate on retries or double-triggers. |
| 6 | Hardcoded binary recommendation | `workers/agent_tasks.py:191-192` | "maybe" tier from `EvaluationAgent` is discarded; only "hire"/"no_hire" is used. |
| 7 | Double-triggering agent pipeline | `api/sessions.py:436` + `session_tasks.py:10-18` | `handle_session_ended` just delegates to `trigger_all_agents` — pointless indirection. |
| 8 | Redis pubsub accessed incorrectly | `services/realtime_service.py:121,134` | `redis_client.pubsub()` should be `redis_client.client.pubsub()`. |
| 9 | cv2 blocks event loop | `services/vision_service.py:221` | `VideoCapture` read loop is synchronous, blocks for minutes on long videos. |
| 10 | `created_at` can be None | `api/supabase_auth.py:44` | `UserResponse.created_at` is `datetime` (non-optional). Pydantic will raise 422. |
| 11 | `DEMO_MODE` config is dead code | `app/core/config.py:137` | Flag exists but no code checks it. Misleading configuration. |
| 12 | `cleanup_old_sessions` never runs | `workers/session_tasks.py:21-50` | Task defined but no `beat_schedule` configured. Never executes. |
| 13 | Metadata field name mismatch | `schemas.py:43` vs `models.py` | `metadata` (Pydantic) vs `meta_data` (ORM). Fragile manual mapping. |

### Frontend Major Issues

| # | Issue | File:Line | Description |
|---|-------|-----------|-------------|
| 1 | User ID type mismatch | `lib/api.ts:79` vs `store/useAuthStore.ts:7` | API uses `id: number`, auth store uses `id: string`. Never reconciled. |
| 2 | Dead auth API layer | `lib/api.ts:86-106` | `authApi` functions exist but are never imported or used anywhere. |
| 3 | Dashboard has no loading/error state | `pages/Dashboard.tsx:53-58` | Empty list shown until data arrives. No spinner, no error message. |
| 4 | SessionMonitor has no error state | `pages/SessionMonitor.tsx:61` | Permanently blank loading message if API fails. |
| 5 | `isRecruiter` not used for UI differentiation | `pages/InterviewRoom.tsx:18` | Same UI for both roles — no candidate vs recruiter distinction. |
| 6 | Index-based keys on dynamic lists | Multiple files | `key={i}` on filtered/reordered lists causes React reconciliation issues. |
| 7 | SessionResults hardcodes data | `pages/SessionResults.tsx:204-209` | Static strings for duration, difficulty, status regardless of actual data. |
| 8 | WebSocket connects without auth token | `lib/websocket.ts:20,93` | Raw `new WebSocket(url)` with no authentication. Backend WS endpoints appear unauthenticated. |
| 9 | `any` types defeat TypeScript | `components/ui/tech-orbit.tsx:97`, `lib/websocket.ts:8,86` | Multiple critical props typed as `any`. |
| 10 | Mixed loading strategies | `pages/SessionResults.tsx:70-93` | Session uses global store, evaluation uses local state. Inconsistent. |
| 11 | Dead `DemoOne.tsx` page | `pages/DemoOne.tsx` | Not routed, not imported. Heavy Three.js dependency included in bundle. |
| 12 | `onAuthStateChange` never unsubscribed | `store/useAuthStore.ts:195-199` | Leaks new listener on every HMR reload in development. |

### Infrastructure Major Issues

| # | Issue | File:Line | Description |
|---|-------|-----------|-------------|
| 1 | No `.dockerignore` | Root | `frontend/node_modules/`, `.git/` included in build context. Bloated images. |
| 2 | Render missing worker services | `render.yaml` | Only `web` service defined. Celery workers never start on Render. |
| 3 | Hardcoded test credentials | `tests/conftest.py:19` | DB URL with password committed to version control. |
| 4 | Severely outdated dependencies | `requirements.txt` | `openai==1.3.7` (current 1.75+), `anthropic==0.7.7` (current 0.49+). |
| 5 | `httpx` listed twice | `requirements.txt:12,31` | Duplicate dependency entry. |
| 6 | `passlib` + `bcrypt` incompatibility | `requirements.txt` | Known deprecation warning spam at startup. |

---

## Minor Issues

### Backend Minor Issues

| # | Issue | File:Line |
|---|-------|-----------|
| 1 | `datetime.utcnow()` deprecated (Python 3.12+) | Multiple files |
| 2 | `app/__init__.py` version 1.0.0 vs `config.py` 2.1.0 | Version mismatch |
| 3 | `logging.py` timestamp not timezone-aware | `core/logging.py:19` |
| 4 | Unused `db: AsyncSession` on auth routes | `api/supabase_auth.py:22,63,104` |
| 5 | Redis listener task leak (no cancellation) | `services/realtime_service.py:180-190` |
| 6 | `_calculate_confidence` always returns 0.85 | `services/speech_service.py:124-131` |
| 7 | Vision fallback returns fabricated positive metrics | `services/vision_service.py:170-184` |
| 8 | `judge0_service.py` 1-second sleep before first poll | `services/judge0_service.py:159` |
| 9 | `execution_time_ms` never populated | `api/coding_events.py:175-188` |
| 10 | Duplicate Celery validator logic | `core/config.py:58-90` |
| 11 | No `HEALTHCHECK` in Dockerfile | `Dockerfile` |
| 12 | Redis has no password in dev | `docker-compose.yml:19-27` |
| 13 | Chord uses `si()` discarding task results | `workers/agent_tasks.py:221-229` |

### Frontend Minor Issues

| # | Issue | File:Line |
|---|-------|-----------|
| 1 | `"use client"` directives (Next.js-specific) | `splite.tsx:1`, `liquid-glass-button.tsx:1` |
| 2 | Tailwind color system duplication | `tailwind.config.js` |
| 3 | `AnimatedNumber` missing React import | `components/AnimatedNumber.tsx:13` |
| 4 | Unused stagger animation CSS classes | `index.css:381-388` |
| 5 | Unused strength-meter CSS classes | `index.css:344-356` |
| 6 | Accordion accessibility (no `aria-hidden`) | `FAQ.tsx:142-148`, `Troubleshooting.tsx:267-270` |
| 7 | `willChange` set permanently | `components/ScrollReveal.tsx:90` |
| 8 | SVG filter ID collisions | `components/Logo.tsx:51-62` |
| 9 | `set` variable shadows Zustand convention | `pages/Register.tsx:77` |
| 10 | `useTypewriter` interval leak on unmount | `pages/Landing.tsx:87-105` |
| 11 | `TechnicalBlueprint` unused component | `components/TechnicalBlueprint.tsx` |
| 12 | `FlickeringGrid` rAF runs on every page | `components/ui/flickering-grid.tsx` |
| 13 | ErrorBoundary uses full page reload | `App.tsx:62` |
| 14 | Duplicate `/join` routes | `App.tsx` |

---

## Security Audit

| # | Severity | Issue | File:Line |
|---|----------|-------|-----------|
| 1 | **Critical** | Auth role bypass via `user_metadata` | `core/supabase_auth.py`, `api/websocket.py:42` |
| 2 | **Critical** | WebSocket rate limit bypass | `main.py:75` — all `/ws/*` paths exempt |
| 3 | **Major** | Error messages leak internal exceptions | `core/supabase_auth.py:138,172,239`, `api/supabase_auth.py:57,95,130` |
| 4 | **Major** | No audio file size/type validation | `api/speech.py:61-67` — unlimited upload, no MIME check |
| 5 | **Major** | `join_session` ignores authenticated identity | `api/sessions.py:141` — uses request body email, not token email |
| 6 | **Major** | Sign-out doesn't invalidate JWT | `core/supabase_auth.py:174-184` — token remains valid until expiry |
| 7 | **Major** | `broadcast_coding_event` is a silent no-op | `services/realtime_service.py:86-91` — returns `True` without writing |
| 8 | **Minor** | Redis unauthenticated in Docker | `docker-compose.yml` — no `requirepass` |
| 9 | **Minor** | Default MinIO credentials in `.env.example` | `.env.example:47-48` — `minioadmin/minioadmin` |
| 10 | **Minor** | Supabase service role key mutation on shared client | `services/supabase_service.py:46-47` |

---

## Architecture & Design Issues

| # | Issue | Description |
|---|-------|-------------|
| 1 | **Dual database paths** | SQLAlchemy ORM + Supabase REST client write to same tables with no transaction coordination |
| 2 | **In-memory WebSocket manager** | `ConnectionManager` is per-process. With 4 uvicorn workers, messages silently drop between processes |
| 3 | **`AgentOutput` name collision** | Both Pydantic (`agents/base.py:21`) and SQLAlchemy (`models/models.py:214`) classes share the same name |
| 4 | **LiveKit credentials default to empty string** | `config.py:99-101` — `Optional[str] = None` with startup validation would be safer |
| 5 | **`calculate_score` normalization** | `agents/base.py:108-130` — works when weights sum to 1.0, but not robust for other weight distributions |

---

## Testing & CI/CD

### Test Coverage Gaps (Zero Coverage)

The following modules have **no tests at all**:
- `app/api/websocket.py`
- `app/api/speech.py`
- `app/api/coding_events.py`
- `app/api/evaluations.py`
- `app/workers/agent_tasks.py` (all 5 task functions)
- `app/workers/session_tasks.py`
- `app/services/` (all 8 service modules)
- `app/agents/` (all 5 agents)

### Test Quality Issues

| # | Issue | File:Line |
|---|-------|-----------|
| 1 | All tests import non-existent `AuthService` | `conftest.py:17` and all test files |
| 2 | Fixtures use deprecated `User` model | `conftest.py:75-130` |
| 3 | `--disable-warnings` hides deprecation signals | `pytest.ini:7` |
| 4 | Security header test too weak | `test_system.py:191-196` — only checks absence of 2 headers |
| 5 | Rate limiting test doesn't test rate limiting | `test_system.py:199-204` — only checks `content-type` |
| 6 | Refresh token in query string (security anti-pattern) | `test_auth.py:131-138` |

---

## Infrastructure & Deployment

### Docker

| # | Issue | File:Line |
|---|-------|-----------|
| 1 | No `.dockerignore` — bloated build context | Root |
| 2 | No `HEALTHCHECK` in Dockerfile | `Dockerfile` |
| 3 | User created after files copied | `Dockerfile:22` |
| 4 | `minio/minio:latest` and `ollama/ollama:latest` tags | `docker-compose.yml:167,178` |
| 5 | No resource limits on any service | `docker-compose.yml` |
| 6 | API CMD doesn't apply `WORKERS` env var | `Dockerfile:27` |

### Deployment Configs

| # | Issue | File:Line |
|---|-------|-----------|
| 1 | Railway hardcoded port breaks deployment | `nixpacks.toml:8` |
| 2 | Render free plan insufficient for production | `render.yaml:6` |
| 3 | Render has no worker/beat services | `render.yaml` |
| 4 | Procfile missing worker/beat processes | `Procfile` |
| 5 | Railway restart without cooldown | `railway.toml` |

### Root-Level Scripts

| # | Issue | File:Line |
|---|-------|-----------|
| 1 | `reset_all.py` — `delete_all_auth_users` prints instructions, does nothing | Function is a stub |
| 2 | `cleanup_database.py` — sequences out of sync with models | References `evaluation_reports_id_seq` which doesn't exist |
| 3 | `init_db.py` — f-string SQL in `cleanup_database.py:55-61` | Bad pattern, could become dangerous if table list becomes dynamic |

---

## Frontend Issues

### Performance Concerns

1. **Landing page is extremely heavy** — stacks Spline 3D scene, Three.js WebGL shader, framer-motion scroll animations, TechOrbit rAF loop, ambient-orb CSS blur, and TypewriterText. None are lazously loaded.
2. **`FlickeringGrid` runs requestAnimationFrame on every page** via Footer component.
3. **`ScrollReveal` sets `willChange` permanently** — GPU layers never released.
4. **Dead files in bundle**: `DemoOne.tsx` (Three.js dependency), `TechnicalBlueprint.tsx`.

### State Management

1. **Auth state rehydrates before Supabase validation** — stale localStorage drives route guards on first render.
2. **Session state lost on refresh** — `useSessionStore` doesn't use `persist`, so browser refresh during interview forces re-join.
3. **`onAuthStateChange` listener leaked** in development (HMR).

### UI/UX

1. **Login page has duplicate "Sign up" links** with inconsistent copy (`Login.tsx:193-200` and `205-212`).
2. **No loading skeletons** anywhere — Dashboard, SessionMonitor, SessionDetail show nothing while fetching.
3. **Footer legal links all go to About page** — `/privacy`, `/terms`, `/cookies` render `<About />`.

---

## Priority Fix Roadmap

### Phase 1 — Security & Data Integrity (Do First)

| Priority | Issue | Action |
|----------|-------|--------|
| P0 | Auth role bypass (CRIT-1) | Unify to use `app_metadata` role everywhere. Remove `supabase_auth.py` weaker auth path. |
| P0 | Speech temp file race condition (CRIT-3) | Use `tempfile.NamedTemporaryFile()` for audio processing. |
| P0 | Sign-out doesn't invalidate JWT (SEC-6) | Implement proper server-side token revocation. |
| P0 | WebSocket auth bypass (CRIT-2) | Use singleton Supabase client, validate tokens server-side. |
| P0 | Audio upload has no validation (SEC-4) | Add MIME type allowlist and max file size (e.g., 50MB). |

### Phase 2 — Testing & CI (Do Soon)

| Priority | Issue | Action |
|----------|-------|--------|
| P1 | Test suite completely broken (CRIT-4) | Fix `AuthService` import, update fixtures to match current auth system. |
| P1 | No CI/CD (CRIT-5) | Set up GitHub Actions with lint, test, security scan, Docker build. |
| P1 | Zero coverage for agents/workers/services | Write integration tests for agent pipeline and Celery tasks. |
| P1 | NullPool crash in test mode (CRIT-13) | Conditionally apply `pool_size`/`max_overflow` only when not using `NullPool`. |

### Phase 3 — Architecture Refactoring

| Priority | Issue | Action |
|----------|-------|--------|
| P2 | Dual database paths (ARCH-1) | Migrate to single ORM path or single Supabase REST path. |
| P2 | In-memory WebSocket manager (ARCH-2) | Wire Redis pub/sub for multi-worker broadcasting. |
| P2 | Sync-in-async calls (MAJ-1, MAJ-2) | Use `aiobotocore` and Supabase `AsyncClient` or `run_in_executor`. |
| P2 | Migration system (CRIT-6) | Adopt Alembic properly with version tracking and rollback support. |

### Phase 4 — Frontend Fixes

| Priority | Issue | Action |
|----------|-------|--------|
| P2 | Phantom legal routes (C1) | Create actual Privacy, Terms, Cookies pages or redirect to external URLs. |
| P2 | Non-functional buttons (C4) | Implement PDF download and authorize hire functionality. |
| P2 | Silent error handling (C3) | Add try/catch with user-facing toast notifications. |
| P2 | Auth state race condition (C6/C5) | Add loading gate that blocks route rendering until Supabase validation completes. |
| P3 | Loading states missing (M3/M4) | Add skeleton/spinner to Dashboard, SessionMonitor, SessionDetail. |
| P3 | TypeScript `any` types (M12-M15) | Define proper interfaces for WebSocket messages, metrics, props. |

### Phase 5 — Cleanup & Polish

| Priority | Issue | Action |
|----------|-------|--------|
| P3 | Outdated dependencies | Update `openai`, `anthropic`, `livekit`, `python-jose` (or remove if unused). |
| P3 | Dead code removal | Remove `DemoOne.tsx`, `TechnicalBlueprint.tsx`, `authApi` in `api.ts`, unused CSS classes. |
| P3 | Docker improvements | Add `.dockerignore`, `HEALTHCHECK`, pin image versions, add resource limits. |
| P3 | Deployment configs | Fix Railway `$PORT`, add worker services to Render, complete Procfile. |
| P3 | `datetime.utcnow()` migration | Replace with `datetime.now(timezone.utc)` everywhere. |
| P3 | Version consistency | Unify `__version__` in `app/__init__.py` and `config.py`. |

---

## Files Not Changed

This is a **documentation-only audit**. No code changes were made. All issues listed above reference existing files and line numbers for the development team to address.

---

*Generated by automated multi-agent codebase analysis on 2026-04-10.*

 
