from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.models import PaymentNotification, Student, AuditLog, User
from ..schemas import PaymentNotificationCreate, PaymentNotificationResponse
from ..auth import get_current_user, get_optional_current_user
from ..core.timezone import ph_now_iso

router = APIRouter(prefix="/api/notifications", tags=["Payment Announcements"])


@router.get("/", response_model=List[PaymentNotificationResponse])
def get_notifications(
    student_id: Optional[int] = None,
    grade_level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    List Fee & Payment Announcements (e.g., Educational Tour, school event contributions).
    Per v2.0 Inspection Report (2.5.1), overdue balance notices are handled via individual
    formal Payment Notice Letters and excluded from this announcements board.
    """
    query = db.query(PaymentNotification).filter(
        ~PaymentNotification.title.like("Official Overdue Balance Notice%")
    )

    if current_user and (current_user.role or "").lower() == "parent":
        parent_student_id = getattr(current_user, "student_id", current_user.id)
        parent_grade = getattr(current_user, "student_grade", None)
        if not parent_grade and parent_student_id:
            st = db.query(Student).filter(Student.id == parent_student_id).first()
            parent_grade = st.grade_level if st else None

        query = query.filter(
            (PaymentNotification.student_id == parent_student_id) |
            (
                (PaymentNotification.student_id.is_(None)) &
                (
                    (PaymentNotification.grade_level == parent_grade) |
                    (PaymentNotification.grade_level.is_(None)) |
                    (PaymentNotification.grade_level == "All Grades")
                )
            )
        )
    elif student_id:
        student = db.query(Student).filter(Student.id == student_id).first()
        student_grade = student.grade_level if student else None
        query = query.filter(
            (PaymentNotification.student_id == student_id) |
            (
                (PaymentNotification.student_id.is_(None)) &
                (
                    (PaymentNotification.grade_level == student_grade) |
                    (PaymentNotification.grade_level.is_(None)) |
                    (PaymentNotification.grade_level == "All Grades")
                )
            )
        )
    elif grade_level and grade_level != "All Grades":
        query = query.filter(
            (PaymentNotification.grade_level == grade_level) |
            (PaymentNotification.grade_level.is_(None)) |
            (PaymentNotification.grade_level == "All Grades")
        )

    return query.order_by(PaymentNotification.id.desc()).all()


@router.post("/", response_model=PaymentNotificationResponse)
def create_notification(
    data: PaymentNotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cashier / Admin posts a payment announcement (event fee, educational tour, school contribution).
    Parents are strictly blocked from posting announcements.
    """
    user_role = (current_user.role or "").strip().lower()
    if user_role == "parent":
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: Parents cannot post fee announcements."
        )

    now_iso = ph_now_iso()
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

    target_desc = (
        f"Student ID #{data.student_id}"
        if data.student_id
        else (f"Grade {data.grade_level}" if data.grade_level else "All Students")
    )
    audit = AuditLog(
        user_id=current_user.id,
        action=f"Published Payment Announcement: {data.title}",
        entity_type="Notification",
        entity_id=None,
        details=f"Target: {target_desc}, Category: {data.fee_type}, Amount: ₱{data.amount:,.2f}",
        timestamp=now_iso
    )
    db.add(audit)

    db.commit()
    db.refresh(notif)
    return notif


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if (current_user.role or "").lower() == "parent":
        raise HTTPException(status_code=403, detail="Unauthorized")
    notif = db.query(PaymentNotification).filter(PaymentNotification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(notif)
    db.commit()
    return {"status": "success", "message": "Announcement removed"}


@router.put("/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db)):
    """Mark announcement as read by parent."""
    notif = db.query(PaymentNotification).filter(PaymentNotification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = 1
    db.commit()
    return {"status": "success", "message": "Notification marked as read"}
