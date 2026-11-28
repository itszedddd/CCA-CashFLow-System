import hashlib
import json
import os
import re
import threading
import time
import urllib.request

URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
CACHE_TTL = 3600
_cache = {}
_lock = threading.Lock()


def enabled():
    return bool(os.getenv("GEMINI_API_KEY", "").strip())


def fingerprint(data):
    raw = json.dumps(data, sort_keys=True, default=str, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _cache_get(key):
    with _lock:
        item = _cache.get(key)
    if not item:
        return None
    value, created = item
    if time.monotonic() - created > CACHE_TTL:
        with _lock:
            _cache.pop(key, None)
        return None
    return value


def _cache_set(key, value):
    with _lock:
        _cache[key] = (value, time.monotonic())


def _extract_text(payload):
    direct = payload.get("output_text")
    if isinstance(direct, str) and direct.strip():
        return direct.strip()
    chunks = []
    for step in payload.get("steps", []) or []:
        for item in step.get("content", []) or []:
            text = item.get("text")
            if isinstance(text, str) and text.strip():
                chunks.append(text.strip())
    return "\n".join(chunks).strip()


def _strip_fences(text):
    cleaned = str(text or "").strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def generate_json(cache_key, system_instruction, prompt, schema, max_output_tokens=4000):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    body = {
        "model": MODEL,
        "input": prompt,
        "store": False,
        "system_instruction": system_instruction,
        "generation_config": {
            "max_output_tokens": max_output_tokens,
            "thinking_level": "minimal",
        },
        "response_format": {
            "type": "text",
            "mime_type": "application/json",
            "schema": schema,
        },
    }
    request = urllib.request.Request(
        URL,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
            "Api-Revision": "2026-05-20",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
        text = _extract_text(payload)
        if not text:
            raise ValueError("empty response")
        result = json.loads(_strip_fences(text))
        if not isinstance(result, dict):
            return None
        _cache_set(cache_key, result)
        return result
    except Exception as exc:
        detail = str(exc)[:300]
        print(f"[gemini] using fallback: {type(exc).__name__}: {detail}")
        return None
