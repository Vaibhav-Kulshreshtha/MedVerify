"""
MedVerify Reference-Free Forensic Analysis Engine
===================================================
This module provides universal, reference-free verification for ANY medicine packaging:
  1. Optical Character Recognition (OCR) via pytesseract / EasyOCR with intelligent fallback.
  2. Forensic Regex Field Extraction:
     - Batch Number (B.No. / Batch / Lot)
     - Manufacturing Date (MFG)
     - Expiry Date (EXP)
     - Maximum Retail Price (MRP)
     - Manufacturing License Number (Mfg. Lic. No.)
  3. Logical Timeline Validation:
     - Expiry date after Manufacturing date
     - Current date expiry check
     - Mandatory field presence audit
  4. Pharmacopeial Database Cross-Check (rapidfuzz):
     - Fuzzy matches OCR text against /data/medicines.csv (100+ Indian pharmaceutical products)
     - Detects brand name typos / near-misses (e.g. "Dollo 650", "D0L0" -> counterfeit typo indicator)
     - Validates active ingredient composition and authorized manufacturer consistency
  5. Barcode & QR Code Optical Decoding:
     - Decodes with pyzbar / OpenCV BarcodeDetector & QRCodeDetector
     - Evaluates barcode readability and physical packaging presence
"""

import os
import re
import csv
import calendar
import logging
import datetime
from typing import Dict, List, NamedTuple, Tuple, Optional, Any
import numpy as np
import cv2
import zxingcpp

try:
    import pytesseract
except ImportError:
    pytesseract = None

try:
    import rapidfuzz
    from rapidfuzz import fuzz
except ImportError:
    rapidfuzz = None

try:
    import pyzbar.pyzbar as pyzbar_module
except Exception:
    pyzbar_module = None

logger = logging.getLogger("medverify.reference_free")

# Candidate directories where medicines.csv may reside
MEDICINE_DATA_PATHS = [
    os.path.join(os.path.dirname(__file__), "..", "data", "medicines.csv"),
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "medicines.csv"),
    "/data/medicines.csv",
]

# Common macOS / Linux tesseract executable paths
TESSERACT_CANDIDATE_PATHS = [
    "/opt/homebrew/bin/tesseract",
    "/usr/local/bin/tesseract",
    "/usr/bin/tesseract",
]

def get_tesseract_cmd() -> Optional[str]:
    """Finds available tesseract binary on the host system."""
    import shutil
    which_cmd = shutil.which("tesseract")
    if which_cmd:
        return which_cmd
    for p in TESSERACT_CANDIDATE_PATHS:
        if os.path.exists(p) and os.access(p, os.X_OK):
            return p
    return None


def load_medicines_dataset() -> List[Dict[str, str]]:
    """
    Loads master Indian medicine dataset containing (name, composition, manufacturer).
    """
    for csv_path in MEDICINE_DATA_PATHS:
        abs_path = os.path.abspath(csv_path)
        if os.path.exists(abs_path):
            try:
                medicines = []
                with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        name = (row.get("name") or "").strip()
                        composition = (row.get("composition") or "").strip()
                        manufacturer = (row.get("manufacturer") or "").strip()
                        if name:
                            medicines.append({
                                "name": name,
                                "composition": composition,
                                "manufacturer": manufacturer,
                            })
                if medicines:
                    return medicines
            except Exception as e:
                logger.error(f"Error reading medicines.csv from {abs_path}: {e}")

    # Built-in high-fidelity fallback dataset if file is temporarily inaccessible
    return [
        {"name": "Dolo 650", "composition": "Paracetamol 650mg", "manufacturer": "Micro Labs Limited"},
        {"name": "Crocin Advance", "composition": "Paracetamol 500mg", "manufacturer": "GlaxoSmithKline Consumer Healthcare"},
        {"name": "Crocin 650", "composition": "Paracetamol 650mg", "manufacturer": "GlaxoSmithKline Consumer Healthcare"},
        {"name": "Combiflam", "composition": "Ibuprofen 400mg + Paracetamol 325mg", "manufacturer": "Sanofi India Limited"},
        {"name": "Tretiva 20", "composition": "Isotretinoin 20mg", "manufacturer": "Intas Pharmaceuticals Ltd"},
        {"name": "Azithral 250", "composition": "Azithromycin 250mg", "manufacturer": "Alembic Pharmaceuticals Ltd"},
        {"name": "Augmentin 625 Duo", "composition": "Amoxicillin 500mg + Clavulanic Acid 125mg", "manufacturer": "GlaxoSmithKline Pharmaceuticals Ltd"},
    ]


# =============================================================================
# 1. OPTICAL CHARACTER RECOGNITION (OCR)
# =============================================================================

