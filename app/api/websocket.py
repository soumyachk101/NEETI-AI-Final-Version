"""
WebSocket handlers for real-time session events.
Authenticated via token query parameter.
"""
import asyncio
import json
from typing import Dict, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import AsyncSessionLocal
from app.core.logging import logger
from app.models.models import Session, Candidate
from app.core.redis import redis_client

router = APIRouter()


async def authenticate_websocket(token: str) -> Optional[dict]:
    """
    Authenticate WebSocket connection using token.
    Supports Supabase access tokens and LiveKit room tokens as fallback.
    """
    if not token:
        logger.warning("WebSocket auth: missing token")
        return None

    from app.core.config import settings
    
    # 1. Try Supabase Auth (Standard for Recruiters/Registered users)
    try:
        from supabase import create_client
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            user_response = supabase.auth.get_user(token)

            if user_response and user_response.user:
                user = user_response.user
                return {
                    "id": user.id,
                    "email": user.email,
                    "role": user.user_metadata.get("role", "candidate") if user.user_metadata else "candidate",
                    "auth_type": "supabase"
                }
    except Exception as e:
        logger.debug(f"Supabase auth attempt failed: {e}")

    # 2. Try LiveKit Token Auth (For Anonymous Candidates)
    try:
        from jose import jwt
        # LiveKit tokens are signed with the API Secret
        payload = jwt.decode(token, settings.LIVEKIT_API_SECRET, algorithms=["HS256"])
        
        identity = payload.get("sub")
        if identity:
            # Identity format check: numeric (anon candidate) or prefixed (standard)
            role = "candidate"
            if str(identity).startswith("recruiter-"):
                role = "recruiter"
            
            return {
                "id": identity,
                "email": payload.get("name", "Anonymous"),
                "role": role,
                "auth_type": "livekit"
            }
    except Exception as e:
        logger.debug(f"LiveKit auth fallback failed: {e}")

    return None


async def verify_session_membership(user: dict, session_id: int) -> bool:
    """Verify the authenticated user belongs to this session."""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Session).where(Session.id == session_id)
            )
            session = result.scalar_one_or_none()
            if not session:
                logger.warning(f"WebSocket session check: session {session_id} not found")
                return False

            user_id = str(user["id"])
            
            # Check if recruiter
            # Case A: Supabase UUID
            # Case B: LiveKit identity f"recruiter-{id}"
            if user_id == str(session.recruiter_id) or user_id == f"recruiter-{session.recruiter_id}":
                return True

            # Check if candidate
            # Case A: Registered candidate (user_id matched)
            # Case B: Anonymous candidate (candidate.id matched)
            
            # Identity format extraction
            id_to_check = user_id.replace("candidate-", "")
            
            if id_to_check.isdigit():
                # Numeric identity — likely candidate.id
                result = await db.execute(
                    select(Candidate).where(
                        and_(
                            Candidate.session_id == session_id,
                            Candidate.id == int(id_to_check)
                        )
                    )
                )
            else:
                # UUID string — likely user_id
                result = await db.execute(
                    select(Candidate).where(
                        and_(
                            Candidate.session_id == session_id,
                            Candidate.user_id == user_id
                        )
                    )
                )
                
            if result.scalars().first():
                return True

        logger.warning(
            f"WebSocket session check failed: user {user['id']} (role={user.get('role')}) "
            f"not a member of session {session_id}"
        )
        return False
    except Exception as e:
        logger.error(f"WebSocket session check error: {e}")
        return False


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        self.active_connections: Dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: int):
        """Add to session room (accept must be called before this)."""
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        logger.info(f"WebSocket connected to session {session_id} (total: {len(self.active_connections[session_id])})")

    def disconnect(self, websocket: WebSocket, session_id: int):
        """Remove WebSocket connection."""
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        logger.info(f"WebSocket disconnected from session {session_id}")

    async def send_to_session(self, session_id: int, message: dict):
        """Send message to all connections in a session."""
        if session_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.append(connection)
            for conn in disconnected:
                self.disconnect(conn, session_id)


manager = ConnectionManager()


