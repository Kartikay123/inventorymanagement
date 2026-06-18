"""Database engine, session factory and the FastAPI session dependency.

The same code path supports both SQLite (local, zero-config) and PostgreSQL
(Docker / production) — the only difference is the connection URL.
"""

import time
from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings


def _normalize_url(url: str) -> str:
    """Normalize provider-supplied connection strings.

    Render / Railway / Heroku hand out URLs starting with `postgres://`, a scheme
    SQLAlchemy 2.0 no longer recognizes. Rewrite it to the explicit psycopg2
    driver form so the same value works everywhere without manual editing.
    """
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


DATABASE_URL = _normalize_url(settings.DATABASE_URL)

# SQLite needs `check_same_thread=False` to be usable across FastAPI's threads.
_is_sqlite = DATABASE_URL.startswith("sqlite")
_connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=True,  # transparently recover dropped connections
    future=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a request-scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def wait_for_db(max_retries: int = 10, delay: float = 2.0) -> None:
    """Block until the database accepts connections.

    PostgreSQL inside Docker Compose can take a few seconds to become ready even
    with a healthcheck, so we retry rather than crash on the first attempt.
    """
    last_error: Optional[Exception] = None
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.exec_driver_sql("SELECT 1")
            return
        except OperationalError as exc:  # pragma: no cover - timing dependent
            last_error = exc
            print(f"[db] not ready (attempt {attempt}/{max_retries}); retrying in {delay}s...")
            time.sleep(delay)
    raise RuntimeError(f"Database not reachable after {max_retries} attempts") from last_error
