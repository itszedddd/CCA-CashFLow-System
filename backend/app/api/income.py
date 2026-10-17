from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from ..database import get_db
from ..models.models import Income, IncomeCategory, User, AuditLog
from ..auth import get_current_user
from ..schemas import IncomeCreate, IncomeUpdate, IncomeResponse

router = APIRouter(prefix="/api/income", tags=["Income"])


@router.get("/")
def list_incomes(
    school_year: str = Query("2026-2027"),
    category_id: int = None,
    search: str = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Income).filter(Income.school_year == school_year, Income.is_voided == 0)
    if category_id:
        query = query.filter(Income.category_id == category_id)
    if search:
        query = query.filter(
            (Income.description.ilike(f"%{search}%")) |
            (Income.payer_name.ilike(f"%{search}%")) |
            (Income.or_number.ilike(f"%{search}%"))
        )
    
    total = query.count()
    incomes = query.order_by(Income.date_recorded.desc()).offset(skip).limit(limit).all()
    
    results = []
    for inc in incomes:
        cat = db.query(IncomeCategory).filter(IncomeCategory.id == inc.category_id).first()
        recorder = db.query(User).filter(User.id == inc.recorded_by).first() if inc.recorded_by else None
        results.append({
            **{c.name: getattr(inc, c.name) for c in inc.__table__.columns},
            "category_name": cat.name if cat else "Unknown",
            "recorder_name": recorder.full_name if recorder else None
        })
    
    return {"total": total, "items": results}


@router.post("/")
def create_income(
    data: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate category
    cat = db.query(IncomeCategory).filter(IncomeCategory.id == data.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Income category not found")

    income = Income(
        **data.model_dump(),
        date_recorded=datetime.now().isoformat(),
        recorded_by=current_user.id
    )
    db.add(income)
    db.flush()

    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        action="Created Income",
        entity_type="Income",
        entity_id=income.id,
        details=f"₱{data.amount:,.2f} - {data.description}",
        timestamp=datetime.now().isoformat()
    )
    db.add(log)
    db.commit()
    db.refresh(income)
    return {"message": "Income recorded", "id": income.id}


@router.put("/{income_id}")
def update_income(
    income_id: int,
    data: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(income, key, value)
    
    log = AuditLog(
        user_id=current_user.id, action="Updated Income",
        entity_type="Income", entity_id=income_id,
        details=str(update_data), timestamp=datetime.now().isoformat()
    )
    db.add(log)
    db.commit()
    return {"message": "Income updated"}


@router.delete("/{income_id}")
def void_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
    
    income.is_voided = 1
    log = AuditLog(
        user_id=current_user.id, action="Voided Income",
        entity_type="Income", entity_id=income_id,
        details=f"Voided ₱{income.amount:,.2f} - {income.description}",
        timestamp=datetime.now().isoformat()
    )
    db.add(log)
    db.commit()
    return {"message": "Income voided"}


# ── Income Categories ──
@router.get("/categories")
def list_income_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cats = db.query(IncomeCategory).all()
    results = []
    for cat in cats:
        total = db.query(func.sum(Income.amount)).filter(
            Income.category_id == cat.id, Income.is_voided == 0
        ).scalar() or 0
        results.append({
            "id": cat.id, "name": cat.name, "description": cat.description,
            "color": cat.color, "total_amount": total
        })
    return results


@router.post("/categories")
def create_income_category(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cat = IncomeCategory(name=data["name"], description=data.get("description"), color=data.get("color", "#3b82f6"))
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"message": "Category created", "id": cat.id}
