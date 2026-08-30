"""
SignalX - Database Engine & Session Management

Supports SQLite (local dev) and PostgreSQL (production) via SQLAlchemy.
Uses pool_pre_ping for Supabase PgBouncer compatibility.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from typing import Generator
from backend.app.config import get_settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def _get_engine():
    """Create the SQLAlchemy engine based on settings."""
    settings = get_settings()
    url = settings.database_url

    connect_args = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    engine = create_engine(
        url,
        connect_args=connect_args,
        pool_pre_ping=True,  # Required for Supabase PgBouncer
        echo=False,
    )

    # Enable WAL mode for SQLite (better concurrent read performance)
    if url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_conn, connection_record):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


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
