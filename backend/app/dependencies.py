import asyncio

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.supabase import supabase

_bearer = HTTPBearer(auto_error=False)


async def get_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    """Validate the Supabase JWT from the Authorization: Bearer header.

    The frontend signs in via Supabase Auth and passes the resulting access
    token on every request. This dependency calls supabase.auth.get_user()
    to verify the token server-side and returns the authenticated user's UUID.

    Raises 401 if the header is missing or the token is invalid / expired.
    """
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        result = await asyncio.to_thread(
            lambda: supabase.auth.get_user(credentials.credentials)
        )
        return str(result.user.id)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
