import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from app.database import get_db, engine
from app.models import User
from app.api.v1 import router as v1_router
from app.api.auth import router as auth_router
from app.api.data import router as data_router
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from fastapi import Request
import time

app = FastAPI(title="Altus 2.0 API")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    print(f"DEBUG: {request.method} {request.url.path} - {response.status_code} ({duration:.2f}s)")
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"Validation Error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(v1_router, prefix="/api")
app.include_router(data_router, prefix="/api/data", tags=["data"])



@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}

@app.on_event("startup")
async def on_startup():
    # Placeholder for startup logic
    pass
