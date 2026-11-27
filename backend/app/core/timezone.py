"""
Philippine Standard Time (Asia/Manila, UTC+8) & Canonical CCA Grade-Section Helpers.
"""
import secrets
import string
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


def generate_lrn_password(student_id: str) -> str:
    """
    Generate a unique, memorable 10-character initial parent login password paired to an LRN.
    Example: CCA-6001K9
    """
    digits = "".join(ch for ch in (student_id or "") if ch.isdigit())
    suffix_num = digits[-4:] if len(digits) >= 4 else (digits.zfill(4) if digits else "2026")
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    rand_part = "".join(secrets.choice(alphabet) for _ in range(3))
    return f"CCA-{suffix_num}{rand_part}"
