# CCA CashFlow Management System
## Calvary Christian Academy — School Cashflow Management System

A full-stack web application for tracking all school income (tuition, fees, donations) and expenses (salaries, utilities, supplies), with dashboards, budget management, approval workflows, and audit logging.

---

## 🛠️ Technology Stack
| Component | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, TailwindCSS 4 |
| **Backend** | FastAPI (Python), SQLAlchemy |
| **Database** | SQLite |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Auth** | JWT (python-jose), bcrypt |

---

## 🚀 Setup Guide

### Prerequisites
- **Node.js** 18+ (for frontend)
- **Python** 3.10+ (for backend)

### Step 1: Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Step 2: Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Quick Start (Windows)
Just run `start_servers.bat` to launch both servers.

---

## 🔑 Default Login Credentials
| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | admin@cca.edu.ph | password123 |
| **Cashier** | cashier@cca.edu.ph | password123 |
| **Accountant** | accountant@cca.edu.ph | password123 |
| **Principal** | principal@cca.edu.ph | password123 |

---

## 📋 Features
- **Dashboard** — Real-time cashflow overview with charts, stat cards, monthly trends
- **Income Tracking** — Record tuition, fees, donations with OR numbers
- **Expense Management** — Record expenses with approval workflow (Admin/Principal)
- **Budget Allocation** — Set annual budgets per category, track utilization
- **Audit Trail** — Complete activity log for all financial actions
- **Role-Based Access** — Admin, Cashier, Accountant, Principal roles
- **Search & Filter** — Full-text search across all records
