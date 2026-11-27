import sys, os

repo_backend = os.path.join(os.getcwd(), 'CCA-CashFlow-System', 'backend')
if not os.path.exists(repo_backend):
    repo_backend = os.path.join(os.getcwd(), 'backend')
sys.path.insert(0, repo_backend)
os.chdir(os.path.join(repo_backend, '..'))

from app.database import SessionLocal
from app.models.models import Student, User, StudentFeeSchedule
from app.api.students import get_academic_year_rollover_status, enroll_student_for_next_school_year, RolloverEnrollRequest

db = SessionLocal()
cashier = db.query(User).filter(User.role == 'cashier').first()
if not cashier:
    cashier = db.query(User).first()

status_res = get_academic_year_rollover_status(db=db, current_user=cashier)
print('Summary:', status_res['summary'])
print('Sections count:', len(status_res['sections']))
for s in status_res['sections']:
    print(f" Section: {s['grade_level']} - {s['section']} -> Target: {s['target_grade_level']} ({s['target_section']}) | Students: {len(s['students'])}")

db.close()
