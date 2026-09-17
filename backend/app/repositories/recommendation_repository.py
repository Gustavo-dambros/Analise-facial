from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.recommendation import Recommendation, PlanAssignment
from app.models.profile import Profile


class RecommendationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: UUID,
        title: str,
        description: str,
        category: Optional[str] = None,
    ) -> Recommendation:
        rec = Recommendation(
            user_id=user_id,
            title=title.strip(),
            description=description.strip(),
            category=category,
        )
        self.db.add(rec)
        await self.db.commit()
        await self.db.refresh(rec)
        return rec

    async def get_by_id(self, rec_id: UUID) -> Optional[Recommendation]:
        result = await self.db.execute(
            select(Recommendation)
            .options(selectinload(Recommendation.user))
            .where(Recommendation.id == rec_id)
        )
        return result.scalar_one_or_none()

    async def get_user_recommendations(
        self, user_id: UUID, limit: int = 20, offset: int = 0
    ) -> List[Recommendation]:
        result = await self.db.execute(
            select(Recommendation)
            .where(Recommendation.user_id == user_id)
            .order_by(desc(Recommendation.created_at))
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()

    async def count_user_recommendations(self, user_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count(Recommendation.id)).where(Recommendation.user_id == user_id)
        )
        return result.scalar() or 0

    async def count_recent_by_user(
        self, user_id: UUID, hours: int = 24
    ) -> int:
        from datetime import datetime, timedelta, timezone
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        result = await self.db.execute(
            select(func.count(Recommendation.id))
            .where(Recommendation.user_id == user_id)
            .where(Recommendation.created_at >= cutoff)
        )
        return result.scalar() or 0


class PlanAssignmentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        assigned_by: UUID,
        target_email: str,
        plan_type: str,
        notes: Optional[str] = None,
        target_user_id: Optional[UUID] = None,
    ) -> PlanAssignment:
        assignment = PlanAssignment(
            assigned_by=assigned_by,
            target_email=target_email.lower().strip(),
            plan_type=plan_type,
            notes=notes,
            target_user_id=target_user_id,
        )
        self.db.add(assignment)
        await self.db.commit()
        await self.db.refresh(assignment)
        return assignment

    async def get_by_id(self, assignment_id: UUID) -> Optional[PlanAssignment]:
        result = await self.db.execute(
            select(PlanAssignment)
            .options(
                selectinload(PlanAssignment.assigner),
                selectinload(PlanAssignment.target_user),
            )
            .where(PlanAssignment.id == assignment_id)
        )
        return result.scalar_one_or_none()

    async def get_by_assigner(
        self, assigned_by: UUID, limit: int = 50, offset: int = 0
    ) -> List[PlanAssignment]:
        result = await self.db.execute(
            select(PlanAssignment)
            .options(selectinload(PlanAssignment.target_user))
            .where(PlanAssignment.assigned_by == assigned_by)
            .order_by(desc(PlanAssignment.created_at))
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()

    async def get_pending_by_email(self, email: str) -> List[PlanAssignment]:
        result = await self.db.execute(
            select(PlanAssignment)
            .where(PlanAssignment.target_email == email.lower().strip())
            .where(PlanAssignment.status == "pending")
            .order_by(desc(PlanAssignment.created_at))
        )
        return result.scalars().all()

    async def mark_applied(self, assignment_id: UUID, target_user_id: UUID) -> bool:
        assignment = await self.get_by_id(assignment_id)
        if not assignment or assignment.status != "pending":
            return False
        from datetime import datetime, timezone
        assignment.status = "applied"
        assignment.target_user_id = target_user_id
        assignment.applied_at = datetime.now(timezone.utc)
        await self.db.commit()
        return True

    async def mark_failed(self, assignment_id: UUID, reason: str) -> bool:
        assignment = await self.get_by_id(assignment_id)
        if not assignment:
            return False
        assignment.status = "failed"
        assignment.notes = (assignment.notes or "") + f"\n[FAILED] {reason}"
        await self.db.commit()
        return True