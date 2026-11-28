# CCA FlowSys — Codebase Walkthrough

Use this guide to walk a panelist through the system from login to reporting. It explains **where each feature lives**, **how a request travels through the code**, and **what to demonstrate**.

---

## 1. What the system does

CCA FlowSys is a school cashflow management system for Calvary Christian Academy. It tracks:

- Student profiles and enrollment data
- The 5 official CCA fee schedules per student
- Cashier collections, Official Receipts, and balances
- Parent Portal credentials and fee announcements
- AI-assisted anomaly detection on recorded transactions
- Financial reports and an audit trail

There are three active roles:

| Role | Main purpose |
|---|---|
| **Admin** | User Accounts and Student Accounts management; financial pages are view-only |
| **Cashier** | Daily collections, student archiving, receipts, notices, anomaly review |
| **Parent** | View their own child's balances, receipts, and announcements |

Demo accounts:

```text
Admin:   admin@cca.edu.ph   / password123
Cashier: cashier@cca.edu.ph / password123
Parent:  use a student LRN  / password123 (or the generated LRN password)
```

---

## 2. High-level architecture

```text
Browser (React + Vite)
   │
   │ fetch /api/... with Bearer JWT
   ▼
Vercel rewrite: /* -> /api/index.py?__path=...
   │
   ▼
FastAPI app (backend/app/main.py)
   │
   ├─ auth.py            JWT creation + current user resolution
   ├─ api/*.py           Route handlers
   ├─ core/*.py          Anomaly engine, timezone/section/fee helpers
   ├─ models/models.py   SQLAlchemy tables
   ├─ schemas.py         Pydantic request/response shapes
   └─ database.py        DATABASE_URL + engine/session setup
   │
   ▼
Database
   ├─ Persistent Postgres via DATABASE_URL (recommended / production)
   └─ SQLite fallback for local dev and ephemeral Vercel demo
```

### Important deployment note

On Vercel, `/tmp/cashflow.db` is **ephemeral and per-instance**. If `DATABASE_URL` is not set, anomaly verifications, payments, and archive changes can appear to revert on a cold start or another serverless instance.

Set a persistent database URL in the Vercel project:

```text
DATABASE_URL=postgresql://user:password@host:5432/cca_cashflow?sslmode=require
```

`api/index.py` respects a configured `DATABASE_URL`. Only when it is missing does it copy the repository SQLite database to `/tmp`. `backend/app/database.py` also normalizes `postgres://` and `postgresql://` URLs to the installed `psycopg` driver.

---

## 3. Repository map

```text
api/
  index.py                  Vercel serverless entry point / path rewrite wrapper

backend/
  app/
    main.py                 App creation, middleware, routers, DB init/migrations
    auth.py                 Password hashing, JWT, get_current_user
    database.py             Engine, SessionLocal, Base, DATABASE_URL logic
    schemas.py              Pydantic request/response models
    seed_data.py            Demo students, fee structures, payments
    models/
      models.py             All SQLAlchemy tables
    api/
      auth.py               Login, /me, change password
      users.py              Admin user account CRUD
      students.py           Student CRUD, CSV import, archive, payments, receipts
      income.py             General collections/income endpoints
      dashboard.py          Dashboard stats, reports, search, audit logs
      anomaly.py            AI ledger summary, scan, verify, envelope verification
      notifications.py      Payment announcements CRUD
    core/
      anomaly_engine.py     Scoring rules, reasons, AI payment plan generation
      timezone.py           Asia/Manila timestamps, sections, fee benchmarks
  requirements.txt          Python dependencies

frontend/
  src/
    App.jsx                 Route table and role guards
    api.js                  Axios client with stored JWT
    components/             Sidebar, Header, modals, Toast, ErrorBoundary
    pages/                  One page per major screen
    utils/schoolData.js     Grade/section/fee helpers and name formatting
  dist/                     Built frontend served by Vercel

docs/
  ERD.mmd                   Mermaid entity relationship diagram
  CCA_CashFlow_ERD.drawio   Draw.io version of the ERD
  ML_Anomaly_Detection_and_System_Requirements.md
  CODEBASE_WALKTHROUGH.md   This file

CCA_Students_Import_Template.xlsx   Excel-friendly registrar template
CCA_Students_Import_Template.csv    Header-only CSV companion
CCA_Students_4_Records.csv          Sample ready-to-import student records
```

