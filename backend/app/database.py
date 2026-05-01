import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

DATABASE_URL = os.getenv("POSTGRES_DSN", "postgresql+asyncpg://altus:altus@db:5432/altus")

engine = create_async_engine(DATABASE_URL, echo=True, future=True)

async def get_db():
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