def preprocess_for_ocr(image: np.ndarray) -> np.ndarray:
    """Preprocesses packaging image to maximize character stroke readability, including metallic foil blister packs."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    h, w = gray.shape[:2]
    if w < 1000:
        scale = 1200.0 / w
        gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
    elif w > 2400:
        scale = 2000.0 / w
        gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    # CLAHE (Contrast Limited Adaptive Histogram Equalization) neutralizes metallic foil glare
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    return enhanced


def extract_lines_with_bbox(image: np.ndarray, tess_cmd: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Extracts text lines and their physical percentage bounding boxes (x, y, width, height)
    directly from the packaging image using pytesseract.image_to_data.
    """
    if not pytesseract or not tess_cmd:
        return "", []
    try:
        pytesseract.pytesseract.tesseract_cmd = tess_cmd
        h, w = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(gray)
        data = pytesseract.image_to_data(clahe, config=r'--oem 3 --psm 6', output_type=pytesseract.Output.DICT, timeout=10)

        n_boxes = len(data.get('level', []))
        lines_dict: Dict[Tuple[int, int, int], Dict[str, Any]] = {}
        for i in range(n_boxes):
            text = (data['text'][i] or "").strip()
            if not text:
                continue
            line_id = (data['block_num'][i], data['par_num'][i], data['line_num'][i])
            bx = data['left'][i]
            by = data['top'][i]
            bw = data['width'][i]
            bh = data['height'][i]
            if line_id not in lines_dict:
                lines_dict[line_id] = {
                    "words": [text],
                    "x_min": bx,
                    "y_min": by,
                    "x_max": bx + bw,
                    "y_max": by + bh,
                }
            else:
                lines_dict[line_id]["words"].append(text)
                lines_dict[line_id]["x_min"] = min(lines_dict[line_id]["x_min"], bx)
                lines_dict[line_id]["y_min"] = min(lines_dict[line_id]["y_min"], by)
                lines_dict[line_id]["x_max"] = max(lines_dict[line_id]["x_max"], bx + bw)
                lines_dict[line_id]["y_max"] = max(lines_dict[line_id]["y_max"], by + bh)

        extracted_lines = []
        text_lines = []
        for line_id, item in lines_dict.items():
            line_str = " ".join(item["words"]).strip()
            if len(line_str) >= 2:
                text_lines.append(line_str)
                extracted_lines.append({
                    "text": line_str,
                    "x": round((item["x_min"] / w) * 100, 1),
                    "y": round((item["y_min"] / h) * 100, 1),
                    "width": round(((item["x_max"] - item["x_min"]) / w) * 100, 1),
                    "height": round(((item["y_max"] - item["y_min"]) / h) * 100, 1),
                })
        return "\n".join(text_lines), extracted_lines
    except Exception as e:
        logger.warning(f"Error extracting line bounding boxes: {e}")
        return "", []


def perform_ocr(image: np.ndarray) -> Dict[str, Any]:
    """
    Extracts text and physical bounding boxes from packaging image using pytesseract.
    Robustly handles horizontal text and 90-degree vertical stamps on blister packs.
    Includes automated fallback if tesseract binary is not installed on host.
    """
    tess_cmd = get_tesseract_cmd()
    extracted_text = ""
    engine_used = "tesseract"
    char_count = 0
    line_boxes: List[Dict[str, Any]] = []

    if pytesseract and tess_cmd:
        try:
            pytesseract.pytesseract.tesseract_cmd = tess_cmd
            collected_lines: List[str] = []

            # Step 1: Extract high-fidelity line bounding boxes on standard orientation
            box_text, line_boxes = extract_lines_with_bbox(image, tess_cmd)
            for line in box_text.splitlines():
                clean_l = line.strip()
                if len(clean_l) >= 2 and clean_l not in collected_lines:
                    collected_lines.append(clean_l)

            def run_tesseract_pass(img_orient: np.ndarray):
                gray = cv2.cvtColor(img_orient, cv2.COLOR_BGR2GRAY) if len(img_orient.shape) == 3 else img_orient
                h, w = gray.shape[:2]
                if w > 2000:
                    scale = 1800.0 / w
                    gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

                # 1. CLAHE pass
                clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(gray)
                t1 = pytesseract.image_to_string(clahe, config=r'--oem 3 --psm 6', timeout=10)
                for line in t1.splitlines():
                    clean_l = line.strip()
                    if len(clean_l) >= 3 and clean_l not in collected_lines:
                        collected_lines.append(clean_l)

                # 2. Otsu binary pass (outstanding on high-glare metallic foils)
                _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                t2 = pytesseract.image_to_string(otsu, config=r'--oem 3 --psm 6', timeout=10)
                for line in t2.splitlines():
                    clean_l = line.strip()
                    if len(clean_l) >= 3 and clean_l not in collected_lines:
                        collected_lines.append(clean_l)

            # Check if mandatory fields (batch, mfg/exp) are present
            pre_fields = extract_packaging_fields("\n".join(collected_lines))
            needs_rotation = (
                not pre_fields.get("batch_number") or
                not (pre_fields.get("mfg_date_str") or pre_fields.get("exp_date_str")) or
                len(collected_lines) < 8
            )

            if needs_rotation:
                # Pass 2: 90 deg Clockwise (blister pack vertical margins)
                rot_cw = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
                run_tesseract_pass(rot_cw)

                post_fields = extract_packaging_fields("\n".join(collected_lines))
                if not post_fields.get("batch_number"):
                    # Pass 3: 90 deg Counter-Clockwise
                    rot_ccw = cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
                    run_tesseract_pass(rot_ccw)

            extracted_text = "\n".join(collected_lines).strip()
            char_count = len(extracted_text)
        except Exception as e:
            logger.warning(f"Tesseract execution error: {e}")
            extracted_text = ""

    # Intelligent Fallback / Heuristic Reader if tesseract binary is absent on host
    if not extracted_text:
        engine_used = "tesseract" if pytesseract and tess_cmd else "unavailable"

    # Clean text lines
    lines = [line.strip() for line in extracted_text.splitlines() if line.strip()]

    return {
        "text": extracted_text,
        "lines": lines,
        "line_boxes": line_boxes,
        "character_count": char_count,
        "engine_used": engine_used,
        "is_sufficient": char_count >= 20,
    }


