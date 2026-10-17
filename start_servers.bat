@echo off
echo ============================================
echo   CCA CashFlow Management System
echo   Calvary Christian Academy
echo ============================================
echo.

echo [1/2] Starting Backend (FastAPI)...
start "CCA-CashFlow-Backend" cmd /k "cd backend && venv\Scripts\activate && python -m uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend (React/Vite)...
start "CCA-CashFlow-Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting...
echo   Backend: http://127.0.0.1:8000
echo   Frontend: http://localhost:5173
echo.
pause
