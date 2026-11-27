# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary — School Cashier / Finance Office (Desktop Workstation):** Operates inside the CCA Cashier's Office processing daily tuition and school fee collections (Cash and Check), entering manual Official Receipt (OR) numbers from physical receipt booklets, verifying student balances across the 5 fee categories, posting payment announcements, and printing formal Letter-sized End-of-School-Year cashflow statements and overdue notice letters.
- **Secondary — Parents & Guardians (Mobile-First Web):** Accesses the Parent Portal primarily from mobile smartphones to view their child's linked Student LRN account, remaining balances across all 5 fees, view-only Official Digital Receipts, fee announcements, and read-only End-of-School-Year payment records. Parents do not self-register; they sign in using their child's LRN and an admin-generated initial password (changeable after sign-in).
- **Governance & Administration — School Administrator, Registrar & Principal:**
  - **Admin / Registrar Role:** Handles student account records, enrollment synchronization via CSV upload per grade level and single section, and student/parent account provisioning (with automatic fee schedule assignment).
  - **Authorized School Administrator (`Michelle Jean Gormley, Administrator`) & School Principal:** Review, verify, and formally approve End-of-School-Year cashflow statements and official payment notice letters.
- **Removed Role:** Legacy Accountant / Disbursement approver roles are outside study scope and excluded from v2.0.

## Product Purpose

**CCA FlowSys** (Calvary Christian Academy School CashFlow Management System) digitizes school tuition and fee collection tracking, student ledger accountability, official digital receipt viewing, payment announcements, and End-of-School-Year financial reporting for Calvary Christian Academy. It gives cashiers reliable digital records tied 1:1 to physical official receipts while giving mobile parents transparent, view-only access to their child's payment status and balances.

Success means zero duplicate LRNs or OR numbers, accurate real-time collection visibility (`2026 vs. 2025`), instant parent mobile clarity without risking unauthorized edits or printable digital receipt misuse, and audit-ready End-of-School-Year statements ready for Administrator and Principal sign-off.

## Positioning

A tightly scoped institutional **school revenue ledger & ML-assisted collection auditing system** built specifically around Calvary Christian Academy's 5-category fee structure, single-section-per-grade-level roster, manual physical OR workflow, and non-self-registered LRN parent portal — pairing Isolation Forest anomaly auditing with strict revenue-only accounting by stripping out out-of-scope expense, disbursement, and budget modules.

## Operating Context

- **Institution:** Calvary Christian Academy, BLK 1 LOT 9-10, Sarmiento Townville, Poblacion I, CSJDM, Bulacan 3023 (`Mobile: 0956 150 4946`, `Tel: (044) 305 6166`, `cashier@cca.edu.ph`), operating for School Year `2026-2027` (with `2025` baseline collection comparison).
- **Physical Cashier Workflow:** Cashiers issue physical Official Receipts with printed OR numbers and maintain student payment envelopes. In FlowSys, the Cashier manually types the physical OR number when recording a payment (`Cash` or `Check`); Digital Receipts in the system exist solely for visual verification (`Digital`, no Print button) rather than replacing physical receipts.
- **Enrollment & Provisioning Ritual:** Registrars/Admins enroll students via form or CSV upload (Kindergarten through Grade 10, strictly one fixed Section per Grade Level). Each student receives a mandatory, non-auto-generated DepEd LRN, auto-assigned fee schedules for all 5 categories, and an LRN-based auto-generated parent login password.
- **Reporting & Notices:** Cashflow statements print to standard US Letter (`8.5" x 11"`) paper with accountability sign-off blocks (`Prepared by: Cashier`, `Checked by: Authorized School Administrator`, `Approved by: School Principal`, `Date Prepared`, `Date Reviewed`). Payment Announcements (e.g., educational tours, activity collections) live in Payment Notices, separate from formal overdue Statement of Account notice letters.
- **Reference Materials on Hand:** `docs/ERD.mmd`, `docs/CCA_CashFlow_ERD.drawio`, `CCA_FlowSys_Features_and_Functionality.docx`, `[CCA_FlowSys]_System_Inspection_Report_v0.0.pdf`.