---

## 4. Request lifecycle

Use this explanation when a panelist asks “what happens when I click a button?”

1. A React page calls `api` from `frontend/src/api.js`.
2. `api.js` attaches the JWT stored in `localStorage` as `Authorization: Bearer <token>`.
3. `api/index.py` receives the Vercel request and rewrites `__path` back to `/api/...`.
4. `backend/app/main.py` runs middleware:
   - Admin write requests are blocked globally.
   - Student-account management is explicitly allowed for Admin.
   - Payments are never allowed for Admin.
5. The matching router in `backend/app/api/*.py` validates input with Pydantic schemas.
6. The handler uses `get_db()` from `database.py`, queries SQLAlchemy models, changes state, and writes `AuditLog` rows where appropriate.
7. The response returns to React; the page updates its local state or shows a toast/modal.

---

## 5. Data model overview

Defined in `backend/app/models/models.py`:

| Table | Purpose |
|---|---|
| `users` | Staff accounts: Admin, Cashier (Parent users are resolved from `students`) |
| `students` | Student profile, LRN, parent credentials, archive state, balances |
| `student_fee_schedules` | One row per fee category per student |
| `income_categories` | Tuition, Registration, Books, Energy, Other |
| `incomes` | Payment transactions, OR numbers, anomaly fields |
| `payment_notifications` | Fee announcements / notices |
| `audit_logs` | Track who changed what and when |
| `expenses` / `expense_categories` | Modeled but excluded from the v2.0 active scope |

### Student name convention

Canonical format is:

```text
Last, First, Middle
```

Examples:

```text
Lopez, Ana, Patricia
Dela Cruz, Nicolas, Jose
Coronel, Kent, Kenji
```

Frontend helpers are in `frontend/src/utils/schoolData.js`:

- `formatStudentFullName(last, first, middle)` builds the canonical string.
- `splitStudentFullName(fullName)` splits it back for edit forms.
- `getDefaultStudentPassword(name)` derives the LRN password prefix from the surname.

Backend import/create/update normalizes comma-separated names through `_normalize_full_name()` in `backend/app/api/students.py`. Legacy space-separated names are left untouched to avoid misreading compound surnames.

### Archive state

Archiving is **soft deletion**:

- `students.is_archived` is set to `1`
- `archived_at` and `archived_by` are recorded
- the student is hidden from the default `/api/students/` list
- balances, fee schedules, receipts, and audit history remain intact
- `GET /api/students/?archived=true` shows the archive
- `POST /api/students/{id}/unarchive` restores the student

---

## 6. Role and navigation map

Defined in `frontend/src/components/Sidebar.jsx` and guarded in `frontend/src/App.jsx`.

### Admin

Keeps both account-management menus:

- **User Accounts** (`/admin/users`) — `AdminUsers.jsx`
- **Student Accounts** (`/admin/students`) — `AdminStudents.jsx`

Admin intentionally sees **only these two menus**. Dashboard, Collections, AI Ledger Intelligence, Payment Notices, Financial Reports, Audit Trail, and the Institutional Fee Scope panel are not shown for Admin, and direct URLs to those pages redirect back to `/admin/users`. Student Profile remains reachable from Student Accounts for viewing details. Financial mutations are also blocked at the API middleware layer.

### Cashier

- Dashboard
- Collections
- **Archived Students** (`/archive`) — `ArchivedStudents.jsx`
- AI Ledger Intelligence
- Payment Notices
- Financial Reports
- Audit Trail

Archive actions are available on Collections rows and inside the Student Profile page.

### Parent

- My Child Account (`/parent`)
- Fee Announcements (`/notifications`)

Parent identity is resolved from the JWT `sub` (the student LRN) in `backend/app/auth.py`.

---

## 7. Feature code map

### Login and authorization

- Frontend: `frontend/src/pages/Login.jsx`
- API: `POST /api/auth/login` in `backend/app/api/auth.py`
- JWT helpers: `backend/app/auth.py`
- Route guards: `frontend/src/App.jsx`
- Admin view-only middleware: `backend/app/main.py`

