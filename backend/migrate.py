import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Checking for missing columns...")
        # Add llm_api_key
        try:
            await conn.execute(text('ALTER TABLE "user" ADD COLUMN llm_api_key TEXT;'))
            print("Added llm_api_key")
        except Exception as e:
            print(f"llm_api_key check: {e}")
            
        # Add llm_provider
        try:
            await conn.execute(text("ALTER TABLE \"user\" ADD COLUMN llm_provider TEXT DEFAULT 'anthropic';"))
            print("Added llm_provider")
        except Exception as e:
            print(f"llm_provider check: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
