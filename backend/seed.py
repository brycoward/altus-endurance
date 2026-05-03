import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine
from app.models import User, SexEnum, UserGoal, GoalDirection
from app.auth import get_password_hash

async def seed():
    async with AsyncSession(engine, expire_on_commit=False) as session:
        user = User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            email="test@altus.app",
            hashed_password=get_password_hash("password123"),
            name="Test User",
            birth_year=1990,
            height_cm=180.0,
            sex=SexEnum.M,
            timezone="UTC"
        )
        session.add(user)
        
        goal = UserGoal(
            user_id=user.id,
            direction=GoalDirection.maintain,
            weekly_rate_kg=0.0
        )
        session.add(goal)
        
        await session.commit()
        print(f"Seeded user: {user.id}")

if __name__ == "__main__":
    asyncio.run(seed())