## Capabilities and Constraints

### Confirmed In-Scope Capabilities
- **Cashier Dashboard:** School Revenue / Collections KPIs (no Total Expenses, Net Cashflow, or expense-voucher Pending Approvals), 12-Month School Revenue comparison (`2026 vs. 2025`, Income/Collections only), and recent collection transactions (Income/Collections only).
- **Collections & Student Profiles:** Student directory synced non-editably (`Grade Level -> Section`), full-width non-scrolling Collections table on desktop viewports, mandatory non-auto-generated LRN, automatic 5-fee schedule assignment on student/CSV creation, Quick Record Payment with manual physical OR number input, Official Digital Receipt modal (view-only, synced to `Asia/Manila` timezone, `[CCA L3]` header), Statement of Account / Payment Notice letter (`[CCA L3]` header), and Student Profile payment ledger.
- **ML Anomaly Detection (`AI Ledger Intelligence`):** Retained core IsolationForest + SOP heuristic auditing engine (`[2.4.1]` removes only `"Feature #6"` / `"PROPOSED FEATURE #6 •"` draft labels) and Section 8 summary in End-of-Year Reports.
- **Admin Student Records & CSV Sync:** Dedicated Admin entity/role handling student account records, bulk CSV enrollment import synced cleanly to student accounts, and LRN-based auto-generated initial passwords for parents (changeable by parents after login).
- **Parent Portal (Mobile-First):** View-only balance summary, 5 fee category breakdowns, view-only Official Digital Receipts, Fee Announcements, password update capability, and read-only End-of-School-Year payment record modal (`[CCA L3]` header, no printing controls).
- **Payment Announcements:** Fee announcements for upcoming school events/activities requiring payments (e.g., Educational Tour), kept strictly separate from overdue balance notices.
- **Financial Statements & Formal Reports:** Income/collection-focused Cashflow Statement and 8-section End-of-School-Year Cashflow Report (Sections 1–8) formatted for US Letter (`8.5" x 11"`) printing with `[CCA L3]` header and Cashier, Authorized School Administrator, and Principal signature blocks.
- **System Audit Trail:** Timestamped activity log (`Asia/Manila` PH timezone) of financial and student record actions.

### Confirmed Out-of-Scope / To Remove (Per v2.0 Inspection & User Confirmation)
- **Removed Financial Modules:** Expenses, Disbursements, Budget Allocation, Budget Variance reports, and Dashboard `Pending Approvals` (expense vouchers).
- **Removed Prototype Labels & Auth/Print Flows:** `"(Feature #6)"` / `"PROPOSED FEATURE #6 •"` labels in ML Anomaly Detection, Demo Account quick-login visibility on Login, Student Self-Registration (`register` tab), parent self-linking (`link` tab replaced by Admin-provisioned LRN + generated password), `Print Physical Receipt` buttons inside Digital Receipt modals, and `Print Complete School Year Record` controls in Parent Portal.

### Technical & Domain Rules
- **Language:** English-only UI text and outputs.
- **Currency & Tenders:** Philippine Peso (`₱`, never `$`); payment methods restricted strictly to `Cash` and `Check`.
- **Fixed 5 Fee Categories:** `Tuition Fee` (₱19,060/yr or ₱1,906/mo), `Registration Fee` (₱5,700), `Books` (₱6,900), `Energy Fee` (₱3,000/yr or ₱300/mo), `Other Fees` (₱1,500).
- **Fixed Section Mapping:** Each Grade Level maps deterministically to one non-editable Section (`Kindergarten -> Joy`, `Grade 1 -> Faith`, `Grade 2 -> Grace`, `Grade 3 -> Hope`, `Grade 4 -> Peace`, `Grade 5 -> Patience`, `Grade 6 -> Kindness`, `Grade 7 -> Goodness`, `Grade 8 -> Faithfulness`, `Grade 9 -> Gentleness`, `Grade 10 -> Self-Control`).
- **Data Integrity:** LRN is required and never auto-generated; OR numbers, LRNs, and `Name + Grade Level` pairs enforce case-insensitive duplicate prevention (`LOWER(TRIM(...))`); `backend/cashflow.db` and root `cashflow.db` remain synchronized.
- **Timekeeping:** Real-time navigation date/time display and receipt/audit timestamps synced accurately to Philippine Standard Time (`Asia/Manila`).

