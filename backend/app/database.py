"""
SignalX - Database Engine & Session Management

Supports SQLite (local dev) and PostgreSQL (production) via SQLAlchemy.
Uses pool_pre_ping for Supabase PgBouncer compatibility.
"""

import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from typing import Generator
from backend.app.config import get_settings

logger = logging.getLogger("SignalX.database")


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def _get_engine():
    """Create the SQLAlchemy engine based on settings with resilient fallback."""
    settings = get_settings()
    url = (settings.database_url or "").strip()

    if not url:
        url = "sqlite:///./data/SignalX.db"

    # Fix legacy / Render postgres:// format
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

    connect_args = {}
    engine_kwargs = {
        "echo": False,
        "pool_pre_ping": True,  # Required for Supabase PgBouncer & cloud resilience
    }

    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        # Ensure SQLite target directory exists
        db_path = url.replace("sqlite:///", "").split("?")[0]
        if db_path and not db_path.startswith(":memory:"):
            db_dir = os.path.dirname(os.path.abspath(db_path))
            if db_dir:
                os.makedirs(db_dir, exist_ok=True)
    else:
        # PostgreSQL connection pool settings
        engine_kwargs["pool_size"] = 10
        engine_kwargs["max_overflow"] = 20
        engine_kwargs["pool_recycle"] = 300

    try:
        engine = create_engine(url, connect_args=connect_args, **engine_kwargs)

        # Enable WAL mode for SQLite (better concurrent read performance)
        if url.startswith("sqlite"):
            @event.listens_for(engine, "connect")
            def set_sqlite_pragma(dbapi_conn, connection_record):
                cursor = dbapi_conn.cursor()
                try:
                    cursor.execute("PRAGMA journal_mode=WAL")
                    cursor.execute("PRAGMA foreign_keys=ON")
                except Exception:
                    pass
                finally:
                    cursor.close()

        return engine

    except Exception as exc:
        logger.warning(
            "Failed to initialize database engine with URL '%s': %s. Falling back to local SQLite.",
            url,
            exc,
        )
        os.makedirs("data", exist_ok=True)
        fallback_url = "sqlite:///./data/SignalX.db"
        return create_engine(
            fallback_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
            echo=False,
        )


# Module-level engine and session factory
engine = _get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables in the database."""
    # Import all models to ensure they're registered with Base
    import backend.app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Drop all tables (use with caution for testing only)."""
    import backend.app.models  # noqa: F401
    Base.metadata.drop_all(bind=engine)

