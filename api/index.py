import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, os.path.abspath(backend_dir))

# Set database URL for serverless environment if on Vercel
if os.environ.get("VERCEL"):
    os.environ["DATABASE_URL"] = "sqlite:////tmp/cashflow.db"

from app.main import app
