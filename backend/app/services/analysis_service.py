import json
import logging
import httpx
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.analysis_repository import AnalysisRepository
from app.schemas.analysis import (
    AnalysisCreate,
    AnalysisResponse,
    AttributeItem,
    ATTRIBUTE_NAMES,
    attribute_score_to_label,
    compute_symmetry,
    compute_overall,
)
from app.core.config import settings
from app.core.exceptions import SanitizedHTTPException
from app.models.profile import PlanType

logger = logging.getLogger(__name__)


# ---- Monthly analysis limits per plan ----
PLAN_MONTHLY_LIMITS: dict[PlanType | str, int] = {
    PlanType.free: 3,
    PlanType.pro: 5,
    PlanType.enterprise: -1,  # unlimited
}


SYSTEM_PROMPT = """\
You are a world-class expert in Visagism and Facial Aesthetics with over 30 years of experience in morphological analysis, facial proportionality, and aesthetic harmony.

Analyze the provided frontal facial photograph and produce a complete qualitative and quantitative evaluation of the user's facial anatomy.

## Analysis Rules
1. Evaluate facial symmetry comparing left and right sides.
2. Analyze the facial thirds (superior, middle, inferior) and their balance.
3. Assess mandibular contour and profile definition.
4. Identify strengths and areas for improvement constructively.
5. Age estimates should be realistic and fair — do not artificially inflate or deflate.

## Validation
If the image does not contain a human face (animals, objects, or corrupted images), return EXACTLY:
{"error": true, "message": "No human face detected in the provided image"}

## Output Format
Return ONLY valid JSON, without any additional text before or after. The JSON must EXACTLY follow this structure:

{
  "attractiveness": <0-10>,
  "attributes": {
    "Terco Superior": <ordinal scale 0-10>,
    "Terco Medio": <ordinal scale 0-10>,
    "Terco Inferior": <ordinal scale 0-10>,
    "Olhos": <ordinal scale 0-10>,
    "Sobrancelhas": <ordinal scale 0-10>,
    "Nariz": <ordinal scale 0-10>,
    "Labios": <ordinal scale 0-10>,
    "Mandibula": <ordinal scale 0-10>,
    "Queixo": <ordinal scale 0-10>,
    "Maçãs do Rosto": <ordinal scale 0-10>,
    "Testa": <ordinal scale 0-10>,
    "Formato do Rosto": <ordinal scale 0-10>
  },
  "thirds_data": [<superior_third>, <middle_third>, <inferior_third>],
  "highlights": ["<highlight_1>", "<highlight_2>", "<highlight_3>", "<highlight_4>"],
  "visagismo_tips": {
    "formato_rosto": "<face shape description>",
    "cabelo": "<haircut recommendations>",
    "barba": "<beard recommendations, if applicable>",
    "oculos": "<glasses recommendations>"
  }
}

The attributes must be integers from 0 - 10.
The thirds_data must sum to approximately 100 (e.g., [33.3, 33.3, 33.4]).
The highlights must contain between 1 and 4 strings describing the most positive aspects.
The attractiveness must be an integer from 0-10 representing the Atratividade grade.
"""


def _get_http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=settings.OPENROUTER_BASE_URL,
        headers={
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "HTTP-Referer": settings.OPENROUTER_REFERER,
            "X-Title": "FaceMax",
        },
        timeout=httpx.Timeout(settings.OPENROUTER_TIMEOUT, connect=5.0),
        limits=httpx.Limits(
            max_connections=20,
            max_keepalive_connections=10,
            keepalive_expiry=30,
        ),
    )


