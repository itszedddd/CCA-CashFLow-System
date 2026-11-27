from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .database import engine, Base, SessionLocal
from .models.models import User, Student, PaymentNotification
from .api import auth, income, dashboard, anomaly, students, notifications
from .seed_data import seed_database
from .auth import get_password_hash
from .core.timezone import ph_now_iso, resolve_section, generate_lrn_password
import os

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CCA FlowSys — Calvary Christian Academy CashFlow Management System",
    description="Calvary Christian Academy Student Fee Collections & ML Anomaly Detection System",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers (Expenses & Disbursements excluded per v2.0 study scope)
app.include_router(auth.router)
app.include_router(income.router)
app.include_router(dashboard.router)
app.include_router(anomaly.router)
app.include_router(students.router)
app.include_router(notifications.router)


def _ensure_sqlite_migrations(db):
    """Non-destructive column & institutional role/LRN password synchronization."""
    try:
        cols = [r[1] for r in db.execute(text("PRAGMA table_info(students)")).fetchall()]
        if "initial_password" not in cols:
            db.execute(text("ALTER TABLE students ADD COLUMN initial_password TEXT"))
        if "password_changed" not in cols:
            db.execute(text("ALTER TABLE students ADD COLUMN password_changed INTEGER DEFAULT 0"))
        db.commit()
    except Exception as e:
        print(f"Schema migration note: {e}")

    # Seed/ensure Admin, Cashier, Principal accounts
    now_iso = ph_now_iso()
    required_staff = [
        ("cashier@cca.edu.ph", "Maria Santos", "Cashier"),
        ("admin@cca.edu.ph", "Michelle Jean Gormley", "Admin"),
        ("principal@cca.edu.ph", "Pastor David Reyes, M.Div.", "Principal"),
    ]
    for uname, fname, role in required_staff:
        u = db.query(User).filter(User.username == uname).first()
        if not u:
            db.add(User(
                username=uname,
                full_name=fname,
                hashed_password=get_password_hash("password123"),
                role=role,
                is_active=1,
                created_at=now_iso
            ))
    db.commit()

    # Sync deterministic Grade->Section & ensure every student LRN has its own unique generated initial password
    all_students = db.query(Student).all()
    for st in all_students:
        canonical_sec = resolve_section(st.grade_level, st.section or "Faith")
        if st.section != canonical_sec:
            st.section = canonical_sec
        if not st.parent_username:
            st.parent_username = st.student_id
        if not getattr(st, "password_changed", 0) and not getattr(st, "initial_password", None):
            gen_pw = generate_lrn_password(st.student_id)
            st.initial_password = gen_pw
            st.parent_password_hash = get_password_hash(gen_pw)
            st.password_changed = 0
    db.commit()

    # Purge auto-generated overdue balance spam from Announcements board (Inspection Report 2.5.1)
    try:
        db.query(PaymentNotification).filter(
            PaymentNotification.title.like("Official Overdue Balance Notice%")
        ).delete(synchronize_session=False)
        db.commit()
    except Exception:
        pass


def init_db():
    try:
        db = SessionLocal()
        _ensure_sqlite_migrations(db)
        seed_database(db)
        _ensure_sqlite_migrations(db)
        db.close()
    except Exception as e:
        print(f"Database initialization note: {e}")


init_db()


@app.on_event("startup")
def startup_event():
    init_db()


from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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
        "system": "CCA FlowSys v2.0",
        "school": "Calvary Christian Academy",
        "version": "2.0.0",
        "status": "running"
    }


@app.get("/api")
@app.get("/api/")
@app.get("/api/index")
def api_root():
    return {
        "system": "CCA FlowSys v2.0",
        "school": "Calvary Christian Academy",
        "version": "2.0.0",
        "status": "running"
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


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

    return {"system": "CCA FlowSys v2.0", "status": "running"}
