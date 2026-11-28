import hashlib


def pick(seed, *options):
    options = [option for option in options if option]
    if not options:
        return ""
    digest = hashlib.md5(str(seed).encode("utf-8")).hexdigest()
    return options[int(digest[:8], 16) % len(options)]


def money(value):
    try:
        return f"₱{float(value or 0):,.2f}"
    except Exception:
        return "₱0.00"


def student_forename(full_name):
    raw = str(full_name or "").strip()
    parts = [part.strip() for part in raw.split(",") if part.strip()]
    if len(parts) >= 2:
        tokens = parts[1].split()
        return tokens[0] if tokens else parts[0]
    tokens = raw.split()
    return tokens[0] if tokens else "the student"
