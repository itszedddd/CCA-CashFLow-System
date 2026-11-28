from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from ..database import get_db
from ..models.models import User, Income, Expense, Budget, AuditLog
from ..auth import get_password_hash, require_role
from ..schemas import UserResponse, UserCreate, UserUpdate, AdminResetPasswordRequest
from ..core.timezone import ph_now_iso

router = APIRouter(prefix="/api/users", tags=["User Accounts"])

ALLOWED_STAFF_ROLES = {"Admin", "Cashier"}


def _normalize_role(role: str) -> str:
    cleaned = (role or "").strip().lower()
    for allowed in ALLOWED_STAFF_ROLES:
        if allowed.lower() == cleaned:
            return allowed
    raise HTTPException(
        status_code=400,
        detail=f"Invalid role '{role}'. Must be one of: Admin, Cashier."
    )


def _active_admin_count(db: Session, exclude_user_id: Optional[int] = None) -> int:
    q = db.query(User).filter(func.lower(User.role) == "admin", User.is_active == 1)
    if exclude_user_id is not None:
        q = q.filter(User.id != exclude_user_id)
    return q.count()


@router.get("/", response_model=List[UserResponse])
def list_users(
    role: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin"))
):
    query = db.query(User)
    if role and role.lower() != "all":
        query = query.filter(func.lower(User.role) == role.strip().lower())
    if q and q.strip():
        like_str = f"%{q.strip()}%"
        query = query.filter(
            (User.username.ilike(like_str)) |
            (User.full_name.ilike(like_str))
        )
    return query.order_by(User.id.asc()).all()


@router.post("/", response_model=UserResponse)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin"))
):
    username = (data.username or "").strip().lower()
    full_name = (data.full_name or "").strip()
    password = (data.password or "").strip()

    if not username or len(username) < 3:
        raise HTTPException(status_code=400, detail="Username or email must be at least 3 characters.")
    if " " in username:
        raise HTTPException(status_code=400, detail="Username cannot contain spaces.")
    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    canonical_role = _normalize_role(data.role)

    existing = db.query(User).filter(func.lower(func.trim(User.username)) == username).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Username '{username}' is already registered.")

    now_iso = ph_now_iso()
    new_user = User(
        username=username,
        full_name=full_name,
        hashed_password=get_password_hash(password),
        role=canonical_role,
        is_active=1 if (data.is_active is None or data.is_active) else 0,
        created_at=now_iso,
    )
    db.add(new_user)
    db.flush()

    db.add(AuditLog(
        user_id=current_user.id,
        action="Created User Account",
        entity_type="User",
        entity_id=new_user.id,
        details=f"Created {canonical_role} account '{username}' ({full_name})",
        timestamp=now_iso,
    ))
    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    if data.username is not None:
        new_username = data.username.strip().lower()
        if not new_username or len(new_username) < 3 or " " in new_username:
            raise HTTPException(status_code=400, detail="Username must be at least 3 characters with no spaces.")
        dup = db.query(User).filter(
            func.lower(func.trim(User.username)) == new_username,
            User.id != user_id
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail=f"Username '{new_username}' is already in use.")
        user.username = new_username

    if data.full_name is not None:
        clean_name = data.full_name.strip()
        if not clean_name:
            raise HTTPException(status_code=400, detail="Full name cannot be empty.")
        user.full_name = clean_name

    target_role = _normalize_role(data.role) if data.role is not None else user.role
    target_active = (1 if data.is_active else 0) if data.is_active is not None else user.is_active

    if user.id == current_user.id:
        if target_active == 0:
            raise HTTPException(status_code=400, detail="You cannot deactivate your own active Admin account.")
        if target_role.lower() != "admin":
            raise HTTPException(status_code=400, detail="You cannot remove the Admin role from your own account.")

    was_active_admin = (user.role or "").lower() == "admin" and user.is_active == 1
    will_stay_active_admin = target_role.lower() == "admin" and target_active == 1
    if was_active_admin and not will_stay_active_admin:
        if _active_admin_count(db, exclude_user_id=user.id) == 0:
            raise HTTPException(status_code=400, detail="Cannot deactivate or demote the last active Admin account.")

    user.role = target_role
    user.is_active = target_active

    now_iso = ph_now_iso()
    db.add(AuditLog(
        user_id=current_user.id,
        action="Updated User Account",
        entity_type="User",
        entity_id=user.id,
        details=f"Updated account '{user.username}' (Role: {user.role}, Active: {bool(user.is_active)})",
        timestamp=now_iso,
    ))
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reset-password")
def admin_reset_user_password(
    user_id: int,
    data: AdminResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    new_pw = (data.new_password or "").strip()
    if len(new_pw) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    user.hashed_password = get_password_hash(new_pw)
    now_iso = ph_now_iso()
    db.add(AuditLog(
        user_id=current_user.id,
        action="Reset User Password",
        entity_type="User",
        entity_id=user.id,
        details=f"Admin reset password for '{user.username}' ({user.role})",
        timestamp=now_iso,
    ))
    db.commit()
    return {"status": "success", "message": f"Password updated for {user.username}"}


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    if (user.role or "").lower() == "admin" and user.is_active == 1:
        if _active_admin_count(db, exclude_user_id=user.id) == 0:
            raise HTTPException(status_code=400, detail="Cannot delete the last active Admin account.")

    has_records = (
        db.query(Income).filter(Income.recorded_by == user_id).first() is not None
        or db.query(Expense).filter((Expense.recorded_by == user_id) | (Expense.approved_by == user_id)).first() is not None
        or db.query(Budget).filter(Budget.created_by == user_id).first() is not None
    )
    if has_records:
        raise HTTPException(
            status_code=400,
            detail="Account has recorded financial transactions. Deactivate the account instead to preserve audit history."
        )

    username = user.username
    db.query(AuditLog).filter(AuditLog.user_id == user_id).update({AuditLog.user_id: None})
    db.delete(user)
    db.add(AuditLog(
        user_id=current_user.id,
        action="Deleted User Account",
        entity_type="User",
        entity_id=user_id,
        details=f"Deleted user account '{username}'",
        timestamp=ph_now_iso(),
    ))
    db.commit()
    return {"status": "success", "message": f"User account '{username}' deleted."}
