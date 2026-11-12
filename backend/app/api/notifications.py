from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.models import PaymentNotification, Student, AuditLog
from ..schemas import PaymentNotificationCreate, PaymentNotificationResponse

router = APIRouter(prefix="/api/notifications", tags=["Payment Notifications"])


@router.get("/", response_model=List[PaymentNotificationResponse])
def get_notifications(
    student_id: Optional[int] = None,
    grade_level: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List notifications. Parents receive notifications targeted to their child,
    their child's grade level, or general school fee announcements.
    """
    query = db.query(PaymentNotification)

    if student_id:
        student = db.query(Student).filter(Student.id == student_id).first()
        student_grade = student.grade_level if student else None
        # Match student-specific, grade-specific, or all-school announcements
        query = query.filter(
            (PaymentNotification.student_id == student_id) |
            (PaymentNotification.grade_level == student_grade) |
            ((PaymentNotification.student_id == None) & (PaymentNotification.grade_level == None))
        )
    elif grade_level:
        query = query.filter(
            (PaymentNotification.grade_level == grade_level) |
            (PaymentNotification.grade_level == None)
        )

    notifications = query.order_by(PaymentNotification.id.desc()).all()
    return notifications


@router.post("/", response_model=PaymentNotificationResponse)
def create_notification(data: PaymentNotificationCreate, db: Session = Depends(get_db)):
    """
    Cashier adds a new fee / payment notification.
    Auto-reflects in parent accounts with description, fee type, and amount.
    """
    now_iso = datetime.now().isoformat()
    notif = PaymentNotification(
        student_id=data.student_id,
        grade_level=data.grade_level,
        title=data.title,
        fee_type=data.fee_type,
        description=data.description,
        amount=data.amount,
        due_date=data.due_date,
        is_read=0,
        created_at=now_iso
    )
    db.add(notif)

    # Log to audit trail
    target_desc = f"Student ID #{data.student_id}" if data.student_id else (f"Grade {data.grade_level}" if data.grade_level else "All Students")
    audit = AuditLog(
        action=f"Created Payment Notification: {data.title}",
        entity_type="Notification",
        entity_id=None,
        details=f"Target: {target_desc}, Fee: {data.fee_type}, Amount: ₱{data.amount:,.2f}",
        timestamp=now_iso
    )
    db.add(audit)

    db.commit()
    db.refresh(notif)
    return notif


@router.put("/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db)):
    """Mark notification as read by parent."""
    notif = db.query(PaymentNotification).filter(PaymentNotification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = 1
    db.commit()
    return {"status": "success", "message": "Notification marked as read"}

