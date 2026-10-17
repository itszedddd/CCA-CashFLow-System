from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from ..database import get_db
from ..models.models import Expense, ExpenseCategory, Budget, User, AuditLog
from ..auth import get_current_user, require_role
from ..schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])


@router.get("/")
def list_expenses(
    school_year: str = Query("2026-2027"),
    category_id: int = None,
    status: str = None,
    search: str = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Expense).filter(Expense.school_year == school_year, Expense.is_voided == 0)
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if status:
        query = query.filter(Expense.status == status)
    if search:
        query = query.filter(
            (Expense.description.ilike(f"%{search}%")) |
            (Expense.payee.ilike(f"%{search}%")) |
            (Expense.voucher_number.ilike(f"%{search}%"))
        )
    
    total = query.count()
    expenses = query.order_by(Expense.date_recorded.desc()).offset(skip).limit(limit).all()
    
    results = []
    for exp in expenses:
        cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == exp.category_id).first()
        recorder = db.query(User).filter(User.id == exp.recorded_by).first() if exp.recorded_by else None
        approver = db.query(User).filter(User.id == exp.approved_by).first() if exp.approved_by else None
        results.append({
            **{c.name: getattr(exp, c.name) for c in exp.__table__.columns},
            "category_name": cat.name if cat else "Unknown",
            "recorder_name": recorder.full_name if recorder else None,
            "approver_name": approver.full_name if approver else None,
        })
    
    return {"total": total, "items": results}


@router.post("/")
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == data.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Expense category not found")

    expense = Expense(
        **data.model_dump(),
        date_recorded=datetime.now().isoformat(),
        recorded_by=current_user.id
    )
    db.add(expense)
    db.flush()

    log = AuditLog(
        user_id=current_user.id, action="Created Expense",
        entity_type="Expense", entity_id=expense.id,
        details=f"₱{data.amount:,.2f} - {data.description}",
        timestamp=datetime.now().isoformat()
    )
    db.add(log)
    db.commit()
    db.refresh(expense)
    return {"message": "Expense recorded", "id": expense.id}


@router.put("/{expense_id}")
def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(expense, key, value)
    
    log = AuditLog(
        user_id=current_user.id, action="Updated Expense",
        entity_type="Expense", entity_id=expense_id,
        details=str(update_data), timestamp=datetime.now().isoformat()
    )
    db.add(log)
    db.commit()
    return {"message": "Expense updated"}


@router.put("/{expense_id}/approve")
def approve_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Principal"))
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense.status = "Approved"
    expense.approved_by = current_user.id
    expense.date_approved = datetime.now().isoformat()

    # Update budget spent
    budget = db.query(Budget).filter(
        Budget.category_id == expense.category_id,
        Budget.school_year == expense.school_year
    ).first()
    if budget:
        budget.spent_amount += expense.amount

    log = AuditLog(
        user_id=current_user.id, action="Approved Expense",
        entity_type="Expense", entity_id=expense_id,
        details=f"Approved ₱{expense.amount:,.2f} - {expense.description}",
        timestamp=datetime.now().isoformat()
    )
    db.add(log)
    db.commit()
    return {"message": "Expense approved"}


@router.put("/{expense_id}/reject")
def reject_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Principal"))
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense.status = "Rejected"
    log = AuditLog(
        user_id=current_user.id, action="Rejected Expense",
        entity_type="Expense", entity_id=expense_id,
        details=f"Rejected ₱{expense.amount:,.2f}",
        timestamp=datetime.now().isoformat()
    )
    db.add(log)
    db.commit()
    return {"message": "Expense rejected"}


@router.delete("/{expense_id}")
def void_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense.is_voided = 1
    log = AuditLog(
        user_id=current_user.id, action="Voided Expense",
        entity_type="Expense", entity_id=expense_id,
        details=f"Voided ₱{expense.amount:,.2f}",
        timestamp=datetime.now().isoformat()
    )
    db.add(log)
    db.commit()
    return {"message": "Expense voided"}


# ── Expense Categories ──
@router.get("/categories")
def list_expense_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cats = db.query(ExpenseCategory).all()
    results = []
    for cat in cats:
        total = db.query(func.sum(Expense.amount)).filter(
            Expense.category_id == cat.id, Expense.is_voided == 0, Expense.status == "Approved"
        ).scalar() or 0
        results.append({
            "id": cat.id, "name": cat.name, "description": cat.description,
            "color": cat.color, "budget_limit": cat.budget_limit, "total_spent": total
        })
    return results


@router.post("/categories")
def create_expense_category(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cat = ExpenseCategory(
        name=data["name"], description=data.get("description"),
        color=data.get("color", "#ef4444"), budget_limit=data.get("budget_limit", 0)
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"message": "Category created", "id": cat.id}
