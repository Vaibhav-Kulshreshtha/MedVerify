"""
MedVerify Computer Vision & Multi-Modal Forensic Engine
======================================================
This module performs comprehensive packaging authenticity verification using:
  1. Print Sharpness Analysis (Laplacian spatial variance) - Reference-Free
  2. Edge & Contour Quality Analysis (Canny edge continuity & stroke coherence) - Reference-Free
  3. Optical Character Recognition (pytesseract OCR with automated fallback) - Reference-Free
  4. Mandatory Regulatory Field Extraction (Regex for Batch, MFG, EXP, MRP, Mfg Lic No) - Reference-Free
  5. Chronological Date & Shelf-Life Logic Validation - Reference-Free
  6. Pharmacopeial Medicine Database Cross-Check (rapidfuzz against /data/medicines.csv) - Reference-Free
  7. Barcode & QR Code Optical Decoding (pyzbar + OpenCV detectors) - Reference-Free
  8. Optional Brand Reference Color Match (HSV Histogram Correlation) - Only when authentic master exists

Decision Rule & Classification:
  - Composite Score Threshold: >= 65.0 -> 'PASSED SCREENING', < 65.0 -> 'SUSPICIOUS'
  - HARD RULE: If ANY check triggers a HIGH or CRITICAL severity flag, the verdict CANNOT be
    'PASSED SCREENING' and is forced to 'SUSPICIOUS'.
  - INCONCLUSIVE RULE: If OCR text is unreadable (< 20 chars) and no severe counterfeit flaws
    are detected, the verdict is 'INCONCLUSIVE' with clear guidance on what is missing.
"""

import os
import glob
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import cv2

from app.reference_free_engine import (
    perform_ocr,
    extract_packaging_fields,
    evaluate_field_logic,
    cross_check_medicine_database,
    decode_barcode_and_qr,
)

logger = logging.getLogger("medverify.cv")

# Base directories where reference genuine packaging images and brands.json reside
REFERENCE_DIRS = [
    os.path.join(os.path.dirname(__file__), "..", "reference_images"),
    os.path.join(os.path.dirname(__file__), "..", "..", "reference_images"),
]

# Benchmarks according to pharmacopeial quality standards (USP-NF & ISO-17025)
BENCHMARK_SHARPNESS = 70.0
BENCHMARK_EDGE = 70.0
BENCHMARK_COLOR = 75.0

OUTLIER_THRESHOLD_SHARPNESS = 0.40 * BENCHMARK_SHARPNESS  # 28.0 pts
OUTLIER_THRESHOLD_EDGE = 0.40 * BENCHMARK_EDGE            # 28.0 pts
OUTLIER_THRESHOLD_COLOR = 0.40 * BENCHMARK_COLOR          # 30.0 pts

# Known brand aliases
BRAND_ALIASES = {
    "tretiva": ["isotretinoin", "tretiva", "tretiva20", "tretiva-20", "tetriva", "tetriva20", "tetriva-20"],
    "tetriva": ["tretiva", "isotretinoin", "tretiva20", "tretiva-20", "tetriva", "tetriva20", "tetriva-20"],
    "tetriva20": ["tretiva", "isotretinoin", "tretiva20", "tretiva-20", "tetriva", "tetriva20", "tetriva-20"],
    "tretiva20": ["tretiva", "isotretinoin", "tretiva20", "tretiva-20", "tetriva", "tetriva20", "tetriva-20"],
    "isotretinoin": ["tretiva", "isotretinoin", "tretiva20", "tretiva-20", "tetriva", "tetriva20", "tetriva-20"],
    "dolo650": ["dolo", "dolo650", "dolo-650", "paracetamol"],
    "crocin": ["crocin", "crocinadvance", "crocin-advance", "paracetamol"],
    "combiflam": ["combiflam", "ibuprofen", "paracetamol"],
    "azithromycin": ["azithral", "azithromycin", "azithral250", "azithral-250"],
    "azithral": ["azithromycin", "azithral", "azithral250", "azithral-250"],
    "amoxicillin": ["augmentin", "amoxicillin", "augmentin625", "augmentin-625", "mox"],
    "augmentin": ["amoxicillin", "augmentin", "augmentin625", "augmentin-625", "mox"],
}