## Brand Commitments

- **Institutional Identity:** **Calvary Christian Academy** (`CCA FlowSys` / `CCA EduSys`) using existing official branding assets stored in `frontend/public/assets/` (and documented in the v2.0 Inspection Design Assets source):
  - Login Page mark: `[CCA L1] CCA EduSys Logo V1.png` (and transparent/v1 variants)
  - Sidebar Navigation mark: `[CCA L2.2]` (Light Mode) / `[CCA L2.1]` (Dark Mode) — *updated mapping per v2.0 Inspection Report*
  - Official Digital Receipts, Payment Notice Letters, Reports, and End-of-Year Records header mark: `[CCA L3]` (`[CCA L3.2]` / `[CCA L3.1]`)
- **Formal Tone & Signatory:** Courteous, institutional Christian academic tone (`Greetings in the name of our Lord and Saviour Jesus Christ!` on parent correspondence); formal signatory **Michelle Jean Gormley, Administrator**.
- **Institutional Typography Asset Committed:** Local `Cinzel` font family (`frontend/public/assets/fonts/`) paired with `Inter` for data legibility (existing project commitment; detailed visual specification belongs to DESIGN.md, not here).

## Evidence on Hand

- Full-stack codebase (`frontend/` React 19 + Vite, `backend/` FastAPI + SQLAlchemy + SQLite, root `cashflow.db` with 26 seeded/active students, 130 fee schedules, 397 income records, 22 notifications as of inspection baseline).
- Official CCA logos, brand palette image (`[1] Color Palette.png`), mission/vision/goals scans (`[CCA M1]`, `[CCA M2]`), and physical school forms (`[CCA F1]`–`[CCA F6]`) under `frontend/public/assets/`.
- Inspection & system documentation: `[CCA_FlowSys]_System_Inspection_Report_v0.0.pdf`, `docs/ERD.mmd`, `docs/CCA_CashFlow_ERD.drawio`.
- **Absences not to fabricate:** No external customer testimonials, press quotes, marketing benchmarks, pricing tiers, or live payment-gateway integrations exist or apply to this school portal.

## Product Principles

1. **Mirror Physical Cashier Custody:** Software complements rather than replaces CCA's physical receipt booklet and cash envelopes—manual OR numbers match paper receipts, digital receipts stay view-only, and formal reports carry physical signatory lines.
2. **Mobile Clarity for Parents, Without Write Risk:** Parents on smartphones get instant visibility into balances, fee breakdowns, and announcements via school-provisioned LRN credentials, with strictly read-only views and zero horizontal table overflow.
3. **Strict Revenue & Audit Scope:** Every dashboard metric, chart, table, and formal report serves student fee collections, anomaly accountability, and official documentation—out-of-scope expenses, disbursements, and budget tracking stay out.
4. **Prevent Duplicates Before They Enter the Ledger:** Mandatory unique LRNs, grade-synced fixed sections, auto-assigned fee schedules, duplicate-checked OR numbers, and Philippine-timezone timestamps protect financial accuracy from enrollment to year-end sign-off.

## Accessibility & Inclusion

- **Built-in Accessible Mode:** Global accessibility toggle (`accessible-mode`) scaling root font size (`105%`), enlarging interactive button and input hit areas, and boosting small text sizing alongside Light and Dark themes.
- **Mobile-First Parent Accessibility:** Parent Portal views and modals must remain legible and usable on narrow smartphone screens without horizontal scrolling.
- **Clear High-Contrast Financial Data:** Monospace numeric alignment for currency (`₱`) and LRN identifiers to prevent misreading digits during cashier entry and parent review.
