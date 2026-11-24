"""Explain a completed screening using only de-identified, structured findings."""

import asyncio
from collections import deque
import json
import logging
import re
from time import monotonic

import httpx

from app import config
from app.schemas import AnalyzeResponse, GeminiExplanation

logger = logging.getLogger(__name__)
# Bound spending on this public endpoint. Each API worker has its own window.
_request_times: deque[float] = deque()
_MAX_CALLS_PER_MINUTE = 10

_INSTRUCTION = (
    "Explain an existing medicine packaging screening to the person who uploaded a photo. "
    "Use two or three short plain-English sentences. Describe the supplied verdict and "
    "one or two relevant observations such as missing fields, a barcode discrepancy, or "
    "image quality. A higher optical score indicates a closer match to the screen's criteria. "
    "Prioritize observed conflicts for a suspicious result. A null field is unassessed. "
    "Mention only evidence present in the supplied metrics. A missing field can simply "
    "be outside the photo. Do not infer a cause, authenticate medicine, assess its contents, "
    "give treatment advice, or describe a screening score as a probability. If a check "
    "needs follow-up, suggest a clearer photo or checking the package with the pharmacist "
    "or manufacturer. Return plain text."
)


def _metrics(report: AnalyzeResponse) -> dict:
    fields = report.date_logic_details or {}
    catalog = report.database_match_details or {}
    barcode = report.barcode_details or {}
    audit = report.cross_audit_details or {}
    has_mfg = bool(fields.get("has_mfg_date"))
    has_expiry = bool(fields.get("has_exp_date"))
    has_catalog_match = bool(catalog.get("matched_name"))
    return {
        "screening_verdict": report.verdict,
        "sharpness_out_of_100": report.sharpness_score,
        "edge_quality_out_of_100": report.edge_quality_score,
        "reference_color_match_out_of_100": report.color_match_score if report.reference_used else None,
        "batch_read": bool(fields.get("batch_present")),
        "manufacture_date_read": has_mfg,
        "expiry_date_read": has_expiry,
        "date_order_conflict_detected": not fields.get("date_timeline_valid", True) if has_mfg and has_expiry else None,
        "date_order_confirmed": bool(fields.get("date_order_confirmed")) if has_mfg and has_expiry else None,
        "expiry_in_past": bool(fields.get("is_expired")) if has_expiry else None,
        "name_matched_in_local_catalog": has_catalog_match,
        "catalog_conflict_flags": [
            key for key in ("is_typo_suspect", "composition_mismatch", "manufacturer_mismatch")
            if catalog.get(key) is True
        ],
        "barcode_decoded": bool(barcode.get("is_decoded")),
        "barcode_field_agreement": {
            key: audit[key] for key in ("batch_match", "expiry_match") if isinstance(audit.get(key), bool)
        },
    }


async def explain_screening(report: AnalyzeResponse) -> GeminiExplanation:
    if not config.GEMINI_API_KEY:
        return GeminiExplanation(status="not_configured")
    unavailable = GeminiExplanation(status="unavailable")
    if not re.fullmatch(r"[A-Za-z0-9._-]+", config.GEMINI_MODEL):
        logger.warning("Invalid GEMINI_MODEL setting")
        return unavailable

    now = monotonic()
    while _request_times and _request_times[0] <= now - 60:
        _request_times.popleft()
    if len(_request_times) >= _MAX_CALLS_PER_MINUTE:
        return unavailable
    _request_times.append(now)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{config.GEMINI_MODEL}:generateContent"
    payload = {
        "systemInstruction": {"parts": [{"text": _INSTRUCTION}]},
        "contents": [{"role": "user", "parts": [{"text": json.dumps(_metrics(report))}]}],
        "generationConfig": {"maxOutputTokens": 1024},
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await asyncio.wait_for(
                client.post(url, headers={"x-goog-api-key": config.GEMINI_API_KEY}, json=payload),
                timeout=12.0,
            )
        response.raise_for_status()
        candidate = response.json()["candidates"][0]
        if candidate.get("finishReason") != "STOP":
            return unavailable
        summary = " ".join(
            part["text"].strip() for part in candidate["content"]["parts"]
            if isinstance(part, dict) and isinstance(part.get("text"), str) and not part.get("thought")
        ).strip()
        if 0 < len(summary) <= 1600:
            return GeminiExplanation(status="generated", summary=summary)
    except httpx.HTTPStatusError as exc:
        logger.warning("Gemini request returned HTTP %s", exc.response.status_code)
    except (httpx.RequestError, asyncio.TimeoutError, ValueError, KeyError, IndexError, TypeError, AttributeError):
        logger.warning("Gemini explanation unavailable")
    return unavailable
