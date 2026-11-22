from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.models import PaymentNotification, Student, StudentFeeSchedule, AuditLog, User
from ..schemas import PaymentNotificationCreate, PaymentNotificationResponse
from ..auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Payment Notifications"])


def auto_ai_detect_overdue_payments(db: Session) -> int:
    """
    AI-driven automated background scanner: monitors student payment ledgers,
    detects overdue or unpaid balances, and automatically generates formal
    payment notice notifications for student & parent accounts.
    """
    now_iso = datetime.now().isoformat()
    created_count = 0

    students = db.query(Student).all()
    for student in students:
        total_due = sum(fs.total_due for fs in student.fee_schedules)
        total_paid = sum(fs.total_paid for fs in student.fee_schedules)
        outstanding = max(0.0, total_due - total_paid)

        if outstanding > 0:
            # Check if active unread overdue notice already exists for this student
            existing_notif = db.query(PaymentNotification).filter(
                PaymentNotification.student_id == student.id,
                PaymentNotification.title.like("Official Overdue Balance Notice%"),
                PaymentNotification.is_read == 0
            ).first()

            if not existing_notif:
                unpaid_categories = [
                    fs.category_name for fs in student.fee_schedules
                    if (fs.total_due - fs.total_paid) > 0
                ]
                cat_summary = ", ".join(unpaid_categories[:3]) if unpaid_categories else "Tuition & Fees"

                notif = PaymentNotification(
                    student_id=student.id,
                    grade_level=student.grade_level,
                    title=f"Official Overdue Balance Notice: ₱{outstanding:,.2f}",
                    fee_type="Tuition Fee" if "Tuition Fee" in unpaid_categories else (unpaid_categories[0] if unpaid_categories else "Tuition Fee"),
                    description=(
                        f"Dear Mr. & Mrs. {student.parent_name or 'Parent/Guardian'}, greetings in the name of our Lord and Saviour Jesus Christ! "
                        f"This is an automated reminder from Calvary Christian Academy regarding an outstanding balance of ₱{outstanding:,.2f} "
                        f"for {student.full_name} ({student.grade_level} - {student.section}) covering {cat_summary}. "
                        f"Please visit the Cashier Office (Administrator: Michelle Jean Gormley) at your earliest convenience to settle this account."
                    ),
                    amount=outstanding,
                    due_date="March 16, 2026",
                    is_read=0,
                    created_at=now_iso
                )
                db.add(notif)
                created_count += 1

    if created_count > 0:
        db.commit()
    return created_count


@router.get("/", response_model=List[PaymentNotificationResponse])
def get_notifications(
    student_id: Optional[int] = None,
    grade_level: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List notifications. Automatically runs the AI overdue payment monitor
    in the background so parents immediately see updated balance notices.
    """
    try:
        auto_ai_detect_overdue_payments(db)
    except Exception:
        pass

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


@router.post("/ai-detect-overdue")
def trigger_ai_overdue_scan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Explicitly triggers the AI Overdue Payment monitoring scan."""
    created = auto_ai_detect_overdue_payments(db)
    return {
        "status": "success",
        "message": f"AI Overdue Monitor analyzed all student accounts. Generated {created} new automated payment notices.",
        "notices_created": created
    }


@router.post("/", response_model=PaymentNotificationResponse)
def create_notification(
    data: PaymentNotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Staff / Cashier adds a new fee / payment notification.
    Parents are strictly blocked from posting announcements.
    """
    user_role = (current_user.role or "").strip().lower()
    if user_role == "parent":
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: Parents cannot post fee announcements. Only School Cashiers and Administrators have posting access."
        )

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
        user_id=current_user.id,
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

