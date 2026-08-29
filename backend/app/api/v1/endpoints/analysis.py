"""
Geometry Analysis endpoint — coordinate-based facial metrics.
"""

import logging
from fastapi import APIRouter, Depends, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.schemas.analysis import (
    GeometryAnalysisInputSchema,
    GeometryAnalysisResponseSchema,
    FaceDetectSchema,
    FaceDetectResponse,
)
from app.services.geometry_service import GeometryService
from app.services.face_detection_service import FaceDetectionService
from app.core.security import get_current_user
from app.core.config import settings
from app.core.exceptions import SanitizedHTTPException
from app.models.profile import Profile

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def get_geometry_service() -> GeometryService:
    return GeometryService()


@router.post(
    "/calculate-metrics",
    response_model=GeometryAnalysisResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Calculate geometric facial metrics",
)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def calculate_metrics(
    request: Request,
    data: GeometryAnalysisInputSchema,
    current_user: Profile = Depends(get_current_user),
    geometry_service: GeometryService = Depends(get_geometry_service),
) -> GeometryAnalysisResponseSchema:
    """Calculate facial metrics from landmark coordinates. Requires authentication."""
    try:
        trichion = data.trichion.model_dump()
        glabella = data.glabella.model_dump()
        subnasale_front = data.subnasale_front.model_dump()
        menton_front = data.menton_front.model_dump()
        subnasale_profile = data.subnasale_profile.model_dump()
        pranasale = data.pranasale.model_dump()
        labiale_superius = data.labiale_superius.model_dump()
        labiale_inferius = data.labiale_inferius.model_dump()
        menton_profile = data.menton_profile.model_dump()

        thirds = await geometry_service.calculate_facial_thirds(
            trichion=trichion, glabella=glabella,
            subnasale=subnasale_front, menton=menton_front,
        )
        nasolabial_angle = await geometry_service.calculate_nasolabial_angle(
            subnasale=subnasale_profile, pranasale=pranasale,
            labiale_superius=labiale_superius,
        )
        ricketts = await geometry_service.calculate_ricketts_line(
            pranasale=pranasale, menton=menton_profile,
            labiale_superius=labiale_superius, labiale_inferius=labiale_inferius,
        )

        return GeometryAnalysisResponseSchema(
            thirds=thirds, nasolabial_angle=nasolabial_angle, ricketts=ricketts,
        )
    except ValueError as exc:
        raise SanitizedHTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Dados de coordenadas invalidos.",
            str(exc),
        )
    except SanitizedHTTPException:
        raise
    except Exception as exc:
        logger.exception("Geometry calculation error")
        raise SanitizedHTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Erro ao calcular metricas geometricas.",
            str(exc),
        )


@router.post(
    "/detect-face",
    response_model=FaceDetectResponse,
    status_code=status.HTTP_200_OK,
    summary="Detect face and crop image",
)
@limiter.limit(settings.RATE_LIMIT_GENERAL)
async def detect_face(
    request: Request,
    data: FaceDetectSchema,
    current_user: Profile = Depends(get_current_user),
) -> FaceDetectResponse:
    """Detect face and crop image. Requires authentication."""
    try:
        service = FaceDetectionService()
        cropped = await service.detect_and_crop(data.image)
        return FaceDetectResponse(cropped_image=cropped)
    except ValueError as exc:
        raise SanitizedHTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            str(exc),
            str(exc),
        )
    except SanitizedHTTPException:
        raise
    except Exception as exc:
        logger.exception("Face detection error")
        raise SanitizedHTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Erro ao detectar rosto na imagem.",
            str(exc),
        )
