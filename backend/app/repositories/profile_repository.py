from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.profile import Profile


class ProfileRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> Profile | None:
        result = await self.db.execute(select(Profile).where(Profile.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, profile_id: str) -> Profile | None:
        result = await self.db.execute(select(Profile).where(Profile.id == profile_id))
        return result.scalar_one_or_none()

    async def create(self, profile: Profile) -> Profile:
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def update_plan(self, profile: Profile, plan) -> None:
        profile.plan = plan
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
