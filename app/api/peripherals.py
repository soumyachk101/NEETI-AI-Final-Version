"""
Peripheral Device Tracking API — Anti-Cheat Module.

Endpoints for capturing device inventory snapshots and real-time
device change events during interview sessions. All events are
stored in the audit trail and forwarded via WebSocket to recruiters.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.logging import logger
from app.core.auth import get_current_user
from app.core.events import publish_peripheral_snapshot, publish_peripheral_change
from app.models.models import Session, PeripheralEvent
from app.schemas.schemas import (
    PeripheralSnapshotCreate,
    PeripheralChangeCreate,
    PeripheralEventResponse,
)

router = APIRouter(tags=["peripherals"])


def _classify_severity(change_type: str, added: list, removed: list, screen_count: int) -> tuple[str, str]:
    """
    Determine alert severity and generate a human-readable message
    based on the type of peripheral device change detected.

    Returns:
        (severity, message) tuple
    """
    added_kinds = [d.kind for d in added]
    removed_kinds = [d.kind for d in removed]

    # --- Screen change: secondary monitor ---
    if change_type == "screen_change" or screen_count > 1:
        return "high", f"Screen configuration changed — {screen_count} display(s) detected"

    # --- USB device ---
    if "usb" in added_kinds:
        labels = [d.label or "Unknown USB" for d in added if d.kind == "usb"]
        return "critical", f"USB device connected: {', '.join(labels)}"

    # --- Bluetooth device ---
    if "bluetooth" in added_kinds:
        labels = [d.label or "Unknown Bluetooth" for d in added if d.kind == "bluetooth"]
        return "high", f"Bluetooth device connected: {', '.join(labels)}"

    # --- HID device (keyboard, mouse, gamepad) ---
    if "hid" in added_kinds:
        labels = [d.label or "Unknown HID" for d in added if d.kind == "hid"]
        return "medium", f"HID device connected: {', '.join(labels)}"

    # --- New camera or microphone ---
    if "videoinput" in added_kinds:
        labels = [d.label or "Unknown Camera" for d in added if d.kind == "videoinput"]
        return "medium", f"New camera detected: {', '.join(labels)}"

    if "audioinput" in added_kinds:
        labels = [d.label or "Unknown Mic" for d in added if d.kind == "audioinput"]
        return "medium", f"New microphone detected: {', '.join(labels)}"

    # --- Device removed ---
    if removed and not added:
        return "low", f"Device removed: {', '.join(d.label or d.kind for d in removed)}"

    # --- Generic added ---
    if added:
        return "medium", f"New device(s) detected: {', '.join(d.label or d.kind for d in added)}"

    return "low", "Minor peripheral change detected"


def _count_devices(devices: list) -> dict:
    """Count devices by kind."""
    counts = {"camera": 0, "microphone": 0, "speaker": 0}
    for d in devices:
        if d.kind == "videoinput":
            counts["camera"] += 1
        elif d.kind == "audioinput":
            counts["microphone"] += 1
        elif d.kind == "audiooutput":
            counts["speaker"] += 1
    return counts


@router.post(
    "/sessions/{session_id}/peripherals/snapshot",
    response_model=PeripheralEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit initial device inventory snapshot",
)
async def create_peripheral_snapshot(
    session_id: int,
    payload: PeripheralSnapshotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Called once at session start to record the candidate's initial
    set of connected peripheral devices and screen configuration.
    """
    # Verify session exists
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    device_counts = _count_devices(payload.devices)

    snapshot_data = {
        "devices": [d.model_dump() for d in payload.devices],
        "screen_count": payload.screen_count,
        "screen_width": payload.screen_width,
        "screen_height": payload.screen_height,
        "user_agent": payload.user_agent,
    }

    event = PeripheralEvent(
        session_id=session_id,
        event_type="snapshot",
        device_snapshot=snapshot_data,
        device_changes={},
        alert_severity=None,
        alert_message=f"Initial device inventory: {len(payload.devices)} device(s), {payload.screen_count} screen(s)",
        camera_count=device_counts["camera"],
        microphone_count=device_counts["microphone"],
        speaker_count=device_counts["speaker"],
        screen_count=payload.screen_count,
        meta_data=payload.metadata,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    # Publish event for WebSocket subscribers
    try:
        await publish_peripheral_snapshot(session_id, snapshot_data)
    except Exception as e:
        logger.warning(f"Failed to publish peripheral snapshot event: {e}")

    logger.info(
        f"Peripheral snapshot recorded for session {session_id}: "
        f"{device_counts['camera']} cameras, {device_counts['microphone']} mics, "
        f"{payload.screen_count} screens"
    )
    return event


@router.post(
    "/sessions/{session_id}/peripherals/change",
    response_model=PeripheralEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Report a peripheral device change",
)
async def create_peripheral_change(
    session_id: int,
    payload: PeripheralChangeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Called when the browser detects a device being added, removed,
    or a screen configuration change during an active interview.
    """
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    severity, message = _classify_severity(
        payload.change_type,
        payload.added_devices,
        payload.removed_devices,
        payload.screen_count,
    )

    device_counts = _count_devices(payload.current_devices)

    change_data = {
        "change_type": payload.change_type,
        "added": [d.model_dump() for d in payload.added_devices],
        "removed": [d.model_dump() for d in payload.removed_devices],
    }

    snapshot_data = {
        "devices": [d.model_dump() for d in payload.current_devices],
        "screen_count": payload.screen_count,
        "screen_width": payload.screen_width,
        "screen_height": payload.screen_height,
    }

    event = PeripheralEvent(
        session_id=session_id,
        event_type=payload.change_type,
        device_snapshot=snapshot_data,
        device_changes=change_data,
        alert_severity=severity,
        alert_message=message,
        camera_count=device_counts["camera"],
        microphone_count=device_counts["microphone"],
        speaker_count=device_counts["speaker"],
        screen_count=payload.screen_count,
        meta_data=payload.metadata,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    # Publish to WebSocket for real-time recruiter alerts
    try:
        await publish_peripheral_change(session_id, {
            **change_data,
            "severity": severity,
            "message": message,
            "screen_count": payload.screen_count,
            "device_counts": device_counts,
        })
    except Exception as e:
        logger.warning(f"Failed to publish peripheral change event: {e}")

    logger.warning(
        f"[PERIPHERAL ALERT] Session {session_id} | {severity.upper()}: {message}"
    )
    return event


@router.get(
    "/sessions/{session_id}/peripherals",
    response_model=list[PeripheralEventResponse],
    summary="Get all peripheral events for a session",
)
async def list_peripheral_events(
    session_id: int,
    severity: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve all peripheral device events for a session.
    Optionally filter by severity level. Recruiter access only.
    """
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Build query
    query = select(PeripheralEvent).where(
        PeripheralEvent.session_id == session_id
    )
    if severity:
        query = query.where(PeripheralEvent.alert_severity == severity)
    
    query = query.order_by(PeripheralEvent.timestamp.asc())

    result = await db.execute(query)
    events = result.scalars().all()
    return events

# Synced for GitHub timestamp

 
