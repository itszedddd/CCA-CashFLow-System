import os
import sys
import shutil

# Ensure backend directory is in sys.path
backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, os.path.abspath(backend_dir))

# Set database URL for serverless environment if on Vercel
if os.environ.get("VERCEL"):
    tmp_db = "/tmp/cashflow.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db}"
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    seed_db = os.path.join(repo_root, "backend", "cashflow.db")
    if not os.path.exists(seed_db):
        seed_db = os.path.join(repo_root, "cashflow.db")
    if os.path.exists(seed_db) and (not os.path.exists(tmp_db) or os.path.getsize(tmp_db) == 0):
        try:
            shutil.copyfile(seed_db, tmp_db)
        except Exception as e:
            print(f"Could not copy seed database to /tmp: {e}")

from app.main import app
