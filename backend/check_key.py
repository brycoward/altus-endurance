import asyncio
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.begin() as conn:
        result = await conn.execute(text('SELECT llm_provider, llm_api_key FROM "user";'))
        rows = result.fetchall()
        for row in rows:
            print(f"Provider: {row[0]}, Key Length: {len(row[1]) if row[1] else 0}")

if __name__ == "__main__":
    asyncio.run(check())
