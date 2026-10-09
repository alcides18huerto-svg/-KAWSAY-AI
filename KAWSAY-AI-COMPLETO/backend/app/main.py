import logging
import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import check_database_connection
from app.api import api
from app.modules.auth.routes import router as auth_router
from app.modules.sync.routes import router as sync_router
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s request_id=%(request_id)s %(message)s",
)
logger = logging.getLogger("kawsay.api")

@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("KAWSAY backend starting", extra={"request_id": "startup"})
    yield
    logger.info("KAWSAY backend stopping", extra={"request_id": "shutdown"})

app = FastAPI(
    title="KAWSAY AI API",
    version="0.1.0",
    description="API modular de KAWSAY AI",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Request-ID"],
)

@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled request error", extra={"request_id": request_id})
        response = JSONResponse(status_code=500, content={"code": "INTERNAL_ERROR", "message": "Error interno", "request_id": request_id})
    response.headers["X-Request-ID"] = request_id
    logger.info("request completed", extra={"request_id": request_id, "duration_ms": round((time.perf_counter() - started) * 1000, 2)})
    return response
@app.get("/health", tags=["operations"])
def health():
    return {"status": "ok", "service": "kawsay-backend", "environment": settings.app_env}

@app.get("/ready", tags=["operations"])
def readiness():
    database_ok = check_database_connection()
    payload = {"status": "ready" if database_ok else "not_ready", "database": "ok" if database_ok else "unavailable"}
    return JSONResponse(status_code=200 if database_ok else 503, content=payload)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(sync_router, prefix="/api/v1")
app.include_router(api)
