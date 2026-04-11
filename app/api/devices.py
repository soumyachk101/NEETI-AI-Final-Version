"""
Peripheral Device Tracking API endpoints.
Track and monitor device usage during interview sessions.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db, AsyncSessionLocal
from app.core.auth import get_current_user, get_current_recruiter
from app.models.models import Session, Candidate, PeripheralDevice, DeviceType, DeviceStatus
from app.schemas.schemas import (
    PeripheralDeviceCreate, PeripheralDeviceUpdate, PeripheralDeviceResponse,
    DeviceEventCreate, DeviceEventResponse, DeviceMetricsResponse
)
from app.services.device_tracking_service import device_tracking_service
from app.core.events import publish_code_changed
from app.core.logging import logger

router = APIRouter(prefix="/devices", tags=["Device Tracking"])

async def verify_session_participant(
    session_id: int,
    current_user: dict,
    db: AsyncSession
) -> Session:
    """Verify session exists and user is a participant."""
    result = await db.execute(
        select(Session).where(Session.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Check if recruiter
    if str(session.recruiter_id) == str(current_user["id"]):
        return session

    # Check if candidate
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

@router.post("/register", response_model=PeripheralDeviceResponse, status_code=status.HTTP_201_CREATED)
async def register_device(
    device_data: PeripheralDeviceCreate,
    session_id: int = Query(..., description="Session ID"),
    candidate_id: Optional[int] = Query(None, description="Candidate ID (optional)"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> PeripheralDeviceResponse:
    """Register a new peripheral device for a session."""
    
    await verify_session_participant(session_id, current_user, db)
    
    try:
        device = await device_tracking_service.register_device(
            session_id=session_id,
            device_data=device_data,
            candidate_id=candidate_id
        )
        
        # Publish device registration event
        await publish_code_changed(
            session_id=session_id,
            data={
                "event": "device_registered",
                "device_id": device.device_id,
                "device_type": device.device_type.value,
                "device_name": device.device_name
            }
        )
        
        logger.info(f"Device registered: {device.device_id} for session {session_id}")
        return device
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Device registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register device"
        )

@router.patch("/{device_id}/status", response_model=PeripheralDeviceResponse)
async def update_device_status(
    device_id: int,
    status: DeviceStatus,
    candidate_id: Optional[int] = Query(None, description="Candidate ID (optional)"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> PeripheralDeviceResponse:
    """Update device status."""
    
    # First get the device to find the session
    async with AsyncSessionLocal() as temp_db:
        device_result = await temp_db.execute(
            select(PeripheralDevice).where(PeripheralDevice.id == device_id)
        )
        device = device_result.scalar_one_or_none()
        
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Device not found"
            )
        
        session_id = device.session_id
    
    await verify_session_participant(session_id, current_user, db)
    
    try:
        updated_device = await device_tracking_service.update_device_status(
            device_id=device_id,
            status=status,
            candidate_id=candidate_id
        )
        
        if not updated_device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Device not found"
            )
        
        # Publish status update event
        await publish_code_changed(
            session_id=session_id,
            data={
                "event": "device_status_updated",
                "device_id": device_id,
                "status": status.value
            }
        )
        
        logger.info(f"Device {device_id} status updated to {status}")
        return updated_device
        
    except Exception as e:
        logger.error(f"Device status update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update device status"
        )

@router.post("/events", response_model=DeviceEventResponse, status_code=status.HTTP_201_CREATED)
async def track_device_event(
    event_data: DeviceEventCreate,
    session_id: int = Query(..., description="Session ID"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> DeviceEventResponse:
    """Track a device interaction event."""
    
    await verify_session_participant(session_id, current_user, db)
    
    try:
        event = await device_tracking_service.track_device_event(
            session_id=session_id,
            event_data=event_data
        )
        
        # Publish device event
        await publish_code_changed(
            session_id=session_id,
            data={
                "event": "device_event_tracked",
                "device_id": event_data.device_id,
                "event_type": event_data.event_type,
                "timestamp": event.timestamp.isoformat()
            }
        )
        
        logger.info(f"Device event tracked: {event_data.event_type} for device {event_data.device_id}")
        return event
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Device event tracking error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track device event"
        )

@router.get("/session/{session_id}", response_model=List[PeripheralDeviceResponse])
async def get_session_devices(
    session_id: int,
    device_type: Optional[DeviceType] = Query(None, description="Filter by device type"),
    status: Optional[DeviceStatus] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> List[PeripheralDeviceResponse]:
    """Get all devices for a session."""
    
    await verify_session_participant(session_id, current_user, db)
    
    try:
        devices = await device_tracking_service.get_session_devices(
            session_id=session_id,
            device_type=device_type,
            status=status
        )
        return devices
        
    except Exception as e:
        logger.error(f"Get session devices error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session devices"
        )

@router.get("/session/{session_id}/events", response_model=List[DeviceEventResponse])
async def get_device_events(
    session_id: int,
    device_id: Optional[int] = Query(None, description="Filter by device ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    limit: int = Query(default=100, le=500, ge=1),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> List[DeviceEventResponse]:
    """Get device events for a session."""
    
    await verify_session_participant(session_id, current_user, db)
    
    try:
        events = await device_tracking_service.get_device_events(
            session_id=session_id,
            device_id=device_id,
            event_type=event_type,
            limit=limit,
            offset=offset
        )
        return events
        
    except Exception as e:
        logger.error(f"Get device events error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve device events"
        )

@router.get("/session/{session_id}/metrics", response_model=DeviceMetricsResponse)
async def get_device_metrics(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> DeviceMetricsResponse:
    """Get comprehensive device metrics for a session."""
    
    await verify_session_participant(session_id, current_user, db)
    
    try:
        metrics = await device_tracking_service.get_device_metrics(session_id)
        return metrics
        
    except Exception as e:
        logger.error(f"Get device metrics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve device metrics"
        )

@router.get("/session/{session_id}/anomalies")
async def detect_device_anomalies(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_recruiter)  # Only recruiters can view anomalies
) -> List[dict]:
    """Detect device usage anomalies (Recruiter only)."""
    
    await verify_session_participant(session_id, current_user, db)
    
    try:
        anomalies = await device_tracking_service.detect_anomalies(session_id)
        return anomalies
        
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to detect anomalies"
        )

@router.post("/session/{session_id}/cleanup")
async def cleanup_disconnected_devices(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_recruiter)  # Only recruiters can cleanup
) -> dict:
    """Clean up inactive devices (Recruiter only)."""
    
    await verify_session_participant(session_id, current_user, db)
    
    try:
        cleaned_count = await device_tracking_service.cleanup_disconnected_devices(session_id)
        return {"cleaned_devices": cleaned_count}
        
    except Exception as e:
        logger.error(f"Device cleanup error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cleanup devices"
        )