@router.websocket("/ws/session/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: int,
    token: str = Query(default="")
):
    """
    WebSocket endpoint for real-time session updates.
    Requires ?token=<supabase_access_token> query parameter.
    
    Architecture:
    - Accept the WebSocket FIRST (otherwise the browser sees 403)
    - Authenticate after accept
    - If auth fails, send error message then close
    - Listen for both client messages AND Redis pub/sub events
    """
    # MUST accept first — closing before accept = HTTP 403
    await websocket.accept()

    # Authenticate
    user = await authenticate_websocket(token)
    if not user:
        await websocket.send_json({"type": "error", "message": "Authentication failed"})
        await websocket.close(code=1008, reason="Authentication failed")
        return

    # Verify membership
    if not await verify_session_membership(user, session_id):
        await websocket.send_json({"type": "error", "message": "Not authorized for this session"})
        await websocket.close(code=1008, reason="Not authorized for this session")
        return

    # Connected and authorized
    await manager.connect(websocket, session_id)
    await websocket.send_json({
        "type": "connected",
        "data": {"session_id": session_id, "user_id": user["id"], "role": user.get("role")}
    })

    # Set up Redis pub/sub for code events
    pubsub = None
    try:
        # Subscribe to relevant Redis channels for this session's events
        channels = [
            f"events:code.changed",
            f"events:code.executed",
            f"events:speech.transcribed",
            f"events:session.ended",
        ]

        if redis_client.client:
            pubsub = redis_client.client.pubsub()
            await pubsub.subscribe(*channels)

        async def listen_redis():
            """Background task: forward Redis events to WebSocket."""
            if not pubsub:
                return
            try:
                while True:
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message and message["type"] == "message":
                        try:
                            event_data = json.loads(message["data"])
                            # Only forward events for THIS session
                            if event_data.get("session_id") == session_id:
                                await websocket.send_json({
                                    "type": event_data.get("event_type", "unknown"),
                                    "timestamp": event_data.get("timestamp", ""),
                                    "data": event_data.get("data", {})
                                })
                        except (json.JSONDecodeError, Exception) as e:
                            logger.debug(f"Redis event parse error: {e}")
                    await asyncio.sleep(0.1)
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.debug(f"Redis listener stopped: {e}")

        # Start Redis listener as background task
        redis_task = asyncio.create_task(listen_redis())

        # Main loop: listen for client messages
        try:
            while True:
                data = await websocket.receive_json()
                msg_type = data.get("type", "")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})

                elif msg_type == "code.changed":
                    # Candidate sent code update — broadcast to recruiter via manager
                    await manager.send_to_session(session_id, {
                        "type": "code.changed",
                        "data": data.get("data", {}),
                    })

                elif msg_type == "request_metrics":
                    try:
                        from app.services.metrics_service import MetricsService
                        from app.services.device_tracking_service import device_tracking_service
                        metrics = await MetricsService.get_live_metrics(session_id)
                        device_metrics = await device_tracking_service.get_device_metrics(session_id)
                        await websocket.send_json({
                            "type": "metrics_update", 
                            "data": {
                                **metrics,
                                "devices": device_metrics.model_dump()
                            }
                        })
                    except Exception as e:
                        logger.warning(f"Metrics request failed: {e}")
                        await websocket.send_json({"type": "metrics_update", "data": {}})
                
                elif msg_type == "device.register":
                    # Handle device registration via WebSocket
                    try:
                        from app.services.device_tracking_service import device_tracking_service
                        from app.schemas.schemas import PeripheralDeviceCreate
                        device_data = data.get("data", {})
                        device_create = PeripheralDeviceCreate(**device_data)
                        device = await device_tracking_service.register_device(
                            session_id=session_id,
                            device_data=device_create
                        )
                        await websocket.send_json({
                            "type": "device.registered",
                            "data": {"device_id": device.id, "status": "success"}
                        })
                    except Exception as e:
                        logger.warning(f"Device registration failed: {e}")
                        await websocket.send_json({
                            "type": "device.registered",
                            "data": {"status": "error", "message": str(e)}
                        })
                
                elif msg_type == "device.event":
                    # Handle device events via WebSocket
                    try:
                        from app.services.device_tracking_service import device_tracking_service
                        from app.schemas.schemas import DeviceEventCreate
                        event_data = data.get("data", {})
                        event_create = DeviceEventCreate(**event_data)
                        event = await device_tracking_service.track_device_event(
                            session_id=session_id,
                            event_data=event_create
                        )
                        await websocket.send_json({
                            "type": "device.event_tracked",
                            "data": {"event_id": event.id, "status": "success"}
                        })
                    except Exception as e:
                        logger.warning(f"Device event tracking failed: {e}")
                        await websocket.send_json({
                            "type": "device.event_tracked",
                            "data": {"status": "error", "message": str(e)}
                        })

        except WebSocketDisconnect:
            logger.info(f"Client disconnected from session {session_id}")
        except Exception as e:
            logger.warning(f"WebSocket receive error: {e}")
        finally:
            # Cancel the Redis listener
            redis_task.cancel()
            try:
                await redis_task
            except asyncio.CancelledError:
                pass

    except Exception as e:
        logger.error(f"WebSocket setup error: {e}")

    finally:
        # Clean up
        manager.disconnect(websocket, session_id)
        if pubsub:
            try:
                await pubsub.unsubscribe()
                await pubsub.close()
            except Exception:
                pass
