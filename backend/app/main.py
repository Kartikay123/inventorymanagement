"""FastAPI application entry point.

Wires together configuration, database initialization, CORS, global error
handlers and the product / customer / order / dashboard routers.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from .config import settings
from .database import Base, engine, wait_for_db
from .routers import customers, dashboard, orders, products


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure the database is reachable, create tables, optionally seed.
    wait_for_db()
    Base.metadata.create_all(bind=engine)
    if settings.SEED_DATA:
        from .seed import seed_if_empty

        seed_if_empty()
    yield
    # Shutdown: nothing to clean up (sessions are request-scoped).


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Manage products, customers and orders with automatic stock tracking.",
    lifespan=lifespan,
)

# ---- CORS -------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Global error handlers --------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return a clean, consistent 422 payload for validation failures."""
    errors = []
    for err in exc.errors():
        location = " -> ".join(str(p) for p in err.get("loc", []) if p != "body")
        errors.append({"field": location or "request", "message": err.get("msg", "Invalid value")})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation failed", "errors": errors},
    )


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    """Safety net for any database constraint violation that slips through."""
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "A database constraint was violated (duplicate or invalid reference)."},
    )


# ---- Routers ----------------------------------------------------------------
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(dashboard.router)


# ---- Health & root ----------------------------------------------------------
@app.get("/", tags=["Health"])
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    """Liveness/readiness probe used by Docker and cloud platforms."""
    return {"status": "healthy"}