class AnalysisService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.analysis_repo = AnalysisRepository(db)

    async def check_monthly_limit(self, user) -> None:
        """Verify the user has not exceeded their monthly analysis quota.

        Raises HTTPException(403) when the limit is reached.
        Admin/superuser users are exempt from limits.
        """
        # `is_superuser` may be set on detached test instances but is not a column
        # on the production Profile model, so guard with getattr.
        if getattr(user, "is_superuser", False) or user.role == "admin":
            logger.info("User %s is superuser — skipping monthly limit check", user.id)
            return

        plan = user.plan
        limit = PLAN_MONTHLY_LIMITS.get(plan, PLAN_MONTHLY_LIMITS[PlanType.free])

        # Unlimited plans (-1)
        if limit == -1:
            return

        count = await self.analysis_repo.count_monthly_analyses(user.id)

        if count >= limit:
            plan_label = "Gratuito" if plan == PlanType.free else "Profissional" if plan == PlanType.pro else str(plan)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Limite mensal de analises atingido no plano {plan_label}.",
            )

        logger.info(
            "User %s plan=%s — monthly usage %d/%d",
            user.id, plan, count, limit,
        )

    async def _call_ai(self, image_b64: str) -> dict:
        """Send image to OpenRouter and return structured JSON analysis."""
        if image_b64.startswith("data:"):
            image_b64 = image_b64.split(",", 1)[1]

        import base64 as _b64
        size_bytes = len(_b64.b64decode(image_b64))
        max_bytes = settings.MAX_IMAGE_BASE64_SIZE_MB * 1024 * 1024
        if size_bytes > max_bytes:
            raise SanitizedHTTPException(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                f"Imagem excede o limite de {settings.MAX_IMAGE_BASE64_SIZE_MB}MB.",
                f"Image size: {size_bytes} bytes",
            )

        data_url = f"data:image/jpeg;base64,{image_b64}"

        payload = {
            "model": settings.OPENROUTER_MODEL,
            "temperature": 0.4,
            "max_tokens": 2048,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Analyze this frontal facial photograph and return the structured JSON evaluation as per the system instructions.",
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url},
                        },
                    ],
                },
            ],
        }

        async with _get_http_client() as client:
            try:
                resp = await client.post("/chat/completions", json=payload)
                resp.raise_for_status()
            except httpx.TimeoutException:
                raise SanitizedHTTPException(
                    status.HTTP_504_GATEWAY_TIMEOUT,
                    "A API de analise demorou para responder. Tente novamente.",
                    "OpenRouter timeout",
                )
            except httpx.HTTPStatusError as exc:
                raise SanitizedHTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    "Erro ao comunicar com a API de analise. Tente novamente.",
                    f"OpenRouter HTTP {exc.response.status_code}: {exc.response.text[:300]}",
                )
            except Exception as exc:
                raise SanitizedHTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    "Erro ao comunicar com a API de analise. Tente novamente.",
                    str(exc),
                )

            body = resp.json()
            raw = body.get("choices", [{}])[0].get("message", {}).get("content", "")
            if not raw:
                raise SanitizedHTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    "A API de analise retornou uma resposta vazia.",
                    "Empty response from OpenRouter",
                )

        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            raise SanitizedHTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "A API de analise retornou uma resposta invalida.",
                f"Invalid JSON from AI: {raw[:200]}",
            )

        if isinstance(result, dict) and result.get("error"):
            raise SanitizedHTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                result.get("message", "Rosto humano nao detectado na imagem fornecida"),
                "IA detectou ausencia de rosto",
            )

        return result

    def _map_to_response(self, ai_result: dict) -> dict:
        """Map AI JSON output with 13 attributes + automatic scoring."""
        attractiveness = int(ai_result.get("attractiveness", 5))
        raw_attributes = ai_result.get("attributes", {})

        # Merge with partial attributes if present, fallback for signers
        attributes: dict[str, int] = {}
        for name in ATTRIBUTE_NAMES:
            value = raw_attributes.get(name, 5)
            attributes[name] = max(1, min(10, int(value)))

        # Generate attribute items with badges
        attribute_items = [
            {"name": name, "score": score, "badge": attribute_score_to_label(score)}
            for name, score in attributes.items()
        ]

        # All scores
        symmetry = compute_symmetry(attributes)
        overall = compute_overall(symmetry, attractiveness)

        thirds_pcts = ai_result.get("thirds_data", [33.3, 33.3, 33.4])
        thirds_data = [
            {"label": "Terco Superior (Testa)", "value": round(thirds_pcts[0], 1)},
            {"label": "Terco Medio (Nariz)", "value": round(thirds_pcts[1], 1)},
            {"label": "Terco Inferior (Mandibula)", "value": round(thirds_pcts[2], 1)},
        ]

        radar_data = [{"feature": name, "score": score} for name, score in attributes.items()]

        highlights = ai_result.get("highlights", [])
        if not highlights:
            highlights = ["Analise facial completa"]

        categories = attribute_items

        return {
            "overall_score": overall,
            "confidence": 1.0,
            "harmony_score": overall,
            "symmetry_score": symmetry,
            "thirds_data": thirds_data,
            "radar_data": radar_data,
            "highlights": highlights[:4],
            "categories": categories,
            "visagismo_tips": ai_result.get("visagismo_tips", {}),
            "attractiveness": attractiveness,
            "attributes": attributes,
        }

    async def analyze(self, data: AnalysisCreate, user_id: str, current_user=None) -> AnalysisResponse:
        # Enforce monthly usage limits (security: backend is the authority)
        if current_user is not None:
            await self.check_monthly_limit(current_user)

        ai_result = await self._call_ai(data.photo_front)
        result = self._map_to_response(ai_result)

        db_analysis = await self.analysis_repo.create({
            "user_id": user_id,
            "overall_score": result["overall_score"],
            "confidence": result["confidence"],
            "harmony_score": result["harmony_score"],
            "symmetry_score": result["symmetry_score"],
            "thirds_data": result["thirds_data"],
            "radar_data": result["radar_data"],
            "highlights": result["highlights"],
            "categories": result["categories"],
            "attractiveness": result["attractiveness"],
            "attributes_data": result["attributes"],
            "photo_front_url": None,
            "photo_right_url": None,
            "photo_left_url": None,
        })

        return AnalysisResponse(
            id=db_analysis.id,
            overall_score=db_analysis.overall_score,
            confidence=db_analysis.confidence,
            harmony_score=db_analysis.harmony_score,
            symmetry_score=db_analysis.symmetry_score,
            thirds_data=db_analysis.thirds_data,
            radar_data=db_analysis.radar_data,
            highlights=db_analysis.highlights,
            categories=[
                {"name": cat.name, "score": cat.score, "badge": cat.badge}
                for cat in db_analysis.categories
            ],
            attractiveness=db_analysis.attractiveness,
            attributes=[AttributeItem(**attr) for attr in (db_analysis.attributes_data or [])],
            created_at=db_analysis.created_at,
        )

    async def get_user_analyses(self, user_id: str) -> list[AnalysisResponse]:
        analyses = await self.analysis_repo.get_by_user(user_id)
        return [
            AnalysisResponse(
                id=a.id,
                overall_score=a.overall_score,
                confidence=a.confidence,
                harmony_score=a.harmony_score,
                symmetry_score=a.symmetry_score,
                thirds_data=a.thirds_data,
                radar_data=a.radar_data,
                highlights=a.highlights,
                categories=[
                    {"name": cat.name, "score": cat.score, "badge": cat.badge}
                    for cat in a.categories
                ],
                attractiveness=a.attractiveness,
                attributes=[AttributeItem(**attr) for attr in (a.attributes_data or [])],
                created_at=a.created_at,
            )
            for a in analyses
        ]
