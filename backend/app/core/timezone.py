"""
Philippine Standard Time (Asia/Manila, UTC+8) & Canonical CCA Grade-Section Helpers.
"""
from datetime import datetime, timezone, timedelta

PH_TZ = timezone(timedelta(hours=8))

GRADE_SECTION_MAP = {
    "Pre-Kinder": "Love",
    "Kindergarten": "Joy",
    "Grade 1": "Faith",
    "Grade 2": "Grace",
    "Grade 3": "Hope",
    "Grade 4": "Peace",
    "Grade 5": "Patience",
    "Grade 6": "Kindness",
    "Grade 7": "Goodness",
    "Grade 8": "Faithfulness",
    "Grade 9": "Gentleness",
    "Grade 10": "Self-Control",
}


def ph_now() -> datetime:
    """Return current datetime strictly in Philippine Standard Time (Asia/Manila, UTC+8)."""
    return datetime.now(PH_TZ)


def ph_now_iso() -> str:
    """Return ISO-8601 timestamp string anchored at UTC+08:00."""
    return ph_now().isoformat(timespec="seconds")


def ph_now_display() -> str:
    """Return formal human-readable PH timestamp (e.g., November 27, 2026 • 09:05 AM PHT)."""
    return ph_now().strftime("%B %d, %Y • %I:%M %p PHT")


def format_ph_timestamp(iso_str: str) -> str:
    """Parse an ISO timestamp string and display it in Philippine Standard Time."""
    if not iso_str:
        return ph_now_display()
    try:
        cleaned = str(iso_str).replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=PH_TZ)
        else:
            dt = dt.astimezone(PH_TZ)
        return dt.strftime("%B %d, %Y • %I:%M %p PHT")
    except Exception:
        return str(iso_str)


def resolve_section(grade_level: str, fallback: str = "Faith") -> str:
    """Return the single canonical CCA section for a given grade level."""
    if not grade_level:
        return fallback
    g_clean = grade_level.strip().lower()
    for k, v in GRADE_SECTION_MAP.items():
        if k.lower() == g_clean:
            return v
    if g_clean in ("kinder", "k"):
        return "Joy"
    return fallback


def generate_lrn_password(student_id: str, full_name: str = "") -> str:
    """
    Generate default initial password for a student account.
    Format: First 3 letters of last name (uppercase) + '#0000'.
    Handles both 'LastName, FirstName MiddleName' and 'FirstName LastName'.
    Example: 'Santos, Juan Miguel' or 'Juan Miguel Santos' -> 'SAN#0000'
    Fallback: 'CCA#0000' if name is unavailable or has < 3 letters.
    """
    last_word = ""
    if full_name:
        cleaned = full_name.strip()
        if "," in cleaned:
            last_word = cleaned.split(",", 1)[0].strip()
        else:
            parts = [p.strip() for p in cleaned.split() if p.strip()]
            if parts:
                last_word = parts[-1]

    clean_letters = "".join(ch for ch in last_word if ch.isalpha()).upper()
    if len(clean_letters) < 3 and full_name:
        clean_letters = "".join(ch for ch in full_name if ch.isalpha()).upper()

    prefix = (clean_letters[:3] if len(clean_letters) >= 3 else (clean_letters + "CCA")[:3]).upper()
    return f"{prefix}#0000"


# ── Official CCA SY 2026-2027 Fee Guidelines per Grade Level ──
# Source: Calvary Christian Academy Inc. Official Payment Guidelines
# Registration & Misc: 5,700 (all levels)
# Tuition:
#   Pre-Kinder to Kinder: 16,060/yr (1,606/mo CBC Member) | 17,060/yr (1,706/mo Non-Member)
#   Grade 1 to 6:         17,010/yr (1,701/mo CBC Member) | 18,010/yr (1,801/mo Non-Member)
#   Grade 7 to 10:        19,060/yr (1,906/mo CBC Member) | 20,060/yr (2,006/mo Non-Member)
# Energy Fee:
#   Pre-Kinder to Kinder: 150/month (1,500/yr)
#   Grade 1 to 10:        300/month (3,000/yr)
# Books (SY 2026-2027):
#   Kinder: 5,500 | Grade 1: 6,900 | Grade 2: 6,300 | Grade 3: 6,900 | Grade 4-6: 8,500 | Grade 7-10: 9,200
# Note: Total 1-year baseline (Tuition Non-Member + Reg + Energy, without books):
#   Kinder: 24,260 | Grade 1 to 6: 26,710 | Grade 7 to 10: 28,760