Demonstration: log in as Cashier, then as Admin. Show that Admin keeps User Accounts and Student Accounts but cannot record a payment.

---

### Student accounts and registrar CSV sync

- Admin UI: `frontend/src/pages/AdminStudents.jsx`
- Cashier Collections UI: `frontend/src/pages/Income.jsx`
- Backend: `backend/app/api/students.py`
- Templates: `CCA_Students_Import_Template.xlsx`, `CCA_Students_Import_Template.csv`
- Sample import file: `CCA_Students_4_Records.csv`

CSV columns:

```text
student_id,full_name,grade_level,section,gender,parent_name,
parent_contact,parent_email,address,school_year,
tuition_paid,registration_paid,books_paid,energy_paid,other_paid,total_paid
```

Required: `student_id`, `full_name`, `grade_level`.

Import behavior:

1. `POST /api/students/check-csv-duplicates` runs first.
2. The UI opens a **Duplicate data detected** popup if rows are repeated in the CSV or already exist in the system.
3. The uploader chooses **Cancel Upload** or **Skip Duplicates & Import**.
4. Continuing calls `POST /api/students/import-csv?skip_duplicates=true`.
5. Each unique new student receives the 5 CCA fee schedules and a unique LRN-generated Parent Portal password.
6. Excel LRNs are kept as Text; scientific-notation values like `1.09284E+11` are rejected with a row-level error.

Name inputs in the UI use three fields — Last, First, Middle — and are joined into the canonical comma-separated format.

---

### Collections, payments, and receipts

- Page: `frontend/src/pages/Income.jsx` (list + quick pay)
- Profile: `frontend/src/pages/StudentProfile.jsx`
- Receipt modal: `frontend/src/components/OfficialReceiptModal.jsx`
- Backend: `POST /api/students/{id}/payments` in `backend/app/api/students.py`

Payment rules:

- A physical OR number is required and cannot be duplicated.
- The matching fee schedule's `total_paid` and `remaining_balance` are updated.
- The transaction is saved as an `Income` row with `payer_name = student.full_name`.
- The transaction is evaluated by the anomaly engine before saving.
- An official receipt is returned to the frontend immediately.

---

### Student archiving

- Cashier sidebar: `frontend/src/components/Sidebar.jsx`
- Archive list UI: `frontend/src/pages/ArchivedStudents.jsx`
- Archive buttons: `Income.jsx` rows and `StudentProfile.jsx`
- API:
  - `POST /api/students/{id}/archive`
  - `POST /api/students/{id}/unarchive`
  - `GET /api/students/?archived=true`

Only Admin and Cashier tokens can change archive state; Parent tokens receive `403`.

Demonstration: archive a student from Collections, confirm they disappear from the active list, open **Archived Students**, view their preserved balance, then restore them.

---

### AI anomaly detection

- UI: `frontend/src/pages/AnomalyDetection.jsx`
- Router: `backend/app/api/anomaly.py`
- Engine: `backend/app/core/anomaly_engine.py`
- ML requirements doc: `docs/ML_Anomaly_Detection_and_System_Requirements.md`

Key endpoints:

- `GET /api/ai/anomaly/summary` — read-only summary
- `GET /api/ai/anomaly/transactions` — flagged transactions
- `POST /api/ai/anomaly/scan-all` — explicit rescan that persists results
- `PUT /api/ai/anomaly/resolve/{income_id}` — Verify & Clear
- `PUT /api/ai/anomaly/envelope-verify/{income_id}` — envelope verification

Important implementation detail: the summary endpoint uses `persist=False`. Only the explicit `scan-all` action writes a new scan. This prevents simply opening the AI page from undoing a cleared anomaly.

---

### Reports, notices, and audit trail

- Reports: `frontend/src/pages/Reports.jsx`, `backend/app/api/dashboard.py`
- Payment notices: `frontend/src/pages/Notifications.jsx`, `backend/app/api/notifications.py`
- Notice letter / yearly record generators: `backend/app/api/students.py`
- Audit UI: `frontend/src/pages/AuditLog.jsx`
- Audit data: `audit_logs` table

