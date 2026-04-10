# Supabase Deployment Guide

This guide focuses on Supabase-specific configuration for authentication and database connectivity.

## 1) Supabase Project Setup

1. Create a Supabase project.
2. Collect:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Confirm Auth providers and email settings are configured for your environment.

## 2) Environment Configuration

Set these in production runtime:

```env
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon>
SUPABASE_SERVICE_ROLE_KEY=<service_role>
USE_SUPABASE=True
```

For DB connectivity, either:

- set `DATABASE_URL` (preferred), or
- set `POSTGRES_*` values.

## 3) Database Connectivity Notes

- Use a direct Postgres connection compatible with asyncpg.
- If your connection string starts with `postgres://` or `postgresql://`, backend normalizes it to `postgresql+asyncpg://`.

## 4) Schema Initialization

```powershell
python init_db.py
```

Optional SQL scripts in `migrations/` can be applied manually as needed.

## 5) Auth and Role Handling

- User login and token lifecycle are Supabase-backed.
- Backend resolves user role defensively and applies role checks per endpoint.
- Protected endpoints require `Authorization: Bearer <token>`.

## 6) CORS and Frontend Integration

Set backend allowlist explicitly:

```env
CORS_ORIGINS=https://app.yourdomain.com
```

For local development include local origins:

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:8000
```

## 7) Operational Checks

Validate quickly:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/health
Invoke-WebRequest -UseBasicParsing http://localhost:8000/api/info
```

Auth check path:

1. `POST /api/auth/login`
2. call `GET /api/auth/me` with access token

## 8) Security Recommendations

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend.
- Keep anon key in frontend only where required.
- Rotate credentials periodically.
- Audit auth-related logs for repeated unauthorized access patterns.

Last updated: 2026-04-07

 
