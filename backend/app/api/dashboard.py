from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from ..database import get_db
from ..models.models import (
    Income, Expense, IncomeCategory, ExpenseCategory,
    Budget, AuditLog, User
)
from ..auth import get_current_user
from ..schemas import BudgetCreate, BudgetUpdate

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    school_year: str = Query("2026-2027"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Total income
    total_income = db.query(func.sum(Income.amount)).filter(
        Income.school_year == school_year, Income.is_voided == 0
    ).scalar() or 0

    # Total approved expenses
    total_expenses = db.query(func.sum(Expense.amount)).filter(
        Expense.school_year == school_year, Expense.is_voided == 0,
        Expense.status == "Approved"
    ).scalar() or 0

    # Pending expenses count
    pending_expenses = db.query(Expense).filter(
        Expense.school_year == school_year, Expense.status == "Pending",
        Expense.is_voided == 0
    ).count()

    # This month
    now = datetime.now()
    month_prefix = now.strftime("%Y-%m")
    
    income_this_month = db.query(func.sum(Income.amount)).filter(
        Income.date_recorded.like(f"{month_prefix}%"),
        Income.is_voided == 0
    ).scalar() or 0

    expenses_this_month = db.query(func.sum(Expense.amount)).filter(
        Expense.date_recorded.like(f"{month_prefix}%"),
        Expense.is_voided == 0, Expense.status == "Approved"
    ).scalar() or 0

    # Income by category
    income_cats = db.query(IncomeCategory).all()
    income_by_category = []
    for cat in income_cats:
        amt = db.query(func.sum(Income.amount)).filter(
            Income.category_id == cat.id, Income.school_year == school_year,
            Income.is_voided == 0
        ).scalar() or 0
        if amt > 0:
            income_by_category.append({"name": cat.name, "amount": amt, "color": cat.color})

    # Expenses by category
    expense_cats = db.query(ExpenseCategory).all()
    expenses_by_category = []
    for cat in expense_cats:
        amt = db.query(func.sum(Expense.amount)).filter(
            Expense.category_id == cat.id, Expense.school_year == school_year,
            Expense.is_voided == 0, Expense.status == "Approved"
        ).scalar() or 0
        if amt > 0:
            expenses_by_category.append({"name": cat.name, "amount": amt, "color": cat.color})

    # Monthly trend (last 12 months)
    monthly_trend = []
    for i in range(11, -1, -1):
        d = now - timedelta(days=i * 30)
        m = d.strftime("%Y-%m")
        label = d.strftime("%b %Y")
        
        m_income = db.query(func.sum(Income.amount)).filter(
            Income.date_recorded.like(f"{m}%"), Income.is_voided == 0
        ).scalar() or 0
        
        m_expense = db.query(func.sum(Expense.amount)).filter(
            Expense.date_recorded.like(f"{m}%"), Expense.is_voided == 0,
            Expense.status == "Approved"
        ).scalar() or 0
        
        monthly_trend.append({
            "month": label, "income": m_income, "expenses": m_expense,
            "net": m_income - m_expense
        })

    # Recent transactions (latest 10)
    recent_incomes = db.query(Income).filter(Income.is_voided == 0).order_by(
        Income.date_recorded.desc()
    ).limit(5).all()
    
    recent_expenses = db.query(Expense).filter(Expense.is_voided == 0).order_by(
        Expense.date_recorded.desc()
    ).limit(5).all()

    recent_transactions = []
    for inc in recent_incomes:
        cat = db.query(IncomeCategory).filter(IncomeCategory.id == inc.category_id).first()
        recent_transactions.append({
            "type": "income", "amount": inc.amount, "description": inc.description,
            "category": cat.name if cat else "Unknown", "date": inc.date_recorded,
            "id": inc.id
        })
    for exp in recent_expenses:
        cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == exp.category_id).first()
        recent_transactions.append({
            "type": "expense", "amount": exp.amount, "description": exp.description,
            "category": cat.name if cat else "Unknown", "date": exp.date_recorded,
            "status": exp.status, "id": exp.id
        })
    recent_transactions.sort(key=lambda x: x["date"], reverse=True)
    recent_transactions = recent_transactions[:10]

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_cashflow": total_income - total_expenses,
        "pending_expenses": pending_expenses,
        "income_this_month": income_this_month,
        "expenses_this_month": expenses_this_month,
        "income_by_category": income_by_category,
        "expenses_by_category": expenses_by_category,
        "monthly_trend": monthly_trend,
        "recent_transactions": recent_transactions,
    }


