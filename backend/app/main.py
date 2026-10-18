from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SessionLocal
from .models.models import *  # Import all models for table creation
from .api import auth, income, expenses, dashboard
from .seed_data import seed_database

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


@app.get("/")
@app.get("/api")
def root():
    return {
        "system": "CCA CashFlow Management System",
        "school": "Calvary Christian Academy",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}
