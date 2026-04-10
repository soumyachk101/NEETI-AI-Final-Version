"""
Coding events API endpoints.
Track and execute code during interviews.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import CodingEvent, Session, Candidate
from app.schemas.schemas import CodingEventCreate, CodingEventResponse
from app.core.logging import logger
from app.core.events import publish_code_changed, publish_code_executed

router = APIRouter(prefix="/coding-events", tags=["Coding"])

# ── FIX #5: Execution safety constants ──
MAX_CODE_LENGTH = 51200  # 50 KB
MAX_EXECUTIONS_PER_SESSION = 100
ALLOWED_LANGUAGES = {
    "python", "javascript", "typescript", "java", "cpp", "c",
    "go", "rust", "ruby", "php", "swift", "kotlin", "scala",
    "csharp", "bash", "sql", "r", "perl", "haskell", "lua",
}

async def verify_session_participant(
    session_id: int,
    current_user: dict,
    db: AsyncSession
) -> Session:
    """Verify session exists and user is a participant (recruiter or candidate)."""
    result = await db.execute(
        select(Session).where(Session.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    if str(session.recruiter_id) == str(current_user["id"]):
        return session

    result = await db.execute(
        select(Candidate).where(
            and_(
                Candidate.session_id == session_id,
                Candidate.user_id == str(current_user["id"])
            )
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session"
        )

    return session

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_coding_event(
    event_data: CodingEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Create a coding event (keystroke, execution, etc.)"""
    
    await verify_session_participant(event_data.session_id, current_user, db)

    # FIX #5: Validate code length
    if event_data.code_snapshot and len(event_data.code_snapshot) > MAX_CODE_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Code snapshot exceeds maximum length of {MAX_CODE_LENGTH} bytes"
        )
    
    new_event = CodingEvent(
        session_id=event_data.session_id,
        event_type=event_data.event_type,
        code_snapshot=event_data.code_snapshot,
        language=event_data.language,
        execution_output=event_data.execution_output,
        execution_error=event_data.execution_error,
        meta_data=event_data.metadata or {}
    )
    
    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)
    
    logger.info(
        f"Coding event created: {new_event.event_type} "
        f"for session {event_data.session_id}"
    )
    
    if event_data.event_type == "execute":
        await publish_code_executed(
            session_id=event_data.session_id,
            data={
                "language": event_data.language,
                "code": event_data.code_snapshot,
                "output": event_data.execution_output,
                "error": event_data.execution_error
            }
        )
    else:
        await publish_code_changed(
            session_id=event_data.session_id,
            data={
                "language": event_data.language,
                "code": event_data.code_snapshot
            }
        )
    
    return {"success": True, "event_id": new_event.id}

@router.post("/execute")
async def execute_code(
    event_data: CodingEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Execute code in a sandbox using Judge0.
    Falls back to rule-based analysis if Judge0 not configured.
    """
    
    await verify_session_participant(event_data.session_id, current_user, db)

    # FIX #5: Validate code length
    if event_data.code_snapshot and len(event_data.code_snapshot) > MAX_CODE_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Code exceeds maximum length of {MAX_CODE_LENGTH} bytes"
        )

    # FIX #5: Validate language against whitelist
    lang = (event_data.language or "").lower().strip()
    if lang and lang not in ALLOWED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported language '{event_data.language}'. Supported: {', '.join(sorted(ALLOWED_LANGUAGES))}"
        )

    # FIX #5: Rate limit executions per session
    exec_count = await db.execute(
        select(func.count(CodingEvent.id)).where(
            and_(
                CodingEvent.session_id == event_data.session_id,
                CodingEvent.event_type == "execute"
            )
        )
    )
    if exec_count.scalar_one() >= MAX_EXECUTIONS_PER_SESSION:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Execution limit of {MAX_EXECUTIONS_PER_SESSION} per session reached"
        )
    
    from app.services.judge0_service import judge0_service
    
    execution_result = await judge0_service.execute_code(
        code=event_data.code_snapshot,
        language=event_data.language,
        stdin=event_data.metadata.get("stdin") if event_data.metadata else None
    )
    
    output = execution_result.get("output")
    error = execution_result.get("error")
    
    execution_event = CodingEvent(
        session_id=event_data.session_id,
        event_type="execute",
        code_snapshot=event_data.code_snapshot,
        language=event_data.language,
        execution_output=output,
        execution_error=error,
        meta_data={
            **(event_data.metadata or {}),
            "execution_time": execution_result.get("time"),
            "memory_used": execution_result.get("memory"),
            "status": execution_result.get("status")
        }
    )
    
    db.add(execution_event)
    await db.commit()
    
    await publish_code_executed(
        session_id=event_data.session_id,
        data={
            "language": event_data.language,
            "code": event_data.code_snapshot,
            "output": output,
            "error": error,
            "status": execution_result.get("status")
        }
    )
    
    return {
        "success": execution_result.get("success", False),
        "output": output,
        "error": error,
        "time": execution_result.get("time"),
        "memory": execution_result.get("memory"),
        "status": execution_result.get("status")
    }

# FIX #13: Add pagination
@router.get("/{session_id}")
async def get_coding_events(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    limit: int = Query(default=200, le=500, ge=1),
    offset: int = Query(default=0, ge=0),
) -> List[CodingEventResponse]:
    """Get coding events for a session (paginated, max 500 per page)."""
    
    await verify_session_participant(session_id, current_user, db)
    
    result = await db.execute(
        select(CodingEvent)
        .where(CodingEvent.session_id == session_id)
        .order_by(CodingEvent.timestamp)
        .limit(limit)
        .offset(offset)
    )
    events = result.scalars().all()
    
    return events

# Synced for GitHub timestamp

 
