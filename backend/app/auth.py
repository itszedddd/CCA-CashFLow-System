from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models.models import User, Student

SECRET_KEY = "cca-cashflow-secret-key-2026-calvary-christian-academy"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 720  # 12 hours

import bcrypt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pw_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8') if isinstance(hashed_password, str) else hashed_password
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    pw_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # 1. Check if Parent role
    if role == "Parent":
        student = db.query(Student).filter(
            (Student.student_id == username) |
            (Student.parent_username == username)
        ).first()
        if student:
            user = User(
                id=student.id,
                username=student.student_id,
                full_name=student.parent_name or f"Parent of {student.full_name}",
                role="Parent",
                is_active=1
            )
            user.student_id = student.id
            user.student_lrn = student.student_id
            user.student_grade = student.grade_level
            return user

    # 2. Staff / Cashier / Admin
    user = db.query(User).filter(
        (User.username == username) |
        (User.username == f"{username}@cca.edu.ph")
    ).first()
    if user is None:
        # If single-user cashier system, fallback to cashier
        user = db.query(User).filter(User.role == "Cashier").first()
    if user is None:
        raise credentials_exception
    return user


def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Optional user dependency: does not raise 401 if token is omitted."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if not username:
            return None

        if role == "Parent":
            student = db.query(Student).filter(
                (Student.student_id == username) |
                (Student.parent_username == username)
            ).first()
            if student:
                user = User(
                    id=student.id,
                    username=student.student_id,
                    full_name=student.parent_name or f"Parent of {student.full_name}",
                    role="Parent",
                    is_active=1
                )
                user.student_id = student.id
                user.student_lrn = student.student_id
                user.student_grade = student.grade_level
                return user

        user = db.query(User).filter(
            (User.username == username) |
            (User.username == f"{username}@cca.edu.ph")
        ).first()
        return user
    except Exception:
        return None


def require_role(*roles):
    """Dependency: restrict endpoint to specific roles."""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker
