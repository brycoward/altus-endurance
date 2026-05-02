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
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from fastapi import Request
import time

app = FastAPI(title="Altus 2.0 API")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    if os.getenv("DEBUG_REQUESTS", "false").lower() == "true":
        duration = time.time() - start_time
        print(f"DEBUG: {request.method} {request.url.path} - {response.status_code} ({duration:.2f}s)")
    return response

_frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5174")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_frontend_origin],
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

# SPA Static File Serving
if os.path.exists("static"):
    @app.exception_handler(StarletteHTTPException)
    async def custom_404_handler(request: Request, exc: StarletteHTTPException):
        if exc.status_code == 404 and not request.url.path.startswith("/api"):
            return FileResponse("static/index.html")
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    app.mount("/", StaticFiles(directory="static", html=True), name="static")
