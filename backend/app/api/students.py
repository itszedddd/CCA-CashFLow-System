import json
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, timedelta

from ..database import get_db
from ..models.models import (
    Student, StudentFeeSchedule, Income, IncomeCategory, AuditLog, User
)
from ..schemas import (
    StudentCreate, StudentUpdate, StudentResponse, StudentDetailResponse,
    RecordStudentPaymentRequest, IncomeResponse
)
from ..core.anomaly_engine import evaluate_single_transaction, generate_student_ai_payment_plan
from ..core.timezone import (
    ph_now, ph_now_iso, ph_now_display, format_ph_timestamp,
    resolve_section, generate_lrn_password, get_grade_fee_benchmarks
)
from ..auth import get_current_user, get_optional_current_user, get_password_hash


router = APIRouter(prefix="/api/students", tags=["Students & Collections"])

# Default standard fee benchmarks for CCA School Year 2026-2027
DEFAULT_FEES = [
    {"category_name": "Tuition Fee", "sub_description": "Annual Tuition (10 Months @ ₱1,906/mo)", "total_due": 19060.0},
    {"category_name": "Registration Fee", "sub_description": "Annual Registration & Matriculation", "total_due": 5700.0},
    {"category_name": "Books", "sub_description": "Textbooks & Instructional Modules", "total_due": 6900.0},
    {"category_name": "Energy Fee", "sub_description": "Air-Conditioning & Utility Subsidy", "total_due": 3000.0},
    {"category_name": "Other Fees", "sub_description": "Educational Tour, Swimming & Activities", "total_due": 1500.0},
]


def generate_next_or_number(db: Session) -> str:
    """
    Auto-generates sequential reference number for CSV historical credits (e.g., CSV-2026-00045).
    Manual cashier collections must supply the physical Official Receipt (OR) Number.
    """
    year = ph_now().year
    prefix = f"CSV-{year}-"

    incomes_with_or = db.query(Income.or_number).filter(Income.or_number.like(f"{prefix}%")).all()
    highest_num = 0
    for (or_str,) in incomes_with_or:
        if or_str:
            try:
                part = int(or_str.split("-")[-1])
                if part > highest_num:
                    highest_num = part
            except Exception:
                pass

    next_num = max(highest_num + 1, 1)
    while True:
        candidate_or = f"{prefix}{next_num:05d}"
        if not db.query(Income).filter(Income.or_number == candidate_or).first():
            return candidate_or
        next_num += 1


def calculate_student_balance(student: Student, school_year: Optional[str] = None):
    """Computes total due, total paid, remaining balance, and status for the active school year."""
    target_sy = school_year or getattr(student, "school_year", None)
    all_schedules = getattr(student, "fee_schedules", []) or []
    if target_sy:
        active_schedules = [fs for fs in all_schedules if not fs.school_year or fs.school_year == target_sy]
        if not active_schedules:
            active_schedules = all_schedules
    else:
        active_schedules = all_schedules

    total_due = sum(fs.total_due for fs in active_schedules)
    total_paid = sum(fs.total_paid for fs in active_schedules)
    outstanding = max(0.0, total_due - total_paid)

    if total_due > 0 and outstanding == 0:
        status = "Fully Paid"
    elif total_paid > 0:
        status = "Partial"
    else:
        status = "Unpaid"

    return total_due, total_paid, outstanding, status



def find_student_by_id_or_lrn(
    identifier: str | int,
    db: Session,
    current_user: Optional[User] = None
) -> Optional[Student]:
    """
    Finds a student by either their database primary key (id), their Learner Reference Number (student_id / LRN),
    their parent username, or 'me' if caller is an authenticated Parent.
    Ensures seamless lookup regardless of whether UI routes use primary keys or LRN strings.
    """
    raw = str(identifier or "").strip()
    if not raw:
        return None

    # Handle 'me' for authenticated Parent
    if raw.lower() == "me" and current_user and (current_user.role or "").lower() == "parent":
        p_id = getattr(current_user, "student_id", current_user.id)
        if p_id:
            st = db.query(Student).filter(Student.id == p_id).first()
            if st:
                return st
        if getattr(current_user, "username", None):
            st = db.query(Student).filter(
                (func.lower(func.trim(Student.student_id)) == current_user.username.lower()) |
                (func.lower(func.trim(Student.parent_username)) == current_user.username.lower())
            ).first()
            if st:
                return st

    # 1. Match by Student LRN or parent username (exact case-insensitive match)
    student = db.query(Student).filter(
        (func.lower(func.trim(Student.student_id)) == raw.lower()) |
        (func.lower(func.trim(Student.parent_username)) == raw.lower())
    ).first()
    if student:
        return student

    # 2. Match by integer primary key if identifier is numeric
    if raw.isdigit():
        try:
            int_id = int(raw)
            student = db.query(Student).filter(Student.id == int_id).first()
            if student:
                return student
        except Exception:
            pass

    return None


@router.get("/next-receipt-number")
def get_next_or(db: Session = Depends(get_db)):
    """Preview the next auto-generated OR number."""
    return {"next_or_number": generate_next_or_number(db)}


def _parse_csv_amount(val) -> float:
    """Helper to safely parse monetary amounts from CSV strings."""
    if not val:
        return 0.0
    try:
        cleaned = str(val).replace("₱", "").replace("$", "").replace(",", "").strip()
        return max(0.0, float(cleaned)) if cleaned else 0.0
    except Exception:
        return 0.0


