from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.models import (
    Student, StudentFeeSchedule, Income, IncomeCategory, AuditLog, User
)
from ..schemas import (
    StudentCreate, StudentUpdate, StudentResponse, StudentDetailResponse,
    RecordStudentPaymentRequest, IncomeResponse
)
from ..core.anomaly_engine import evaluate_single_transaction
from ..auth import get_current_user

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
    """Auto-generates sequential Official Receipt number (e.g., OR-2026-00045)."""
    year = datetime.now().year
    prefix = f"OR-{year}-"
    # Find highest existing OR with this prefix
    last_income = db.query(Income).filter(
        Income.or_number.like(f"{prefix}%")
    ).order_by(Income.id.desc()).first()

    if last_income and last_income.or_number:
        try:
            num_part = int(last_income.or_number.split("-")[-1])
            next_num = num_part + 1
        except Exception:
            next_num = db.query(Income).count() + 1
    else:
        # Fallback to total incomes count + 1000
        count = db.query(Income).count()
        next_num = count + 1

    return f"{prefix}{next_num:05d}"


def calculate_student_balance(student: Student):
    """Computes total due, total paid, remaining balance, and status."""
    total_due = sum(fs.total_due for fs in student.fee_schedules)
    total_paid = sum(fs.total_paid for fs in student.fee_schedules)
    outstanding = max(0.0, total_due - total_paid)

    if total_due > 0 and outstanding == 0:
        status = "Fully Paid"
    elif total_paid > 0:
        status = "Partial"
    else:
        status = "Unpaid"

    return total_due, total_paid, outstanding, status


@router.get("/next-receipt-number")
def get_next_or(db: Session = Depends(get_db)):
    """Preview the next auto-generated OR number."""
    return {"next_or_number": generate_next_or_number(db)}


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
    db: Session = Depends(get_db)
):
    """
    List students organized by grade level with search and payment status filtering.
    """
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

        resp = StudentResponse(
            id=s.id,
            student_id=s.student_id,
            full_name=s.full_name,
            grade_level=s.grade_level,
            section=s.section,
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
            payment_status=payment_status
        )
        result.append(resp)

    return result


@router.get("/{student_id}", response_model=StudentDetailResponse)
def get_student_detail(student_id: int, db: Session = Depends(get_db)):
    """
    Get detailed student profile with all fee schedules across:
    Tuition Fee, Registration Fee, Books, Energy Fee, Other Fees,
    along with full payment transaction records.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
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

    # Sort payments descending by date
    payments_resp.sort(key=lambda x: x.date_recorded or "", reverse=True)

    return StudentDetailResponse(
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
        fee_schedules=student.fee_schedules,
        payments=payments_resp
    )


@router.post("/", response_model=StudentResponse)
def create_student(data: StudentCreate, db: Session = Depends(get_db)):
    """
    Create a new student profile and initialize standard fee schedules for Tuition,
    Registration, Books, Energy Fee, and Other Fees.
    """
    existing = db.query(Student).filter(Student.student_id == data.student_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student ID / LRN already exists")

    student = Student(
        student_id=data.student_id,
        full_name=data.full_name,
        grade_level=data.grade_level,
        section=data.section or "Faith",
        gender=data.gender,
        birthdate=data.birthdate,
        parent_name=data.parent_name,
        parent_contact=data.parent_contact,
        parent_email=data.parent_email,
        address=data.address,
        school_year=data.school_year or "2026-2027",
        enrollment_status=data.enrollment_status or "Enrolled",
        created_at=datetime.now().isoformat()
    )
    db.add(student)
    db.flush()

    # Initialize standard 5 fee schedules
    for f in DEFAULT_FEES:
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
        payment_status=payment_status
    )


@router.put("/{student_id}", response_model=StudentResponse)
def update_student(student_id: int, data: StudentUpdate, db: Session = Depends(get_db)):
    """Update student basic information."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    for field, val in data.dict(exclude_unset=True).items():
        setattr(student, field, val)

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
        payment_status=payment_status
    )


