# Executive Summary

## What Neeti AI Is

Neeti AI is a technical interview platform that combines live interview collaboration with AI-assisted evaluation. It is built for recruiter-led interview sessions with evidence capture from coding behavior, communication signals, and final scoring workflows.

## Core Value

- Reduce manual interview-note overhead.
- Provide consistent evaluation artifacts.
- Keep human hiring decision authority while surfacing machine-generated evidence.

## Product Pillars

1. Real-time interview room (video + coding).
2. Session lifecycle management for recruiters and candidates.
3. Event capture and replay-ready coding telemetry.
4. AI evaluation pipeline with triggerable processing and structured output.
5. Operational deployability with Docker and managed services.

## Current Technical Position

- Backend: FastAPI with async SQLAlchemy and Redis-backed patterns.
- Frontend: React 19 + TypeScript + Vite.
- Auth: Supabase token model with backend validation.
- Realtime: WebSocket and Redis publish/subscribe.
- Worker processing: Celery tasks for evaluation pipelines.

## Stakeholder Outcomes

### Recruiters
- Faster session setup and candidate monitoring.
- Structured post-session evaluation reports.
- Reduced reliance on ad-hoc note taking.

### Engineering Teams
- Clear API boundaries and schema-driven contracts.
- Containerized deployment options.
- Flexible AI/provider integration strategy.

### Operations
- Straightforward local and production bootstrap.
- Health endpoint visibility for dependency readiness.
- Degraded-mode behavior when dependencies are temporarily unavailable.

## Risks and Mitigations

- Dependency outages (DB/Redis/LiveKit): mitigated by health checks, degraded startup behavior, and explicit error responses.
- Auth/role misuse: mitigated by server-side role resolution and dependency checks.
- Execution abuse: mitigated by language allowlists, payload limits, and execution caps.

## Next Practical Priorities

1. Expand integration and load testing coverage for session and evaluation workflows.
2. Tighten production runbooks and alert thresholds.
3. Evolve evaluator calibration and explainability in reports.

Last updated: 2026-04-07

 
