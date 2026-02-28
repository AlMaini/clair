from fastapi import Header


def get_user_id(
    x_user_id: str = Header(default="00000000-0000-0000-0000-000000000000"),
) -> str:
    """Extract the authenticated user's ID from the request header.

    TODO: Replace with proper Supabase JWT auth once Auth is wired up:

        from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
        from app.services.supabase import supabase

        credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
        user = supabase.auth.get_user(credentials.credentials)
        return user.user.id

    Until then, the frontend should pass the Supabase user UUID in X-User-ID.
    """
    return x_user_id
