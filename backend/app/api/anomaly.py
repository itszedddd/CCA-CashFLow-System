import json
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.models import Income, IncomeCategory, User, AuditLog
from ..auth import get_current_user
from ..core.anomaly_engine import AnomalyEngine, evaluate_single_transaction

router = APIRouter(prefix="/api/ai/anomaly", tags=["AI Anomaly Detection"])


class EvaluateRequest(BaseModel):
    amount: float
    category_id: int
    payer_name: Optional[str] = None
    grade_level: Optional[str] = None
    payment_method: Optional[str] = "Cash"
    is_partial: Optional[int] = 0
    expected_amount: Optional[float] = None


class ResolveRequest(BaseModel):
    action: str  # "verify_clear" | "mark_correction"
    cashier_notes: Optional[str] = None


class EnvelopeVerifyRequest(BaseModel):
    status: int  # 1: Verified, 0: Pending, 2: Discrepancy
    cashier_notes: Optional[str] = None


@router.get("/summary")
def get_anomaly_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the high-level ML Anomaly Detection summary, health score,
    3-level threshold breakdown, and generative insights for the Cashier.
    """
    engine = AnomalyEngine(db)
    summary = engine.train_and_scan_all()
    return summary


@router.get("/transactions")
def list_flagged_transactions(
    level: Optional[str] = None,  # "All", "High", "Medium", "Low"
    status: Optional[str] = None,  # "Flagged", "Verified_Cleared", "Normal"
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 25,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves transaction ledger records enriched with ML Anomaly scores,
    3-level thresholds, flagged reasons, and cashier verification statuses.
    """
    query = db.query(Income).filter(Income.is_voided == 0)

    if level and level != "All":
        query = query.filter(Income.anomaly_level == level)

    if status and status != "All":
        query = query.filter(Income.anomaly_status == status)

    if search:
        query = query.filter(
            (Income.payer_name.ilike(f"%{search}%")) |
            (Income.or_number.ilike(f"%{search}%")) |
            (Income.description.ilike(f"%{search}%"))
        )

    total = query.count()
    items = query.order_by(Income.anomaly_score.desc(), Income.date_recorded.desc()).offset(skip).limit(limit).all()

    categories = {c.id: c.name for c in db.query(IncomeCategory).all()}

    results = []
    for inc in items:
        reasons_data = {}
        if inc.anomaly_reasons:
            try:
                reasons_data = json.loads(inc.anomaly_reasons)
            except Exception:
                reasons_data = {"reasons": [inc.anomaly_reasons], "recommendations": []}

        results.append({
            "id": inc.id,
            "or_number": inc.or_number,
            "payer_name": inc.payer_name,
            "category_id": inc.category_id,
            "category_name": categories.get(inc.category_id, "Unknown"),
            "amount": inc.amount,
            "expected_amount": inc.expected_amount,
            "is_partial": inc.is_partial,
            "remaining_balance": inc.remaining_balance,
            "date_recorded": inc.date_recorded,
            "description": inc.description,
            "payment_method": inc.payment_method,
            "grade_level": inc.grade_level,
            "envelope_verified": inc.envelope_verified,
            "anomaly_score": inc.anomaly_score,
            "anomaly_level": inc.anomaly_level,
            "anomaly_status": inc.anomaly_status,
            "cashier_notes": inc.cashier_notes,
            "reasons": reasons_data.get("reasons", []),
            "recommendations": reasons_data.get("recommendations", []),
            "ml_outlier_factor": reasons_data.get("ml_outlier_factor", 0.0),
        })

    return {"total": total, "items": results}


@router.post("/evaluate")
def evaluate_transaction_endpoint(
    data: EvaluateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Real-time pre-check endpoint. Returns live anomaly score and instant risk level
    as the Cashier inputs payment details in the modal, preventing errors before save.
    """
    cat = db.query(IncomeCategory).filter(IncomeCategory.id == data.category_id).first()
    category_name = cat.name if cat else "General"

    res = evaluate_single_transaction(
        amount=data.amount,
        category_id=data.category_id,
        category_name=category_name,
        payer_name=data.payer_name,
        grade_level=data.grade_level,
        payment_method=data.payment_method or "Cash",
        expected_amount=data.expected_amount or (cat.expected_amount if cat else 0.0),
        is_partial=data.is_partial or 0,
    )
    return res


@router.post("/scan-all")
def trigger_full_scan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Triggers complete retrain of IsolationForest and re-evaluates all transactions."""
    engine = AnomalyEngine(db)
    result = engine.train_and_scan_all()

    # Log to Audit Log
    log = AuditLog(
        user_id=current_user.id,
        action="Ran ML Anomaly Scan",
        entity_type="AI_Anomaly",
        details=f"Analyzed {result.get('total_analyzed')} records. Ledger health: {result.get('health_score')}%.",
        timestamp=datetime.now().isoformat()
    )
    db.add(log)
    db.commit()

    return result


@router.put("/resolve/{income_id}")
def resolve_anomaly(
    income_id: int,
    data: ResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cashier resolves a flagged anomaly by either marking it as verified & cleared,
    or flagging it for manual correction.
    """
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=404, detail="Transaction record not found")

    if data.action == "verify_clear":
        income.anomaly_status = "Verified_Cleared"
        action_text = "Verified & Cleared Flagged Anomaly"
    else:
        income.anomaly_status = "Pending_Correction"
        action_text = "Flagged Anomaly for Correction"

    if data.cashier_notes:
        income.cashier_notes = data.cashier_notes

    # Add audit log entry
    log = AuditLog(
        user_id=current_user.id,
        action=action_text,
        entity_type="Income",
        entity_id=income.id,
        details=f"Cashier {current_user.full_name} resolved transaction {income.or_number}. Notes: {data.cashier_notes or 'None'}",
        timestamp=datetime.now().isoformat()
    )
    db.add(log)
    db.commit()
    db.refresh(income)

    return {
        "message": f"Transaction {data.action} successfully updated",
        "anomaly_status": income.anomaly_status,
        "cashier_notes": income.cashier_notes
    }


@router.put("/envelope-verify/{income_id}")
def verify_physical_envelope(
    income_id: int,
    data: EnvelopeVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates the physical brown envelope verification status for Feature #3 / Objective 3:
    1: Verified in Envelope, 0: Pending, 2: Discrepancy Found.
    """
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=404, detail="Transaction record not found")

    income.envelope_verified = data.status
    if data.cashier_notes:
        income.cashier_notes = (income.cashier_notes or "") + f" [Envelope Verification: {data.cashier_notes}]"

    status_labels = {1: "Verified in Physical Envelope", 0: "Pending Verification", 2: "Envelope Discrepancy Detected"}

    log = AuditLog(
        user_id=current_user.id,
        action="Envelope Verification Check",
        entity_type="Income",
        entity_id=income.id,
        details=f"Status: {status_labels.get(data.status, 'Unknown')}. Notes: {data.cashier_notes or 'None'}",
        timestamp=datetime.now().isoformat()
    )
    db.add(log)
    db.commit()
    db.refresh(income)

    return {
        "message": "Envelope verification status updated",
        "envelope_verified": income.envelope_verified,
        "status_label": status_labels.get(income.envelope_verified)
    }