@router.post("/{student_id}/payments")
def record_student_payment(
    student_id: int,
    data: RecordStudentPaymentRequest,
    db: Session = Depends(get_db)
):
    """
    Record payment collection directly from student profile:
    - Auto-generates Official Receipt (OR) Number
    - Auto-updates student fee schedule balance
    - Saves payment record with ML anomaly validation
    - Automatically returns printable soft-copy receipt details
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    # Auto-generate Official Receipt Number
    or_number = generate_next_or_number(db)

    # Find matching fee schedule for this student
    fs = db.query(StudentFeeSchedule).filter(
        StudentFeeSchedule.student_id == student.id,
        StudentFeeSchedule.category_name == data.fee_type
    ).first()

    if not fs:
        # Create fee schedule if not yet present
        fs = StudentFeeSchedule(
            student_id=student.id,
            category_name=data.fee_type,
            sub_description=data.description or data.fee_type,
            total_due=data.amount,
            total_paid=0.0,
            remaining_balance=data.amount,
            school_year=data.school_year or "2026-2027"
        )
        db.add(fs)
        db.flush()

    # Update fee schedule balance
    fs.total_paid += data.amount
    fs.remaining_balance = max(0.0, fs.total_due - fs.total_paid)

    # Map category name to category_id
    cat = db.query(IncomeCategory).filter(
        IncomeCategory.name.ilike(f"%{data.fee_type[:5]}%")
    ).first()
    category_id = cat.id if cat else 1

    # Record Income transaction
    now_iso = datetime.now().isoformat()
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
        is_partial=income.is_partial
    )
    income.anomaly_score = eval_res.get("anomaly_score", 0.0)
    income.anomaly_level = eval_res.get("anomaly_level", "Low")
    income.anomaly_reasons = str(eval_res.get("reasons", []))
    income.anomaly_status = "Flagged" if income.anomaly_level == "High" else "Normal"

    db.add(income)

    # Audit Trail
    audit = AuditLog(
        action=f"Recorded Payment {or_number} for {student.full_name}",
        entity_type="Income",
        entity_id=None,
        details=f"Fee: {data.fee_type}, Amount: ₱{data.amount:,.2f}, Method: {data.payment_method}",
        timestamp=now_iso
    )
    db.add(audit)

    db.commit()
    db.refresh(income)

    # Prepare receipt object
    receipt = {
        "or_number": or_number,
        "date": datetime.now().strftime("%B %d, %Y - %I:%M %p"),
        "student_name": student.full_name,
        "student_id": student.student_id,
        "grade_level": student.grade_level,
        "section": student.section,
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
        "cashier_name": "Maria Santos",
        "school_name": "Calvary Christian Academy"
    }

    return {
        "status": "success",
        "message": f"Payment of ₱{data.amount:,.2f} recorded successfully with OR {or_number}",
        "or_number": or_number,
        "income_id": income.id,
        "receipt": receipt
    }


@router.get("/{student_id}/notice-letter")
def get_payment_notice_letter(student_id: int, db: Session = Depends(get_db)):
    """
    Generate auto-filled Payment Notice Letter data for students with outstanding balances.
    Auto-fills student name, parent name, itemized unpaid fee types and amounts.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
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
            "name": "CALVARY CHRISTIAN ACADEMY",
            "tagline": "Quality Christian Education for Excellence & Character",
            "address": "Calvary Christian Academy Campus, Bulacan, Philippines",
            "contact": "(044) 123-4567 | info@cca.edu.ph"
        },
        "letter_date": datetime.now().strftime("%B %d, %Y"),
        "student": {
            "full_name": student.full_name,
            "student_id": student.student_id,
            "grade_level": student.grade_level,
            "section": student.section,
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
            "cashier": "Maria Santos",
            "cashier_title": "School Cashier",
            "principal": "Pastor David Reyes, M.Div.",
            "principal_title": "School Principal"
        }
    }


@router.get("/{student_id}/yearly-record")
def get_end_of_year_record(student_id: int, db: Session = Depends(get_db)):
    """
    Complete end-of-school-year payment transcript and receipt ledger for student profile & parent copy.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
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
                "fee_type": p.fee_type or (p.category.name if p.category else "Tuition"),
                "description": p.description,
                "amount": p.amount,
                "payment_method": p.payment_method,
                "cashier": "Maria Santos"
            })

    receipts_list.sort(key=lambda x: x["date"] or "", reverse=True)

    return {
        "school": {
            "name": "CALVARY CHRISTIAN ACADEMY",
            "title": "OFFICIAL STATEMENT OF ACCOUNT & COMPLETE PAYMENT RECORD",
            "school_year": student.school_year,
            "generated_at": datetime.now().strftime("%B %d, %Y %I:%M %p")
        },
        "student": {
            "full_name": student.full_name,
            "student_id": student.student_id,
            "grade_level": student.grade_level,
            "section": student.section,
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
            "cashier": "Maria Santos (School Cashier)",
            "accountant": "Accountant Office",
            "principal": "Pastor David Reyes, M.Div."
        }
    }
