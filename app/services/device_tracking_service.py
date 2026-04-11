"""
Peripheral Device Tracking Service.
Tracks device usage, connections, and events during interview sessions.
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
import uuid
import hashlib

from app.core.database import AsyncSessionLocal
from app.core.logging import logger
from app.models.models import (
    PeripheralDevice, DeviceEvent, DeviceType, DeviceStatus, 
    Session, Candidate
)
from app.schemas.schemas import (
    PeripheralDeviceCreate, PeripheralDeviceUpdate, DeviceEventCreate,
    DeviceMetricsResponse, PeripheralDeviceResponse, DeviceEventResponse
)

class DeviceTrackingService:
    """Service for tracking peripheral devices during interviews."""
    
    def __init__(self):
        self.active_sessions: Dict[int, Dict[str, Any]] = {}
    
    async def register_device(
        self, 
        session_id: int, 
        device_data: PeripheralDeviceCreate,
        candidate_id: Optional[int] = None
    ) -> PeripheralDevice:
        """Register a new peripheral device for a session."""
        
        async with AsyncSessionLocal() as db:
            # Verify session exists
            session_result = await db.execute(
                select(Session).where(Session.id == session_id)
            )
            session = session_result.scalar_one_or_none()
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            # Check if device already exists
            device_result = await db.execute(
                select(PeripheralDevice).where(
                    and_(
                        PeripheralDevice.session_id == session_id,
                        PeripheralDevice.device_id == device_data.device_id
                    )
                )
            )
            existing_device = device_result.scalar_one_or_none()
            
            if existing_device:
                # Update existing device
                existing_device.status = DeviceStatus.CONNECTED
                existing_device.is_active = True
                existing_device.last_active_at = datetime.utcnow()
                existing_device.connection_count += 1
                
                if device_data.device_name:
                    existing_device.device_name = device_data.device_name
                if device_data.capabilities:
                    existing_device.capabilities.update(device_data.capabilities)
                if device_data.properties:
                    existing_device.properties.update(device_data.properties)
                
                await db.commit()
                await db.refresh(existing_device)
                
                logger.info(f"Device reconnected: {device_data.device_id} for session {session_id}")
                return existing_device
            
            # Create new device
            new_device = PeripheralDevice(
                session_id=session_id,
                candidate_id=candidate_id,
                device_id=device_data.device_id,
                device_type=device_data.device_type,
                device_name=device_data.device_name,
                manufacturer=device_data.manufacturer,
                model=device_data.model,
                status=DeviceStatus.CONNECTED,
                is_active=True,
                capabilities=device_data.capabilities,
                properties=device_data.properties,
                meta_data=device_data.metadata
            )
            
            db.add(new_device)
            await db.commit()
            await db.refresh(new_device)
            
            logger.info(f"New device registered: {device_data.device_id} ({device_data.device_type}) for session {session_id}")
            return new_device
    
    async def update_device_status(
        self, 
        device_id: int, 
        status: DeviceStatus,
        candidate_id: Optional[int] = None
    ) -> Optional[PeripheralDevice]:
        """Update device status."""
        
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(PeripheralDevice).where(PeripheralDevice.id == device_id)
            )
            device = result.scalar_one_or_none()
            
            if not device:
                return None
            
            device.status = status
            device.last_active_at = datetime.utcnow()
            
            if status == DeviceStatus.DISCONNECTED:
                device.is_active = False
                device.disconnected_at = datetime.utcnow()
            elif status == DeviceStatus.ACTIVE:
                device.is_active = True
            
            if candidate_id:
                device.candidate_id = candidate_id
            
            await db.commit()
            await db.refresh(device)
            
            logger.info(f"Device {device_id} status updated to {status}")
            return device
    
    async def track_device_event(
        self, 
        session_id: int,
        event_data: DeviceEventCreate
    ) -> DeviceEvent:
        """Track a device interaction event."""
        
        async with AsyncSessionLocal() as db:
            # Verify device exists
            device_result = await db.execute(
                select(PeripheralDevice).where(PeripheralDevice.id == event_data.device_id)
            )
            device = device_result.scalar_one_or_none()
            
            if not device:
                raise ValueError(f"Device {event_data.device_id} not found")
            
            # Create event
            new_event = DeviceEvent(
                device_id=event_data.device_id,
                session_id=session_id,
                event_type=event_data.event_type,
                event_data=event_data.event_data,
                duration_ms=event_data.duration_ms,
                cursor_x=event_data.cursor_x,
                cursor_y=event_data.cursor_y,
                window_title=event_data.window_title,
                application=event_data.application,
                response_time_ms=event_data.response_time_ms,
                accuracy=event_data.accuracy,
                meta_data=event_data.metadata
            )
            
            db.add(new_event)
            
            # Update device metrics
            device.last_active_at = datetime.utcnow()
            device.interaction_count += 1
            
            if event_data.duration_ms:
                device.total_usage_time_seconds += event_data.duration_ms / 1000.0
            
            await db.commit()
            await db.refresh(new_event)
            
            return new_event
    
    async def get_session_devices(
        self, 
        session_id: int,
        device_type: Optional[DeviceType] = None,
        status: Optional[DeviceStatus] = None
    ) -> List[PeripheralDevice]:
        """Get all devices for a session with optional filters."""
        
        async with AsyncSessionLocal() as db:
            query = select(PeripheralDevice).where(PeripheralDevice.session_id == session_id)
            
            if device_type:
                query = query.where(PeripheralDevice.device_type == device_type)
            if status:
                query = query.where(PeripheralDevice.status == status)
            
            query = query.order_by(PeripheralDevice.first_connected_at.desc())
            
            result = await db.execute(query)
            return result.scalars().all()
    
    async def get_device_events(
        self, 
        session_id: int,
        device_id: Optional[int] = None,
        event_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[DeviceEvent]:
        """Get device events with filters."""
        
        async with AsyncSessionLocal() as db:
            query = select(DeviceEvent).where(DeviceEvent.session_id == session_id)
            
            if device_id:
                query = query.where(DeviceEvent.device_id == device_id)
            if event_type:
                query = query.where(DeviceEvent.event_type == event_type)
            
            query = query.order_by(DeviceEvent.timestamp.desc()).limit(limit).offset(offset)
            
            result = await db.execute(query)
            return result.scalars().all()
    
    async def get_device_metrics(self, session_id: int) -> DeviceMetricsResponse:
        """Get comprehensive device metrics for a session."""
        
        async with AsyncSessionLocal() as db:
            # Get device counts
            total_devices_result = await db.execute(
                select(func.count(PeripheralDevice.id))
                .where(PeripheralDevice.session_id == session_id)
            )
            total_devices = total_devices_result.scalar() or 0
            
            active_devices_result = await db.execute(
                select(func.count(PeripheralDevice.id))
                .where(
                    and_(
                        PeripheralDevice.session_id == session_id,
                        PeripheralDevice.is_active == True
                    )
                )
            )
            active_devices = active_devices_result.scalar() or 0
            
            # Get device type distribution
            device_types_result = await db.execute(
                select(PeripheralDevice.device_type, func.count(PeripheralDevice.id))
                .where(PeripheralDevice.session_id == session_id)
                .group_by(PeripheralDevice.device_type)
            )
            device_types = {dt.value: count for dt, count in device_types_result.all()}
            
            # Get total interactions
            total_interactions_result = await db.execute(
                select(func.count(DeviceEvent.id))
                .where(DeviceEvent.session_id == session_id)
            )
            total_interactions = total_interactions_result.scalar() or 0
            
            # Get average usage time
            avg_usage_result = await db.execute(
                select(func.avg(PeripheralDevice.total_usage_time_seconds))
                .where(PeripheralDevice.session_id == session_id)
            )
            average_usage_time = avg_usage_result.scalar() or 0.0
            
            # Get most active device
            most_active_result = await db.execute(
                select(PeripheralDevice)
                .where(PeripheralDevice.session_id == session_id)
                .order_by(desc(PeripheralDevice.interaction_count))
                .limit(1)
            )
            most_active_device = most_active_result.scalar_one_or_none()
            
            # Get recent events
            recent_events_result = await db.execute(
                select(DeviceEvent)
                .where(DeviceEvent.session_id == session_id)
                .order_by(desc(DeviceEvent.timestamp))
                .limit(10)
            )
            recent_events = recent_events_result.scalars().all()
            
            return DeviceMetricsResponse(
                session_id=session_id,
                total_devices=total_devices,
                active_devices=active_devices,
                device_types=device_types,
                total_interactions=total_interactions,
                average_usage_time=average_usage_time,
                most_active_device=most_active_device,
                recent_events=list(recent_events)
            )
    
    async def detect_anomalies(self, session_id: int) -> List[Dict[str, Any]]:
        """Detect device usage anomalies."""
        
        anomalies = []
        
        async with AsyncSessionLocal() as db:
            # Check for rapid device switching
            recent_devices_result = await db.execute(
                select(PeripheralDevice)
                .where(
                    and_(
                        PeripheralDevice.session_id == session_id,
                        PeripheralDevice.first_connected_at >= datetime.utcnow() - timedelta(minutes=5)
                    )
                )
                .order_by(desc(PeripheralDevice.first_connected_at))
            )
            recent_devices = recent_devices_result.scalars().all()
            
            if len(recent_devices) > 5:  # More than 5 devices in 5 minutes
                anomalies.append({
                    "type": "rapid_device_switching",
                    "severity": "medium",
                    "message": f"Detected {len(recent_devices)} device connections in last 5 minutes",
                    "data": {"device_count": len(recent_devices)}
                })
            
            # Check for unusual activity patterns
            events_result = await db.execute(
                select(DeviceEvent.event_type, func.count(DeviceEvent.id))
                .where(
                    and_(
                        DeviceEvent.session_id == session_id,
                        DeviceEvent.timestamp >= datetime.utcnow() - timedelta(minutes=10)
                    )
                )
                .group_by(DeviceEvent.event_type)
            )
            event_counts = dict(events_result.all())
            
            # High frequency clicking (potential bot activity)
            click_events = event_counts.get("click", 0)
            if click_events > 100:  # More than 100 clicks in 10 minutes
                anomalies.append({
                    "type": "high_frequency_clicks",
                    "severity": "high",
                    "message": f"Unusual click frequency: {click_events} clicks in 10 minutes",
                    "data": {"click_count": click_events}
                })
            
            return anomalies
    
    async def cleanup_disconnected_devices(self, session_id: int) -> int:
        """Mark devices as disconnected if inactive for too long."""
        
        async with AsyncSessionLocal() as db:
            # Find devices inactive for more than 30 minutes
            inactive_threshold = datetime.utcnow() - timedelta(minutes=30)
            
            result = await db.execute(
                select(PeripheralDevice)
                .where(
                    and_(
                        PeripheralDevice.session_id == session_id,
                        PeripheralDevice.is_active == True,
                        PeripheralDevice.last_active_at < inactive_threshold
                    )
                )
            )
            inactive_devices = result.scalars().all()
            
            count = 0
            for device in inactive_devices:
                device.status = DeviceStatus.DISCONNECTED
                device.is_active = False
                device.disconnected_at = datetime.utcnow()
                count += 1
            
            await db.commit()
            
            if count > 0:
                logger.info(f"Marked {count} inactive devices as disconnected for session {session_id}")
            
            return count

# Global service instance
device_tracking_service = DeviceTrackingService()
