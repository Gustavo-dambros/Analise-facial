from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from app.core.security import require_role
from app.models.profile import Profile

router = APIRouter()


@router.post("/save-frame")
async def save_file(
    current_user: Profile = Depends(require_role(["admin"])),
):
    """Disabled in production. Admin-only endpoint for testing."""
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": "Este endpoint esta desabilitado em producao."},
    )


@router.delete("/clear-frames")
async def clear_frames(
    current_user: Profile = Depends(require_role(["admin"])),
):
    """Disabled in production. Admin-only endpoint for testing."""
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": "Este endpoint esta desabilitado em producao."},
    )
