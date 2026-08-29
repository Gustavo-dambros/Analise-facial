"""Helpers to persist uploaded photos in Supabase Storage.

The frontend/admin read analysis photos from the `analysis-photos` bucket, so the
backend stores the public URL rather than raw base64.
"""
import base64
import uuid

from supabase import create_client

from app.core.config import settings

_CLIENT = None
BUCKET = "analysis-photos"


def _get_client():
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _CLIENT


def _normalize_public_url(url):
    if isinstance(url, str):
        return url
    if isinstance(url, dict):
        # supabase-py occasionally returns {"data": {"publicUrl": ...}}
        if "publicUrl" in url:
            return url["publicUrl"]
        data = url.get("data") or {}
        if isinstance(data, dict) and "publicUrl" in data:
            return data["publicUrl"]
    return str(url)


_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def upload_photo(user_id: str, data_url: str) -> str | None:
    """Upload a base64 (or data-URL) image to Supabase Storage.

    Returns the public URL, or None if no image was provided.
    """
    if not data_url:
        return None

    if data_url.startswith("data:"):
        header, _, b64 = data_url.partition(",")
        ctype = header[5:header.find(";")] or "image/jpeg"
        raw = base64.b64decode(b64)
    else:
        ctype = "image/jpeg"
        raw = base64.b64decode(data_url)

    ext = _EXTENSIONS.get(ctype, "jpg")
    path = f"{user_id}/{uuid.uuid4()}.{ext}"

    client = _get_client()
    client.storage.from_(BUCKET).upload(
        path,
        raw,
        {"content-type": ctype, "cache-control": "3600"},
    )
    return _normalize_public_url(client.storage.from_(BUCKET).get_public_url(path))
