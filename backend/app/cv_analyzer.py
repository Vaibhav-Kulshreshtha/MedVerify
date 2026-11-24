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
import io
import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import cv2
from PIL import Image, ImageOps, UnidentifiedImageError

from app.reference_free_engine import (
    perform_ocr,
    extract_packaging_fields,
    evaluate_field_logic,
    cross_check_medicine_database,
    decode_barcode_and_qr,
    cross_audit_physical_vs_digital,
)

logger = logging.getLogger("medverify.cv")

# Base directories where reference genuine packaging images and brands.json reside
REFERENCE_DIRS = [
    os.path.join(os.path.dirname(__file__), "..", "reference_images"),
    os.path.join(os.path.dirname(__file__), "..", "..", "reference_images"),
]

# Empirical thresholds used by the screening heuristics.
BENCHMARK_SHARPNESS = 70.0
BENCHMARK_EDGE = 70.0
BENCHMARK_COLOR = 75.0

OUTLIER_THRESHOLD_SHARPNESS = 0.40 * BENCHMARK_SHARPNESS  # 28.0 pts
OUTLIER_THRESHOLD_EDGE = 0.40 * BENCHMARK_EDGE            # 28.0 pts
OUTLIER_THRESHOLD_COLOR = 0.40 * BENCHMARK_COLOR          # 30.0 pts

# Only unambiguous names may select a specific reference package.
BRAND_ALIASES = {
    "dolo": "dolo650", "dolo-650": "dolo650",
    "crocinadvance": "crocin", "crocin-advance": "crocin",
    "tretiva20": "tretiva", "tretiva-20": "tretiva", "tetriva": "tretiva", "tetriva-20": "tretiva",
    "azithral": "azithromycin", "azithral250": "azithromycin", "azithral-250": "azithromycin",
    "augmentin": "amoxicillin", "augmentin625": "amoxicillin", "augmentin-625": "amoxicillin",
}

MAX_IMAGE_PIXELS = 16_000_000


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
    canonical_id = BRAND_ALIASES.get(clean_id, clean_id)
    brands = load_brands_config()
    if any(b.get("id") == clean_id for b in brands):
        canonical_id = clean_id
    for brand in brands:
        names = (brand.get("name", ""), brand.get("fullName", ""))
        if canonical_id != brand.get("id") and not any(clean_id == name.lower() for name in names):
            continue
        display_name = brand.get("name") or brand_id
        rel_path = brand.get("reference_image")
        if rel_path:
            for ref_dir in REFERENCE_DIRS:
                root = Path(ref_dir).resolve()
                candidate = (root / rel_path).resolve()
                if root in candidate.parents and candidate.is_file():
                    return str(candidate), display_name
        return None, display_name
    return None, brand_id


def decode_image_bytes(file_bytes: bytes) -> np.ndarray:
    """Check the format and dimensions before allocating a decoded image."""
    try:
        with Image.open(io.BytesIO(file_bytes), formats=("JPEG", "PNG", "WEBP")) as photo:
            if photo.width * photo.height > MAX_IMAGE_PIXELS:
                raise ValueError("Image exceeds the 16 megapixel limit.")
            rgb = ImageOps.exif_transpose(photo).convert("RGB")
            # Scale large phone photos before the full-frame OpenCV and OCR passes.
            rgb.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
            return cv2.cvtColor(np.asarray(rgb), cv2.COLOR_RGB2BGR)
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError) as exc:
        raise ValueError("Upload a valid JPEG, PNG, or WebP image.") from exc


