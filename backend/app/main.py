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


@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


@app.get("/")
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
