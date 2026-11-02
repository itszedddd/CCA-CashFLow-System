from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base


# ──────────────────────────────────────────────
# USER / AUTH
# ──────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String)
    role = Column(String)  # Admin, Cashier, Accountant, Principal
    is_active = Column(Integer, default=1)
    profile_picture = Column(String, nullable=True)
    created_at = Column(String, nullable=True)


# ──────────────────────────────────────────────
# INCOME CATEGORIES
# ──────────────────────────────────────────────
class IncomeCategory(Base):
    __tablename__ = "income_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # Tuition, Registration, Donations, Misc Fees, etc.
    description = Column(String, nullable=True)
    color = Column(String, default="#3b82f6")  # For chart color coding
    expected_amount = Column(Float, default=0.0)  # Official CCA benchmark fee

    incomes = relationship("Income", back_populates="category")


# ──────────────────────────────────────────────
# EXPENSE CATEGORIES
# ──────────────────────────────────────────────
class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # Salaries, Utilities, Supplies, Maintenance, etc.
    description = Column(String, nullable=True)
    color = Column(String, default="#ef4444")
    budget_limit = Column(Float, default=0.0)  # Monthly budget cap

    expenses = relationship("Expense", back_populates="category")


# ──────────────────────────────────────────────
# INCOME RECORDS (All school revenue)
# ──────────────────────────────────────────────
class Income(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("income_categories.id"))
    amount = Column(Float)
    expected_amount = Column(Float, nullable=True)  # Standard fee amount per SOP
    is_partial = Column(Integer, default=0)  # 0: Full Payment, 1: Partial Payment
    remaining_balance = Column(Float, default=0.0)  # Remaining balance for partial payments
    student_id = Column(String, nullable=True)  # Student ID / LRN
    grade_level = Column(String, nullable=True)  # Kindergarten, Grade 1 to 10
    envelope_verified = Column(Integer, default=0)  # 0: Pending, 1: Verified in Envelope, 2: Discrepancy
    description = Column(String)
    or_number = Column(String, nullable=True, index=True)  # Official Receipt Number
    payer_name = Column(String, nullable=True)  # Student name, donor, etc.
    payer_type = Column(String, default="Student")  # Student, Parent, Donor, Organization, Other
    payment_method = Column(String, default="Cash")  # Cash, Bank Transfer, Check, GCash, etc.
    reference_number = Column(String, nullable=True)  # Bank ref, check number, etc.
    school_year = Column(String, default="2026-2027")
    date_recorded = Column(String)
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    remarks = Column(Text, nullable=True)
    is_voided = Column(Integer, default=0)  # Soft-delete / void

    # ML-Based Anomaly Detection Fields (Feature #6)
    anomaly_score = Column(Float, default=0.0)  # 0.0 to 100.0 Anomaly Score
    anomaly_level = Column(String, default="Low")  # "Low", "Medium", "High" (3-level threshold)
    anomaly_reasons = Column(Text, nullable=True)  # JSON-encoded array of flagged reasons
    anomaly_status = Column(String, default="Normal")  # "Normal", "Flagged", "Verified_Cleared", "Pending_Correction"
    cashier_notes = Column(Text, nullable=True)  # Cashier review & verification notes

    category = relationship("IncomeCategory", back_populates="incomes")
    recorder = relationship("User")


# ──────────────────────────────────────────────
# EXPENSE RECORDS (All school expenditures)
# ──────────────────────────────────────────────
class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id"))
    amount = Column(Float)
    description = Column(String)
    payee = Column(String, nullable=True)  # Who was paid
    payment_method = Column(String, default="Cash")
    reference_number = Column(String, nullable=True)
    voucher_number = Column(String, nullable=True, index=True)  # Disbursement voucher
    school_year = Column(String, default="2026-2027")
    status = Column(String, default="Pending")  # Pending, Approved, Rejected, Paid
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    date_recorded = Column(String)
    date_approved = Column(String, nullable=True)
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    remarks = Column(Text, nullable=True)
    is_voided = Column(Integer, default=0)

    category = relationship("ExpenseCategory", back_populates="expenses")
    recorder = relationship("User", foreign_keys=[recorded_by])
    approver = relationship("User", foreign_keys=[approved_by])


# ──────────────────────────────────────────────
# BUDGET ALLOCATIONS (Per category, per school year)
# ──────────────────────────────────────────────
class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id"))
    school_year = Column(String)
    allocated_amount = Column(Float)
    spent_amount = Column(Float, default=0.0)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(String, nullable=True)

    category = relationship("ExpenseCategory")
    creator = relationship("User")


# ──────────────────────────────────────────────
# CASHFLOW SUMMARY (Monthly snapshots)
# ──────────────────────────────────────────────
class CashflowSummary(Base):
    __tablename__ = "cashflow_summaries"

    id = Column(Integer, primary_key=True, index=True)
    month = Column(String)  # e.g. "2026-10"
    school_year = Column(String)
    total_income = Column(Float, default=0.0)
    total_expenses = Column(Float, default=0.0)
    net_cashflow = Column(Float, default=0.0)
    opening_balance = Column(Float, default=0.0)
    closing_balance = Column(Float, default=0.0)
    generated_at = Column(String, nullable=True)


# ──────────────────────────────────────────────
# AUDIT LOG (Track all financial actions)
# ──────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String)  # Created Income, Approved Expense, Voided, etc.
    entity_type = Column(String, nullable=True)  # Income, Expense, Budget
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(String)

    user = relationship("User")


# ──────────────────────────────────────────────
# SYSTEM SETTINGS
# ──────────────────────────────────────────────
class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)