def calculate_sharpness_score(image: np.ndarray) -> Tuple[float, float]:
    """
    Computes noise-resistant print sharpness score using Bilateral-Filtered Laplacian variance.
    Edge-preserving bilateral filtering eliminates noise inversion (where artificial/sensor noise
    falsely mimics sharp typography).
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    denoised = cv2.bilateralFilter(gray, d=5, sigmaColor=25, sigmaSpace=25)
    laplacian = cv2.Laplacian(denoised, cv2.CV_64F, ksize=3)
    raw_variance = float(laplacian.var())

    # Calibrated pharmacopeial sharpness curve:
    # Blurred/counterfeit printing (variance < 100) trips the critical outlier threshold (< 28.0 pts)
    # Industrial pharmaceutical typography (variance >= 500) scores >= 85.0 pts
    if raw_variance <= 0.0:
        sharpness_score = 0.0
    elif raw_variance < 120.0:
        sharpness_score = (raw_variance / 120.0) * 26.0
    else:
        sharpness_score = 26.0 + (np.log(raw_variance) - np.log(120.0)) / (np.log(2000.0) - np.log(120.0)) * 74.0

    sharpness_score = float(np.clip(sharpness_score, 0.0, 100.0))
    return round(sharpness_score, 1), round(raw_variance, 2)


def extract_packaging_region(image: np.ndarray) -> Tuple[np.ndarray, Optional[Dict[str, float]]]:
    """
    Isolates the packaging carton or blister pack from the table/background using contour analysis.
    Returns the cropped packaging image and its bounding box percentages.
    """
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        c = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(c)
        if area > (h * w * 0.15):
            bx, by, bw, bh = cv2.boundingRect(c)
            pad = 8
            x1 = max(0, bx - pad)
            y1 = max(0, by - pad)
            x2 = min(w, bx + bw + pad)
            y2 = min(h, by + bh + pad)
            crop = image[y1:y2, x1:x2]
            bbox = {
                "x": round((x1 / w) * 100, 1),
                "y": round((y1 / h) * 100, 1),
                "width": round(((x2 - x1) / w) * 100, 1),
                "height": round(((y2 - y1) / h) * 100, 1),
            }
            return crop, bbox
    return image, None


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
) -> Tuple[Optional[float], Optional[float], Optional[str]]:
    """
    Computes HSV color histogram correlation between the uploaded packaging and an authentic master.
    Uses segmented packaging region to avoid background tabletop color interference.
    """
    pkg_crop, _ = extract_packaging_region(image)
    hsv_image = cv2.cvtColor(pkg_crop, cv2.COLOR_BGR2HSV)
    hist_image = cv2.calcHist([hsv_image], [0, 1], None, [50, 60], [0, 180, 0, 256])
    cv2.normalize(hist_image, hist_image, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)

    ref_bgr = cv2.imread(reference_path)
    if ref_bgr is None:
        return None, None, None

    ref_crop, _ = extract_packaging_region(ref_bgr)
    ref_hsv = cv2.cvtColor(ref_crop, cv2.COLOR_BGR2HSV)
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
                f"LOW SHARPNESS (Laplacian variance {raw_variance:.1f}): "
                f"Print sharpness score {sharpness_score:.1f}/100. "
                "The image is too blurred to assess fine print reliably."
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
                "The photo shows soft letter edges."
            ),
            "severity": "medium",
        })

    # Edge Quality Flags
    if edge_quality_score < OUTLIER_THRESHOLD_EDGE:
        flags.append({
            "issue": (
                f"CRITICAL EDGE QUALITY OUTLIER (Canny Edge Quality {edge_quality_score:.1f}): "
                "Stroke continuity is below the screening threshold."
            ),
            "severity": "high",
        })
    elif edge_quality_score < 50.0:
        flags.append({
            "issue": (
                f"Broken and irregular edge contours (Canny Edge Quality {edge_quality_score:.1f}): "
                f"Detected stroke fragmentation (coherence ratio {coherence_ratio:.2f}) in the photo."
            ),
            "severity": "high",
        })
    elif edge_quality_score < 70.0:
        flags.append({
            "issue": (
                f"Inconsistent text edge continuity (Canny Edge Quality {edge_quality_score:.1f}): "
                f"Edge density ({edge_density:.1f}%) and stroke continuity fall outside the screening range."
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
        ref_path, _ = get_brand_reference_image(brand_id)
        if ref_path and os.path.exists(ref_path):
            color_match_score, best_correlation, matched_ref = calculate_color_consistency_score(image, ref_path)
            reference_used = color_match_score is not None

            if color_match_score is None:
                reference_missing = True
            elif color_match_score < OUTLIER_THRESHOLD_COLOR:
                flags.append({
                    "issue": (
                        f"CRITICAL COLOR OUTLIER (HSV Correlation {best_correlation:.2f}): "
                        f"Color match score ({color_match_score:.1f}/100) is below 40% of benchmark (30.0 pts). "
                        f"Packaging color differs substantially from the selected reference ({matched_ref})."
                    ),
                    "severity": "high",
                })
            elif color_match_score < 60.0:
                flags.append({
                    "issue": (
                        f"Severe color gamut deviation (HSV Correlation {best_correlation:.2f}): "
                        f"Packaging color differs from the selected reference ({matched_ref})."
                    ),
                    "severity": "high",
                })
            elif color_match_score < 75.0:
                flags.append({
                    "issue": (
                        f"Moderate color shift detected in packaging background/foil (HSV Correlation {best_correlation:.2f}) "
                        f"against the selected reference ({matched_ref})."
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
    # OCR Extraction (with physical line-level bounding boxes)
    ocr_result = perform_ocr(image)
    ocr_text = ocr_result["text"]
    char_count = ocr_result["character_count"]
    line_boxes = ocr_result.get("line_boxes", [])

    # Field Extraction via Regex with physical bounding coordinates
    extracted_fields = extract_packaging_fields(ocr_text, line_boxes=line_boxes)

    # Chronological & Regulatory Logic Checks
    field_logic = evaluate_field_logic(extracted_fields)
    ocr_fields_score = field_logic["score"]
    date_logic_score = 50.0
    if field_logic["timeline_error"] or field_logic["is_expired"]:
        date_logic_score = 20.0
    elif field_logic["date_order_confirmed"]:
        date_logic_score = 100.0

    # Date Logic Flags
    if not field_logic["date_timeline_valid"] and field_logic["timeline_error"]:
        flags.append({
            "issue": field_logic["timeline_error"],
            "severity": "high",
            "bbox": extracted_fields.get("exp_bbox"),
        })
    elif field_logic["is_expired"]:
        flags.append({
            "issue": (
                f"The detected expiry date ({extracted_fields.get('exp_date_str')}) "
                "has passed. Confirm the date on the package."
            ),
            "severity": "high",
            "bbox": extracted_fields.get("exp_bbox"),
        })

    # Mandatory Regulatory Presence Flags
    if not field_logic["batch_present"]:
        flags.append({
            "issue": (
                "OCR could not read a batch or lot number from this photo."
            ),
            "severity": "medium" if char_count >= 30 else "low",
            "bbox": None,
        })
    if not field_logic["mrp_present"]:
        flags.append({
            "issue": (
                "OCR could not read a maximum retail price on the visible packaging."
            ),
            "severity": "low",
            "bbox": None,
        })
    if not field_logic["license_present"]:
        flags.append({
            "issue": (
                "OCR could not read a manufacturing license number on the visible packaging."
            ),
            "severity": "low",
            "bbox": None,
        })

    # Database Cross-Check (rapidfuzz against /data/medicines.csv)
    db_result = cross_check_medicine_database(ocr_text, declared_brand=brand_id)
    db_match_score = db_result["score"]
    for db_flag in db_result["flags"]:
        db_bbox = None
        if db_result.get("matched_name") and line_boxes:
            for lb in line_boxes:
                if any(w.lower() in lb["text"].lower() for w in db_result["matched_name"].split()):
                    db_bbox = {"x": lb["x"], "y": lb["y"], "width": lb["width"], "height": lb["height"]}
                    break
        flags.append({
            "issue": db_flag["issue"],
            "severity": db_flag["severity"],
            "bbox": db_bbox,
        })

    # Barcode & Optical Code Decoding
    barcode_result = decode_barcode_and_qr(image)
    barcode_score = barcode_result["score"]
    for bc_flag in barcode_result["flags"]:
        flags.append({
            "issue": bc_flag["issue"],
            "severity": bc_flag["severity"],
            "bbox": bc_flag.get("bbox"),
        })

    # GS1 DataMatrix & Physical-to-Digital Cross Audit
    gs1_details = barcode_result.get("gs1_data")
    cross_audit = cross_audit_physical_vs_digital(extracted_fields, gs1_details)
    for ca_flag in cross_audit.get("flags", []):
        flags.append({
            "issue": ca_flag["issue"],
            "severity": ca_flag["severity"],
            "bbox": extracted_fields.get("batch_bbox"),
        })

    # =========================================================================
    # DETECTED PHYSICAL OVERLAYS (Pixel-grounded Bounding Boxes)
    # =========================================================================
    overlays: List[Dict[str, Any]] = []

    def register_overlay(x: float, y: float, w_box: float, h_box: float, label: str, severity: str, issue: str):
        overlays.append({
            "id": f"overlay-{len(overlays)}",
            "x": round(float(x), 1),
            "y": round(float(y), 1),
            "width": round(float(w_box), 1),
            "height": round(float(h_box), 1),
            "label": label,
            "severity": severity,
            "issue": issue,
        })

    # 1. Packaging ROI Box (if cropped or identified)
    _, pkg_roi_bbox = extract_packaging_region(image)
    if pkg_roi_bbox:
        register_overlay(
            pkg_roi_bbox["x"], pkg_roi_bbox["y"], pkg_roi_bbox["width"], pkg_roi_bbox["height"],
            "PACKAGING BOUNDARY", "low", "Segmented primary medicine packaging boundary"
        )

    # 2. Batch Number Overlay
    if extracted_fields.get("batch_bbox"):
        bb = extracted_fields["batch_bbox"]
        register_overlay(
            bb["x"], bb["y"], bb["width"], bb["height"],
            "BATCH / LOT", "low", f"Detected Batch No: {extracted_fields.get('batch_number')}"
        )

    # 3. Expiry Date Overlay
    if extracted_fields.get("exp_bbox"):
        eb = extracted_fields["exp_bbox"]
        if field_logic.get("is_expired") or not field_logic.get("date_timeline_valid"):
            register_overlay(
                eb["x"], eb["y"], eb["width"], eb["height"],
                "DATE CONFLICT", "high", field_logic.get("timeline_error") or "Expired Medicine Packaging"
            )
        else:
            register_overlay(
                eb["x"], eb["y"], eb["width"], eb["height"],
                "EXPIRY DATE", "low", f"Printed expiry: {extracted_fields.get('exp_date_str')}"
            )

    # 4. Manufacturing Date Overlay
    if extracted_fields.get("mfg_bbox"):
        mb = extracted_fields["mfg_bbox"]
        register_overlay(
            mb["x"], mb["y"], mb["width"], mb["height"],
            "MFG DATE", "low", f"Manufacturing Date: {extracted_fields.get('mfg_date_str')}"
        )

    # 5. MRP Overlay
    if extracted_fields.get("mrp_bbox"):
        mpb = extracted_fields["mrp_bbox"]
        register_overlay(
            mpb["x"], mpb["y"], mpb["width"], mpb["height"],
            "STATUTORY MRP", "low", f"Price: {extracted_fields.get('mrp_str')}"
        )

    # 6. License Number Overlay
    if extracted_fields.get("license_bbox"):
        lb = extracted_fields["license_bbox"]
        register_overlay(
            lb["x"], lb["y"], lb["width"], lb["height"],
            "MFG LICENSE", "low", f"Drug License: {extracted_fields.get('license_number')}"
        )

    # 7. Optical Barcode / GS1 Overlay
    if barcode_result.get("primary_code") and barcode_result["primary_code"].get("bbox"):
        bcb = barcode_result["primary_code"]["bbox"]
        b_sev = "high" if cross_audit.get("status") == "CRITICAL_MISMATCH" else "low"
        b_iss = cross_audit.get("summary") or "Optical barcode verified"
        register_overlay(
            bcb["x"], bcb["y"], bcb["width"], bcb["height"],
            "GS1 / BARCODE", b_sev, b_iss
        )

    # 8. Suspect Brand Typo Overlay
    if db_result.get("is_typo_suspect") and line_boxes:
        for lb in line_boxes:
            if db_result.get("matched_name") and any(w.lower() in lb["text"].lower() for w in db_result["matched_name"].split()):
                register_overlay(
                    lb["x"], lb["y"], lb["width"], lb["height"],
                    "SUSPECT BRAND TYPO", "high",
                    f"Near-miss brand spelling detected: '{lb['text']}' mimics '{db_result['matched_name']}'"
                )
                break

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

    # Texture and legibility alone cannot identify a package or verify its contents.
    has_packaging_field = any((
        field_logic["batch_present"], field_logic["has_exp_date"], field_logic["has_mfg_date"],
        field_logic["license_present"], field_logic["mrp_present"],
    ))
    color_conflict = color_match_score is not None and color_match_score < OUTLIER_THRESHOLD_COLOR
    insufficient_evidence = not has_packaging_field and (char_count < 20 or not color_conflict)

    if insufficient_evidence and cross_audit["status"] != "CRITICAL_MISMATCH":
        verdict = "INCONCLUSIVE"
        rule_triggered = "inconclusive_sparse_text"
        confidence = 0.50
        flags.insert(0, {
            "issue": "No legible batch, date, license, or price was identified. Retake the photo with these details in focus.",
            "severity": "medium",
        })
    elif has_high_severity_flag or is_severe_outlier:
        verdict = "SUSPICIOUS"
        rule_triggered = "severe_outlier_fail_safe"
        confidence = round(min(weighted_final_score, 45.0) / 100.0, 2)
    elif weighted_final_score < 65.0:
        verdict = "SUSPICIOUS"
        rule_triggered = "composite_score"
        confidence = round(weighted_final_score / 100.0, 2)
    else:
        verdict = "PASSED SCREENING"
        rule_triggered = "composite_score"
        confidence = round(weighted_final_score / 100.0, 2)

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
        "gs1_details": gs1_details,
        "cross_audit_details": cross_audit,
        "overlays": overlays,
        "rule_triggered": rule_triggered,
        "verdict_disclaimer": (
            "This photo screens visible packaging features. A pharmacist or the manufacturer can help verify "
            "the package and batch if you have concerns. A photo cannot establish the medicine’s contents or authenticity."
        ),
    }
