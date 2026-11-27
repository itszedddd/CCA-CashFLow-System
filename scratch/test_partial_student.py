import sys, os

repo_backend = os.path.join(os.getcwd(), 'CCA-CashFlow-System', 'backend')
if not os.path.exists(repo_backend):
    repo_backend = os.path.join(os.getcwd(), 'backend')
sys.path.insert(0, repo_backend)
os.chdir(os.path.join(repo_backend, '..'))

from app.database import SessionLocal
from app.models.models import Student
from app.core.anomaly_engine import generate_student_ai_payment_plan

db = SessionLocal()
students = db.query(Student).all()
for st in students:
    plan = generate_student_ai_payment_plan(st, db)
    if plan['total_outstanding'] > 0:
        print(f"\nStudent: {st.full_name} ({st.grade_level}) - Outstanding: ₱{plan['total_outstanding']:,.2f}")
        print('  AI Strategy:', plan['autonomous_decision']['strategy_title'])
        print('  AI Verdict:', plan['autonomous_decision']['verdict_narrative'])
        print('  Matched Cluster:', plan['learned_cluster']['name'], f"({plan['learned_cluster']['confidence_pct']}%)")
        print('  Next Best Action:', plan['next_best_action'])
        break

db.close()
