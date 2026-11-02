from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if os.environ.get("VERCEL"):
        DATABASE_URL = "sqlite:////tmp/cashflow.db"
    else:
        backend_dir = Path(__file__).resolve().parent.parent
        repo_dir = backend_dir.parent
        # Prefer backend/cashflow.db, fallback to root cashflow.db
        if (backend_dir / "cashflow.db").exists():
            db_file = backend_dir / "cashflow.db"
        elif (repo_dir / "cashflow.db").exists():
            db_file = repo_dir / "cashflow.db"
        else:
            db_file = backend_dir / "cashflow.db"
        DATABASE_URL = f"sqlite:///{db_file.as_posix()}"

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