@router.get("/csv-template")
def download_student_csv_template():
    """
    Download standard CSV template for bulk importing existing/old student records.
    Includes optional columns for recording previously paid balances per fee category.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "student_id", "full_name", "grade_level", "section", "gender",
        "parent_name", "parent_contact", "parent_email", "address", "school_year",
        "tuition_paid", "registration_paid", "books_paid", "energy_paid", "other_paid", "total_paid"
    ])
    # Representative sample rows demonstrating different student payment states:
    # 1. Partially paid student (paid registration, books, and partial tuition)
    writer.writerow([
        "109283746501", "Juan Dela Cruz", "Grade 7", "Goodness", "Male",
        "Pedro Dela Cruz", "09171234567", "pedro.delacruz@email.com", "San Jose del Monte, Bulacan", "2026-2027",
        "5718.00", "5700.00", "6900.00", "0.00", "0.00", ""
    ])
    # 2. Fully paid student (all 5 fee categories settled in full)
    writer.writerow([
        "109283746502", "Maria Clara Santos", "Grade 8", "Faithfulness", "Female",
        "Jose Santos", "09187654321", "jose.santos@email.com", "San Jose del Monte, Bulacan", "2026-2027",
        "19060.00", "5700.00", "6900.00", "3000.00", "1500.00", ""
    ])
    # 3. Lump-sum advance payer (auto-allocates across Registration, Books, Tuition, etc.)
    writer.writerow([
        "109283746503", "Joshua Ramos", "Kindergarten", "Joy", "Male",
        "Carlos Ramos", "09201122334", "carlos.ramos@email.com", "San Jose del Monte, Bulacan", "2026-2027",
        "", "", "", "", "", "12600.00"
    ])
    # 4. Enrolled student with zero prior payments (full balance remaining)
    writer.writerow([
        "109283746504", "Ana Marie Reyes", "Grade 1", "Faith", "Female",
        "Elena Reyes", "09192233445", "elena.reyes@email.com", "San Jose del Monte, Bulacan", "2026-2027",
        "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"
    ])
    csv_bytes = output.getvalue().encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=CCA_Students_Import_Template.csv"}
    )


@router.post("/import-csv")
async def import_students_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Import existing/old students in bulk from a CSV file.
    Automatically initializes the 5 official CCA fee schedules for each student
    and credits any existing/prior paid balances to their official student ledger.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except Exception:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    imported = []
    skipped = []
    errors = []

    for row_idx, row in enumerate(reader, start=2):
        sid = (row.get("student_id") or row.get("lrn") or row.get("Student ID") or "").strip()
        name = (row.get("full_name") or row.get("name") or row.get("Student Name") or "").strip()
        grade = (row.get("grade_level") or row.get("grade") or "Grade 7").strip()
        raw_section = (row.get("section") or "Faith").strip()
        section = resolve_section(grade, raw_section)
        gender = (row.get("gender") or "Male").strip()
        parent_name = (row.get("parent_name") or row.get("parent") or "").strip()
        parent_contact_raw = (row.get("parent_contact") or row.get("contact") or "").strip()
        clean_c = re.sub(r"\D", "", parent_contact_raw)
        if clean_c.startswith("63") and len(clean_c) == 12:
            clean_c = "0" + clean_c[2:]
        parent_contact = clean_c if len(clean_c) == 11 else parent_contact_raw
        parent_email = (row.get("parent_email") or row.get("email") or "").strip()
        address = (row.get("address") or "").strip()
        school_year = (row.get("school_year") or "2026-2027").strip()
        csv_or = (row.get("or_number") or row.get("OR Number") or "").strip()

        # Parse paid amounts from CSV columns
        tuition_paid = _parse_csv_amount(row.get("tuition_paid") or row.get("Tuition Paid") or row.get("tuition"))
        reg_paid = _parse_csv_amount(row.get("registration_paid") or row.get("Registration Paid") or row.get("registration"))
        books_paid = _parse_csv_amount(row.get("books_paid") or row.get("Books Paid") or row.get("books"))
        energy_paid = _parse_csv_amount(row.get("energy_paid") or row.get("Energy Paid") or row.get("energy"))
        other_paid = _parse_csv_amount(row.get("other_paid") or row.get("Other Paid") or row.get("other"))
        total_paid_generic = _parse_csv_amount(row.get("total_paid") or row.get("Total Paid") or row.get("balance_paid") or row.get("paid_amount") or row.get("already_paid"))

        # If lump sum total_paid is provided without category breakdowns, distribute in standard priority order:
        if total_paid_generic > 0 and (tuition_paid + reg_paid + books_paid + energy_paid + other_paid) == 0:
            rem = total_paid_generic
            reg_paid = min(5700.0, rem); rem -= reg_paid
            books_paid = min(6900.0, rem); rem -= books_paid
            tuition_paid = min(19060.0, rem); rem -= tuition_paid
            energy_paid = min(3000.0, rem); rem -= energy_paid
            other_paid = min(1500.0, rem)

        cat_paid_map = {
            "Tuition Fee": tuition_paid,
            "Registration Fee": reg_paid,
            "Books": books_paid,
            "Energy Fee": energy_paid,
            "Other Fees": other_paid,
        }

        if not name:
            errors.append(f"Row {row_idx}: Missing student name")
            continue

        # Check existing student by LRN (case-insensitive) OR by Name + Grade (case-insensitive)
        existing = None
        if sid:
            existing = db.query(Student).filter(
                func.lower(func.trim(Student.student_id)) == sid.lower().strip()
            ).first()
        if not existing and name and grade:
            existing = db.query(Student).filter(
                func.lower(func.trim(Student.full_name)) == name.lower().strip(),
                func.lower(func.trim(Student.grade_level)) == grade.lower().strip()
            ).first()

        if existing:
            existing.full_name = name
            existing.grade_level = grade
            existing.section = section
            if parent_name:
                existing.parent_name = parent_name
            if parent_contact:
                existing.parent_contact = parent_contact
            if parent_email:
                existing.parent_email = parent_email

            # Update existing fee schedules if payment values are supplied
            has_payments = any(v > 0 for v in cat_paid_map.values())
            if has_payments:
                for fs in existing.fee_schedules:
                    target_paid = min(fs.total_due, cat_paid_map.get(fs.category_name, 0.0))
                    if target_paid > fs.total_paid:
                        incremental_pay = target_paid - fs.total_paid
                        fs.total_paid = target_paid
                        fs.remaining_balance = max(0.0, fs.total_due - target_paid)

                        cat_match = db.query(IncomeCategory).filter(
                            IncomeCategory.name.ilike(f"%{fs.category_name[:5]}%")
                        ).first()
                        or_num = csv_or or generate_next_or_number(db)
                        income = Income(
                            category_id=cat_match.id if cat_match else 1,
                            student_id_ref=existing.id,
                            amount=incremental_pay,
                            expected_amount=fs.total_due,
                            is_partial=1 if fs.remaining_balance > 0 else 0,
                            remaining_balance=fs.remaining_balance,
                            student_id=existing.student_id,
                            grade_level=existing.grade_level,
                            fee_type=fs.category_name,
                            envelope_verified=1,
                            description=f"Prior balance payment credited via CSV update for {fs.category_name}",
                            or_number=or_num,
                            payer_name=existing.full_name,
                            payer_type="Student",
                            payment_method="Cash",
                            school_year=existing.school_year,
                            date_recorded=ph_now_iso(),
                            remarks="Credited payment update from student CSV",
                            anomaly_score=0.0,
                            anomaly_level="Low",
                            anomaly_status="Normal",
                            is_voided=0
                        )
                        db.add(income)

            if not getattr(existing, "initial_password", None) and not getattr(existing, "password_changed", 0):
                gen_pw = generate_lrn_password(existing.student_id, existing.full_name)
                existing.initial_password = gen_pw
                existing.parent_password_hash = get_password_hash(gen_pw)
                existing.parent_username = existing.student_id
                existing.password_changed = 0

            skipped.append(existing.student_id)
            continue

        if not sid:
            errors.append(f"Row {row_idx}: Missing required LRN / Student ID for '{name}'. LRN cannot be auto-generated.")
            continue
        if not sid.isdigit():
            errors.append(f"Row {row_idx}: Student ID / LRN '{sid}' must contain numbers only.")
            continue

        gen_pw = generate_lrn_password(sid, name)
        student = Student(
            student_id=sid,
            full_name=name,
            grade_level=grade,
            section=section,
            gender=gender,
            parent_name=parent_name,
            parent_contact=parent_contact,
            parent_email=parent_email,
            address=address,
            school_year=school_year,
            parent_username=sid,
            parent_password_hash=get_password_hash(gen_pw),
            initial_password=gen_pw,
            password_changed=0,
            enrollment_status="Enrolled",
            created_at=ph_now_iso()
        )
        db.add(student)
        db.flush()

        # Initialize standard fee schedules matching student's grade level
        grade_benchmarks = get_grade_fee_benchmarks(grade)
        for f in grade_benchmarks:
            cat_name = f["category_name"]
            paid_for_cat = cat_paid_map.get(cat_name, 0.0)
            # If CSV has explicit payment or assessment, use benchmark total_due; otherwise initialize with paid amount
            total_due_val = f["total_due"] if paid_for_cat > 0 else 0.0
            paid_for_cat = min(total_due_val, paid_for_cat) if total_due_val > 0 else paid_for_cat
            rem_bal = max(0.0, total_due_val - paid_for_cat)

            fs = StudentFeeSchedule(
                student_id=student.id,
                category_name=cat_name,
                sub_description=f["sub_description"],
                total_due=total_due_val,
                total_paid=paid_for_cat,
                remaining_balance=rem_bal,
                school_year=school_year
            )
            db.add(fs)

            # If student already has balance paid for this category, create official historical receipt
            if paid_for_cat > 0:
                cat_match = db.query(IncomeCategory).filter(
                    IncomeCategory.name.ilike(f"%{cat_name[:5]}%")
                ).first()
                or_num = csv_or or generate_next_or_number(db)
                income = Income(
                    category_id=cat_match.id if cat_match else 1,
                    student_id_ref=student.id,
                    amount=paid_for_cat,
                    expected_amount=f["total_due"],
                    is_partial=1 if rem_bal > 0 else 0,
                    remaining_balance=rem_bal,
                    student_id=student.student_id,
                    grade_level=student.grade_level,
                    fee_type=cat_name,
                    envelope_verified=1,
                    description=f"Prior balance payment credited via student CSV import for {cat_name}",
                    or_number=or_num,
                    payer_name=student.full_name,
                    payer_type="Student",
                    payment_method="Cash",
                    school_year=student.school_year,
                    date_recorded=ph_now_iso(),
                    remarks="Initial credited payment from legacy school records",
                    anomaly_score=0.0,
                    anomaly_level="Low",
                    anomaly_status="Normal",
                    is_voided=0
                )
                db.add(income)

        imported.append({
            "student_id": sid,
            "full_name": name,
            "grade_level": grade,
            "section": section,
            "initial_password": gen_pw
        })

    db.commit()

    # Log to audit trail
    log = AuditLog(
        user_id=current_user.id if current_user else None,
        action="Bulk Student CSV Import",
        entity_type="Student",
        details=f"Imported {len(imported)} students, updated/skipped {len(skipped)} existing. Errors: {len(errors)}.",
        timestamp=ph_now_iso()
    )
    db.add(log)
    db.commit()

    return {
        "status": "success",
        "imported_count": len(imported),
        "updated_existing_count": len(skipped),
        "error_count": len(errors),
        "imported_students": imported,
        "errors": errors[:10]
    }


@router.get("/grade-summary")
def get_grade_summary(db: Session = Depends(get_db)):
    """Summary of student enrollment and collections organized by grade level."""
    grades = [
        "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4",
        "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"
    ]
    summary = []
    for g in grades:
        students = db.query(Student).filter(Student.grade_level == g).all()
        student_count = len(students)
        total_due = 0.0
        total_paid = 0.0
        for s in students:
            for fs in s.fee_schedules:
                total_due += fs.total_due
                total_paid += fs.total_paid
        summary.append({
            "grade_level": g,
            "student_count": student_count,
            "total_due": total_due,
            "total_paid": total_paid,
            "outstanding_balance": max(0.0, total_due - total_paid),
            "collection_rate": round((total_paid / total_due * 100), 1) if total_due > 0 else 0.0
        })
    return summary


@router.get("/", response_model=List[StudentResponse])
def get_students(
    grade_level: Optional[str] = None,
    q: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    List students organized by grade level with search and payment status filtering.
    """
    is_staff = bool(current_user and (current_user.role or "").lower() in {"admin", "cashier"})
    query = db.query(Student)

    if grade_level and grade_level != "All":
        query = query.filter(Student.grade_level == grade_level)

    if q:
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Student.full_name.ilike(search),
                Student.student_id.ilike(search),
                Student.parent_name.ilike(search)
            )
        )

    students = query.order_by(Student.grade_level, Student.full_name).all()

    result = []
    for s in students:
        total_due, total_paid, outstanding, payment_status = calculate_student_balance(s)
        if status and status != "All" and payment_status != status:
            continue

        pw_changed = getattr(s, "password_changed", 0) or 0
        init_pw = getattr(s, "initial_password", None) if (is_staff and not pw_changed) else None

        resp = StudentResponse(
            id=s.id,
            student_id=s.student_id,
            full_name=s.full_name,
            grade_level=s.grade_level,
            section=resolve_section(s.grade_level, s.section),
            gender=s.gender,
            birthdate=s.birthdate,
            parent_name=s.parent_name,
            parent_contact=s.parent_contact,
            parent_email=s.parent_email,
            address=s.address,
            school_year=s.school_year,
            enrollment_status=s.enrollment_status,
            created_at=s.created_at,
            total_due=total_due,
            total_paid=total_paid,
            outstanding_balance=outstanding,
            payment_status=payment_status,
            initial_password=init_pw,
            password_changed=pw_changed,
        )
        result.append(resp)

    return result