Every major state change — student creation, CSV import, password reset, payment, anomaly clearance, archive, restore — writes an audit row.

---

## 8. API route quick reference

| Router | Prefix | Representative endpoints |
|---|---|---|
| `auth.py` | `/api/auth` | `POST /login`, `GET /me`, `POST /change-password` |
| `users.py` | `/api/users` | list/create/update/reset/delete user accounts |
| `students.py` | `/api/students` | list/detail/create/update, CSV template/check/import, archive/unarchive, payments, reset password, notice letter, yearly record, AI plan |
| `income.py` | `/api/income` | income CRUD, categories, CSV import/template |
| `dashboard.py` | `/api/dashboard` | stats, end-of-year report, search, audit logs |
| `anomaly.py` | `/api/ai/anomaly` | summary, transactions, evaluate, scan-all, resolve, envelope-verify |
| `notifications.py` | `/api/notifications` | list/create/read/delete announcements |

FastAPI auto-generates interactive docs at `/docs` when running locally.

---

## 9. Suggested panelist walkthrough script

Use this order for a 5–10 minute demo.

1. **Login as Cashier.** Show the sidebar: Collections plus the new **Archived Students** menu.
2. **Open Collections.** Point out the name format `Last, First, Middle`, grade/section auto-sync, balance columns, and row action buttons.
3. **Archive a student.** Click the archive icon on a row, confirm, then show the student is gone from the active list.
4. **Open Archived Students.** Show the preserved balance, archive timestamp, and actor. Click **Restore** and show the student returns to Collections.
5. **Open a Student Profile.** Show the Archive/Restore button, payment history, fee schedules, and AI payment plan.
6. **Record a payment.** Enter a physical OR number, save, and show the official receipt modal and updated balance.
7. **Open AI Ledger Intelligence.** Show a flagged transaction, click **Verify & Clear**, reload, and show it stays cleared.
8. **Open Student Accounts as Admin.** Show the add/edit form with Last, First, Middle fields and the Registrar CSV Sync panel.
9. **Upload a CSV with duplicates.** Show the popup, inspect the duplicate reasons, choose **Skip Duplicates & Import**, and show the success summary.
10. **Open Audit Trail.** Show entries for payment, anomaly clearance, archive/restore, and CSV import.
11. **End with architecture.** Open `docs/CODEBASE_WALKTHROUGH.md` and point to `main.py`, `students.py`, `anomaly_engine.py`, and `api/index.py`.

---

## 10. Local setup

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Or run `start_servers.bat` on Windows.

Useful commands:

```bash
python -m py_compile backend/app/api/students.py backend/app/main.py
npm --prefix frontend run build
git status --short
vercel --prod
```

---

## 11. Troubleshooting notes

| Symptom | Likely cause | Check |
|---|---|---|
| Changes revert after refresh on the deployed site | `DATABASE_URL` is not set; Vercel `/tmp` is ephemeral | Vercel project → Environment Variables |
| CSV upload returns scientific notation error | Excel converted LRNs to Number format | Use the `.xlsx` template, keep column A as Text |
| Duplicate popup appears unexpectedly | LRN or name + grade already exists | Read the popup reason line before continuing |
| Admin cannot add a student | Frontend route guard requires role `admin` | Confirm login role and `localStorage.cca_cf_user` |
| Cashier cannot see Student Accounts | Intended — it was moved to Admin | Use `/admin/students` with an Admin account |
| Archived student missing from Collections | Intended — soft hide | Open `/archive` or use `?archived=true` on the API |
| AI anomaly returns after opening the AI page | Old build or rescan endpoint called | Confirm `persist=False` in summary and redeploy |

---

## 12. Glossary

- **LRN** — Learner Reference Number, the student identifier.
- **Fee Schedule** — One of the 5 CCA fee categories assigned to a student.
- **OR Number** — Official Receipt number from the physical receipt booklet.
- **Soft delete / archive** — Hidden from active lists but retained in the database.
- **Anomaly Verify & Clear** — Cashier confirmation that a flagged transaction was reviewed.
- **Registrar Sync** — Bulk CSV import of student records from the registrar.
