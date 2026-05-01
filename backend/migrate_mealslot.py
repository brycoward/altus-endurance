import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Updating MealSlot enum...")
        try:
            # PostgreSQL doesn't allow ALTER TYPE ADD VALUE inside a transaction block easily 
            # (unless it's the only command), so we use execution_options(isolation_level="AUTOCOMMIT")
            # but since we are using engine.begin(), we should be careful.
            # Actually, asyncpg might handle it if we use conn.execute(text("..."))
            await conn.execute(text("ALTER TYPE mealslot ADD VALUE 'WorkoutFuel';"))
            print("Added WorkoutFuel to MealSlot enum")
        except Exception as e:
            print(f"MealSlot update error: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
