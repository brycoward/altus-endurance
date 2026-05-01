# Altus — Autonomous Endurance Nutrition & Performance Agent

## Project Stack
- **Backend:** FastAPI, SQLAlchemy (PostgreSQL 16), Celery (Redis 7)
- **Frontend:** React, Vite, Tailwind CSS, TypeScript
- **Bot:** Telegram Bot (aiogram 3.x)
- **Infrastructure:** Docker Compose

## Quick Start

1. Copy `.env.example` to `.env` in the `infra` directory:
   ```bash
   cp infra/.env.example infra/.env
   ```

2. Start the services using Docker Compose:
   ```bash
   cd infra
   docker-compose up -d --build
   ```

3. Access the services:
   - Frontend: http://localhost:5173
   - Backend API Docs: http://localhost:8000/docs
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

## Principles
- LLM is a reasoning/parsing engine only. All data lives in Postgres.
- Never add SQL columns dynamically — use JSONB for flexible fields.
