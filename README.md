# Altus — Autonomous Endurance Nutrition & Performance Agent

## Project Stack
- **Backend:** FastAPI, SQLAlchemy (PostgreSQL 16), Celery (Redis 7)
- **Frontend:** React, Vite, Tailwind CSS, TypeScript
- **Bot:** Telegram Bot (aiogram 3.x)
- **Infrastructure:** Docker Compose

## Quick Start (Development — Hot Reload)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set your values (`SECRET_KEY`, `POSTGRES_PASSWORD`, `LLM_API_KEY`)

3. Start the services:
   ```bash
   docker compose -f docker-compose.dev.yml up -d --build
   ```

4. Access the services:
   - Frontend: http://localhost:5174
   - Backend API Docs: http://localhost:8001/docs
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

## Deploy (Production — Single Machine)

On your production machine:

```bash
# Clone
git clone https://github.com/brycoward/altus-endurance.git
cd altus-endurance

# Configure environment
cp .env.example .env
# Edit .env — set SECRET_KEY, POSTGRES_PASSWORD, LLM_API_KEY

# Build and start
docker compose -f deploy/docker-compose.yml up -d --build

# Verify
curl http://localhost/health
```

The app will be available at `http://<your-machine-ip>`.

### Update to latest

```bash
git pull
docker compose -f deploy/docker-compose.yml up -d --build
```

## LLM Providers

Set `LLM_PROVIDER` in your `.env` (or per-user in Settings):

| Provider   | Model             | Image Support |
|------------|-------------------|:-------------:|
| anthropic  | claude-3-haiku    | ✅            |
| openai     | gpt-4o            | ✅            |
| deepseek   | deepseek-chat     | — (text only) |
| google     | gemini-flash      | ✅            |

## Principles
- LLM is a reasoning/parsing engine only. All data lives in Postgres.
- Never add SQL columns dynamically — use JSONB for flexible fields.
