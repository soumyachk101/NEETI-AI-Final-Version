"""
Supabase Authentication Service.
Production-ready auth using Supabase only.

SECURITY FIX (CRIT-1): This module now uses the singleton client from
auth.py and delegates role resolution to _resolve_role() which
prioritises app_metadata (server-set) over user_metadata (client-set).

SECURITY FIX (SEC-3): Error messages no longer leak internal exceptions.
"""
from typing import Optional, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings
from app.core.logging import logger

# CRIT-1 / CRIT-2: Use the singleton client from core/auth.py
from app.core.auth import get_supabase_client, _resolve_role, ALLOWED_ROLES

try:
    from app.services.supabase_service import supabase_service
    SUPABASE_SERVICE_AVAILABLE = True
except ImportError:
    SUPABASE_SERVICE_AVAILABLE = False


class SupabaseAuthService:
    """Supabase-only authentication service."""

    @staticmethod
    def _serialize_user(user: Any) -> dict:
        """Convert Supabase user object to serializable dict."""
        if not user:
            return {}

        user_dict = {
            'id': getattr(user, 'id', None),
            'email': getattr(user, 'email', None),
        }

        created_at = getattr(user, 'created_at', None)
        if created_at:
            user_dict['created_at'] = created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at)

        updated_at = getattr(user, 'updated_at', None)
        if updated_at:
            user_dict['updated_at'] = updated_at.isoformat() if hasattr(updated_at, 'isoformat') else str(updated_at)

        return user_dict

    def __init__(self):
        self._client = None

    def _get_client(self):
        """Lazily acquire the singleton Supabase client."""
        if self._client is None:
            try:
                self._client = get_supabase_client()
            except Exception:
                logger.warning("Supabase client not available")
        return self._client

    async def sign_up(self, email: str, password: str, full_name: str, role: str) -> dict:
        """Register user with Supabase."""
        client = self._get_client()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service is not available. Please try again later."
            )

        # Validate role before signup
        if role not in ALLOWED_ROLES:
            role = "candidate"

        try:
            result = client.auth.sign_up({
                'email': email,
                'password': password,
                'options': {
                    'data': {
                        'full_name': full_name,
                        'role': role
                    },
                    'email_redirect_to': None
                }
            })

            if result.user:
                if SUPABASE_SERVICE_AVAILABLE:
                    try:
                        user_data = {
                            'id': result.user.id,
                            'email': email,
                            'full_name': full_name,
                            'role': role,
                            'is_active': True,
                            'created_at': result.user.created_at
                        }
                        await supabase_service.create_user(user_data)
                        logger.info(f"Supabase user registered: {email}")
                    except Exception as db_error:
                        logger.warning(f"User record might already exist in database: {db_error}")

                return {
                    'user': self._serialize_user(result.user),
                    'session': result.session
                }
            else:
                raise Exception("Registration failed")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Supabase registration error: {e}")

            error_msg = str(e).lower()

            if 'rate limit' in error_msg or 'too many' in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Email rate limit exceeded. Please wait a few minutes before trying again."
                )

            elif any(phrase in error_msg for phrase in [
                'already registered',
                'already exists',
                'already been registered',
                'user already exists',
                'email already',
                'duplicate',
                'unique constraint'
            ]):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This email is already registered. Please try logging in instead."
                )

            # SEC-3: Do NOT leak internal error details
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed. Please check your details and try again."
            )

    async def sign_in(self, email: str, password: str) -> dict:
        """Sign in with Supabase."""
        client = self._get_client()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service is not available. Please try again later."
            )

        try:
            result = client.auth.sign_in_with_password({
                'email': email,
                'password': password
            })

            if result.user and result.session:
                logger.info(f"Supabase user signed in: {email}")

                return {
                    'user': self._serialize_user(result.user),
                    'session': result.session,
                    'access_token': result.session.access_token,
                    'refresh_token': result.session.refresh_token
                }
            else:
                raise Exception("Sign in failed")

        except Exception as e:
            logger.error(f"Supabase sign in error: {e}")
            # SEC-3: Do NOT leak internal error details
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

    async def sign_out(self, access_token: str) -> None:
        """Sign out from Supabase."""
        client = self._get_client()
        if not client:
            logger.warning("Supabase not configured, sign out skipped")
            return

        try:
            client.auth.sign_out()
            logger.info("Supabase user signed out")
        except Exception as e:
            logger.error(f"Supabase sign out error: {e}")

    async def get_user(self, access_token: str) -> Optional[dict]:
        """Get user from Supabase using the secure role resolution."""
        client = self._get_client()
        if not client:
            logger.warning("Supabase not configured, cannot get user")
            return None

        try:
            response = client.auth.get_user(access_token)

            if response and response.user:
                user = response.user
                # CRIT-1: Use the secure _resolve_role from auth.py
                role = _resolve_role(user)

                user_metadata = user.user_metadata or {}

                user_dict = {
                    'id': user.id,
                    'email': user.email,
                    'full_name': user_metadata.get('full_name', user.email.split('@')[0]),
                    'role': role,
                    'is_active': True,
                    'created_at': user.created_at,
                }

                return user_dict
            return None

        except Exception as e:
            logger.error(f"Supabase get user error: {e}")
            return None

    async def refresh_token(self, refresh_token: str) -> dict:
        """Refresh Supabase token."""
        client = self._get_client()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service is not available. Please try again later."
            )

        try:
            result = client.auth.refresh_session(refresh_token)

            if result.session:
                logger.info("Supabase token refreshed")
                return {
                    'access_token': result.session.access_token,
                    'refresh_token': result.session.refresh_token,
                    'token_type': 'bearer'
                }
            else:
                raise Exception("Token refresh failed")

        except Exception as e:
            logger.error(f"Supabase refresh error: {e}")
            # SEC-3: Do NOT leak internal error details
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please sign in again."
            )

supabase_auth_service = SupabaseAuthService()


# ── CRIT-1 FIX: These now delegate to the secure auth.py dependency ──
async def get_current_supabase_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
) -> dict:
    """Get current user using Supabase auth with secure role resolution."""

    token = credentials.credentials
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication token provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await supabase_auth_service.get_user(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_recruiter(
    current_user: dict = Depends(get_current_supabase_user)
) -> dict:
    """Dependency to ensure current user is a recruiter."""

    if current_user.get('role') != 'recruiter':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recruiter access required"
        )

    return current_user


async def get_current_candidate(
    current_user: dict = Depends(get_current_supabase_user)
) -> dict:
    """Dependency to ensure current user is a candidate."""

    if current_user.get('role') != 'candidate':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate access required"
        )

    return current_user
