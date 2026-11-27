import sys, os

repo_backend = os.path.join(os.getcwd(), 'CCA-CashFlow-System', 'backend')
if not os.path.exists(repo_backend):
    repo_backend = os.path.join(os.getcwd(), 'backend')
sys.path.insert(0, repo_backend)

# Set database working directory so sqlite finds cashflow.db
os.chdir(os.path.join(repo_backend, '..'))

from app.database import SessionLocal
from app.models.models import Student, Income
from app.core.anomaly_engine import AnomalyEngine, generate_student_ai_payment_plan
from app.core.timezone import get_next_grade_and_section, get_next_school_year
from app.api.students import calculate_student_balance

db = SessionLocal()
print('Testing AnomalyEngine...')
engine = AnomalyEngine(db)
res = engine.train_and_scan_all()
print('Total analyzed:', res['total_analyzed'])
print('Learned patterns count:', len(res.get('learned_patterns', [])))
for lp in res.get('learned_patterns', []):
    print(f" - Pattern: {lp['name']} | Pct: {lp['percentage']}% | Channel: {lp['primary_channel']} | AI Policy: {lp['ai_policy']}")

st = db.query(Student).first()
if st:
    print('\nTesting Student AI Payment Plan for:', st.full_name)
    plan = generate_student_ai_payment_plan(st, db)
    print(' Strategy:', plan['autonomous_decision']['strategy_title'])
    print(f" Matched Cluster: {plan['learned_cluster']['name']} ({plan['learned_cluster']['confidence_pct']}%)")
    print(' Steps count:', len(plan['settlement_steps']))
    for s in plan['settlement_steps']:
        print(f"   Step {s['step']}: {s['category']} - ₱{s['amount']:,.2f} ({s['timeline']})")
    if plan['next_best_action']:
        print(' Next Best Action:', plan['next_best_action']['button_label'])

    ng, ns, is_g = get_next_grade_and_section(st.grade_level)
    print(f"\nGrade progression: {st.grade_level} -> {ng} ({ns}), Graduated: {is_g}")
    print(f"Next SY: {st.school_year} -> {get_next_school_year(st.school_year)}")

db.close()
print('\nALL TESTS PASSED!')
