import asyncio
from sqlmodel import SQLModel
from app.database import engine
from app.models import User, UserGoal, FoodLog, ActivityLog, HealthMetric, DailySnapshot

async def reset_db():
    print("Resetting database...")
    async with engine.begin() as conn:
        # We need to drop in reverse order of dependencies or use CASCADE
        # SQLModel doesn't have a direct async drop_all that handles dependencies easily without some boilerplate
        # But we can just use the metadata
        await conn.run_sync(SQLModel.metadata.drop_all)
        print("Tables dropped.")
        await conn.run_sync(SQLModel.metadata.create_all)
        print("Tables created.")
    print("Database reset complete.")

if __name__ == "__main__":
    asyncio.run(reset_db())