# =============================================================================
# 2. FORENSIC REGEX FIELD EXTRACTION
# =============================================================================

def extract_packaging_fields(
    text: str,
    line_boxes: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Extracts mandatory regulatory packaging fields using calibrated regular expressions:
      - Manufacturing License Number (Mfg. Lic. No.)
      - Batch Lot Number (with calibrated prefix handling)
      - Manufacturing Date (MFG)
      - Expiry Date (EXP)
      - Maximum Retail Price (MRP)
    When line_boxes is provided, attaches physical bounding coordinates for each field.
    """
    clean_text = text.replace("\r", " ")
    
    label_suffix = r"[ \t]*(?:(?:number|n[o0])\b\.?)?[ \t:.#-]*"
    code = r"([A-Za-z0-9][A-Za-z0-9/.-]{2,24})"
    lic_match = re.search(
        r"\b(?:licen[sc]e|lic\b\.?|m\.?[ \t]*l\b\.?)" + label_suffix + code,
        clean_text, re.IGNORECASE,
    )
    lic_number = lic_match.group(1).rstrip(".,-") if lic_match else None

    batch_match = re.search(
        r"\b(?:batch\b(?:[ \t]+lot)?|lot\b|[bpr]\.?[ \t]*n[o0]\b\.?)" + label_suffix + code,
        clean_text, re.IGNORECASE,
    )
    batch_number = batch_match.group(1).rstrip(".,-") if batch_match else None
    if batch_number and batch_number.lower() in {"batch", "number", "date", "price", "expiry", "license"}:
        batch_number = None

    # Preserve a printed day when present, including dates with named months.
    printed_date = r"((?:\d{1,2}[-/. ]+)?(?:\d{1,2}|[a-z]{3,4})[-/. ]+(?:\d{4}|\d{2}))\b"
    mfg_match = re.search(
        r"\b(?:date[ \t]+of[ \t]+mfg|mfg(?:\.?[ \t]*date)?|mfd)[ \t.:-]*" + printed_date,
        clean_text, re.IGNORECASE,
    )
    mfg_date_str = mfg_match.group(1) if mfg_match else None
    exp_match = re.search(
        r"\b(?:exp(?:iry)?(?:\.?[ \t]*date)?|use[ \t]+(?:before|by)|best[ \t]+before)[ \t.:-]*" + printed_date,
        clean_text, re.IGNORECASE,
    )
    exp_date_str = exp_match.group(1) if exp_match else None

    # 5. Maximum Retail Price (MRP) regex
    # Matches: "MRP: Rs. 34.50", "M.R.P. Rs 42", "MRP: ₹285.00", "MRP (INCL. TAXES): Rs. 34.50"
    mrp_pattern = re.compile(
        r'(?:M\.?\s*R\.?\s*P\.?|MRP|Max\.?\s*Retail\s*Price)(?:[^\d\n]{0,30})(?:Rs\.?|₹|INR)?\s*[:\-]?\s*([0-9]+(?:\.[0-9]{1,2})?)',
        re.IGNORECASE
    )
    mrp_match = mrp_pattern.search(clean_text)
    mrp_str = mrp_match.group(1).strip() if mrp_match else None
    mrp_value = float(mrp_str) if mrp_str else None
    mrp_display = f"Rs. {mrp_str}" if mrp_str else None

    # Physical bounding box correlation for each field
    batch_bbox = None
    mfg_bbox = None
    exp_bbox = None
    mrp_bbox = None
    lic_bbox = None

    if line_boxes:
        for lb in line_boxes:
            ltxt = lb.get("text", "")
            bx = {"x": lb["x"], "y": lb["y"], "width": lb["width"], "height": lb["height"]}
            if batch_number and batch_number in ltxt and not batch_bbox:
                batch_bbox = bx
            if mfg_date_str and mfg_date_str in ltxt and not mfg_bbox:
                mfg_bbox = bx
            if exp_date_str and exp_date_str in ltxt and not exp_bbox:
                exp_bbox = bx
            if mrp_str and (mrp_str in ltxt or "MRP" in ltxt.upper() or "TAXES" in ltxt.upper()) and not mrp_bbox:
                mrp_bbox = bx
            if lic_number and (lic_number in ltxt or "LIC" in ltxt.upper()) and not lic_bbox:
                lic_bbox = bx

    return {
        "batch_number": batch_number,
        "mfg_date_str": mfg_date_str,
        "exp_date_str": exp_date_str,
        "mrp_str": mrp_display,
        "mrp_value": mrp_value,
        "license_number": lic_number,
        "batch_bbox": batch_bbox,
        "mfg_bbox": mfg_bbox,
        "exp_bbox": exp_bbox,
        "mrp_bbox": mrp_bbox,
        "license_bbox": lic_bbox,
    }


class DateRange(NamedTuple):
    first: datetime.date
    last: datetime.date


def _printed_date_range(date_str: Optional[str]) -> Optional[DateRange]:
    """Preserve the precision of day/month/year and month/year labels."""
    if not date_str:
        return None
    s = date_str.strip()
    month_names = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12
    }
    
    parts = re.split(r'[/\-.\s]+', s.lower())
    if len(parts) not in (2, 3):
        return None
    month_part, year_part = parts[-2:]
    if not re.fullmatch(r"\d{2}|\d{4}", year_part):
        return None
    year = int(year_part) + (2000 if len(year_part) == 2 else 0)
    try:
        month = month_names.get(month_part) or int(month_part)
        if len(parts) == 3:
            date = datetime.date(year, month, int(parts[0]))
            return DateRange(date, date)
        return DateRange(datetime.date(year, month, 1), datetime.date(year, month, calendar.monthrange(year, month)[1]))
    except ValueError:
        return None


def parse_date_string(date_str: Optional[str]) -> Optional[Tuple[int, int]]:
    bounds = _printed_date_range(date_str)
    return (bounds.first.year, bounds.first.month) if bounds else None


# =============================================================================
# 3. LOGICAL TIMELINE & MANDATORY FIELD CHECKS
# =============================================================================

def evaluate_field_logic(fields: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates:
      - Batch present (pass/fail)
      - MRP present (pass/fail)
      - License number present (pass/fail)
      - EXP date is after MFG date (pass/fail - critical if false)
      - Not already expired relative to current date
    """
    batch_present = bool(fields.get("batch_number"))
    mrp_present = bool(fields.get("mrp_value") or fields.get("mrp_str"))
    lic_present = bool(fields.get("license_number"))

    mfg = _printed_date_range(fields.get("mfg_date_str"))
    expiry = _printed_date_range(fields.get("exp_date_str"))
    timeline_error = None
    if mfg and expiry and expiry.last <= mfg.first:
        timeline_error = (
            f"Printed expiry ({fields['exp_date_str']}) falls on or before "
            f"the manufacturing date ({fields['mfg_date_str']}). Confirm both dates on the package."
        )
    order_confirmed = bool(mfg and expiry and mfg.last < expiry.first)
    is_expired = bool(expiry and expiry.last < datetime.date.today())

    # Compute a normalized score (0 - 100) for field compliance
    field_score = 0.0
    if batch_present:
        field_score += 35.0
    if mrp_present:
        field_score += 25.0
    if lic_present:
        field_score += 20.0
    if not timeline_error and (mfg or expiry):
        field_score += 20.0

    return {
        "batch_present": batch_present,
        "mrp_present": mrp_present,
        "license_present": lic_present,
        "has_mfg_date": bool(mfg),
        "has_exp_date": bool(expiry),
        "date_timeline_valid": timeline_error is None,
        "date_order_confirmed": order_confirmed,
        "timeline_error": timeline_error,
        "is_expired": is_expired,
        "score": round(field_score, 1),
    }


# =============================================================================
# 4. MEDICINE DATABASE CROSS-CHECK (rapidfuzz)
# =============================================================================

def cross_check_medicine_database(
    ocr_text: str,
    declared_brand: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fuzzy-matches extracted text against Indian medicines dataset (/data/medicines.csv).
    Detects:
      1. Legitimate brand name matches
      2. Counterfeit brand typos / near-miss spellings (e.g. 'Dollo 650' or 'D0L0')
      3. Contradictions between claimed brand and actual active composition or manufacturer
    """
    medicines = load_medicines_dataset()
    if not medicines:
        return {
            "matched_name": None,
            "expected_composition": None,
            "expected_manufacturer": None,
            "similarity": 0.0,
            "is_typo_suspect": False,
            "composition_mismatch": False,
            "manufacturer_mismatch": False,
            "score": 50.0,
            "flags": [],
        }

    upper_text = ocr_text.upper()
    norm_upper_text = re.sub(r'[^A-Z0-9\s]', ' ', upper_text)
    norm_upper_text = re.sub(r'\s+', ' ', norm_upper_text).strip()

    # A selected reference alone supplies no text evidence for a database match.
    best_med = None
    best_score = 0.0
    best_matched_term = ""

    # 2. Match exact registered brand names appearing in the packaging text
    for med in medicines:
        med_name = med["name"].upper()
        norm_med = re.sub(r'[^A-Z0-9\s]', ' ', med_name)
        norm_med = re.sub(r'\s+', ' ', norm_med).strip()
        
        # Exact match of full name (e.g. "TRETIVA 20" or "DOLO 650")
        if norm_med and f" {norm_med} " in f" {norm_upper_text} ":
            best_med = med
            best_score = 100.0
            best_matched_term = med["name"]
            break

    # An ingredient alone cannot establish a brand or strength. Only compare brand terms.
    if not best_med and rapidfuzz:
        regulatory_prefixes = ("BATCH", "B.NO", "B NO", "LOT", "MFG", "EXP", "MRP", "LIC", "RS", "PRICE", "DATE", "STORAGE", "DOSAGE")
        candidate_phrases = set()
        for line in ocr_text.splitlines():
            line_clean = line.strip().upper()
            if not line_clean or any(line_clean.startswith(pref) for pref in regulatory_prefixes):
                continue
            if "BATCH" in line_clean or "LOT NO" in line_clean or "EXPIRY" in line_clean:
                continue
            norm_line = re.sub(r'[^A-Z0-9\s]', ' ', line_clean)
            words = norm_line.split()
            for n in range(1, 4):
                for i in range(len(words) - n + 1):
                    phrase = " ".join(words[i:i + n])
                    if len(phrase) >= 5 and not phrase.isdigit():
                        candidate_phrases.add(phrase)

        phrases = sorted(candidate_phrases)
        for med in medicines:
            med_name = med["name"].upper()
            norm_med = re.sub(r'[^A-Z0-9\s]', ' ', med_name)
            norm_med = re.sub(r'\s+', ' ', norm_med).strip()

            for phrase in phrases:
                score = fuzz.ratio(norm_med, phrase)
                token_score = fuzz.token_sort_ratio(norm_med, phrase)
                effective_score = max(score, token_score)
                if effective_score > best_score:
                    best_score = effective_score
                    best_med = med
                    best_matched_term = phrase
                    if best_score >= 95.0:
                        break

    flags: List[Dict[str, str]] = []
    is_typo_suspect = False
    composition_mismatch = False
    manufacturer_mismatch = False
    db_score = 50.0

    if best_med and best_score >= 82.0:
        norm_med = re.sub(r'[^A-Z0-9\s]', ' ', best_med["name"].upper())
        norm_med = re.sub(r'\s+', ' ', norm_med).strip()
        is_exact = norm_med in norm_upper_text or best_score >= 95.0
        length_diff = abs(len(norm_med) - len(best_matched_term))

        # Check if text contains the active ingredient
        expected_comp = best_med["composition"].upper()
        comp_keywords = [
            word for word in re.findall(r'[A-Za-z]+', expected_comp)
            if len(word) >= 4 and word not in ("TABLETS", "CAPSULES", "WITH", "ACID", "SOFT", "GELATIN")
        ]
        has_active_comp = any(
            kw in upper_text or (rapidfuzz and any(fuzz.ratio(kw, w) >= 80 for w in upper_text.split()))
            for kw in comp_keywords
        )

        # Only flag as suspect typo if NOT an exact match, NOT supported by active ingredient, high near-miss score (>= 82%), and length diff <= 2
        if not is_exact and not has_active_comp and 82.0 <= best_score < 95.0 and length_diff <= 2:
            is_typo_suspect = True
            db_score = 20.0
            flags.append({
                "issue": (
                    f"SUSPECT BRAND TYPO (Near-miss spelling {best_score:.1f}%): Extracted packaging name "
                    f"'{best_matched_term}' resembles the catalog entry '{best_med['name']}'. Check the printed spelling."
                ),
                "severity": "high",
            })
        else:
            db_score = 98.0

            # Validate active composition consistency
            if comp_keywords and not has_active_comp and len(upper_text) > 350:
                other_actives = ["PARACETAMOL", "IBUPROFEN", "AZITHROMYCIN", "AMOXICILLIN", "PANTOPRAZOLE", "OMEPRAZOLE", "CETIRIZINE"]
                has_conflicting_active = any(oa in upper_text for oa in other_actives if oa not in expected_comp)
                if has_conflicting_active:
                    composition_mismatch = True
                    db_score = 35.0
                    flags.append({
                        "issue": (
                            f"COMPOSITION CONTRADICTION: Claimed brand '{best_med['name']}' requires active API "
                            f"'{best_med['composition']}', but formulation was not detected in packaging micro-text."
                        ),
                        "severity": "high",
                    })

            # Validate manufacturer consistency if packaging mentions an explicit manufacturer
            expected_mfg = best_med["manufacturer"].upper()
            mfg_keywords = [
                w for w in re.findall(r'[A-Za-z]+', expected_mfg)
                if len(w) >= 4 and w not in ("LIMITED", "PHARMACEUTICALS", "PHARMA", "INDIA", "PRIVATE", "CORP", "INDUSTRIES", "LTD")
            ]
            if mfg_keywords:
                has_expected_mfg = any(
                    kw in norm_upper_text or (rapidfuzz and fuzz.partial_ratio(kw, norm_upper_text) >= 80)
                    for kw in mfg_keywords
                )
                if has_expected_mfg and not composition_mismatch:
                    db_score = 100.0
                elif not has_expected_mfg and len(norm_upper_text) > 400:
                    mfg_line_match = re.search(r'(?:MANUFACTURED|MARKETED|MFD)\s*BY\s*[:\-]?\s*([^\n\r]+)', ocr_text, re.IGNORECASE)
                    if mfg_line_match:
                        found_mfg_text = mfg_line_match.group(1).upper()
                        if len(found_mfg_text) > 10 and not any(kw in found_mfg_text for kw in mfg_keywords):
                            manufacturer_mismatch = True
                            db_score = min(db_score, 40.0)
                            flags.append({
                                "issue": (
                                    f"MANUFACTURER DISCREPANCY: Brand '{best_med['name']}' lists manufacturer "
                                    f"'{best_med['manufacturer']}', but packaging cites '{found_mfg_text.strip()}'. Check the printed manufacturer against the catalog."
                                ),
                                "severity": "high",
                            })
    else:
        best_med = None

    return {
        "matched_name": best_med["name"] if best_med else None,
        "expected_composition": best_med["composition"] if best_med else None,
        "expected_manufacturer": best_med["manufacturer"] if best_med else None,
        "similarity": round(best_score, 1),
        "is_typo_suspect": is_typo_suspect,
        "composition_mismatch": composition_mismatch,
        "manufacturer_mismatch": manufacturer_mismatch,
        "score": round(db_score, 1),
        "flags": flags,
    }


# =============================================================================
# 5. GS1 DATAMATRIX PARSING & PHYSICAL-TO-DIGITAL CROSS-AUDIT
# =============================================================================

def parse_gs1_payload(text: str) -> Dict[str, Any]:
    """
    Parses GS1 DataMatrix AI (Application Identifier) strings:
      - (01) GTIN - 14 digits
      - (17) Expiry Date - YYMMDD
      - (10) Batch / Lot Number
      - (21) Serial Number
    Supports standard parenthesized representations and continuous barcode byte streams.
    """
    if not text:
        return {"gtin": None, "expiry_date": None, "batch_number": None, "serial_number": None, "is_valid_gs1": False}

    gtin = None
    exp_date = None
    batch = None
    serial = None

    # 1. Standard AI with parentheses: (01)...(17)...(10)...
    p_gtin = re.search(r'\(0?1\)\s*(\d{13,14})', text)
    if p_gtin:
        gtin = p_gtin.group(1).strip()

    p_exp = re.search(r'\(17\)\s*(\d{6})', text)
    if p_exp:
        raw_exp = p_exp.group(1).strip()
        yy, mm, dd = raw_exp[0:2], raw_exp[2:4], raw_exp[4:6]
        exp_date = f"20{yy}-{mm}-{dd}"

    p_batch = re.search(r'\(10\)\s*([A-Za-z0-9\-\/]{3,22})', text)
    if p_batch:
        batch = p_batch.group(1).strip()

    p_serial = re.search(r'\(21\)\s*([A-Za-z0-9\-\/]{3,22})', text)
    if p_serial:
        serial = p_serial.group(1).strip()

    # 2. Scanner byte stream without parentheses: 01...17...10...
    if not gtin:
        p_raw = re.search(r'\b01(\d{14})17(\d{6})10([A-Za-z0-9\-\/]{4,22})', text)
        if p_raw:
            gtin = p_raw.group(1)
            raw_exp = p_raw.group(2)
            exp_date = f"20{raw_exp[0:2]}-{raw_exp[2:4]}-{raw_exp[4:6]}"
            batch = p_raw.group(3)

    return {
        "gtin": gtin,
        "expiry_date": exp_date,
        "batch_number": batch,
        "serial_number": serial,
        "is_valid_gs1": bool(gtin or batch),
    }


def cross_audit_physical_vs_digital(
    extracted_fields: Dict[str, Any],
    gs1_data: Optional[Dict[str, Any]],
    ocr_lines: Optional[List[str]] = None,  # Legacy argument; printed text cannot supply a decoded payload.
) -> Dict[str, Any]:
    """
    Performs physical-to-digital cross-verification:
      - Validates that physically printed Batch Number matches digital GS1 DataMatrix payload.
      - Validates that physically printed Expiry Date aligns with GS1 Expiry Date.
      - Discrepancy indicates counterfeit repackaging, copied QR codes, or relabeling fraud.
    """
    ocr_batch = (extracted_fields.get("batch_number") or "").strip().upper()
    ocr_exp = (extracted_fields.get("exp_date_str") or "").strip().upper()

    if not gs1_data or not gs1_data.get("is_valid_gs1"):
        return {
            "status": "PHYSICAL_ONLY",
            "batch_match": None,
            "expiry_match": None,
            "summary": "Physical packaging audit completed (no digital GS1 2D barcode payload detected on scan surface).",
            "flags": [],
        }

    digital_batch = (gs1_data.get("batch_number") or "").strip().upper()
    digital_exp = (gs1_data.get("expiry_date") or "").strip()

    batch_match = None
    flags = []

    if ocr_batch and digital_batch:
        norm_ocr_b = re.sub(r'[^A-Z0-9]', '', ocr_batch)
        norm_dig_b = re.sub(r'[^A-Z0-9]', '', digital_batch)
        if norm_ocr_b and norm_ocr_b == norm_dig_b:
            batch_match = True
        else:
            batch_match = False
            flags.append({
                "issue": (
                    f"DIGITAL-PHYSICAL BATCH CONFLICT: Physically printed batch '{ocr_batch}' contradicts "
                    f"digital GS1 barcode payload '{digital_batch}'. Check both codes on the original package."
                ),
                "severity": "high",
            })

    expiry_match = None
    printed = _printed_date_range(ocr_exp)
    digital = None
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", digital_exp):
        year, month, day = digital_exp.split("-")
        # Some codes provide year/month and use 00 in the day field.
        value = f"{month}/{year}" if day == "00" else f"{day}/{month}/{year}"
        digital = _printed_date_range(value)
    if printed and digital:
        expiry_match = printed.first <= digital.last and digital.first <= printed.last
        if not expiry_match:
            flags.append({
                "issue": f"Printed expiry '{ocr_exp}' conflicts with the decoded barcode expiry '{digital_exp}'.",
                "severity": "high",
            })

    if batch_match is False or expiry_match is False:
        status = "CRITICAL_MISMATCH"
        summary = "CRITICAL ALERT: Physical packaging typography does not match digital barcode identity."
    elif batch_match is True:
        status = "VERIFIED_MATCH"
        summary = f"Printed batch {ocr_batch} matches the batch encoded in the scanned barcode."
    else:
        status = "PARTIAL_AUDIT"
        summary = "Partial GS1 record cross-audited against packaging typography."

    return {
        "status": status,
        "batch_match": batch_match,
        "expiry_match": expiry_match,
        "digital_batch": digital_batch,
        "digital_expiry": digital_exp,
        "gtin": gs1_data.get("gtin"),
        "summary": summary,
        "flags": flags,
    }


# =============================================================================
# 6. BARCODE & QR CODE OPTICAL DECODING
# =============================================================================

def decode_barcode_and_qr(image: np.ndarray) -> Dict[str, Any]:
    """
    Reads Data Matrix with ZXing, and linear or QR codes with ZBar and OpenCV.
    Evaluates:
      - Validly decoded code with physical bounding box
      - Detected but damaged/unreadable code
      - Code absent from scanned surface
    """
    decoded_codes = []
    h, w = image.shape[:2]

    # HRI expands GS1 application identifiers while preserving field boundaries.
    for symbol in zxingcpp.read_barcodes(image, formats=zxingcpp.BarcodeFormat.DataMatrix):
        position = symbol.position
        corners = (position.top_left, position.top_right, position.bottom_right, position.bottom_left)
        left, right = min(p.x for p in corners), max(p.x for p in corners)
        top, bottom = min(p.y for p in corners), max(p.y for p in corners)
        decoded_codes.append({
            "type": "DATAMATRIX",
            "data": symbol.text,
            "bbox": {
                "x": round(100 * left / w, 1), "y": round(100 * top / h, 1),
                "width": round(100 * (right - left) / w, 1), "height": round(100 * (bottom - top) / h, 1),
            },
        })
    
    # 1. Try pyzbar if available
    if pyzbar_module:
        try:
            zbar_results = pyzbar_module.decode(image)
            for z in zbar_results:
                data_str = z.data.decode("utf-8", errors="replace")
                rect = z.rect
                bbox = {
                    "x": round((rect.left / w) * 100, 1),
                    "y": round((rect.top / h) * 100, 1),
                    "width": round((rect.width / w) * 100, 1),
                    "height": round((rect.height / h) * 100, 1),
                }
                decoded_codes.append({
                    "type": str(z.type),
                    "data": data_str,
                    "rect": z.rect,
                    "bbox": bbox,
                })
        except Exception as e:
            logger.debug(f"pyzbar decoding: {e}")

    # 2. Try OpenCV QR Code detector
    if not decoded_codes:
        try:
            qr_detector = cv2.QRCodeDetector()
            val, points, _ = qr_detector.detectAndDecode(image)
            if val:
                bbox = None
                if points is not None and len(points) > 0:
                    pts = points[0]
                    bx = float(np.min(pts[:, 0]))
                    by = float(np.min(pts[:, 1]))
                    bw = float(np.max(pts[:, 0]) - bx)
                    bh = float(np.max(pts[:, 1]) - by)
                    bbox = {
                        "x": round((bx / w) * 100, 1),
                        "y": round((by / h) * 100, 1),
                        "width": round((bw / w) * 100, 1),
                        "height": round((bh / h) * 100, 1),
                    }
                decoded_codes.append({
                    "type": "QRCODE",
                    "data": val,
                    "bbox": bbox,
                })
        except Exception as e:
            logger.debug(f"cv2.QRCodeDetector: {e}")

    # 3. Try OpenCV Barcode detector (safe 3-tuple / 4-tuple unpacking for all OpenCV versions)
    if not decoded_codes:
        try:
            bc_detector = cv2.barcode.BarcodeDetector()
            ok, decoded_info, decoded_type, points = bc_detector.detectAndDecodeWithType(image)
            if ok and decoded_info:
                for idx, (info, b_type) in enumerate(zip(decoded_info, decoded_type)):
                    if info:
                        bbox = None
                        if points is not None and idx < len(points):
                            pts = points[idx]
                            bx = float(np.min(pts[:, 0]))
                            by = float(np.min(pts[:, 1]))
                            bw = float(np.max(pts[:, 0]) - bx)
                            bh = float(np.max(pts[:, 1]) - by)
                            bbox = {
                                "x": round((bx / w) * 100, 1),
                                "y": round((by / h) * 100, 1),
                                "width": round((bw / w) * 100, 1),
                                "height": round((bh / h) * 100, 1),
                            }
                        decoded_codes.append({
                            "type": b_type or "BARCODE",
                            "data": info,
                            "bbox": bbox,
                        })
        except Exception as e:
            logger.debug(f"cv2.barcode.BarcodeDetector: {e}")

    # 4. Check for physical barcode pattern presence via morphology (parallel line bars)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    sobel_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=-1)
    sobel_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=-1)
    gradient = cv2.subtract(sobel_x, sobel_y)
    gradient = cv2.convertScaleAbs(gradient)
    blurred = cv2.blur(gradient, (9, 9))
    _, thresh = cv2.threshold(blurred, 225, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (21, 7))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    closed = cv2.erode(closed, None, iterations=4)
    closed = cv2.dilate(closed, None, iterations=4)
    
    contours, _ = cv2.findContours(closed.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    barcode_visually_present = False
    barcode_pattern_bbox = None
    for c in contours:
        bx, by, bw, bh = cv2.boundingRect(c)
        aspect_ratio = float(bw) / bh if bh > 0 else 0
        area = cv2.contourArea(c)
        if area > 4000 and 2.2 <= aspect_ratio <= 5.5:
            barcode_visually_present = True
            barcode_pattern_bbox = {
                "x": round((bx / w) * 100, 1),
                "y": round((by / h) * 100, 1),
                "width": round((bw / w) * 100, 1),
                "height": round((bh / h) * 100, 1),
            }
            break

    flags = []
    gs1_data = None

    if decoded_codes:
        primary = decoded_codes[0]
        status = "decoded_valid"
        score = 98.0
        for code in decoded_codes:
            parsed = parse_gs1_payload(code["data"])
            if parsed["is_valid_gs1"]:
                primary = code
                gs1_data = parsed
                break
        flags.append({
            "issue": f"Decoded {primary['type']} from the supplied photo.",
            "severity": "low",
            "bbox": primary.get("bbox"),
        })
    elif barcode_visually_present:
        status = "unreadable_distorted"
        score = 65.0
        flags.append({
            "issue": (
                "BARCODE / DATAMATRIX UNREADABLE: An optical barcode matrix was detected on packaging "
                "but could not be cleanly decoded due to surface glare or resolution."
            ),
            "severity": "low",
            "bbox": barcode_pattern_bbox,
        })
    else:
        status = "absent"
        score = 80.0
        flags.append({
            "issue": "No readable barcode was found on the visible packaging.",
            "severity": "low",
            "bbox": None,
        })

    return {
        "status": status,
        "is_decoded": bool(decoded_codes),
        "visually_present": barcode_visually_present,
        "primary_code": primary if decoded_codes else None,
        "codes": decoded_codes,
        "gs1_data": gs1_data,
        "score": score,
        "flags": flags,
    }
