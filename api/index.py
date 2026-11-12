import os
import sys
import shutil
import urllib.parse

# Ensure backend directory is in sys.path
backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, os.path.abspath(backend_dir))

# Set database URL for serverless environment if on Vercel
if os.environ.get("VERCEL"):
    tmp_db = "/tmp/cashflow.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db}"
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    search_paths = [
        os.path.join(repo_root, "backend", "cashflow.db"),
        os.path.join(repo_root, "cashflow.db"),
    ]
    seed_db = None
    for p in search_paths:
        if os.path.exists(p):
            seed_db = p
            break
    if seed_db and (not os.path.exists(tmp_db) or os.path.getsize(tmp_db) == 0):
        try:
            shutil.copyfile(seed_db, tmp_db)
            print(f"Copied seed database from {seed_db} to {tmp_db}")
        except Exception as e:
            print(f"Could not copy seed database to /tmp: {e}")

from app.main import app as fastapi_app

# ASGI Wrapper to intercept Vercel serverless request scope before FastAPI routing
class VercelASGIApp:
    def __init__(self, inner_app):
        self.inner_app = inner_app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            raw_qs = scope.get("query_string", b"").decode("utf-8", "ignore")
            headers = dict(scope.get("headers", []))
            
            # Check __path query parameter from Vercel rewrite: /api/(.*) -> /api/index.py?__path=$1
            q_dict = urllib.parse.parse_qs(raw_qs)
            if "__path" in q_dict:
                sub_path = q_dict.pop("__path")[0].lstrip("/")
                new_path = f"/api/{sub_path}" if sub_path else "/api"
                scope["path"] = new_path
                scope["raw_path"] = new_path.encode("utf-8")
                new_qs = urllib.parse.urlencode(q_dict, doseq=True)
                scope["query_string"] = new_qs.encode("utf-8")
            elif headers.get(b"x-forwarded-uri"):
                uri = headers[b"x-forwarded-uri"].decode("utf-8").split("?")[0]
                if uri.startswith("/api"):
                    scope["path"] = uri
                    scope["raw_path"] = uri.encode("utf-8")
            elif headers.get(b"x-matched-path"):
                matched = headers[b"x-matched-path"].decode("utf-8").split("?")[0]
                if matched.startswith("/api"):
                    scope["path"] = matched
                    scope["raw_path"] = matched.encode("utf-8")

        await self.inner_app(scope, receive, send)

app = VercelASGIApp(fastapi_app)
