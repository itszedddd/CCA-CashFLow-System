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
    role = Column(String)  # Admin, Cashier, Accountant, Principal, Parent
    is_active = Column(Integer, default=1)
    profile_picture = Column(String, nullable=True)
    created_at = Column(String, nullable=True)


# ──────────────────────────────────────────────
# STUDENT MODEL (ICC-Style Individual Student Profiles)
# ──────────────────────────────────────────────
class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True)  # LRN / Student ID (e.g. "LRN-2026-001")
    full_name = Column(String, index=True)
    grade_level = Column(String, index=True)  # Kindergarten, Grade 1 to Grade 10
    section = Column(String, default="Faith")
    gender = Column(String, nullable=True)  # Male, Female
    birthdate = Column(String, nullable=True)
    parent_name = Column(String, nullable=True)
    parent_contact = Column(String, nullable=True)
    parent_email = Column(String, nullable=True)
    parent_username = Column(String, nullable=True)
    parent_password_hash = Column(String, nullable=True)
    address = Column(String, nullable=True)
    school_year = Column(String, default="2026-2027")
    enrollment_status = Column(String, default="Enrolled")  # Enrolled, Pending, Transferred
    created_at = Column(String, nullable=True)

    # Relationships
    payments = relationship("Income", back_populates="student", cascade="all, delete-orphan")
    fee_schedules = relationship("StudentFeeSchedule", back_populates="student", cascade="all, delete-orphan")
    notifications = relationship("PaymentNotification", back_populates="student", cascade="all, delete-orphan")


# ──────────────────────────────────────────────
# STUDENT FEE SCHEDULE (Tuition, Registration, Books, Energy, Other)
# ──────────────────────────────────────────────
class StudentFeeSchedule(Base):
    __tablename__ = "student_fee_schedules"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True)
    category_name = Column(String, index=True)  # Tuition Fee, Registration Fee, Books, Energy Fee, Other Fees
    sub_description = Column(String, nullable=True)  # e.g., "Educational Tour", "Swimming Class", "Graduation"
    total_due = Column(Float, default=0.0)
    total_paid = Column(Float, default=0.0)
    remaining_balance = Column(Float, default=0.0)
    school_year = Column(String, default="2026-2027")
    due_date = Column(String, nullable=True)
    remarks = Column(String, nullable=True)

    student = relationship("Student", back_populates="fee_schedules")


# ──────────────────────────────────────────────
# PAYMENT NOTIFICATION (Fee announcements & reminders)
# ──────────────────────────────────────────────
class PaymentNotification(Base):
    __tablename__ = "payment_notifications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True, index=True)  # Null = Broadcast to grade/all
    grade_level = Column(String, nullable=True)  # Null = All grades
    title = Column(String)
    fee_type = Column(String)  # Tuition Fee, Registration Fee, Books, Energy Fee, Other Fees
    description = Column(Text)
    amount = Column(Float, default=0.0)
    due_date = Column(String, nullable=True)
    is_read = Column(Integer, default=0)
    created_at = Column(String)

    student = relationship("Student", back_populates="notifications")


# ──────────────────────────────────────────────
# INCOME CATEGORIES
# ──────────────────────────────────────────────
class IncomeCategory(Base):
    __tablename__ = "income_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # Tuition Fees, Registration Fee, Books, Energy Fee, Other Fees
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
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    color = Column(String, default="#ef4444")
    budget_limit = Column(Float, default=0.0)

    expenses = relationship("Expense", back_populates="category")


# ──────────────────────────────────────────────
# INCOME RECORDS (All school collections & student payments)
# ──────────────────────────────────────────────
class Income(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("income_categories.id"))
    student_id_ref = Column(Integer, ForeignKey("students.id"), nullable=True, index=True)
    amount = Column(Float)
    expected_amount = Column(Float, nullable=True)
    is_partial = Column(Integer, default=0)  # 0: Full Payment, 1: Partial Payment
    remaining_balance = Column(Float, default=0.0)
    student_id = Column(String, nullable=True)  # Student LRN string for quick search
    grade_level = Column(String, nullable=True)  # Kindergarten, Grade 1 to 10
    fee_type = Column(String, default="Tuition Fee")  # Tuition Fee, Registration Fee, Books, Energy Fee, Other Fees
    envelope_verified = Column(Integer, default=0)
    description = Column(String)
    or_number = Column(String, nullable=True, index=True)  # Official Receipt Number
    payer_name = Column(String, nullable=True)
    payer_type = Column(String, default="Student")
    payment_method = Column(String, default="Cash")  # Cash, Bank Transfer, Check, GCash
    reference_number = Column(String, nullable=True)
    school_year = Column(String, default="2026-2027")
    date_recorded = Column(String)
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    remarks = Column(Text, nullable=True)
    is_voided = Column(Integer, default=0)

    # ML-Based Anomaly Detection Fields
    anomaly_score = Column(Float, default=0.0)
    anomaly_level = Column(String, default="Low")
    anomaly_reasons = Column(Text, nullable=True)
    anomaly_status = Column(String, default="Normal")
    cashier_notes = Column(Text, nullable=True)

    category = relationship("IncomeCategory", back_populates="incomes")
    recorder = relationship("User")
    student = relationship("Student", back_populates="payments")


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
