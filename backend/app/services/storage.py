from uuid import uuid4

from fastapi import HTTPException

from app.services.supabase import supabase

BUCKET = "note-files"


def upload_file(user_id: str, filename: str, data: bytes, content_type: str) -> str:
    """Upload a file to the note-files bucket and return its storage path.

    Files are stored under {user_id}/{uuid}-{filename} so that storage RLS
    policies (which check the first folder segment) scope access per user.

    Args:
        user_id: The authenticated user's UUID.
        filename: Original file name (used as a readable suffix).
        data: Raw file bytes.
        content_type: MIME type of the file (e.g. "audio/mpeg").

    Returns:
        The storage path, suitable for storing in notes.file_path.
    """
    path = f"{user_id}/{uuid4()}-{filename}"
    try:
        supabase.storage.from_(BUCKET).upload(
            path=path,
            file=data,
            file_options={"content-type": content_type},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")
    return path


def get_signed_url(file_path: str, expires_in: int = 3600) -> str:
    """Return a short-lived signed URL for a stored file.

    Args:
        file_path: The storage path returned by upload_file.
        expires_in: Seconds until the URL expires (default 1 hour).

    Returns:
        A pre-signed HTTPS URL the client can use to download the file.
    """
    try:
        result = supabase.storage.from_(BUCKET).create_signed_url(
            path=file_path,
            expires_in=expires_in,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create signed URL: {e}")
    return result["signedURL"]