# ── Budget Management ──
@router.get("/budgets")
def list_budgets(
    school_year: str = Query("2026-2027"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budgets = db.query(Budget).filter(Budget.school_year == school_year).all()
    results = []
    for b in budgets:
        cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == b.category_id).first()
        results.append({
            "id": b.id,
            "category_id": b.category_id,
            "category_name": cat.name if cat else "Unknown",
            "category_color": cat.color if cat else "#666",
            "school_year": b.school_year,
            "allocated_amount": b.allocated_amount,
            "spent_amount": b.spent_amount,
            "remaining": b.allocated_amount - b.spent_amount,
            "utilization_pct": round((b.spent_amount / b.allocated_amount * 100), 1) if b.allocated_amount > 0 else 0
        })
    return results


@router.post("/budgets")
def create_budget(
    data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Budget).filter(
        Budget.category_id == data.category_id,
        Budget.school_year == data.school_year
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Budget already exists for this category and school year")

    budget = Budget(
        **data.model_dump(),
        created_by=current_user.id,
        created_at=datetime.now().isoformat()
    )
    db.add(budget)
    
    log = AuditLog(
        user_id=current_user.id, action="Created Budget",
        entity_type="Budget", entity_id=budget.id,
        details=f"₱{data.allocated_amount:,.2f} for category {data.category_id}",
        timestamp=datetime.now().isoformat()
    )
    db.add(log)
    db.commit()
    return {"message": "Budget created"}


@router.put("/budgets/{budget_id}")
def update_budget(
    budget_id: int, data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    if data.allocated_amount is not None:
        budget.allocated_amount = data.allocated_amount
    db.commit()
    return {"message": "Budget updated"}


@router.delete("/budgets/{budget_id}")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    log = AuditLog(
        user_id=current_user.id, action="Deleted Budget",
        entity_type="Budget", entity_id=budget.id,
        details=f"Deleted budget for category {budget.category_id}",
        timestamp=datetime.now().isoformat()
    )
    db.add(log)
    db.delete(budget)
    db.commit()
    return {"message": "Budget deleted"}


# ── Global Search ──
@router.get("/search")
def search_records(
    q: str = Query("", min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query_str = f"%{q}%"
    incomes = db.query(Income).filter(
        Income.is_voided == 0,
        (Income.description.ilike(query_str)) |
        (Income.payer_name.ilike(query_str)) |
        (Income.or_number.ilike(query_str))
    ).limit(8).all()

    expenses = db.query(Expense).filter(
        Expense.is_voided == 0,
        (Expense.description.ilike(query_str)) |
        (Expense.payee.ilike(query_str)) |
        (Expense.voucher_number.ilike(query_str))
    ).limit(8).all()

    return {
        "incomes": [
            {
                "id": inc.id,
                "or_number": inc.or_number,
                "description": inc.description,
                "payer_name": inc.payer_name,
                "amount": inc.amount,
                "date": inc.date_recorded,
            }
            for inc in incomes
        ],
        "expenses": [
            {
                "id": exp.id,
                "voucher_number": exp.voucher_number,
                "description": exp.description,
                "payee": exp.payee,
                "amount": exp.amount,
                "status": exp.status,
                "date": exp.date_recorded,
            }
            for exp in expenses
        ],
    }


# ── Audit Logs ──
@router.get("/audit-logs")
def list_audit_logs(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total = db.query(AuditLog).count()
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    results = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
        results.append({
            "id": log.id, "user_id": log.user_id,
            "username": user.full_name if user else "System",
            "action": log.action, "entity_type": log.entity_type,
            "entity_id": log.entity_id, "details": log.details,
            "timestamp": log.timestamp
        })
    return {"total": total, "items": results}
