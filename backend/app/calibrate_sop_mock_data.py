"""
Calibrates the mock transaction dataset to strictly follow CCA Cashier SOP:
Exactly 3 to 4 realistic problems per month are flagged for AI detection,
while all other transactions reflect standard, compliant school collections.
"""
import os
import sys
import json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from collections import defaultdict
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.models.models import Income, IncomeCategory
from backend.app.core.anomaly_engine import AnomalyEngine

def calibrate():
    db: Session = SessionLocal()
    try:
        incomes = db.query(Income).filter(Income.is_voided == 0).order_by(Income.date_recorded.asc()).all()
        print(f"Total active incomes: {len(incomes)}")

        # Group by year-month
        by_month = defaultdict(list)
        for inc in incomes:
            m = inc.date_recorded[:7] if inc.date_recorded else "2026-10"
            by_month[m].append(inc)

        cat_tuition = db.query(IncomeCategory).filter(IncomeCategory.name.ilike("%tuition%")).first()
        cat_reg = db.query(IncomeCategory).filter(IncomeCategory.name.ilike("%reg%")).first()
        cat_book = db.query(IncomeCategory).filter(IncomeCategory.name.ilike("%book%")).first()
        cat_energy = db.query(IncomeCategory).filter(IncomeCategory.name.ilike("%energy%")).first()
        cat_other = db.query(IncomeCategory).filter(IncomeCategory.name.ilike("%other%")).first()

        id_tuition = cat_tuition.id if cat_tuition else 1
        id_reg = cat_reg.id if cat_reg else 2
        id_book = cat_book.id if cat_book else 3
        id_energy = cat_energy.id if cat_energy else 4
        id_other = cat_other.id if cat_other else 8

        for month, items in sorted(by_month.items()):
            # Target exactly 3 problems for small months (<30), exactly 4 for larger months (>=30)
            target_problems = 3 if len(items) < 30 else 4

            step = max(1, len(items) // (target_problems + 1))
            problem_indices = set([min(len(items) - 1, (i + 1) * step) for i in range(target_problems)])

            p_count = 0
            for idx, inc in enumerate(items):
                is_problem = idx in problem_indices

                if is_problem:
                    p_count += 1
                    if p_count == 1:
                        # Problem 1: Unverified Brown Envelope Discrepancy (Medium: 45 pts)
                        inc.category_id = id_tuition
                        inc.fee_type = "Tuition Fee"
                        inc.amount = 1906.0
                        inc.expected_amount = 1906.0
                        inc.envelope_verified = 0
                        inc.is_partial = 0
                        inc.remarks = "Brown envelope missing cashier signature during physical envelope reconciliation"
                    elif p_count == 2:
                        # Problem 2: Excess Assessment Overpayment (High: ~78 pts)
                        inc.category_id = id_reg
                        inc.fee_type = "Registration Fee"
                        inc.amount = 6500.0  # Exceeds ₱5,700 registration ceiling by ₱800
                        inc.expected_amount = 5700.0
                        inc.envelope_verified = 1
                        inc.is_partial = 0
                        inc.remarks = "Payment amount (₱6,500.00) exceeds official registration fee ceiling (₱5,700.00)"
                    elif p_count == 3:
                        # Problem 3: Irregular Partial Installment without Partial Flag (Medium: 40 pts)
                        inc.category_id = id_tuition
                        inc.fee_type = "Tuition Fee"
                        inc.amount = 1000.0  # Irregular installment
                        inc.expected_amount = 1906.0
                        inc.envelope_verified = 1
                        inc.is_partial = 0  # Missing partial flag per SOP!
                        inc.remarks = "Installment amount (₱1,000.00) lower than monthly fee (₱1,906.00) without partial flag"
                    else:
                        # Problem 4: Cross-category mismatch (High: 75 pts)
                        inc.category_id = id_energy
                        inc.fee_type = "Energy Fee"
                        inc.amount = 1906.0  # Mismatched amount matching tuition
                        inc.expected_amount = 300.0
                        inc.envelope_verified = 1
                        inc.is_partial = 0
                        inc.remarks = "Payment amount (₱1,906.00) precisely matches monthly Tuition Fee rather than Energy Fee"
                else:
                    # Normal compliant transaction adhering strictly to CCA SOP
                    inc.envelope_verified = 1
                    inc.is_partial = 0
                    inc.remarks = "Verified payment collection"

                    # Normalize by category so category_id matches fee_type and benchmark amount perfectly
                    if inc.category_id == id_reg:
                        inc.fee_type = "Registration Fee"
                        inc.amount = 5700.0
                        inc.expected_amount = 5700.0
                    elif inc.category_id == id_book:
                        inc.fee_type = "Books"
                        inc.amount = 6900.0
                        inc.expected_amount = 6900.0
                    elif inc.category_id == id_energy:
                        inc.fee_type = "Energy Fee"
                        inc.amount = 300.0
                        inc.expected_amount = 300.0
                    elif inc.category_id == id_other:
                        inc.fee_type = "Other Fees"
                        inc.amount = 1500.0
                        inc.expected_amount = 1500.0
                    else:
                        inc.category_id = id_tuition
                        inc.fee_type = "Tuition Fee"
                        inc.amount = 1906.0
                        inc.expected_amount = 1906.0

        db.commit()

        # Re-evaluate with AnomalyEngine
        print("Re-evaluating with AnomalyEngine...")
        engine = AnomalyEngine(db)
        engine.train_and_scan_all()

        # Check monthly distribution of flagged records
        flagged = db.query(Income).filter(Income.anomaly_score >= 40.0, Income.is_voided == 0).all()
        flagged_by_month = defaultdict(int)
        for f in flagged:
            m = f.date_recorded[:7] if f.date_recorded else "Unknown"
            flagged_by_month[m] += 1

        print("\n=== FINAL MONTHLY PROBLEM DISTRIBUTION ===")
        for m, cnt in sorted(flagged_by_month.items()):
            print(f"Month {m}: {cnt} problems detected by AI (Target: 3 to 4)")
        print(f"Total problems across all months: {len(flagged)}")

    finally:
        db.close()

if __name__ == "__main__":
    calibrate()
