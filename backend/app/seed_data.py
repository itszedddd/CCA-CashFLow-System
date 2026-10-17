"""
Seed data for CCA CashFlow Management System.
Creates default users, categories, and sample transactions.
"""
from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from .models.models import (
    User, IncomeCategory, ExpenseCategory, Income, Expense, Budget, AuditLog
)
from .auth import get_password_hash


def seed_database(db: Session):
    """Seed the database with initial data if empty."""
    
    # Check if already seeded
    if db.query(User).count() > 0:
        return
    
    print("[*] Seeding database...")

    # ── Default Users ──
    users = [
        User(username="admin@cca.edu.ph", full_name="System Administrator",
             hashed_password=get_password_hash("password123"), role="Admin",
             created_at=datetime.now().isoformat()),
        User(username="cashier@cca.edu.ph", full_name="Maria Santos",
             hashed_password=get_password_hash("password123"), role="Cashier",
             created_at=datetime.now().isoformat()),
        User(username="accountant@cca.edu.ph", full_name="Juan Dela Cruz",
             hashed_password=get_password_hash("password123"), role="Accountant",
             created_at=datetime.now().isoformat()),
        User(username="principal@cca.edu.ph", full_name="Dr. Rebecca Lim",
             hashed_password=get_password_hash("password123"), role="Principal",
             created_at=datetime.now().isoformat()),
    ]
    db.add_all(users)
    db.flush()

    # ── Income Categories ──
    income_cats = [
        IncomeCategory(name="Tuition Fees", description="Monthly and yearly tuition payments from students", color="#10b981"),
        IncomeCategory(name="Registration & Misc Fees", description="Registration, ID, exam fees, and other miscellaneous charges", color="#3b82f6"),
        IncomeCategory(name="Books & Materials", description="Revenue from textbook and school supply sales", color="#8b5cf6"),
        IncomeCategory(name="Energy Fees", description="Monthly energy/utility contributions from students", color="#f59e0b"),
        IncomeCategory(name="Donations", description="Monetary donations from parents, alumni, and organizations", color="#ec4899"),
        IncomeCategory(name="Events & Activities", description="Revenue from school events, fairs, fundraisers", color="#06b6d4"),
        IncomeCategory(name="Canteen", description="Canteen and cafeteria revenue", color="#84cc16"),
        IncomeCategory(name="Other Income", description="Any other miscellaneous income sources", color="#6b7280"),
    ]
    db.add_all(income_cats)
    db.flush()

    # ── Expense Categories ──
    expense_cats = [
        ExpenseCategory(name="Staff Salaries", description="Monthly payroll for teachers, admin, and support staff", color="#ef4444", budget_limit=350000),
        ExpenseCategory(name="Utilities", description="Electricity, water, internet, and phone bills", color="#f97316", budget_limit=50000),
        ExpenseCategory(name="School Supplies", description="Office supplies, teaching materials, and equipment", color="#eab308", budget_limit=30000),
        ExpenseCategory(name="Maintenance & Repairs", description="Building maintenance, equipment repair, janitorial", color="#22c55e", budget_limit=25000),
        ExpenseCategory(name="Books & Learning Materials", description="Textbook purchases and educational materials", color="#3b82f6", budget_limit=40000),
        ExpenseCategory(name="Events & Activities", description="School events, field trips, graduation expenses", color="#8b5cf6", budget_limit=20000),
        ExpenseCategory(name="Technology & IT", description="Computer equipment, software licenses, internet", color="#06b6d4", budget_limit=15000),
        ExpenseCategory(name="Transportation", description="School vehicle fuel, maintenance, driver wages", color="#ec4899", budget_limit=10000),
        ExpenseCategory(name="Insurance & Permits", description="School insurance, government permits and licenses", color="#64748b", budget_limit=15000),
        ExpenseCategory(name="Miscellaneous", description="Any other operational expenses", color="#6b7280", budget_limit=10000),
    ]
    db.add_all(expense_cats)
    db.flush()

    # ── Sample Income Records (6 months of realistic data) ──
    now = datetime.now()
    student_names = [
        "Juan Santos", "Maria Garcia", "Pedro Reyes", "Ana Lopez", "Carlos Cruz",
        "Sofia Rivera", "Miguel Torres", "Isabella Flores", "Andres Ramos", "Gabriela Mendoza",
        "Diego Hernandez", "Valentina Aquino", "Mateo Gonzales", "Camila Bautista", "Sebastian Villanueva",
        "Lucia Castillo", "Nicolas Dela Cruz", "Emma Dizon", "Rafael Manalo", "Victoria Pascual",
        "Jose Fernandez", "Patricia Santos", "Marco Enriquez", "Angela Reyes", "Antonio Garcia",
        "Rosa Martinez", "Luis Navarro", "Teresa Concepcion", "Eduardo Salazar", "Carmen Rodriguez",
    ]
    
    payment_methods = ["Cash", "Bank Transfer", "GCash", "Check"]
    
    incomes = []
    or_counter = 2026001
    
    for month_offset in range(6, 0, -1):
        month_date = now - timedelta(days=month_offset * 30)
        
        # Tuition payments (15-25 students per month)
        num_tuition = random.randint(15, 25)
        for _ in range(num_tuition):
            student = random.choice(student_names)
            amount = random.choice([1606, 1701, 1801, 1906, 2006])
            incomes.append(Income(
                category_id=1, amount=amount,
                description=f"Monthly tuition - {month_date.strftime('%B %Y')}",
                or_number=f"OR-{or_counter}", payer_name=student,
                payer_type="Student", payment_method=random.choice(payment_methods),
                school_year="2026-2027",
                date_recorded=(month_date + timedelta(days=random.randint(1, 25))).isoformat(),
                recorded_by=2, remarks=None
            ))
            or_counter += 1

        # Registration fees (start of year - more in first 2 months)
        if month_offset >= 4:
            for _ in range(random.randint(5, 12)):
                student = random.choice(student_names)
                incomes.append(Income(
                    category_id=2, amount=5700,
                    description=f"Registration & miscellaneous fees SY 2026-2027",
                    or_number=f"OR-{or_counter}", payer_name=student,
                    payer_type="Student", payment_method=random.choice(payment_methods),
                    school_year="2026-2027",
                    date_recorded=(month_date + timedelta(days=random.randint(1, 25))).isoformat(),
                    recorded_by=2
                ))
                or_counter += 1

        # Book sales
        if month_offset >= 4:
            for _ in range(random.randint(3, 8)):
                student = random.choice(student_names)
                amount = random.choice([5500, 6300, 6900, 8500, 9200])
                incomes.append(Income(
                    category_id=3, amount=amount,
                    description=f"Textbooks purchase",
                    or_number=f"OR-{or_counter}", payer_name=student,
                    payer_type="Parent", payment_method=random.choice(payment_methods),
                    school_year="2026-2027",
                    date_recorded=(month_date + timedelta(days=random.randint(1, 25))).isoformat(),
                    recorded_by=2
                ))
                or_counter += 1

        # Energy fees
        for _ in range(random.randint(10, 20)):
            student = random.choice(student_names)
            amount = random.choice([150, 300])
            incomes.append(Income(
                category_id=4, amount=amount,
                description=f"Energy fee - {month_date.strftime('%B %Y')}",
                or_number=f"OR-{or_counter}", payer_name=student,
                payer_type="Student", payment_method="Cash",
                school_year="2026-2027",
                date_recorded=(month_date + timedelta(days=random.randint(1, 25))).isoformat(),
                recorded_by=2
            ))
            or_counter += 1

        # Canteen revenue (weekly lump)
        for week in range(4):
            incomes.append(Income(
                category_id=7, amount=random.randint(3000, 8000),
                description=f"Canteen weekly revenue - Week {week+1}",
                or_number=f"OR-{or_counter}", payer_name="School Canteen",
                payer_type="Other", payment_method="Cash",
                school_year="2026-2027",
                date_recorded=(month_date + timedelta(days=7 * week + random.randint(0, 3))).isoformat(),
                recorded_by=2
            ))
            or_counter += 1

        # Occasional donations
        if random.random() > 0.5:
            incomes.append(Income(
                category_id=5, amount=random.choice([5000, 10000, 15000, 25000]),
                description="Donation from parent association",
                or_number=f"OR-{or_counter}", payer_name="CCA Parents Association",
                payer_type="Organization", payment_method="Bank Transfer",
                school_year="2026-2027",
                date_recorded=(month_date + timedelta(days=random.randint(1, 25))).isoformat(),
                recorded_by=1
            ))
            or_counter += 1

    db.add_all(incomes)

    # ── Sample Expense Records ──
    expenses = []
    voucher_counter = 1001
    
    payees = {
        1: ["Teaching Staff", "Admin Staff", "Support Staff", "Janitorial Staff"],
        2: ["Meralco", "Manila Water", "PLDT", "Globe Telecom"],
        3: ["National Bookstore", "SM Office Supplies", "DataBlitz"],
        4: ["JR Contractors", "ABC Maintenance Services", "QuickFix Repairs"],
        5: ["Rex Bookstore", "Vibal Group", "Phoenix Publishing"],
        6: ["Event Coordinator", "Catering Service", "Sound System Rental"],
        7: ["Acer Philippines", "Microsoft PH", "CompAsia"],
        8: ["Shell Gas Station", "Petron", "Auto Mechanic Shop"],
        9: ["Malayan Insurance", "City Hall - Business Permit"],
        10: ["Various Suppliers"],
    }

    for month_offset in range(6, 0, -1):
        month_date = now - timedelta(days=month_offset * 30)
        
        # Salaries (biggest expense, monthly)
        expenses.append(Expense(
            category_id=1, amount=random.randint(280000, 350000),
            description=f"Staff payroll - {month_date.strftime('%B %Y')}",
            payee="Teaching & Admin Staff", payment_method="Bank Transfer",
            voucher_number=f"DV-{voucher_counter}", school_year="2026-2027",
            status="Approved", approved_by=1,
            date_recorded=(month_date + timedelta(days=random.randint(25, 28))).isoformat(),
            date_approved=(month_date + timedelta(days=random.randint(25, 28))).isoformat(),
            recorded_by=3
        ))
        voucher_counter += 1

        # Utilities
        for utility in ["Electricity", "Water", "Internet & Phone"]:
            expenses.append(Expense(
                category_id=2, amount=random.randint(5000, 20000),
                description=f"{utility} bill - {month_date.strftime('%B %Y')}",
                payee=random.choice(payees[2]), payment_method="Bank Transfer",
                voucher_number=f"DV-{voucher_counter}", school_year="2026-2027",
                status="Approved", approved_by=1,
                date_recorded=(month_date + timedelta(days=random.randint(10, 20))).isoformat(),
                date_approved=(month_date + timedelta(days=random.randint(12, 22))).isoformat(),
                recorded_by=3
            ))
            voucher_counter += 1

        # Supplies
        if random.random() > 0.3:
            expenses.append(Expense(
                category_id=3, amount=random.randint(3000, 15000),
                description="Office and school supplies purchase",
                payee=random.choice(payees[3]), payment_method="Cash",
                voucher_number=f"DV-{voucher_counter}", school_year="2026-2027",
                status="Approved", approved_by=1,
                date_recorded=(month_date + timedelta(days=random.randint(5, 20))).isoformat(),
                date_approved=(month_date + timedelta(days=random.randint(6, 21))).isoformat(),
                recorded_by=3
            ))
            voucher_counter += 1

        # Maintenance
        if random.random() > 0.4:
            expenses.append(Expense(
                category_id=4, amount=random.randint(5000, 20000),
                description=random.choice(["AC unit repair", "Plumbing repair", "Classroom repainting", "Electrical maintenance"]),
                payee=random.choice(payees[4]), payment_method="Cash",
                voucher_number=f"DV-{voucher_counter}", school_year="2026-2027",
                status="Approved", approved_by=4,
                date_recorded=(month_date + timedelta(days=random.randint(1, 25))).isoformat(),
                date_approved=(month_date + timedelta(days=random.randint(3, 27))).isoformat(),
                recorded_by=3
            ))
            voucher_counter += 1

    # Add a few pending expenses
    for _ in range(3):
        expenses.append(Expense(
            category_id=random.choice([3, 4, 6, 7]),
            amount=random.randint(5000, 25000),
            description=random.choice([
                "New projector for Grade 10 classroom",
                "School fair decorations and materials",
                "Replacement chairs for library",
                "Science lab equipment repair"
            ]),
            payee="Pending Supplier",
            payment_method="Cash",
            voucher_number=f"DV-{voucher_counter}",
            school_year="2026-2027",
            status="Pending",
            date_recorded=datetime.now().isoformat(),
            recorded_by=3
        ))
        voucher_counter += 1

    db.add_all(expenses)

    # ── Budget Allocations ──
    for cat in expense_cats:
        db.add(Budget(
            category_id=cat.id, school_year="2026-2027",
            allocated_amount=cat.budget_limit * 12,
            spent_amount=0, created_by=1,
            created_at=datetime.now().isoformat()
        ))

    db.commit()
    print("[OK] Database seeded successfully!")
    print("   Admin: admin@cca.edu.ph / password123")
    print("   Cashier: cashier@cca.edu.ph / password123")
    print("   Accountant: accountant@cca.edu.ph / password123")
    print("   Principal: principal@cca.edu.ph / password123")
