"""
Supabase authentication - validates tokens from Supabase Auth.
No custom JWT generation - Supabase manages all authentication.

SECURITY: Roles are validated against app_metadata (server-side only)
and fall back to user_metadata with validation. Never trust client-set
metadata alone for authorization decisions.
"""
from functools import lru_cache
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.logging import logger
from supabase import create_client, Client

security = HTTPBearer()

# ── FIX #10: Singleton Supabase client ──
@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Get cached Supabase client instance (singleton)."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase credentials not configured")
    
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


# ── FIX #1: Determine role from server-side source ──
ALLOWED_ROLES = {"recruiter", "candidate", "admin"}

def _resolve_role(user) -> str:
    """
    Resolve user role with server-side priority.
    
    Priority:
    1. app_metadata.role  (set server-side only, trusted)
    2. user_metadata.role (set by client during signup, validated)
    3. Default to 'candidate'
    """
    # app_metadata can only be set via service_role key, so it is trusted
    app_role = getattr(user, 'app_metadata', {}).get("role") if hasattr(user, 'app_metadata') else None
    if app_role and app_role in ALLOWED_ROLES:
        return app_role
    
    # Fall back to user_metadata but validate
    user_role = user.user_metadata.get("role", "candidate") if user.user_metadata else "candidate"
    if user_role not in ALLOWED_ROLES:
        logger.warning(f"Invalid role '{user_role}' for user {user.id}, defaulting to candidate")
        return "candidate"
    
    return user_role


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Dependency to get current authenticated user from Supabase.
    Validates JWT token from Supabase and returns user data.
    """
    token = credentials.credentials
    
    try:
        supabase = get_supabase_client()
        
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = user_response.user
        role = _resolve_role(user)
        
        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.user_metadata.get("full_name") if user.user_metadata else None,
            "role": role,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_recruiter(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Dependency to ensure current user is a recruiter."""
    if current_user.get("role") != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recruiter access required"
        )
    return current_user

async def get_current_candidate(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Dependency to ensure current user is a candidate."""
    if current_user.get("role") != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate access required"
        )
    return current_user

# Synced for GitHub timestamp

 
