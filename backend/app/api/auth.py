from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.models import User, Student, AuditLog
from ..auth import verify_password, get_password_hash, create_access_token, get_current_user
from ..schemas import LoginRequest, TokenResponse, UserResponse, ChangePasswordRequest
from ..core.timezone import ph_now_iso

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(form_data: LoginRequest, db: Session = Depends(get_db)):
    raw_username = (form_data.username or "").strip().lower()
    raw_password = (form_data.password or "").strip()

    if not raw_username or not raw_password:
        raise HTTPException(status_code=400, detail="Username/LRN and password are required.")

    # 1. Check Staff / Admin / Cashier user table first
    user = db.query(User).filter(
        (func.lower(func.trim(User.username)) == raw_username) |
        (func.lower(func.trim(User.username)) == f"{raw_username}@cca.edu.ph")
    ).first()

    if user:
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is deactivated. Contact System Administrator.")
        if not user.hashed_password or not verify_password(raw_password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid username or password.")

        token = create_access_token(data={"sub": user.username, "role": user.role})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "role": user.role,
                "profile_picture": user.profile_picture,
            }
        }

    # 2. Check Parent / Student account via Student LRN or parent_username
    student = db.query(Student).filter(
        (func.lower(func.trim(Student.student_id)) == raw_username) |
        (func.lower(func.trim(Student.parent_username)) == raw_username)
    ).first()

    if student:
        is_pw_ok = bool(student.parent_password_hash and verify_password(raw_password, student.parent_password_hash))
        # Also allow initial_password match if hash somehow wasn't synced
        if not is_pw_ok and student.initial_password and raw_password == student.initial_password:
            student.parent_password_hash = get_password_hash(raw_password)
            db.commit()
            is_pw_ok = True

        if not is_pw_ok:
            raise HTTPException(
                status_code=401,
                detail="Invalid Student LRN or password. Please verify the generated LRN password from the School Admin/Registrar."
            )

        token = create_access_token(data={"sub": student.student_id, "role": "Parent"})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": student.id,
                "username": student.student_id,
                "full_name": student.parent_name or f"Parent of {student.full_name}",
                "role": "Parent",
                "student_id": student.id,
                "student_name": student.full_name,
                "student_lrn": student.student_id,
                "grade_level": student.grade_level,
                "password_changed": bool(student.password_changed),
                "profile_picture": None,
            }
        }

    raise HTTPException(status_code=401, detail="Invalid username / Student LRN or password.")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Allows authenticated Parents (using LRN-generated initial password) or Staff/Admin
    to change their password after logging in.
    """
    current_pw = (data.current_password or "").strip()
    new_pw = (data.new_password or "").strip()

    if len(new_pw) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")
    if current_pw == new_pw:
        raise HTTPException(status_code=400, detail="New password must differ from current password.")

    now_iso = ph_now_iso()

    if (current_user.role or "").lower() == "parent":
        parent_id = getattr(current_user, "student_id", current_user.id)
        student = db.query(Student).filter(
            (Student.id == parent_id) |
            (func.lower(func.trim(Student.student_id)) == str(current_user.username).lower()) |
            (func.lower(func.trim(Student.parent_username)) == str(current_user.username).lower())
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student account not found.")

        if not student.parent_password_hash or not verify_password(current_pw, student.parent_password_hash):
            raise HTTPException(status_code=401, detail="Current password is incorrect.")

        student.parent_password_hash = get_password_hash(new_pw)
        student.initial_password = None
        student.password_changed = 1

        db.add(AuditLog(
            user_id=None,
            action="Parent Changed Account Password",
            entity_type="Student",
            entity_id=student.id,
            details=f"Parent portal password updated for LRN {student.student_id} ({student.full_name})",
            timestamp=now_iso
        ))
        db.commit()
        return {"status": "success", "message": "Password updated successfully!", "password_changed": True}

    staff = db.query(User).filter(User.id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="User account not found.")
    if not staff.hashed_password or not verify_password(current_pw, staff.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")

    staff.hashed_password = get_password_hash(new_pw)
    db.add(AuditLog(
        user_id=staff.id,
        action="Changed Account Password",
        entity_type="User",
        entity_id=staff.id,
        details=f"Updated password for {staff.username}",
        timestamp=now_iso
    ))
    db.commit()
    return {"status": "success", "message": "Password updated successfully!"}
