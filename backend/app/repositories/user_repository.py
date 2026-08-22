from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
import bcrypt
from app.models.user import User
from app.schemas.auth import UserCreate


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_verification_token(self, token: str) -> User | None:
        result = await self.db.execute(select(User).where(User.verification_token == token))
        return result.scalar_one_or_none()

    async def get_by_reset_token(self, token: str) -> User | None:
        result = await self.db.execute(select(User).where(User.reset_token == token))
        return result.scalar_one_or_none()
    async def create(self, user_data: UserCreate) -> User:
        user = User(
            email=user_data.email,
            hashed_password=bcrypt.hashpw(
                user_data.password.encode(), bcrypt.gensalt()
            ).decode(),
            full_name=user_data.full_name,
            is_active=False,
            is_verified=False,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def set_verification_token(self, user_id: str, token: str, expires: datetime) -> None:
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(verification_token=token, verification_token_expires=expires)
        )
        await self.db.commit()

    async def verify_user(self, user: User) -> None:
        await self.db.execute(
            update(User)
            .where(User.id == user.id)
            .values(
                is_verified=True,
                is_active=True,
                verification_token=None,
                verification_token_expires=None,
            )
        )
        await self.db.commit()

    async def update_password(self, user: User, new_password: str) -> None:
        await self.db.execute(
            update(User)
            .where(User.id == user.id)
            .values(
                hashed_password=bcrypt.hashpw(
                    new_password.encode(), bcrypt.gensalt()
                ).decode(),
                reset_token=None,
                reset_token_expires=None,
            )
        )
        await self.db.commit()

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(
            plain_password.encode(), hashed_password.encode()
        )