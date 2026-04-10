# API Reference

Base URL (local): `http://localhost:8000`

All API routes are mounted under `/api` except root/health/info.

## Platform Endpoints

### GET /
Returns app identity and operational status.

### GET /health
Returns service health and dependency connectivity.

### GET /api/info
Returns API metadata and key endpoint paths.

## Authentication (`/api/auth`)

Supabase-backed auth endpoints.

### POST /api/auth/register
Register user.

Request:
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!",
  "full_name": "Jane Doe",
  "role": "recruiter"
}
```

Response: `201 Created` (`UserResponse`)

### POST /api/auth/login
Login with email/password.

Request:
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!"
}
```

Response: `200 OK` (`TokenResponse`)

### POST /api/auth/refresh
Refresh access token.

Request body is a raw string refresh token.

Response: `200 OK` (`TokenResponse`)

### GET /api/auth/me
Get current authenticated user.

Header:
- `Authorization: Bearer <access_token>`

Response: `200 OK` (`UserResponse`)

### POST /api/auth/logout
Logs out current user (server-side acknowledgement).

Response: `200 OK`

## Sessions (`/api/sessions`)

### POST /api/sessions
Recruiter-only: create interview session.

Request:
```json
{
  "title": "Backend interview",
  "description": "Async Python and system design",
  "scheduled_at": "2026-04-08T13:00:00Z",
  "metadata": {
    "difficulty": "senior"
  }
}
```

Response: `201 Created` (`SessionResponse`)

### GET /api/sessions
List sessions for current user.

Query params:
- `status_filter` optional (`scheduled|live|completed|cancelled`)
- `limit` default `50`, max `200`
- `offset` default `0`

Response: `200 OK` (`SessionResponse[]`)

### GET /api/sessions/{session_id}
Get one session if caller is participant/recruiter.

### PATCH /api/sessions/{session_id}
Recruiter-only partial update (`SessionUpdate`).

### POST /api/sessions/join
Join by session code.

Request:
```json
{
  "session_code": "ABC123",
  "full_name": "Candidate One",
  "email": "candidate@example.com"
}
```

Response: `200 OK` (`SessionJoinResponse`)

### GET /api/sessions/{session_id}/token
Get LiveKit room token for recruiter/candidate participant.

Response: `200 OK` (`RoomTokenResponse`)

### POST /api/sessions/{session_id}/start
Recruiter-only: set session live.

### POST /api/sessions/{session_id}/end
Recruiter-only: end session.

### GET /api/sessions/{session_id}/candidates
Recruiter-only: list enrolled candidates.

## Coding Events (`/api/coding-events`)

### POST /api/coding-events
Create coding event (keystroke, paste, execute metadata).

Request (`CodingEventCreate`):
```json
{
  "session_id": 12,
  "event_type": "change",
  "code_snapshot": "print('hello')",
  "language": "python",
  "metadata": {}
}
```

Response: `201 Created`

### POST /api/coding-events/execute
Execute code via Judge0 or fallback.

Key guardrails:
- max code length: 50KB
- language allowlist enforcement
- max 100 executions per session

### GET /api/coding-events/{session_id}
Get coding history for session.

Query params:
- `limit` default `200`, max `500`
- `offset` default `0`

Response: `200 OK` (`CodingEventResponse[]`)

## Evaluations (`/api/evaluations`)

### GET /api/evaluations/{session_id}
Get final evaluation for session.

### POST /api/evaluations/{session_id}/trigger
Recruiter-only: enqueue AI evaluation pipeline.

Returns:
```json
{
  "status": "processing",
  "session_id": 12
}
```

## Speech (`/api/speech`)

- `POST /api/speech/transcribe`
- `POST /api/speech/analyze`
- `GET /api/speech/status`

## WebSocket

WebSocket routes are exposed under `/api` router namespace in `websocket.py`.
Use frontend websocket helpers from `frontend/src/lib/websocket.ts` for canonical event handling.

## Error Codes

Common statuses:
- `400` bad request
- `401` unauthenticated
- `403` unauthorized
- `404` not found
- `409` conflict (e.g., evaluation already exists)
- `413` payload too large
- `429` rate limited
- `500` internal server error
- `503` upstream dependency unavailable

## Local Testing

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/health
Invoke-WebRequest -UseBasicParsing http://localhost:8000/api/info
```

If browser shows CORS `status: null`, verify API reachability before CORS debugging.

Last updated: 2026-04-07

 
