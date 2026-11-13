"""
Seed data for CCA CashFlow Management System.
Creates default users, categories, sample transactions, students, fee schedules, and notifications.
"""
from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from .models.models import (
    User, IncomeCategory, ExpenseCategory, Income, Expense, Budget, AuditLog,
    Student, StudentFeeSchedule, PaymentNotification
)
from .auth import get_password_hash


STUDENT_DATA = [
    # Kindergarten
    {"name": "Liam Noah Ramos", "grade": "Kindergarten", "section": "Joy", "gender": "Male", "parent": "Carlos Ramos", "contact": "0917-123-4501"},
    {"name": "Mia Olivia Cruz", "grade": "Kindergarten", "section": "Joy", "gender": "Female", "parent": "Elena Cruz", "contact": "0918-234-5602"},
    {"name": "Ethan Gabriel Santos", "grade": "Kindergarten", "section": "Joy", "gender": "Male", "parent": "Roberto Santos", "contact": "0919-345-6703"},
    # Grade 1
    {"name": "Juan Miguel Santos", "grade": "Grade 1", "section": "Faith", "gender": "Male", "parent": "Antonio Santos", "contact": "0917-555-1122"},
    {"name": "Maria Sophia Garcia", "grade": "Grade 1", "section": "Faith", "gender": "Female", "parent": "Lourdes Garcia", "contact": "0918-555-2233"},
    {"name": "Pedro Luis Reyes", "grade": "Grade 1", "section": "Faith", "gender": "Male", "parent": "Fernando Reyes", "contact": "0919-555-3344"},
    # Grade 2
    {"name": "Ana Patricia Lopez", "grade": "Grade 2", "section": "Grace", "gender": "Female", "parent": "Maricel Lopez", "contact": "0920-555-4455"},
    {"name": "Carlos Joaquin Cruz", "grade": "Grade 2", "section": "Grace", "gender": "Male", "parent": "Eduardo Cruz", "contact": "0921-555-5566"},
    {"name": "Sofia Isabel Rivera", "grade": "Grade 2", "section": "Grace", "gender": "Female", "parent": "Carmela Rivera", "contact": "0922-555-6677"},
    # Grade 3
    {"name": "Miguel Angelo Torres", "grade": "Grade 3", "section": "Hope", "gender": "Male", "parent": "Ramon Torres", "contact": "0923-555-7788"},
    {"name": "Isabella Marie Flores", "grade": "Grade 3", "section": "Hope", "gender": "Female", "parent": "Teresa Flores", "contact": "0924-555-8899"},
    # Grade 4
    {"name": "Andres Daniel Ramos", "grade": "Grade 4", "section": "Peace", "gender": "Male", "parent": "Manuel Ramos", "contact": "0925-555-9900"},
    {"name": "Gabriela Beatriz Mendoza", "grade": "Grade 4", "section": "Peace", "gender": "Female", "parent": "Corazon Mendoza", "contact": "0926-555-0011"},
    # Grade 5
    {"name": "Diego Alexander Hernandez", "grade": "Grade 5", "section": "Patience", "gender": "Male", "parent": "Vicente Hernandez", "contact": "0927-555-1122"},
    {"name": "Valentina Rose Aquino", "grade": "Grade 5", "section": "Patience", "gender": "Female", "parent": "Rosario Aquino", "contact": "0928-555-2233"},
    # Grade 6
    {"name": "Mateo Sebastian Gonzales", "grade": "Grade 6", "section": "Kindness", "gender": "Male", "parent": "Alfonso Gonzales", "contact": "0929-555-3344"},
    {"name": "Camila Victoria Bautista", "grade": "Grade 6", "section": "Kindness", "gender": "Female", "parent": "Imelda Bautista", "contact": "0930-555-4455"},
    # Grade 7
    {"name": "Sebastian Kyle Villanueva", "grade": "Grade 7", "section": "Goodness", "gender": "Male", "parent": "Danilo Villanueva", "contact": "0931-555-5566"},
    {"name": "Lucia Clarisse Castillo", "grade": "Grade 7", "section": "Goodness", "gender": "Female", "parent": "Grace Castillo", "contact": "0932-555-6677"},
    # Grade 8
    {"name": "Nicolas Jose Dela Cruz", "grade": "Grade 8", "section": "Faithfulness", "gender": "Male", "parent": "Gregorio Dela Cruz", "contact": "0933-555-7788"},
    {"name": "Emma Nicole Dizon", "grade": "Grade 8", "section": "Faithfulness", "gender": "Female", "parent": "Rowena Dizon", "contact": "0934-555-8899"},
    # Grade 9
    {"name": "Rafael Dominic Manalo", "grade": "Grade 9", "section": "Gentleness", "gender": "Male", "parent": "Bernardo Manalo", "contact": "0935-555-9900"},
    {"name": "Victoria Celine Pascual", "grade": "Grade 9", "section": "Gentleness", "gender": "Female", "parent": "Amparo Pascual", "contact": "0936-555-0011"},
    # Grade 10
    {"name": "Jose Lorenzo Fernandez", "grade": "Grade 10", "section": "Self-Control", "gender": "Male", "parent": "Felipe Fernandez", "contact": "0937-555-1122"},
    {"name": "Patricia Mae Santos", "grade": "Grade 10", "section": "Self-Control", "gender": "Female", "parent": "Guillermo Santos", "contact": "0938-555-2233"},
    {"name": "Marco Paolo Enriquez", "grade": "Grade 10", "section": "Self-Control", "gender": "Male", "parent": "Rolando Enriquez", "contact": "0939-555-3344"},
]