@router.get("/{student_id}", response_model=StudentDetailResponse)
def get_student_detail(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Get detailed student profile with all fee schedules across:
    Tuition Fee, Registration Fee, Books, Energy Fee, Other Fees,
    along with full payment transaction records.
    Supports lookup by integer primary key or DepEd LRN string.
    """
    is_staff = bool(current_user and (current_user.role or "").lower() in {"admin", "cashier"})
    student = find_student_by_id_or_lrn(student_id, db, current_user)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    total_due, total_paid, outstanding, payment_status = calculate_student_balance(student)

    # Convert payments
    payments_resp = []
    for p in student.payments:
        if not p.is_voided:
            cat_name = p.category.name if p.category else p.fee_type
            payments_resp.append(
                IncomeResponse(
                    id=p.id,
                    category_id=p.category_id or 1,
                    category_name=cat_name,
                    amount=p.amount,
                    expected_amount=p.expected_amount,
                    is_partial=p.is_partial,
                    remaining_balance=p.remaining_balance,
                    student_id=p.student_id,
                    grade_level=p.grade_level,
                    envelope_verified=p.envelope_verified,
                    description=p.description or "",
                    or_number=p.or_number,
                    payer_name=p.payer_name,
                    payer_type=p.payer_type,
                    payment_method=p.payment_method,
                    reference_number=p.reference_number,
                    school_year=p.school_year,
                    date_recorded=p.date_recorded or "",
                    remarks=p.remarks,
                    recorded_by=p.recorded_by,
                    is_voided=p.is_voided,
                    anomaly_score=p.anomaly_score,
                    anomaly_level=p.anomaly_level,
                    anomaly_status=p.anomaly_status,
                    cashier_notes=p.cashier_notes
                )
            )

    payments_resp.sort(key=lambda x: x.date_recorded or "", reverse=True)
    pw_changed = getattr(student, "password_changed", 0) or 0
    init_pw = getattr(student, "initial_password", None) if (is_staff and not pw_changed) else None

    # Generate autonomous AI payment plan
    ai_plan = generate_student_ai_payment_plan(student, db)

    return StudentDetailResponse(
        id=student.id,
        student_id=student.student_id,
        full_name=student.full_name,
        grade_level=student.grade_level,
        section=resolve_section(student.grade_level, student.section),
        gender=student.gender,
        birthdate=student.birthdate,
        parent_name=student.parent_name,
        parent_contact=student.parent_contact,
        parent_email=student.parent_email,
        address=student.address,
        school_year=student.school_year,
        enrollment_status=student.enrollment_status,
        created_at=student.created_at,
        total_due=total_due,
        total_paid=total_paid,
        outstanding_balance=outstanding,
        payment_status=payment_status,
        initial_password=init_pw,
        password_changed=pw_changed,
        fee_schedules=student.fee_schedules,
        payments=payments_resp,
        ai_payment_plan=ai_plan
    )


@router.get("/{student_id}/ai-plan")
def get_student_ai_payment_plan_endpoint(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Returns the autonomous AI payment recommendation, behavioral cluster,
    and optimized settlement schedule for a student.
    """
    student = find_student_by_id_or_lrn(student_id, db, current_user)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return generate_student_ai_payment_plan(student, db)


@router.post("/", response_model=StudentResponse)
def create_student(
    data: StudentCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Create a new student profile, auto-sync canonical Section from Grade Level,
    auto-generate unique per-LRN parent password, and initialize standard 5 fee schedules.
    """
    clean_sid = (data.student_id or "").strip()
    clean_name = (data.full_name or "").strip()
    clean_grade = (data.grade_level or "").strip()
    clean_contact = re.sub(r"\D", "", data.parent_contact or "")

    if not clean_contact or len(clean_contact) != 11:
        raise HTTPException(
            status_code=400,
            detail="Parent contact number is required and must be exactly 11 digits (e.g. 09171234567). Bawal kulang, bawal sobra."
        )

    if not clean_sid:
        raise HTTPException(
            status_code=400,
            detail="Learner Reference Number (LRN) / Student ID is required. LRN cannot be auto-generated."
        )

    if not clean_sid.isdigit():
        raise HTTPException(
            status_code=400,
            detail="Student ID / LRN must contain numbers only."
        )

    if not clean_name:
        raise HTTPException(status_code=400, detail="Student full name is required.")

    existing_sid = db.query(Student).filter(
        func.lower(func.trim(Student.student_id)) == clean_sid.lower()
    ).first()
    if existing_sid:
        raise HTTPException(
            status_code=400,
            detail=f"Student ID / LRN '{clean_sid}' is already registered for {existing_sid.full_name}."
        )

    existing_name = db.query(Student).filter(
        func.lower(func.trim(Student.full_name)) == clean_name.lower(),
        func.lower(func.trim(Student.grade_level)) == clean_grade.lower()
    ).first()
    if existing_name:
        raise HTTPException(
            status_code=400,
            detail=f"A student record for '{clean_name}' in {clean_grade} already exists (LRN: {existing_name.student_id}). Duplicate student profiles are not permitted."
        )

    canonical_sec = resolve_section(clean_grade, (data.section or "Faith").strip())
    gen_pw = generate_lrn_password(clean_sid, clean_name)
    now_iso = ph_now_iso()

    student = Student(
        student_id=clean_sid,
        full_name=clean_name,
        grade_level=clean_grade,
        section=canonical_sec,
        gender=data.gender or "Male",
        birthdate=data.birthdate,
        parent_name=(data.parent_name or "").strip(),
        parent_contact=clean_contact if clean_contact else (data.parent_contact or "").strip(),
        parent_email=(data.parent_email or "").strip(),
        address=data.address,
        school_year=data.school_year or "2026-2027",
        parent_username=clean_sid,
        parent_password_hash=get_password_hash(gen_pw),
        initial_password=gen_pw,
        password_changed=0,
        enrollment_status=data.enrollment_status or "Enrolled",
        created_at=now_iso
    )
    db.add(student)
    db.flush()

    # Initialize standard fee schedules matching student's grade level
    grade_fees = get_grade_fee_benchmarks(clean_grade)
    for f in grade_fees:
        existing_fs = db.query(StudentFeeSchedule).filter(
            StudentFeeSchedule.student_id == student.id,
            StudentFeeSchedule.category_name == f["category_name"]
        ).first()
        if not existing_fs:
            fs = StudentFeeSchedule(
                student_id=student.id,
                category_name=f["category_name"],
                sub_description=f["sub_description"],
                total_due=f["total_due"],
                total_paid=0.0,
                remaining_balance=f["total_due"],
                school_year=student.school_year
            )
            db.add(fs)

    db.add(AuditLog(
        user_id=current_user.id if current_user else None,
        action="Created Student Account",
        entity_type="Student",
        entity_id=student.id,
        details=f"LRN: {clean_sid}, Name: {clean_name}, Grade: {clean_grade} - {canonical_sec}",
        timestamp=now_iso
    ))

    db.commit()
    db.refresh(student)

    total_due, total_paid, outstanding, payment_status = calculate_student_balance(student)
    return StudentResponse(
        id=student.id,
        student_id=student.student_id,
        full_name=student.full_name,
        grade_level=student.grade_level,
        section=student.section,
        gender=student.gender,
        birthdate=student.birthdate,
        parent_name=student.parent_name,
        parent_contact=student.parent_contact,
        parent_email=student.parent_email,
        address=student.address,
        school_year=student.school_year,
        enrollment_status=student.enrollment_status,
        created_at=student.created_at,
        total_due=total_due,
        total_paid=total_paid,
        outstanding_balance=outstanding,
        payment_status=payment_status,
        initial_password=gen_pw,
        password_changed=0,
    )


@router.put("/{student_id}", response_model=StudentResponse)
def update_student(student_id: str, data: StudentUpdate, db: Session = Depends(get_db)):
    """Update student basic information with duplicate safeguards & automatic Section sync."""
    student = find_student_by_id_or_lrn(student_id, db)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if data.student_id:
        clean_sid = data.student_id.strip()
        if not clean_sid:
            raise HTTPException(status_code=400, detail="LRN cannot be empty.")
        if not clean_sid.isdigit():
            raise HTTPException(status_code=400, detail="Student ID / LRN must contain numbers only.")
        if clean_sid.lower() != student.student_id.lower():
            dup_sid = db.query(Student).filter(
                func.lower(func.trim(Student.student_id)) == clean_sid.lower(),
                Student.id != student.id
            ).first()
            if dup_sid:
                raise HTTPException(
                    status_code=400,
                    detail=f"Student ID / LRN '{clean_sid}' is already assigned to {dup_sid.full_name}."
                )
            student.student_id = clean_sid
            student.parent_username = clean_sid

    target_name = (data.full_name.strip() if data.full_name else student.full_name).strip()
    target_grade = (data.grade_level.strip() if data.grade_level else student.grade_level).strip()
    if target_name.lower() != student.full_name.lower() or target_grade.lower() != student.grade_level.lower():
        dup_name = db.query(Student).filter(
            func.lower(func.trim(Student.full_name)) == target_name.lower(),
            func.lower(func.trim(Student.grade_level)) == target_grade.lower(),
            Student.id != student.id
        ).first()
        if dup_name:
            raise HTTPException(
                status_code=400,
                detail=f"A student record for '{target_name}' in {target_grade} already exists (LRN: {dup_name.student_id})."
            )

    for field, val in data.dict(exclude_unset=True).items():
        if field == "parent_contact":
            clean_c = re.sub(r"\D", "", str(val or ""))
            if not clean_c or len(clean_c) != 11:
                raise HTTPException(
                    status_code=400,
                    detail="Parent contact number must be exactly 11 digits (e.g. 09171234567). Bawal kulang, bawal sobra."
                )
            setattr(student, field, clean_c)
        elif field not in ("student_id", "section"):
            setattr(student, field, val)

    # Always synchronize canonical single section per grade level
    student.section = resolve_section(student.grade_level, student.section)

    db.commit()
    db.refresh(student)

    total_due, total_paid, outstanding, payment_status = calculate_student_balance(student)
    pw_changed = getattr(student, "password_changed", 0) or 0
    return StudentResponse(
        id=student.id,
        student_id=student.student_id,
        full_name=student.full_name,
        grade_level=student.grade_level,
        section=student.section,
        gender=student.gender,
        birthdate=student.birthdate,
        parent_name=student.parent_name,
        parent_contact=student.parent_contact,
        parent_email=student.parent_email,
        address=student.address,
        school_year=student.school_year,
        enrollment_status=student.enrollment_status,
        created_at=student.created_at,
        total_due=total_due,
        total_paid=total_paid,
        outstanding_balance=outstanding,
        payment_status=payment_status,
        initial_password=getattr(student, "initial_password", None) if not pw_changed else None,
        password_changed=pw_changed,
    )


@router.post("/{student_id}/reset-password")
def reset_student_password(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin/Cashier resets and issues a fresh LRN initial password for parent login."""
    if (current_user.role or "").lower() == "parent":
        raise HTTPException(status_code=403, detail="Unauthorized: Admin or Cashier access required.")

    student = find_student_by_id_or_lrn(student_id, db, current_user)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    new_pw = generate_lrn_password(student.student_id, student.full_name)
    student.initial_password = new_pw
    student.parent_password_hash = get_password_hash(new_pw)
    student.parent_username = student.student_id
    student.password_changed = 0

    db.add(AuditLog(
        user_id=current_user.id,
        action="Reset Parent LRN Password",
        entity_type="Student",
        entity_id=student.id,
        details=f"Issued fresh generated password for LRN {student.student_id} ({student.full_name})",
        timestamp=ph_now_iso()
    ))
    db.commit()

    return {
        "status": "success",
        "student_id": student.student_id,
        "full_name": student.full_name,
        "initial_password": new_pw,
    }


@router.post("/{student_id}/payments")
def record_student_payment(
    student_id: str,
    data: RecordStudentPaymentRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Record payment collection directly from student profile or Collections list:
    - Requires manual Official Receipt (OR) Number from physical receipt booklet
    - Prevents duplicate OR numbers
    - Auto-updates student fee schedule balance
    - Evaluates payment with ML Anomaly Detection engine
    - Stores timestamps strictly in Philippine Standard Time (Asia/Manila)
    """
    student = find_student_by_id_or_lrn(student_id, db, current_user)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    clean_or = (data.or_number or "").strip()
    if not clean_or:
        raise HTTPException(
            status_code=400,
            detail="Official Receipt (OR) Number from the physical receipt is required."
        )

    existing_or = db.query(Income).filter(
        func.lower(func.trim(Income.or_number)) == clean_or.lower(),
        Income.is_voided == 0
    ).first()
    if existing_or:
        raise HTTPException(
            status_code=400,
            detail=f"Official Receipt Number '{clean_or}' is already recorded (Payer: {existing_or.payer_name}, Amount: ₱{existing_or.amount:,.2f}). Please verify the physical receipt number."
        )

    or_number = clean_or

    # Find matching fee schedule for this student
    fs = db.query(StudentFeeSchedule).filter(
        StudentFeeSchedule.student_id == student.id,
        StudentFeeSchedule.category_name == data.fee_type
    ).first()

    grade_benchmarks = {b["category_name"]: b for b in get_grade_fee_benchmarks(student.grade_level)}
    benchmark_due = grade_benchmarks.get(data.fee_type, {}).get("total_due", data.amount)

    if not fs:
        # Create fee schedule if not yet present, using official grade benchmark total_due
        fs = StudentFeeSchedule(
            student_id=student.id,
            category_name=data.fee_type,
            sub_description=grade_benchmarks.get(data.fee_type, {}).get("sub_description") or data.description or data.fee_type,
            total_due=benchmark_due,
            total_paid=0.0,
            remaining_balance=benchmark_due,
            school_year=data.school_year or "2026-2027"
        )
        db.add(fs)
        db.flush()
    elif (fs.total_due or 0.0) == 0.0 and (fs.total_paid or 0.0) == 0.0:
        # Student account was created with 0.00 assessment; Cashier is now adding/activating the fee
        # Set total_due to official grade benchmark (or at least the payment amount if higher)
        fs.total_due = max(benchmark_due, data.amount)
        fs.remaining_balance = fs.total_due

    # Capture outstanding balance BEFORE payment is applied
    outstanding_before_pay = float(fs.remaining_balance)

    # ── Duplicate / Rapid Submission Detection ──
    # Check for identical payments (same student, same category, same amount) within last 60 minutes
    cutoff_time = (ph_now() - timedelta(minutes=60)).isoformat()
    duplicate_count = db.query(Income).filter(
        Income.student_id_ref == student.id,
        Income.fee_type == data.fee_type,
        Income.amount == data.amount,
        Income.date_recorded > cutoff_time,
        Income.is_voided == 0,
    ).count()

    # Update fee schedule balance
    fs.total_paid += data.amount
    fs.remaining_balance = max(0.0, fs.total_due - fs.total_paid)

    # Map category name to category_id
    cat = db.query(IncomeCategory).filter(
        IncomeCategory.name.ilike(f"%{data.fee_type[:5]}%")
    ).first()
    category_id = cat.id if cat else 1

    # Record Income transaction (Philippine Standard Time)
    now_iso = ph_now_iso()
    desc = data.description or f"Payment for {data.fee_type} - {student.full_name}"

    income = Income(
        category_id=category_id,
        student_id_ref=student.id,
        amount=data.amount,
        expected_amount=fs.total_due,
        is_partial=1 if fs.remaining_balance > 0 else 0,
        remaining_balance=fs.remaining_balance,
        student_id=student.student_id,
        grade_level=student.grade_level,
        fee_type=data.fee_type,
        envelope_verified=data.envelope_verified or 1,
        description=desc,
        or_number=or_number,
        payer_name=student.full_name,
        payer_type="Student",
        payment_method=data.payment_method,
        reference_number=data.reference_number,
        school_year=data.school_year or "2026-2027",
        date_recorded=now_iso,
        recorded_by=current_user.id if current_user else None,
        remarks=data.remarks,
        is_voided=0
    )

    # ML Anomaly Detection check
    eval_res = evaluate_single_transaction(
        amount=income.amount,
        category_id=category_id,
        category_name=data.fee_type,
        payer_name=student.full_name,
        grade_level=student.grade_level,
        payment_method=data.payment_method,
        expected_amount=fs.total_due,
        is_partial=income.is_partial,
        current_balance=outstanding_before_pay,
        duplicate_count=duplicate_count,
    )
    income.anomaly_score = eval_res.get("anomaly_score", 0.0)
    income.anomaly_level = eval_res.get("anomaly_level", "Low")
    income.anomaly_reasons = json.dumps({
        "reasons": eval_res.get("reasons", []),
        "recommendations": eval_res.get("recommendations", [])
    })
    income.anomaly_status = "Flagged" if income.anomaly_level in ["High", "Medium"] else "Normal"

    db.add(income)

    # Audit Trail
    anomaly_tag = f" [ML Anomaly: {income.anomaly_level} ({income.anomaly_score}) - {income.anomaly_status}]" if income.anomaly_status == "Flagged" else ""
    audit = AuditLog(
        user_id=current_user.id if current_user else None,
        action=f"Recorded Payment {or_number} for {student.full_name}",
        entity_type="Income",
        entity_id=None,
        details=f"Fee: {data.fee_type}, Amount: ₱{data.amount:,.2f}, Method: {data.payment_method}{anomaly_tag}",
        timestamp=now_iso
    )
    db.add(audit)

    db.commit()
    db.refresh(income)

    cashier_name = current_user.full_name if current_user and current_user.full_name else "Maria Santos"
    receipt_date_display = format_ph_timestamp(now_iso)

    receipt = {
        "or_number": or_number,
        "date": receipt_date_display,
        "student_name": student.full_name,
        "student_id": student.student_id,
        "grade_level": student.grade_level,
        "section": resolve_section(student.grade_level, student.section),
        "parent_name": student.parent_name or "Parent / Guardian",
        "fee_type": data.fee_type,
        "description": desc,
        "amount": data.amount,
        "payment_method": data.payment_method,
        "reference_number": data.reference_number or "N/A",
        "remaining_balance": fs.remaining_balance,
        "total_due": fs.total_due,
        "total_paid": fs.total_paid,
        "school_year": student.school_year,
        "cashier_name": cashier_name,
        "school_name": "Calvary Christian Academy"
    }

    return {
        "status": "success",
        "message": f"Payment of ₱{data.amount:,.2f} recorded successfully with OR {or_number}",
        "or_number": or_number,
        "income_id": income.id,
        "receipt": receipt,
        "anomaly": {
            "score": income.anomaly_score,
            "level": income.anomaly_level,
            "status": income.anomaly_status,
            "reasons": eval_res.get("reasons", []),
            "recommendations": eval_res.get("recommendations", [])
        }
    }


@router.get("/{student_id}/notice-letter")
def get_payment_notice_letter(student_id: str, db: Session = Depends(get_db)):
    """
    Generate auto-filled Payment Notice Letter data for students with outstanding balances.
    """
    student = find_student_by_id_or_lrn(student_id, db)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    unpaid_items = []
    total_unpaid = 0.0

    for fs in student.fee_schedules:
        bal = max(0.0, fs.total_due - fs.total_paid)
        if bal > 0:
            unpaid_items.append({
                "fee_type": fs.category_name,
                "description": fs.sub_description or fs.category_name,
                "total_due": fs.total_due,
                "total_paid": fs.total_paid,
                "outstanding_amount": bal,
                "due_date": fs.due_date or "Immediate"
            })
            total_unpaid += bal

    return {
        "school": {
            "name": "Calvary Christian Academy",
            "office": "Office of the Cashier",
            "address": "BLK 1 LOT 9-10, Sarmiento Townville, Poblacion I, CSJDM, Bulacan 3023",
            "contact": "Mobile: 0956 150 4946  Tel: (044) 305 6166",
            "administrator": "Michelle Jean Gormley",
            "administrator_title": "Administrator"
        },
        "letter_date": ph_now().strftime("%B %d, %Y"),
        "student": {
            "full_name": student.full_name,
            "student_id": student.student_id,
            "grade_level": student.grade_level,
            "section": resolve_section(student.grade_level, student.section),
            "school_year": student.school_year
        },
        "parent": {
            "name": student.parent_name or "Parent / Guardian",
            "contact": student.parent_contact or "N/A",
            "email": student.parent_email or "N/A"
        },
        "has_unpaid_balance": total_unpaid > 0,
        "unpaid_fees": unpaid_items,
        "total_outstanding": total_unpaid,
        "signatories": {
            "administrator": "Michelle Jean Gormley",
            "administrator_title": "Authorized School Administrator",
            "cashier": "Maria Santos",
            "cashier_title": "School Cashier"
        }
    }


@router.get("/{student_id}/yearly-record")
def get_end_of_year_record(student_id: str, db: Session = Depends(get_db)):
    """
    Complete end-of-school-year payment transcript and receipt ledger for student profile & parent portal.
    """
    student = find_student_by_id_or_lrn(student_id, db)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    total_due, total_paid, outstanding, status = calculate_student_balance(student)

    fee_summary = []
    for fs in student.fee_schedules:
        fee_summary.append({
            "fee_type": fs.category_name,
            "description": fs.sub_description,
            "total_due": fs.total_due,
            "total_paid": fs.total_paid,
            "balance": max(0.0, fs.total_due - fs.total_paid),
            "status": "Cleared" if fs.total_paid >= fs.total_due else "Pending"
        })

    receipts_list = []
    for p in student.payments:
        if not p.is_voided:
            receipts_list.append({
                "or_number": p.or_number,
                "date": p.date_recorded,
                "date_display": format_ph_timestamp(p.date_recorded),
                "fee_type": p.fee_type or (p.category.name if p.category else "Tuition Fee"),
                "description": p.description,
                "amount": p.amount,
                "payment_method": p.payment_method,
                "cashier": "Maria Santos"
            })

    receipts_list.sort(key=lambda x: x["date"] or "", reverse=True)

    return {
        "school": {
            "name": "CALVARY CHRISTIAN ACADEMY",
            "office": "OFFICE OF THE CASHIER",
            "address": "BLK 1 LOT 9-10, Sarmiento Townville, Poblacion I, CSJDM, Bulacan 3023",
            "contact": "Mobile: 0956 150 4946  Tel: (044) 305 6166",
            "title": "COMPLETE PAYMENT RECORDS",
            "school_year": student.school_year,
            "generated_at": ph_now_display()
        },
        "student": {
            "full_name": student.full_name,
            "student_id": student.student_id,
            "grade_level": student.grade_level,
            "section": resolve_section(student.grade_level, student.section),
            "parent_name": student.parent_name or "Parent / Guardian",
            "contact": student.parent_contact or "N/A"
        },
        "financial_summary": {
            "total_assessment": total_due,
            "total_payments_made": total_paid,
            "remaining_balance": outstanding,
            "final_status": status
        },
        "fee_breakdown": fee_summary,
        "receipts": receipts_list,
        "certified_by": {
            "cashier": "Maria Santos",
            "administrator": "Michelle Jean Gormley"
        }
    }
