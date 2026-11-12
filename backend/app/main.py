from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from .database import engine, Base, SessionLocal
from .models.models import *  # Import all models for table creation
from .api import auth, income, expenses, dashboard, anomaly, students, notifications
from .seed_data import seed_database
import urllib.parse
import os

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CCA CashFlow Management System",
    description="Calvary Christian Academy - School Cashflow Management System",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(income.router)
app.include_router(expenses.router)
app.include_router(dashboard.router)
app.include_router(anomaly.router)
app.include_router(students.router)
app.include_router(notifications.router)


def init_db():
    try:
        db = SessionLocal()
        seed_database(db)
        db.close()
    except Exception as e:
        print(f"Database initialization note: {e}")

init_db()


@app.on_event("startup")
def startup_event():
    init_db()


from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Check for built frontend dist directory
dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
assets_dir = os.path.join(dist_dir, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/")
def root():
    index_file = os.path.join(dist_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "system": "CCA CashFlow Management System",
        "school": "Calvary Christian Academy",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/api")
@app.get("/api/")
@app.get("/api/index")
def api_root():
    return {
        "system": "CCA CashFlow Management System",
        "school": "Calvary Christian Academy",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/debug")
def debug_info():
    """Debug endpoint to check Vercel environment."""
    import glob
    return {
        "is_vercel": bool(os.environ.get("VERCEL")),
        "db_exists": os.path.exists("/tmp/cashflow.db") if os.environ.get("VERCEL") else "N/A",
        "db_url": os.environ.get("DATABASE_URL", "not set"),
        "routes": [
            {"path": r.path, "methods": list(r.methods) if hasattr(r, "methods") else []}
            for r in app.routes
            if hasattr(r, "path") and r.path.startswith("/api")
        ],
    }


@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
def serve_frontend_or_spa(full_path: str):
    if full_path.startswith("api"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="API endpoint not found")

    file_path = os.path.join(dist_dir, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)

    index_file = os.path.join(dist_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)

    return {"system": "CCA CashFlow Management System", "status": "running"}
