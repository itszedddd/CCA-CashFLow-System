from pydantic import BaseModel
from typing import Optional, List


# ── Auth ──
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    role: str
    is_active: int
    profile_picture: Optional[str]

    class Config:
        from_attributes = True


# ── Income ──
class IncomeCreate(BaseModel):
    category_id: int
    amount: float
    description: str
    or_number: Optional[str] = None
    payer_name: Optional[str] = None
    payer_type: str = "Student"
    payment_method: str = "Cash"
    reference_number: Optional[str] = None
    school_year: str = "2026-2027"
    remarks: Optional[str] = None

class IncomeUpdate(BaseModel):
    category_id: Optional[int] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    or_number: Optional[str] = None
    payer_name: Optional[str] = None
    payer_type: Optional[str] = None
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    remarks: Optional[str] = None

class IncomeResponse(BaseModel):
    id: int
    category_id: int
    category_name: Optional[str] = None
    amount: float
    description: str
    or_number: Optional[str]
    payer_name: Optional[str]
    payer_type: str
    payment_method: str
    reference_number: Optional[str]
    school_year: str
    date_recorded: str
    recorded_by: Optional[int]
    recorder_name: Optional[str] = None
    remarks: Optional[str]
    is_voided: int

    class Config:
        from_attributes = True


# ── Expense ──
class ExpenseCreate(BaseModel):
    category_id: int
    amount: float
    description: str
    payee: Optional[str] = None
    payment_method: str = "Cash"
    reference_number: Optional[str] = None
    voucher_number: Optional[str] = None
    school_year: str = "2026-2027"
    remarks: Optional[str] = None

class ExpenseUpdate(BaseModel):
    category_id: Optional[int] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    payee: Optional[str] = None
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    voucher_number: Optional[str] = None
    remarks: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: int
    category_id: int
    category_name: Optional[str] = None
    amount: float
    description: str
    payee: Optional[str]
    payment_method: str
    reference_number: Optional[str]
    voucher_number: Optional[str]
    school_year: str
    status: str
    approved_by: Optional[int]
    approver_name: Optional[str] = None
    date_recorded: str
    date_approved: Optional[str]
    recorded_by: Optional[int]
    recorder_name: Optional[str] = None
    remarks: Optional[str]
    is_voided: int

    class Config:
        from_attributes = True


# ── Categories ──
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#3b82f6"

class ExpenseCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#ef4444"
    budget_limit: Optional[float] = 0.0

class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    color: str

    class Config:
        from_attributes = True

class ExpenseCategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    color: str
    budget_limit: float

    class Config:
        from_attributes = True


# ── Budget ──
class BudgetCreate(BaseModel):
    category_id: int
    school_year: str
    allocated_amount: float

class BudgetUpdate(BaseModel):
    allocated_amount: Optional[float] = None

class BudgetResponse(BaseModel):
    id: int
    category_id: int
    category_name: Optional[str] = None
    school_year: str
    allocated_amount: float
    spent_amount: float
    remaining: Optional[float] = None

    class Config:
        from_attributes = True


# ── Dashboard ──
class DashboardStats(BaseModel):
    total_income: float
    total_expenses: float
    net_cashflow: float
    pending_expenses: int
    income_this_month: float
    expenses_this_month: float
    income_by_category: list
    expenses_by_category: list
    monthly_trend: list
    recent_transactions: list


# ── Audit ──
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    username: Optional[str] = None
    action: str
    entity_type: Optional[str]
    entity_id: Optional[int]
    details: Optional[str]
    timestamp: str

    class Config:
        from_attributes = True
