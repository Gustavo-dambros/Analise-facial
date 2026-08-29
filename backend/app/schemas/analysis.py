from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ------------------------------------------------------------------ #
#  Constants — 12 Attributes & Classification
# ------------------------------------------------------------------ #

ATTRIBUTE_NAMES = [
    "Terco Superior",
    "Terco Medio",
    "Terco Inferior",
    "Olhos",
    "Sobrancelhas",
    "Nariz",
    "Labios",
    "Mandibula",
    "Queixo",
    "Macas do Rosto",
    "Testa",
    "Formato do Rosto",
]


def attribute_score_to_label(score: int) -> str:
    """Convert numeric score (1-10) to textual label."""
    if score <= 3:
        return "Ok"
    if score <= 6:
        return "Bom"
    return "Otimo"


def compute_symmetry(attributes: dict[str, int]) -> float:
    """Facial Symmetry = simple average of all 13 attributes (scale 1-10)."""
    if not attributes:
        return 0.0
    return round(sum(attributes.values()) / len(attributes), 2)


def compute_overall(symmetry: float, attractiveness: int) -> float:
    """Overall (0-100) = ((Symmetry + Attractiveness) / 2) * 10."""
    return round(((symmetry + attractiveness) / 2) * 10, 1)


# ------------------------------------------------------------------ #
#  Existing schemas (image-based analysis)
# ------------------------------------------------------------------ #

class ThirdData(BaseModel):
    label: str
    value: float


class RadarData(BaseModel):
    feature: str
    score: int


class CategoryResult(BaseModel):
    name: str
    score: float
    badge: str


class AttributeItem(BaseModel):
    name: str
    score: int
    label: str


class AnalysisResponse(BaseModel):
    id: str
    overall_score: Optional[float] = None
    confidence: Optional[float] = None
    harmony_score: Optional[float] = None
    symmetry_score: Optional[float] = None
    thirds_data: Optional[List[ThirdData]] = None
    radar_data: Optional[List[RadarData]] = None
    highlights: Optional[List[str]] = None
    categories: List[CategoryResult]
    created_at: datetime
    attractiveness: Optional[int] = None
    attributes: Optional[List[AttributeItem]] = None

    model_config = {"from_attributes": True}


class AnalysisCreate(BaseModel):
    photo_front: str  # Base64 encoded


class AnalysisPendingResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    overall_score: Optional[float] = None
    created_at: datetime
    photo_front: Optional[str] = None  # base64 image for admin review


class AnalysisSubmissionResponse(BaseModel):
    """Returned right after a photo is submitted for analysis (pending review)."""
    id: str
    status: str
    photo_front_url: Optional[str] = None
    created_at: datetime


# ------------------------------------------------------------------ #
#  Weekly exercises schemas
# ------------------------------------------------------------------ #

DAY_NAMES = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"]


class DayExercises(BaseModel):
    general: List[str] = Field(default_factory=list, description="General exercises for this day")
    facial: List[str] = Field(default_factory=list, description="Facial exercises for this day")


class WeeklyRoutineCreate(BaseModel):
    days: dict[str, DayExercises]  # key: "Monday".."Sunday"


class WeeklyRoutineResponse(BaseModel):
    id: str
    user_id: str
    exercises: dict  # {"Monday": {"general": [...], "facial": [...]}, ...}
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ------------------------------------------------------------------ #
#  Geometry analysis schemas (coordinate-based)
# ------------------------------------------------------------------ #

class PointSchema(BaseModel):
    """A single 2D anatomical landmark coordinate."""
    x: float = Field(..., description="Horizontal coordinate (px or normalized)")
    y: float = Field(..., description="Vertical coordinate (px or normalized)")


class ThirdResultSchema(BaseModel):
    """Result for a single facial third."""
    label: str
    distance: float = Field(..., description="Vertical distance in the same unit as input")
    percentage: float = Field(..., ge=0, le=100, description="Percentage of total face height")
    deviation: float = Field(..., ge=0, description="Absolute deviation from the ideal 33.3% target")


class ThirdsResponseSchema(BaseModel):
    """Complete facial thirds analysis."""
    superior: ThirdResultSchema
    middle: ThirdResultSchema
    inferior: ThirdResultSchema


class RickettsResponseSchema(BaseModel):
    """Ricketts E-line lip distances."""
    upper_lip_distance: float = Field(
        ..., description="Signed perpendicular distance of upper lip to E-line (positive = anterior)"
    )
    lower_lip_distance: float = Field(
        ..., description="Signed perpendicular distance of lower lip to E-line (positive = anterior)"
    )


class GeometryAnalysisInputSchema(BaseModel):
    """
    Coordinate input for geometric facial analysis.

    Expects pre-extracted landmark coordinates from the frontend
    or an upstream detection pipeline (MediaPipe, dlib, etc.).
    """
    # Front face points — facial thirds
    trichion: PointSchema = Field(..., description="Hairline midpoint")
    glabella: PointSchema = Field(..., description="Point between the eyebrows")
    subnasale_front: PointSchema = Field(..., description="Base of nasal septum (front view)")
    menton_front: PointSchema = Field(..., description="Lowest point of the chin (front view)")

    # Profile points — nasolabial angle & Ricketts
    subnasale_profile: PointSchema = Field(..., description="Base of nasal septum (profile view)")
    pranasale: PointSchema = Field(..., description="Nose tip (most anterior point)")
    labiale_superius: PointSchema = Field(..., description="Upper lip margin")
    labiale_inferius: PointSchema = Field(..., description="Lower lip margin")
    menton_profile: PointSchema = Field(..., description="Chin tip (profile view)")


class GeometryAnalysisResponseSchema(BaseModel):
    """
    Structured response containing all geometric facial measurements.
    """
    thirds: ThirdsResponseSchema
    nasolabial_angle: float = Field(
        ..., description="Nasolabial angle in degrees [0, 180]"
    )
    ricketts: RickettsResponseSchema


# ------------------------------------------------------------------ #
#  Face detection schemas
# ------------------------------------------------------------------ #

class FaceDetectSchema(BaseModel):
    """Input for face detection and cropping."""
    image: str = Field(..., description="Base64 encoded image (data:image/...;base64,...)")


class FaceDetectResponse(BaseModel):
    """Response with cropped face image."""
    cropped_image: str = Field(..., description="Cropped face as base64 data URI")