def get_grade_fee_benchmarks(grade_level: str, is_cbc_member: bool = False) -> list[dict]:
    """
    Returns standard official 5 fee schedules for a given grade level according to
    Calvary Christian Academy Payment Guidelines SY 2026-2027.
    """
    g = (grade_level or "").strip().lower()

    # 1. Registration Fee: ₱5,700 flat across all grade levels
    reg_fee = {
        "category_name": "Registration Fee",
        "sub_description": "Registration & Miscellaneous (Due upon enrollment)",
        "total_due": 5700.0
    }

    # 2. Tuition Fee & Energy Fee
    if any(k in g for k in ["pre-kinder", "pre kinder", "kinder"]):
        tuition_due = 16060.0 if is_cbc_member else 17060.0
        monthly_tuit = 1606 if is_cbc_member else 1706
        tuit_fee = {
            "category_name": "Tuition Fee",
            "sub_description": f"Annual Tuition (10 Months @ ₱{monthly_tuit:,}/mo)",
            "total_due": tuition_due
        }
        energy_fee = {
            "category_name": "Energy Fee",
            "sub_description": "Air-Conditioning & Utility Subsidy (10 Months @ ₱150/mo)",
            "total_due": 1500.0
        }
        books_due = 5500.0
    elif any(k in g for k in ["grade 7", "grade 8", "grade 9", "grade 10", "g7", "g8", "g9", "g10"]):
        tuition_due = 19060.0 if is_cbc_member else 20060.0
        monthly_tuit = 1906 if is_cbc_member else 2006
        tuit_fee = {
            "category_name": "Tuition Fee",
            "sub_description": f"Annual Tuition (10 Months @ ₱{monthly_tuit:,}/mo)",
            "total_due": tuition_due
        }
        energy_fee = {
            "category_name": "Energy Fee",
            "sub_description": "Air-Conditioning & Utility Subsidy (10 Months @ ₱300/mo)",
            "total_due": 3000.0
        }
        books_due = 9200.0
    else:
        # Grade 1 to 6
        tuition_due = 17010.0 if is_cbc_member else 18010.0
        monthly_tuit = 1701 if is_cbc_member else 1801
        tuit_fee = {
            "category_name": "Tuition Fee",
            "sub_description": f"Annual Tuition (10 Months @ ₱{monthly_tuit:,}/mo)",
            "total_due": tuition_due
        }
        energy_fee = {
            "category_name": "Energy Fee",
            "sub_description": "Air-Conditioning & Utility Subsidy (10 Months @ ₱300/mo)",
            "total_due": 3000.0
        }
        if "grade 1" in g or g == "g1":
            books_due = 6900.0
        elif "grade 2" in g or g == "g2":
            books_due = 6300.0
        elif "grade 3" in g or g == "g3":
            books_due = 6900.0
        else:
            # Grade 4 to 6
            books_due = 8500.0

    books_fee = {
        "category_name": "Books",
        "sub_description": f"Textbooks & Instructional Modules (SY 2026-2027: ₱{books_due:,.0f})",
        "total_due": books_due
    }

    other_fee = {
        "category_name": "Other Fees",
        "sub_description": "Educational Tour, Swimming & Activities",
        "total_due": 1500.0
    }

    return [tuit_fee, reg_fee, books_fee, energy_fee, other_fee]

