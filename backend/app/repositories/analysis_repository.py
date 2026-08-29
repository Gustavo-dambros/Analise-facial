from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.analysis import FacialAnalysis, AnalysisCategory
from app.models.profile import Profile
from datetime import datetime, timezone


class AnalysisRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, analysis_id: str) -> FacialAnalysis | None:
        result = await self.db.execute(
            select(FacialAnalysis)
            .options(selectinload(FacialAnalysis.categories))
            .where(FacialAnalysis.id == analysis_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user(self, user_id: str) -> list[FacialAnalysis]:
        result = await self.db.execute(
            select(FacialAnalysis)
            .options(selectinload(FacialAnalysis.categories))
            .where(FacialAnalysis.user_id == user_id)
            .order_by(FacialAnalysis.created_at.desc())
        )
        return list(result.scalars().all())

    async def count_monthly_analyses(self, user_id: str) -> int:
        """Count analyses created by the user in the current calendar month."""
        now = datetime.now(timezone.utc)
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        result = await self.db.execute(
            select(func.count(FacialAnalysis.id)).where(
                and_(
                    FacialAnalysis.user_id == user_id,
                    FacialAnalysis.created_at >= first_of_month,
                )
            )
        )
        return result.scalar() or 0

    async def create(self, analysis_data: dict) -> FacialAnalysis:
        categories_data = analysis_data.pop("categories", [])
        analysis = FacialAnalysis(**analysis_data)
        self.db.add(analysis)
        await self.db.flush()

        for cat_data in categories_data:
            category = AnalysisCategory(analysis_id=analysis.id, **cat_data)
            self.db.add(category)

        await self.db.commit()
        await self.db.refresh(analysis)
        return analysis

    async def get_pending(self) -> list[dict]:
        result = await self.db.execute(
            select(FacialAnalysis, Profile.full_name)
            .join(Profile, FacialAnalysis.user_id == Profile.id)
            .where(FacialAnalysis.status == "pending")
            .order_by(FacialAnalysis.created_at.desc())
        )
        return [
            {
                "id": analysis.id,
                "user_id": analysis.user_id,
                "user_name": full_name,
                "overall_score": analysis.overall_score,
                "created_at": analysis.created_at,
                "photo_front": analysis.photo_front_data,
            }
            for analysis, full_name in result.all()
        ]