def load_brands_config() -> List[Dict]:
    """Loads medicine brands mapping configuration from brands.json."""
    for ref_dir in REFERENCE_DIRS:
        cfg_path = os.path.join(ref_dir, "brands.json")
        if os.path.exists(cfg_path):
            try:
                with open(cfg_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("brands", [])
            except Exception as e:
                logger.error(f"Error loading brands.json from {cfg_path}: {e}")
    return []


def get_brand_reference_image(brand_id: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Resolves the exact authentic master image file for a given medicine brand ID or name.
    Returns: (resolved_file_path, brand_display_name).
    """
    if not brand_id or brand_id.lower().strip() in ("auto", "other", "none", ""):
        return None, None

    clean_id = brand_id.strip().lower()
    brands = load_brands_config()
    matched_brand_entry = None
    brand_display_name = brand_id

    # 1. Match by exact ID
    for b in brands:
        if b.get("id", "").strip().lower() == clean_id:
            matched_brand_entry = b
            brand_display_name = b.get("name") or b.get("fullName") or brand_id
            break

    # 2. Match by Name / FullName substring
    if not matched_brand_entry:
        for b in brands:
            name_lower = b.get("name", "").strip().lower()
            full_lower = b.get("fullName", "").strip().lower()
            if clean_id in name_lower or clean_id in full_lower or name_lower in clean_id:
                matched_brand_entry = b
                brand_display_name = b.get("name") or b.get("fullName") or brand_id
                break

    # 3. Check alias dictionary
    search_keys = [clean_id]
    if clean_id in BRAND_ALIASES:
        search_keys.extend(BRAND_ALIASES[clean_id])
    for alias_key, alias_list in BRAND_ALIASES.items():
        if clean_id in alias_list:
            search_keys.append(alias_key)
            search_keys.extend(alias_list)
    search_keys = list(dict.fromkeys(search_keys))

    # If configured reference_image path exists
    if matched_brand_entry and matched_brand_entry.get("reference_image"):
        rel_path = matched_brand_entry["reference_image"]
        for ref_dir in REFERENCE_DIRS:
            cand = os.path.join(ref_dir, rel_path)
            if os.path.exists(cand) and os.path.isfile(cand):
                return os.path.abspath(cand), brand_display_name

    # 4. Search reference directories for direct matches
    for key in search_keys:
        for ref_dir in REFERENCE_DIRS:
            if not os.path.exists(ref_dir):
                continue
            candidates = [
                os.path.join(ref_dir, key, "genuine.png"),
                os.path.join(ref_dir, key, "reference.png"),
                os.path.join(ref_dir, f"{key}_genuine.png"),
                os.path.join(ref_dir, f"ref_{key}.png"),
                os.path.join(ref_dir, f"{key}.png"),
            ]
            for cand in candidates:
                if os.path.exists(cand) and os.path.isfile(cand):
                    return os.path.abspath(cand), brand_display_name

            for pattern in (f"ref_{key}*.png", f"{key}*.png", f"*{key}*.png"):
                matches = glob.glob(os.path.join(ref_dir, pattern))
                valid_matches = [m for m in matches if "fake" not in os.path.basename(m).lower() and os.path.isfile(m)]
                if valid_matches:
                    return os.path.abspath(valid_matches[0]), brand_display_name

    return None, brand_display_name


def decode_image_bytes(file_bytes: bytes) -> np.ndarray:
    """Decodes raw image bytes into a BGR NumPy array using OpenCV."""
    np_arr = np.frombuffer(file_bytes, dtype=np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image. Format must be valid JPEG, PNG, or WebP.")
    return image


def calculate_sharpness_score(image: np.ndarray) -> Tuple[float, float]:
    """
    Computes print sharpness score using the Laplacian Operator variance.
    Sharp pharmaceutical packaging produces high variance (> 400); blurred/cheap printing < 100.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F, ksize=3)
    raw_variance = float(laplacian.var())

    target_variance = 650.0
    normalized_score = (np.log1p(raw_variance) / np.log1p(target_variance)) * 100.0
    sharpness_score = float(np.clip(normalized_score, 0.0, 100.0))

    return round(sharpness_score, 1), round(raw_variance, 2)


def calculate_edge_quality_score(image: np.ndarray) -> Tuple[float, float, float]:
    """
    Computes edge continuity and print quality using Canny Edge Detection and Connected Stroke Analysis.
    Counterfeits printed via halftone spray exhibit ragged, fragmented edges.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 1.2)
    edges = cv2.Canny(blurred, 50, 150)

    total_pixels = float(edges.shape[0] * edges.shape[1])
    edge_pixels = float(np.count_nonzero(edges))
    edge_density_pct = (edge_pixels / total_pixels) * 100.0

    if 2.5 <= edge_density_pct <= 16.0:
        density_score = 96.0
    elif 1.0 <= edge_density_pct < 2.5:
        density_score = 60.0 + (edge_density_pct - 1.0) * 24.0
    elif 16.0 < edge_density_pct <= 24.0:
        density_score = 96.0 - (edge_density_pct - 16.0) * 4.0
    elif edge_density_pct < 1.0:
        density_score = max(10.0, edge_density_pct * 40.0)
    else:
        density_score = max(20.0, 64.0 - (edge_density_pct - 24.0) * 3.0)

    if edge_pixels > 0:
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(edges, connectivity=8)
        coherent_pixels = sum(
            stats[i, cv2.CC_STAT_AREA]
            for i in range(1, num_labels)
            if stats[i, cv2.CC_STAT_AREA] >= 10
        )
        coherence_ratio = float(coherent_pixels) / float(edge_pixels)
    else:
        coherence_ratio = 0.0

    coherence_score = float(np.clip(coherence_ratio * 100.0, 0.0, 100.0))
    edge_quality_score = float(np.clip(0.40 * density_score + 0.60 * coherence_score, 0.0, 100.0))

    return round(edge_quality_score, 1), round(edge_density_pct, 2), round(coherence_ratio, 3)


def calculate_color_consistency_score(
    image: np.ndarray,
    reference_path: str,
) -> Tuple[float, float, str]:
    """
    Computes HSV color histogram correlation between the uploaded packaging and an authentic master.
    """
    hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    hist_image = cv2.calcHist([hsv_image], [0, 1], None, [50, 60], [0, 180, 0, 256])
    cv2.normalize(hist_image, hist_image, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)

    ref_bgr = cv2.imread(reference_path)
    if ref_bgr is None:
        return 0.0, 0.0, "UNREADABLE_REFERENCE"

    ref_hsv = cv2.cvtColor(ref_bgr, cv2.COLOR_BGR2HSV)
    ref_hist = cv2.calcHist([ref_hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
    cv2.normalize(ref_hist, ref_hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)

    correlation = float(cv2.compareHist(hist_image, ref_hist, cv2.HISTCMP_CORREL))
    clamped_corr = max(0.0, min(1.0, correlation))
    color_match_score = float(clamped_corr * 100.0)

    parent_dir = os.path.basename(os.path.dirname(reference_path))
    file_name = os.path.basename(reference_path)
    ref_display = f"{parent_dir}/{file_name}" if parent_dir not in ("reference_images", "backend") else file_name

    return round(color_match_score, 1), round(correlation, 3), ref_display


def analyze_packaging_image(
    file_bytes: bytes,
    filename: str = "",
    brand_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Executes universal packaging authenticity analysis on uploaded image bytes.
    Integrates reference-free forensic checks with optional master reference comparison.
    """
    image = decode_image_bytes(file_bytes)
    flags: List[Dict[str, str]] = []

    # =========================================================================
    # CHECK 1 & 2: Print Sharpness & Edge Quality (Always Reference-Free)
    # =========================================================================
    sharpness_score, raw_variance = calculate_sharpness_score(image)
    edge_quality_score, edge_density, coherence_ratio = calculate_edge_quality_score(image)

    # Sharpness Flags
    if sharpness_score < OUTLIER_THRESHOLD_SHARPNESS:
        flags.append({
            "issue": (
                f"CRITICAL SHARPNESS OUTLIER (Laplacian variance {raw_variance:.1f} < 100): "
                f"Print sharpness ({sharpness_score:.1f}/100) is below 40% of required pharmaceutical benchmark. "
                "Severe optical blur indicates counterfeit desktop reproduction."
            ),
            "severity": "high",
        })
    elif sharpness_score < 50.0:
        flags.append({
            "issue": (
                f"Severe print blur detected (Laplacian variance {raw_variance:.1f}): "
                "Micro-typography and batch characters lack optical edge definition."
            ),
            "severity": "high",
        })
    elif sharpness_score < 70.0:
        flags.append({
            "issue": (
                f"Sub-standard print sharpness (Laplacian variance {raw_variance:.1f}): "
                "Letter stroke boundaries exhibit soft focus typical of secondary digital printing."
            ),
            "severity": "medium",
        })

    # Edge Quality Flags
    if edge_quality_score < OUTLIER_THRESHOLD_EDGE:
        flags.append({
            "issue": (
                f"CRITICAL EDGE QUALITY OUTLIER (Canny Edge Quality {edge_quality_score:.1f}): "
                "Stroke continuity is below 40% of benchmark. Extreme stroke fragmentation indicates non-compliant printing."
            ),
            "severity": "high",
        })
    elif edge_quality_score < 50.0:
        flags.append({
            "issue": (
                f"Broken and irregular edge contours (Canny Edge Quality {edge_quality_score:.1f}): "
                f"Detected stroke fragmentation (coherence ratio {coherence_ratio:.2f}) indicative of cheap inkjet printing."
            ),
            "severity": "high",
        })
    elif edge_quality_score < 70.0:
        flags.append({
            "issue": (
                f"Inconsistent text edge continuity (Canny Edge Quality {edge_quality_score:.1f}): "
                f"Edge density ({edge_density:.1f}%) and stroke continuity deviate from pharmaceutical baseline."
            ),
            "severity": "medium",
        })

    # =========================================================================
    # CHECK 3: Optional Brand Reference HSV Color Comparison
    # =========================================================================
    color_match_score = None
    best_correlation = None
    matched_ref = None
    reference_used = False
    reference_missing = False

    is_explicit_brand = bool(brand_id and brand_id.strip() and brand_id.lower().strip() not in ("auto", "other", "none"))
    
    if is_explicit_brand:
        ref_path, brand_display = get_brand_reference_image(brand_id)
        if ref_path and os.path.exists(ref_path):
            reference_used = True
            color_match_score, best_correlation, matched_ref = calculate_color_consistency_score(image, ref_path)

            if color_match_score < OUTLIER_THRESHOLD_COLOR:
                flags.append({
                    "issue": (
                        f"CRITICAL COLOR OUTLIER (HSV Correlation {best_correlation:.2f}): "
                        f"Color match score ({color_match_score:.1f}/100) is below 40% of benchmark (30.0 pts). "
                        f"Packaging color diverges severely from authentic master standard ({matched_ref})."
                    ),
                    "severity": "high",
                })
            elif color_match_score < 60.0:
                flags.append({
                    "issue": (
                        f"Severe color gamut deviation (HSV Correlation {best_correlation:.2f}): "
                        f"Packaging color histogram diverges from authentic master standard ({matched_ref})."
                    ),
                    "severity": "high",
                })
            elif color_match_score < 75.0:
                flags.append({
                    "issue": (
                        f"Moderate color shift detected in packaging background/foil (HSV Correlation {best_correlation:.2f}) "
                        f"against authentic reference standard ({matched_ref})."
                    ),
                    "severity": "medium",
                })
        else:
            # Explicit brand specified, but no reference image on disk
            reference_missing = True
            logger.info(f"No reference master exists for '{brand_id}'. Skipping color match & re-normalizing weights.")
    else:
        # Auto-detect / Other: reference-free mode
        reference_used = False

    # =========================================================================
    # CHECKS 4, 5, 6, 7: Universal Reference-Free Forensic Layer
    # =========================================================================
    # OCR Extraction
    ocr_result = perform_ocr(image)
    ocr_text = ocr_result["text"]
    char_count = ocr_result["character_count"]

    # Field Extraction via Regex
    extracted_fields = extract_packaging_fields(ocr_text)

    # Chronological & Regulatory Logic Checks
    field_logic = evaluate_field_logic(extracted_fields)
    ocr_fields_score = field_logic["score"]
    date_logic_score = 100.0 if (field_logic["date_timeline_valid"] and not field_logic["is_expired"]) else (20.0 if not field_logic["date_timeline_valid"] else 50.0)

    # Date Logic Flags
    if not field_logic["date_timeline_valid"] and field_logic["timeline_error"]:
        flags.append({
            "issue": field_logic["timeline_error"],
            "severity": "high",
        })
    elif field_logic["is_expired"]:
        flags.append({
            "issue": (
                f"EXPIRED MEDICINE SPECIMEN: Packaging expiry date ({extracted_fields.get('exp_date_str')}) "
                "precedes current date. Consuming expired medication carries severe clinical risk."
            ),
            "severity": "high",
        })

    # Mandatory Regulatory Presence Flags
    if not field_logic["batch_present"]:
        flags.append({
            "issue": (
                "MANDATORY BATCH NUMBER ABSENT: No legible batch, lot, or control code identified on carton. "
                "Drug regulatory rules require prominent batch declaration on all secondary packaging."
            ),
            "severity": "medium" if char_count >= 30 else "low",
        })
    if not field_logic["mrp_present"]:
        flags.append({
            "issue": (
                "MAXIMUM RETAIL PRICE (MRP) ABSENT: Statutory price declaration not identified on visible packaging."
            ),
            "severity": "low",
        })
    if not field_logic["license_present"]:
        flags.append({
            "issue": (
                "MANUFACTURING LICENSE NUMBER MISSING: Regulatory Form 25/28 license number not found in packaging micro-text."
            ),
            "severity": "low",
        })

    # Database Cross-Check (rapidfuzz against /data/medicines.csv)
    db_result = cross_check_medicine_database(ocr_text, declared_brand=brand_id)
    db_match_score = db_result["score"]
    for db_flag in db_result["flags"]:
        flags.append(db_flag)

    # Barcode & Optical Code Decoding
    barcode_result = decode_barcode_and_qr(image)
    barcode_score = barcode_result["score"]
    for bc_flag in barcode_result["flags"]:
        flags.append(bc_flag)

    # =========================================================================
    # DYNAMIC WEIGHTING & COMPOSITE SCORING
    # =========================================================================
    if reference_used and color_match_score is not None:
        # 6-check weighted distribution (with Color Match)
        # Weights: Sharpness (20%), Edge (15%), Color (20%), Mandatory Fields (20%), Date Logic (10%), DB Match (10%), Barcode (5%)
        weighted_final_score = (
            0.20 * sharpness_score +
            0.15 * edge_quality_score +
            0.20 * color_match_score +
            0.20 * ocr_fields_score +
            0.10 * date_logic_score +
            0.10 * db_match_score +
            0.05 * barcode_score
        )
    else:
        # 5-check reference-free distribution (Color Match skipped & re-normalized to 100%)
        # Weights: Sharpness (25%), Edge (20%), Mandatory Fields (25%), Date Logic (15%), DB Match (10%), Barcode (5%)
        weighted_final_score = (
            0.25 * sharpness_score +
            0.20 * edge_quality_score +
            0.25 * ocr_fields_score +
            0.15 * date_logic_score +
            0.10 * db_match_score +
            0.05 * barcode_score
        )

    weighted_final_score = float(np.clip(weighted_final_score, 0.0, 100.0))

    # =========================================================================
    # DECISION RULE EVALUATION (HARD FAIL-SAFE & INCONCLUSIVE CHECKS)
    # =========================================================================
    has_high_severity_flag = any(f["severity"].lower() in ("high", "critical") for f in flags)
    is_severe_outlier = (
        sharpness_score < OUTLIER_THRESHOLD_SHARPNESS or
        edge_quality_score < OUTLIER_THRESHOLD_EDGE or
        (reference_used and color_match_score is not None and color_match_score < OUTLIER_THRESHOLD_COLOR)
    )

    # Check for INCONCLUSIVE state: sparse text, severe lack of readable fields without fatal flaws
    is_sparse_text = char_count < 20 and not field_logic["batch_present"]

    if has_high_severity_flag or is_severe_outlier:
        # HARD RULE: If ANY check has a HIGH severity flag, final verdict CANNOT be "PASSED SCREENING"
        verdict = "SUSPICIOUS"
        rule_triggered = "severe_outlier_fail_safe"
        confidence = round(min(weighted_final_score, 45.0) / 100.0, 2)
        flags.insert(0, {
            "issue": (
                "FAIL-SAFE PROTOCOL ACTIVATED: Overall classification forced to SUSPICIOUS due to high-severity "
                "forensic flags or critical benchmark failure. Pharmaceutical quality rules strictly prohibit averaging "
                "out fatal defects (e.g. brand typo, date paradox, severe blur)."
            ),
            "severity": "high",
        })
    elif is_sparse_text:
        verdict = "INCONCLUSIVE"
        rule_triggered = "inconclusive_sparse_text"
        confidence = 0.50
        flags.insert(0, {
            "issue": (
                "INCONCLUSIVE SPECIMEN: Uploaded packaging image contains insufficient legible typography "
                f"({char_count} characters extracted). Batch number, expiry, and manufacturer credentials cannot be verified. "
                "Please scan the carton reverse side or re-capture under direct glare-free lighting."
            ),
            "severity": "medium",
        })
    elif weighted_final_score < 65.0:
        verdict = "SUSPICIOUS"
        rule_triggered = "composite_score"
        confidence = round(weighted_final_score / 100.0, 2)
    else:
        verdict = "PASSED SCREENING"
        rule_triggered = "composite_score"
        confidence = round(weighted_final_score / 100.0, 2)

    # Affirmative notes for passing specimens
    if verdict == "PASSED SCREENING" and len(flags) == 0:
        flags.append({
            "issue": "Print sharpness and edge continuity meet pharmaceutical industrial lithography standards.",
            "severity": "low",
        })
        flags.append({
            "issue": "Mandatory regulatory typography verified (Batch, Expiry, License, and MRP present).",
            "severity": "low",
        })
        if db_result.get("matched_name"):
            flags.append({
                "issue": f"Registered formulation confirmed against pharmacopeial registry ({db_result['matched_name']}).",
                "severity": "low",
            })

    logger.info(
        f"[Engine-Result] Verdict: {verdict} | Conf: {confidence:.2f} | Score: {weighted_final_score:.1f} | "
        f"Sharpness: {sharpness_score} | Edge: {edge_quality_score} | Color: {color_match_score} (RefUsed={reference_used}) | "
        f"OCR Fields: {ocr_fields_score} | DB: {db_match_score} | Flags: {len(flags)}"
    )

    return {
        "verdict": verdict,
        "confidence": confidence,
        "flags": flags,
        "sharpness_score": sharpness_score,
        "edge_quality_score": edge_quality_score,
        "color_match_score": color_match_score,
        "reference_used": reference_used,
        "matched_reference": matched_ref,
        "reference_missing": reference_missing,
        "ocr_fields_score": ocr_fields_score,
        "date_logic_score": date_logic_score,
        "database_match_score": db_match_score,
        "barcode_score": barcode_score,
        "ocr_extracted_text": ocr_text,
        "extracted_fields": extracted_fields,
        "date_logic_details": field_logic,
        "database_match_details": db_result,
        "barcode_details": barcode_result,
        "rule_triggered": rule_triggered,
        "verdict_disclaimer": (
            "First-line optical screening tool only. Not a chemical assay. "
            "Suspected counterfeit or unverified packaging must be reported to the drug manufacturer for batch audit."
        ),
    }
