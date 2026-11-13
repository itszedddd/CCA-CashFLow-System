from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import csv
import io
import re
import json
from ..database import get_db
from ..models.models import Income, IncomeCategory, User, AuditLog
from ..auth import get_current_user
from ..schemas import IncomeCreate, IncomeUpdate, IncomeResponse
from ..core.anomaly_engine import evaluate_single_transaction, _get_category_expected_fee

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
    # Uses top-level imports for anomaly_engine and json

    # Validate category
    cat = db.query(IncomeCategory).filter(IncomeCategory.id == data.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Income category not found")

    expected_amt = data.expected_amount or cat.expected_amount or _get_category_expected_fee(cat.name, data.grade_level)
    is_partial = data.is_partial or 0
    rem_balance = data.remaining_balance or 0.0

    # ────────────────────────────────────────────────────────
    # FEATURE #2 RULE: Automated Validation & Prevention
    # ────────────────────────────────────────────────────────
    if expected_amt > 0:
        if data.amount > expected_amt:
            # Overpayment prevented per CCA policy
            raise HTTPException(
                status_code=400,
                detail=f"Entered amount (₱{data.amount:,.2f}) exceeds the required fee of ₱{expected_amt:,.2f}. "
                       f"Over-amount transactions cannot be processed to prevent category misclassification."
            )
        elif data.amount < expected_amt:
            # Automatically flag as partial payment and compute remaining balance
            is_partial = 1
            rem_balance = round(expected_amt - data.amount, 2)

    # ────────────────────────────────────────────────────────
    # FEATURE #6: ML Anomaly Scoring
    # ────────────────────────────────────────────────────────
    anomaly_eval = evaluate_single_transaction(
        amount=data.amount,
        category_id=data.category_id,
        category_name=cat.name,
        payer_name=data.payer_name,
        grade_level=data.grade_level,
        payment_method=data.payment_method or "Cash",
        expected_amount=expected_amt,
        is_partial=is_partial,
    )

    income_dict = data.model_dump()
    income_dict["expected_amount"] = expected_amt
    income_dict["is_partial"] = is_partial
    income_dict["remaining_balance"] = rem_balance
    income_dict["anomaly_score"] = anomaly_eval["anomaly_score"]
    income_dict["anomaly_level"] = anomaly_eval["anomaly_level"]
    income_dict["anomaly_status"] = anomaly_eval["anomaly_status"]
    income_dict["anomaly_reasons"] = json.dumps({
        "reasons": anomaly_eval["reasons"],
        "recommendations": anomaly_eval["recommendations"]
    })

    income = Income(
        **income_dict,
        date_recorded=datetime.now().isoformat(),
        recorded_by=current_user.id
    )
    db.add(income)
    db.flush()

    # Audit log
    partial_note = f" (Partial Payment - Remaining: ₱{rem_balance:,.2f})" if is_partial else ""
    anomaly_note = f" [Anomaly: {anomaly_eval['anomaly_level']} {anomaly_eval['anomaly_score']}]" if anomaly_eval['anomaly_status'] == 'Flagged' else ""
    log = AuditLog(
        user_id=current_user.id,
        action="Recorded Collection",
        entity_type="Income",
        entity_id=income.id,
        details=f"₱{data.amount:,.2f} - {cat.name} ({data.payer_name}){partial_note}{anomaly_note}",
        timestamp=datetime.now().isoformat()
    )
    db.add(log)
    db.commit()
    db.refresh(income)
    return {
        "message": "Income collection recorded successfully",
        "id": income.id,
        "is_partial": is_partial,
        "remaining_balance": rem_balance,
        "anomaly_level": anomaly_eval["anomaly_level"],
        "anomaly_score": anomaly_eval["anomaly_score"],
        "anomaly_status": anomaly_eval["anomaly_status"]
    }


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
            "color": cat.color, "total_amount": total,
            "expected_amount": getattr(cat, "expected_amount", 0.0) or 0.0
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

# ── CSV Import & Template ──

def _match_category(cat_raw: str, all_cats: list) -> IncomeCategory:
    """Fuzzy-match a raw category string to a known IncomeCategory."""
    c_lower = (cat_raw or "").strip().lower()
    # Exact match first
    for c in all_cats:
        if c.name.lower() == c_lower:
            return c
    # Contains match
    for c in all_cats:
        if c_lower in c.name.lower() or c.name.lower() in c_lower:
            return c
    # Word overlap match
    for c in all_cats:
        words = set(c_lower.split())
        cat_words = set(c.name.lower().split())
        if words & cat_words:
            return c
    return None


def _parse_amount(raw: str) -> float:
    """Parse an amount string that may contain currency symbols, commas, or spaces."""
    cleaned = re.sub(r'[^\d.]', '', str(raw or '0'))
    return float(cleaned) if cleaned else 0.0


@router.post("/import-csv")
def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import transactions from a CSV file exported from Excel."""
    # Read and decode file
    try:
        raw_bytes = file.file.read()
        # Try UTF-8 first, fallback to latin-1
        try:
            content = raw_bytes.decode('utf-8-sig')  # handles BOM from Excel
        except UnicodeDecodeError:
            content = raw_bytes.decode('latin-1')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read uploaded file: {str(e)}")

    # Parse CSV
    reader = csv.DictReader(io.StringIO(content))
    all_cats = db.query(IncomeCategory).all()

    imported = []
    errors = []
    total_amount = 0.0

    for row_idx, row in enumerate(reader, start=2):  # start=2 because row 1 is header
        try:
            # Normalize column names (strip whitespace, case-insensitive)
            norm = {k.strip().lower(): (v or "").strip() for k, v in row.items() if k}

            # Extract fields with flexible column name matching
            date_val = norm.get('date', '') or norm.get('date_recorded', '') or datetime.now().strftime('%Y-%m-%d')
            or_number = norm.get('or number', '') or norm.get('or_number', '') or norm.get('receipt', '') or ''
            student_name = norm.get('student name', '') or norm.get('student_name', '') or norm.get('payer', '') or norm.get('payer_name', '') or 'Unknown'
            grade_level = norm.get('grade level', '') or norm.get('grade_level', '') or norm.get('grade', '') or 'Grade 7-10'
            cat_raw = norm.get('category', '') or norm.get('fee category', '') or norm.get('fee_category', '') or 'Tuition Fees'
            amt_raw = norm.get('amount', '') or norm.get('amount paid', '') or norm.get('amount_paid', '') or '0'
            method = norm.get('payment method', '') or norm.get('payment_method', '') or norm.get('method', '') or 'Cash'
            remarks = norm.get('remarks', '') or norm.get('notes', '') or ''
            description = norm.get('description', '') or norm.get('details', '') or ''

            # Parse amount
            amount = _parse_amount(amt_raw)
            if amount <= 0:
                errors.append({"row": row_idx, "error": "Amount must be greater than 0", "data": dict(row)})
                continue

            # Match category
            cat = _match_category(cat_raw, all_cats)
            if not cat:
                errors.append({"row": row_idx, "error": f"Unknown category: '{cat_raw}'", "data": dict(row)})
                continue

            # Calculate expected amount and partial status
            expected_amt = cat.expected_amount or _get_category_expected_fee(cat.name, grade_level)
            is_partial = 0
            rem_balance = 0.0

            if expected_amt > 0:
                if amount > expected_amt:
                    # Allow in CSV import but flag it
                    pass
                elif amount < expected_amt:
                    is_partial = 1
                    rem_balance = round(expected_amt - amount, 2)

            # ML Anomaly scoring
            anomaly_eval = evaluate_single_transaction(
                amount=amount,
                category_id=cat.id,
                category_name=cat.name,
                payer_name=student_name,
                grade_level=grade_level,
                payment_method=method,
                expected_amount=expected_amt,
                is_partial=is_partial,
            )

            income = Income(
                category_id=cat.id,
                amount=amount,
                expected_amount=expected_amt,
                is_partial=is_partial,
                remaining_balance=rem_balance,
                description=description or f"CSV Import - {cat.name}",
                or_number=or_number,
                payer_name=student_name,
                payer_type="Student",
                grade_level=grade_level,
                payment_method=method,
                school_year="2026-2027",
                date_recorded=date_val or datetime.now().isoformat(),
                recorded_by=current_user.id,
                remarks=f"[CSV Import] {remarks}" if remarks else "[CSV Import]",
                anomaly_score=anomaly_eval["anomaly_score"],
                anomaly_level=anomaly_eval["anomaly_level"],
                anomaly_status=anomaly_eval["anomaly_status"],
                anomaly_reasons=json.dumps({
                    "reasons": anomaly_eval["reasons"],
                    "recommendations": anomaly_eval["recommendations"]
                }),
            )
            db.add(income)
            db.flush()

            imported.append({
                "row": row_idx,
                "id": income.id,
                "student": student_name,
                "category": cat.name,
                "amount": amount,
                "anomaly_level": anomaly_eval["anomaly_level"],
                "anomaly_score": anomaly_eval["anomaly_score"],
            })
            total_amount += amount

        except Exception as e:
            errors.append({"row": row_idx, "error": str(e), "data": dict(row)})

    # Create batch audit log
    if imported:
        log = AuditLog(
            user_id=current_user.id,
            action="CSV Batch Import",
            entity_type="Income",
            entity_id=0,
            details=f"Imported {len(imported)} transactions totaling ₱{total_amount:,.2f} from CSV file '{file.filename}'. Errors: {len(errors)}.",
            timestamp=datetime.now().isoformat()
        )
        db.add(log)
        db.commit()

    return {
        "success": True,
        "imported_count": len(imported),
        "error_count": len(errors),
        "total_amount": total_amount,
        "imported": imported,
        "errors": errors,
    }


@router.get("/csv-template")
def download_csv_template(current_user: User = Depends(get_current_user)):
    """Download a sample CSV template for batch import."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "OR Number", "Student Name", "Grade Level", "Category", "Amount", "Payment Method", "Remarks"])
    writer.writerow(["2026-11-01", "OR-2026-0001", "Juan Dela Cruz", "Grade 7-10", "Tuition Fees", "1906.00", "Cash", "Monthly tuition November"])
    writer.writerow(["2026-11-01", "OR-2026-0002", "Maria Clara", "Grade 1-6", "Tuition Fees", "1701.00", "Cash", "Monthly tuition November"])
    writer.writerow(["2026-11-01", "OR-2026-0003", "Pedro Penduko", "Kindergarten", "Energy Fees", "150.00", "Cash", "Energy utility"])
    writer.writerow(["2026-11-01", "OR-2026-0004", "Jose Rizal", "Grade 7-10", "Registration & Misc Fees", "5700.00", "Cash", "Annual registration"])
    writer.writerow(["2026-11-01", "OR-2026-0005", "Gabriela Silang", "Grade 1-6", "Books & Materials", "6900.00", "Check", "Books and supplies"])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=CCA_Payment_Import_Template.csv"}
    )
