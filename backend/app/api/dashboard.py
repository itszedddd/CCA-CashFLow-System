from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.models import Income, IncomeCategory, AuditLog, User, Student, StudentFeeSchedule
from ..auth import get_current_user
from ..core.timezone import ph_now, format_ph_timestamp, GRADE_SECTION_MAP

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard & Reports"])

ACADEMIC_GRADES = [
    "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4",
    "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"
]

CALENDAR_MONTHS = [
    (1, "Jan"), (2, "Feb"), (3, "Mar"), (4, "Apr"), (5, "May"), (6, "Jun"),
    (7, "Jul"), (8, "Aug"), (9, "Sep"), (10, "Oct"), (11, "Nov"), (12, "Dec")
]

ACADEMIC_MONTHS = [
    ("2026-06", "June"), ("2026-07", "July"), ("2026-08", "August"),
    ("2026-09", "September"), ("2026-10", "October"), ("2026-11", "November"),
    ("2026-12", "December"), ("2027-01", "January"), ("2027-02", "February"),
    ("2027-03", "March"), ("2027-04", "April"), ("2027-05", "May")
]


@router.get("/stats")
def get_dashboard_stats(
    school_year: str = Query("2026-2027"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Revenue & Student Collection metrics strictly within CCA FlowSys study scope
    (Expenses, Disbursements, Budget Allocations, and Pending Expense Vouchers excluded).
    Includes 12-month School Revenue Comparison: Year 2026 vs Year 2025.
    """
    now = ph_now()
    month_prefix = now.strftime("%Y-%m")

    # Total collections / school revenue for school year
    total_income = db.query(func.sum(Income.amount)).filter(
        Income.school_year == school_year, Income.is_voided == 0
    ).scalar() or 0.0

    income_this_month = db.query(func.sum(Income.amount)).filter(
        Income.date_recorded.like(f"{month_prefix}%"),
        Income.is_voided == 0
    ).scalar() or 0.0

    # Student assessment & collection rate stats
    students = db.query(Student).all()
    total_students = len(students)
    total_expected = 0.0
    total_student_paid = 0.0
    fully_paid_count = 0
    with_balance_count = 0

    for st in students:
        s_due = sum(fs.total_due for fs in st.fee_schedules)
        s_paid = sum(fs.total_paid for fs in st.fee_schedules)
        total_expected += s_due
        total_student_paid += s_paid
        if s_due > 0 and s_paid >= s_due:
            fully_paid_count += 1
        elif max(0.0, s_due - s_paid) > 0:
            with_balance_count += 1

    total_outstanding = max(0.0, total_expected - total_student_paid)
    collection_rate = round((total_student_paid / total_expected * 100), 1) if total_expected > 0 else 0.0

    # Income by category (Collections breakdown)
    income_cats = db.query(IncomeCategory).all()
    income_by_category = []
    for cat in income_cats:
        amt = db.query(func.sum(Income.amount)).filter(
            Income.category_id == cat.id,
            Income.school_year == school_year,
            Income.is_voided == 0
        ).scalar() or 0.0
        if amt > 0:
            income_by_category.append({"name": cat.name, "amount": amt, "color": cat.color})

    # Grade-level collection summary for Dashboard companion visualization
    grade_collections = []
    for g in ACADEMIC_GRADES:
        g_students = [s for s in students if s.grade_level == g]
        g_paid = sum(sum(fs.total_paid for fs in s.fee_schedules) for s in g_students)
        g_due = sum(sum(fs.total_due for fs in s.fee_schedules) for s in g_students)
        grade_collections.append({
            "grade": g.replace("Grade ", "G").replace("Kindergarten", "K"),
            "full_grade": g,
            "collected": round(g_paid, 2),
            "outstanding": round(max(0.0, g_due - g_paid), 2),
        })

    # 12-Month School Revenue Comparison: Year 2026 vs Year 2025
    revenue_yoy = []
    for m_num, m_label in CALENDAR_MONTHS:
        prefix_2026 = f"2026-{m_num:02d}"
        prefix_2025 = f"2025-{m_num:02d}"

        rev_2026 = db.query(func.sum(Income.amount)).filter(
            Income.date_recorded.like(f"{prefix_2026}%"),
            Income.is_voided == 0
        ).scalar() or 0.0

        rev_2025 = db.query(func.sum(Income.amount)).filter(
            Income.date_recorded.like(f"{prefix_2025}%"),
            Income.is_voided == 0
        ).scalar() or 0.0

        revenue_yoy.append({
            "month": m_label,
            "revenue_2026": round(rev_2026, 2),
            "revenue_2025": round(rev_2025, 2),
        })

    # Recent Financial Transactions (Income / Collections ONLY)
    recent_incomes = db.query(Income).filter(Income.is_voided == 0).order_by(
        Income.date_recorded.desc()
    ).limit(10).all()

    recent_transactions = []
    for inc in recent_incomes:
        cat = db.query(IncomeCategory).filter(IncomeCategory.id == inc.category_id).first()
        recent_transactions.append({
            "type": "income",
            "id": inc.id,
            "or_number": inc.or_number,
            "payer_name": inc.payer_name,
            "amount": inc.amount,
            "description": inc.description,
            "category": inc.fee_type or (cat.name if cat else "School Fee"),
            "date": inc.date_recorded,
            "date_display": format_ph_timestamp(inc.date_recorded),
        })

    return {
        "total_income": total_income,
        "income_this_month": income_this_month,
        "total_expected_collections": total_expected,
        "total_outstanding_balances": total_outstanding,
        "collection_rate": collection_rate,
        "total_students": total_students,
        "fully_paid_students": fully_paid_count,
        "students_with_balance": with_balance_count,
        "income_by_category": income_by_category,
        "grade_collections": grade_collections,
        "monthly_revenue_comparison": revenue_yoy,
        "recent_transactions": recent_transactions,
    }


@router.get("/end-of-year-report")
def get_end_of_year_report(
    school_year: str = Query("2026-2027"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Complete 8-Section End-of-School-Year Cashflow Report per System Inspection Report v0.0:
    Sections 1–8 covering Financial Summary, Fee Categories, Grade Levels, Monthly Summary,
    Student Payment Status, Outstanding Balances, Transaction Summary, ML Anomaly Detection Summary,
    plus institutional accountability signatories.
    """
    students = db.query(Student).order_by(Student.grade_level, Student.full_name).all()
    all_incomes = db.query(Income).filter(Income.school_year == school_year).all()
    active_incomes = [i for i in all_incomes if not i.is_voided]
    voided_incomes = [i for i in all_incomes if i.is_voided]

    # Section 1 & Section 5 aggregates
    total_expected = 0.0
    total_actual_from_schedules = 0.0
    total_overpayments = 0.0
    fully_paid_students = 0
    partial_students = 0
    unpaid_students = 0
    overpayment_students = 0
    outstanding_rows = []

    for st in students:
        s_due = sum(fs.total_due for fs in st.fee_schedules)
        s_paid = sum(fs.total_paid for fs in st.fee_schedules)
        s_bal = max(0.0, s_due - s_paid)
        s_over = max(0.0, s_paid - s_due)
        for fs in st.fee_schedules:
            if fs.total_paid > fs.total_due:
                total_overpayments += (fs.total_paid - fs.total_due)

        total_expected += s_due
        total_actual_from_schedules += s_paid

        if s_over > 0:
            overpayment_students += 1
        if s_due > 0 and s_paid >= s_due:
            fully_paid_students += 1
            p_status = "Fully Paid"
        elif s_paid > 0:
            partial_students += 1
            p_status = "Partially Paid"
        else:
            unpaid_students += 1
            p_status = "Unpaid"

        unpaid_cats = [fs.category_name for fs in st.fee_schedules if max(0.0, fs.total_due - fs.total_paid) > 0]
        outstanding_rows.append({
            "student_id": st.student_id,
            "full_name": st.full_name,
            "grade_level": st.grade_level,
            "section": st.section,
            "total_school_fees": round(s_due, 2),
            "total_amount_paid": round(s_paid, 2),
            "remaining_balance": round(s_bal, 2),
            "unpaid_fee_categories": ", ".join(unpaid_cats) if unpaid_cats else "None (Cleared)",
            "payment_status": "With Overpayment" if s_over > 0 else p_status,
        })

    total_actual_incomes = sum(i.amount for i in active_incomes)
    total_actual_collections = max(total_actual_incomes, total_actual_from_schedules) if total_actual_incomes == 0 else total_actual_incomes
    total_outstanding_balances = max(0.0, total_expected - total_actual_from_schedules)
    total_refunds_adjustments = sum(i.amount for i in voided_incomes)
    total_net_collections = max(0.0, total_actual_collections - total_refunds_adjustments)
    collection_rate = round((total_actual_from_schedules / total_expected * 100), 1) if total_expected > 0 else 0.0

    # Section 2: Collection Summary by Fee Category
    fee_categories = ["Tuition Fee", "Registration Fee", "Books", "Energy Fee", "Other Fees"]
    by_fee_category = []
    for cat_name in fee_categories:
        cat_schedules = db.query(StudentFeeSchedule).filter(StudentFeeSchedule.category_name == cat_name).all()
        exp_amt = sum(fs.total_due for fs in cat_schedules)
        act_amt = sum(fs.total_paid for fs in cat_schedules)
        out_amt = max(0.0, exp_amt - act_amt)
        by_fee_category.append({
            "fee_category": cat_name,
            "expected_amount": round(exp_amt, 2),
            "actual_collection": round(act_amt, 2),
            "outstanding": round(out_amt, 2),
        })

    # Section 3: Collection Summary by Grade Level
    by_grade_level = []
    grades_order = ["Pre-Kinder"] + ACADEMIC_GRADES
    for g in grades_order:
        g_students = [s for s in students if s.grade_level == g]
        if g == "Pre-Kinder" and len(g_students) == 0:
            continue
        g_exp = sum(sum(fs.total_due for fs in s.fee_schedules) for s in g_students)
        g_act = sum(sum(fs.total_paid for fs in s.fee_schedules) for s in g_students)
        g_out = max(0.0, g_exp - g_act)
        by_grade_level.append({
            "grade_level": g,
            "section": GRADE_SECTION_MAP.get(g, ""),
            "student_count": len(g_students),
            "expected_collection": round(g_exp, 2),
            "actual_collection": round(g_act, 2),
            "outstanding": round(g_out, 2),
        })

    # Section 4: Monthly Collection Summary (Academic calendar June - May)
    monthly_summary = []
    for ym_prefix, month_label in ACADEMIC_MONTHS:
        # Match either 2026-MM / 2027-MM or month number MM within active_incomes
        target_year, target_month = ym_prefix.split("-")
        m_items = [
            inc for inc in active_incomes
            if inc.date_recorded and (
                inc.date_recorded.startswith(ym_prefix) or
                (len(inc.date_recorded) >= 7 and inc.date_recorded[5:7] == target_month and not any(
                    inc.date_recorded.startswith(p) for p, _ in ACADEMIC_MONTHS
                ))
            )
        ]
        monthly_summary.append({
            "month": f"{month_label} ({target_year})",
            "month_name": month_label,
            "total_collections": round(sum(i.amount for i in m_items), 2),
            "transaction_count": len(m_items),
        })

    # Section 7: Transaction & Payment Summary
    total_cash = sum(i.amount for i in active_incomes if (i.payment_method or "Cash").lower() == "cash")
    total_check = sum(i.amount for i in active_incomes if (i.payment_method or "").lower() == "check")
    refunded_count = sum(1 for i in voided_incomes if "refund" in (i.remarks or "").lower())
    adjusted_count = sum(1 for i in active_incomes if "adjust" in (i.remarks or "").lower() or "adjust" in (i.cashier_notes or "").lower())

    # Section 8: ML Anomaly Detection Summary
    unusual_amounts = 0
    incorrect_classification = 0
    potential_duplicates = 0
    rule_violations = 0
    verified_legit = 0
    confirmed_errors = 0
    unresolved_flagged = 0

    for inc in active_incomes:
        reasons_txt = (inc.anomaly_reasons or "").lower()
        status = inc.anomaly_status or "Normal"
        if status in ("Flagged", "Verified_Cleared", "Pending_Correction"):
            if "overpayment" in reasons_txt or "unusual" in reasons_txt or "excess" in reasons_txt or "outlier" in reasons_txt:
                unusual_amounts += 1
            if "category" in reasons_txt or "mismatch" in reasons_txt or "dumping" in reasons_txt:
                incorrect_classification += 1
            if "duplicate" in reasons_txt or "rapid" in reasons_txt:
                potential_duplicates += 1
            if "envelope" in reasons_txt or "partial" in reasons_txt or "rule" in reasons_txt:
                rule_violations += 1

        if status == "Verified_Cleared":
            verified_legit += 1
        elif status == "Pending_Correction":
            confirmed_errors += 1
        elif status == "Flagged":
            unresolved_flagged += 1

    total_flagged = unresolved_flagged + verified_legit + confirmed_errors

    return {
        "school_year": school_year,
        "generated_at": format_ph_timestamp(ph_now().isoformat()),
        "section_1_financial_summary": {
            "total_expected_collections": round(total_expected, 2),
            "total_actual_collections": round(total_actual_collections, 2),
            "total_outstanding_balances": round(total_outstanding_balances, 2),
            "total_overpayments": round(total_overpayments, 2),
            "total_refunds_adjustments": round(total_refunds_adjustments, 2),
            "total_net_collections": round(total_net_collections, 2),
            "collection_rate": collection_rate,
            "fully_paid_students": fully_paid_students,
            "students_with_outstanding_balances": partial_students + unpaid_students,
        },
        "section_2_by_fee_category": by_fee_category,
        "section_3_by_grade_level": by_grade_level,
        "section_4_monthly_summary": monthly_summary,
        "section_5_payment_status_summary": {
            "fully_paid": fully_paid_students,
            "partially_paid": partial_students,
            "unpaid": unpaid_students,
            "with_overpayment": overpayment_students,
            "total_students": len(students),
        },
        "section_6_outstanding_balance_report": outstanding_rows,
        "section_7_transaction_summary": {
            "total_transactions": len(all_incomes),
            "total_cash_collections": round(total_cash, 2),
            "total_check_collections": round(total_check, 2),
            "total_voided_transactions": len(voided_incomes),
            "total_refunded_transactions": refunded_count,
            "total_adjusted_transactions": adjusted_count,
            "issued_receipts_count": sum(1 for i in active_incomes if i.or_number),
        },
        "section_8_anomaly_summary": {
            "unusual_payment_amounts": unusual_amounts,
            "incorrect_fee_classification": incorrect_classification,
            "potential_duplicate_transactions": potential_duplicates,
            "payment_rule_violations": rule_violations,
            "total_flagged_transactions": total_flagged,
            "total_analyzed": len(active_incomes),
            "verified_legitimate": verified_legit,
            "confirmed_errors": confirmed_errors,
            "corrected_transactions": len(voided_incomes) + confirmed_errors,
            "unresolved_flagged": unresolved_flagged,
        },
        "accountability": {
            "prepared_by_name": "Maria Santos",
            "prepared_by_role": "Cashier",
            "checked_by_name": "Michelle Jean Gormley",
            "checked_by_role": "Authorized School Administrator",
            "approved_by_name": "Pastor David Reyes, M.Div.",
            "approved_by_role": "School Principal",
            "date_prepared": ph_now().strftime("%B %d, %Y"),
            "date_reviewed": ph_now().strftime("%B %d, %Y"),
        }
    }


# ── Global Search (Incomes & Students Only) ──
@router.get("/search")
def search_records(
    q: str = Query("", min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query_str = f"%{q}%"
    incomes = db.query(Income).filter(
        Income.is_voided == 0,
        (Income.description.ilike(query_str)) |
        (Income.payer_name.ilike(query_str)) |
        (Income.or_number.ilike(query_str)) |
        (Income.student_id.ilike(query_str))
    ).limit(8).all()

    students = db.query(Student).filter(
        (Student.full_name.ilike(query_str)) |
        (Student.student_id.ilike(query_str)) |
        (Student.parent_name.ilike(query_str))
    ).limit(6).all()

    return {
        "incomes": [
            {
                "id": inc.id,
                "student_id_ref": inc.student_id_ref,
                "or_number": inc.or_number,
                "description": inc.description,
                "payer_name": inc.payer_name,
                "amount": inc.amount,
                "date": inc.date_recorded,
            }
            for inc in incomes
        ],
        "students": [
            {
                "id": st.id,
                "student_id": st.student_id,
                "full_name": st.full_name,
                "grade_level": st.grade_level,
                "section": st.section,
            }
            for st in students
        ],
    }


# ── Audit Logs ──
@router.get("/audit-logs")
def list_audit_logs(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total = db.query(AuditLog).count()
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    results = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
        results.append({
            "id": log.id,
            "user_id": log.user_id,
            "username": user.full_name if user else "System",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "timestamp": log.timestamp,
            "timestamp_display": format_ph_timestamp(log.timestamp),
        })
    return {"total": total, "items": results}