DEFAULT_FEE_SCHEDULE = [
    {"name": "Tuition Fee", "sub": "Annual Tuition (10 Months @ ₱1,906/mo)", "due": 19060.0},
    {"name": "Registration Fee", "sub": "Annual Registration & Matriculation", "due": 5700.0},
    {"name": "Books", "sub": "Textbooks & Instructional Modules", "due": 6900.0},
    {"name": "Energy Fee", "sub": "Air-Conditioning & Utility Subsidy", "due": 3000.0},
    {"name": "Other Fees", "sub": "Educational Tour, Swimming & Activities", "due": 1500.0},
]


def seed_database(db: Session):
    """Seed the database with initial users, students, categories, and transactions."""

    # 1. ── Cashier User ──
    cashier = db.query(User).filter(User.username == "cashier@cca.edu.ph").first()
    if not cashier:
        cashier = User(
            username="cashier@cca.edu.ph",
            full_name="Maria Santos",
            hashed_password=get_password_hash("password123"),
            role="Cashier",
            is_active=1,
            created_at=datetime.now().isoformat()
        )
        db.add(cashier)
        db.flush()

    cashier_user_id = cashier.id

    # 2. ── Income Categories ──
    if db.query(IncomeCategory).count() == 0:
        income_cats = [
            IncomeCategory(name="Tuition Fees", description="Monthly and yearly tuition payments from students", color="#10b981", expected_amount=1906.0),
            IncomeCategory(name="Registration & Misc Fees", description="Registration, ID, exam fees, and other charges", color="#3b82f6", expected_amount=5700.0),
            IncomeCategory(name="Books & Materials", description="Revenue from textbook and supply sales", color="#8b5cf6", expected_amount=6900.0),
            IncomeCategory(name="Energy Fees", description="Monthly energy/utility contributions from students", color="#f59e0b", expected_amount=300.0),
            IncomeCategory(name="Swimming Class Fees", description="Special physical education and swimming fees", color="#06b6d4", expected_amount=1200.0),
            IncomeCategory(name="Donations", description="Monetary donations from parents and organizations", color="#ec4899", expected_amount=0.0),
            IncomeCategory(name="Events & Activities", description="Revenue from school events, tours, fairs", color="#f97316", expected_amount=1000.0),
            IncomeCategory(name="Canteen", description="Canteen and cafeteria revenue", color="#84cc16", expected_amount=0.0),
            IncomeCategory(name="Other Fees", description="Educational tours, graduation, and other fees", color="#6b7280", expected_amount=500.0),
        ]
        db.add_all(income_cats)
        db.flush()

    # 3. ── Expense Categories ──
    if db.query(ExpenseCategory).count() == 0:
        expense_cats = [
            ExpenseCategory(name="Staff Salaries", description="Monthly payroll for teachers and staff", color="#ef4444", budget_limit=350000),
            ExpenseCategory(name="Utilities", description="Electricity, water, internet", color="#f97316", budget_limit=50000),
            ExpenseCategory(name="School Supplies", description="Office supplies and teaching materials", color="#eab308", budget_limit=30000),
            ExpenseCategory(name="Maintenance & Repairs", description="Building maintenance and janitorial", color="#22c55e", budget_limit=25000),
            ExpenseCategory(name="Books & Learning Materials", description="Textbook purchases", color="#3b82f6", budget_limit=40000),
        ]
        db.add_all(expense_cats)
        db.flush()

    # 4. ── Students and Fee Schedules ──
    if db.query(Student).count() == 0:
        print("[*] Seeding Students & Fee Schedules...")
        created_students = []
        lrn_base = 12026001

        for idx, sdata in enumerate(STUDENT_DATA):
            lrn = f"LRN-{lrn_base + idx}"
            parent_user = f"parent_{sdata['name'].split()[0].lower()}"
            student = Student(
                student_id=lrn,
                full_name=sdata["name"],
                grade_level=sdata["grade"],
                section=sdata["section"],
                gender=sdata["gender"],
                birthdate="2015-05-15",
                parent_name=sdata["parent"],
                parent_contact=sdata["contact"],
                parent_email=f"{parent_user}@gmail.com",
                parent_username=parent_user,
                parent_password_hash=get_password_hash("password123"),
                address="Calvary Village, City of San Jose del Monte, Bulacan",
                school_year="2026-2027",
                enrollment_status="Enrolled",
                created_at=datetime.now().isoformat()
            )
            db.add(student)
            db.flush()
            created_students.append(student)

            # Create standard 5 fee schedules
            for f in DEFAULT_FEE_SCHEDULE:
                # Randomize paid amount for realistic variety
                if idx % 4 == 0:
                    # Fully paid student
                    paid = f["due"]
                elif idx % 4 == 1:
                    # Partial payment (50% or 30%)
                    paid = round(f["due"] * random.choice([0.3, 0.5, 0.7]), 2)
                elif idx % 4 == 2:
                    # Registration & Books paid, Tuition & Energy partial
                    paid = f["due"] if f["name"] in ["Registration Fee", "Books"] else round(f["due"] * 0.2, 2)
                else:
                    # Only Registration paid, rest unpaid
                    paid = f["due"] if f["name"] == "Registration Fee" else 0.0

                fs = StudentFeeSchedule(
                    student_id=student.id,
                    category_name=f["name"],
                    sub_description=f["sub"],
                    total_due=f["due"],
                    total_paid=paid,
                    remaining_balance=max(0.0, f["due"] - paid),
                    school_year="2026-2027"
                )
                db.add(fs)

        db.flush()

        # 5. ── Generate Sample Payment Receipts Linked to Students ──
        or_counter = 20260100
        payment_methods = ["Cash", "Cash", "Cash", "Check"]
        now = datetime.now()

        for s in created_students:
            # Look at fee schedules with paid amounts
            for fs in s.fee_schedules:
                if fs.total_paid > 0:
                    date_rec = (now - timedelta(days=random.randint(5, 60))).isoformat()
                    or_no = f"OR-2026-{or_counter:05d}"
                    or_counter += 1

                    income = Income(
                        category_id=1 if fs.category_name == "Tuition Fee" else 2,
                        student_id_ref=s.id,
                        amount=fs.total_paid,
                        expected_amount=fs.total_due,
                        is_partial=1 if fs.remaining_balance > 0 else 0,
                        remaining_balance=fs.remaining_balance,
                        student_id=s.student_id,
                        grade_level=s.grade_level,
                        fee_type=fs.category_name,
                        envelope_verified=1,
                        description=f"Payment for {fs.category_name} - {s.full_name}",
                        or_number=or_no,
                        payer_name=s.full_name,
                        payer_type="Student",
                        payment_method=random.choice(payment_methods),
                        school_year="2026-2027",
                        date_recorded=date_rec,
                        recorded_by=cashier_user_id,
                        anomaly_score=5.0,
                        anomaly_level="Low",
                        anomaly_status="Normal",
                        is_voided=0
                    )
                    db.add(income)

        db.flush()

    # 6. ── Payment Notifications ──
    if db.query(PaymentNotification).count() == 0:
        notifs = [
            PaymentNotification(
                student_id=None,
                grade_level=None,
                title="School Year 2026-2027 Registration & Fee Structure",
                fee_type="Registration Fee",
                description="Welcome to CCA SY 2026-2027! Official matriculation and fee payments are now open at the Cashier window.",
                amount=5700.0,
                due_date="2026-08-31",
                is_read=0,
                created_at=datetime.now().isoformat()
            ),
            PaymentNotification(
                student_id=None,
                grade_level="Grade 4",
                title="Grade 4 Educational Tour Fee Notice",
                fee_type="Other Fees",
                description="Educational Tour to Historical Sites in Bulacan and Rizal. Please settle the tour fee at the Cashier office.",
                amount=1500.0,
                due_date="2026-11-20",
                is_read=0,
                created_at=datetime.now().isoformat()
            ),
            PaymentNotification(
                student_id=None,
                grade_level=None,
                title="Monthly Energy & Air-Conditioning Fee Subsidy",
                fee_type="Energy Fee",
                description="Monthly energy fee for classroom climate control is due every 15th of the month (₱300/mo).",
                amount=300.0,
                due_date="2026-11-15",
                is_read=0,
                created_at=datetime.now().isoformat()
            ),
        ]
        db.add_all(notifs)

    db.commit()
    print("[OK] Database initialized and verified with CCA student profiles & fee structures.")
