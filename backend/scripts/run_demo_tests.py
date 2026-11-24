"""
MedVerify Demo Test Suite & Judge Presentation Script
======================================================
Compares the screening verdict for each synthetic demo image with its fixture label.

Outputs a comprehensive laboratory audit ledger showing:
  - Print Sharpness Score (Laplacian variance)
  - Color Match Score (HSV histogram correlation against brand reference)
  - Edge Quality Score (Canny edge density & stroke coherence)
  - Weighted Confidence & Final Verdict
"""

import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.cv_analyzer import analyze_packaging_image, load_brands_config


def run_tests():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    demo_dir = os.path.join(base_dir, "demo_test_images")

    brands = load_brands_config()
    print("=" * 80)
    print("MEDVERIFY // COMPUTER VISION DIAGNOSTIC TEST REPORT")
    print(f"Loaded {len(brands)} Registered Medicine Brands: {[b['id'] for b in brands]}")
    print("=" * 80)

    # Registered aliases and user-added brands can lack demo fixtures.
    fixture_ids = ("dolo650", "crocin", "combiflam", "tretiva", "azithromycin", "amoxicillin")
    catalog = {brand["id"]: brand for brand in brands}
    mismatches = []
    total = 0
    for brand_id in fixture_ids:
        if brand_id not in catalog:
            mismatches.append(f"{brand_id}: missing brand metadata")
            continue
        brand = catalog[brand_id]
        brand_name = brand["fullName"]

        print(f"\n" + "-" * 80)
        print(f"BRAND UNDER TEST: {brand_name.upper()} (ID: {brand_id})")
        print(f"Reference Master: {brand['reference_image']}")
        print("-" * 80)

        for case_type in ("genuine", "fake"):
            sample_file = os.path.join(demo_dir, f"{brand_id}_{case_type}.png")
            if not os.path.exists(sample_file):
                mismatches.append(f"{brand_id}: missing {case_type} sample")
                continue

            with open(sample_file, "rb") as f:
                img_bytes = f.read()

            result = analyze_packaging_image(
                file_bytes=img_bytes,
                filename=os.path.basename(sample_file),
                brand_id=brand_id,
            )

            total += 1
            expected = "PASSED SCREENING" if case_type == "genuine" else "SUSPICIOUS"
            if brand_id == "tretiva" and case_type == "genuine":
                # The synthetic Sun Pharma design differs from the registered Intas carton.
                # Check that a sharp image passes on its own and raises a color flag against this reference.
                baseline = analyze_packaging_image(img_bytes, os.path.basename(sample_file), brand_id=None)
                print(f"  Clean Tretiva without reference: {baseline['verdict']}")
                if baseline["verdict"] != "PASSED SCREENING" or baseline["reference_used"]:
                    mismatches.append("Clean Tretiva failed its reference-free screening check")
                if not result["reference_used"] or not any("COLOR OUTLIER" in flag["issue"] for flag in result["flags"]):
                    mismatches.append("Clean Tretiva failed to flag the differing registered design")
                expected = "SUSPICIOUS"
            if result["verdict"] != expected:
                mismatches.append(f"{Path(sample_file).name}: expected {expected}, got {result['verdict']}")
            print(f"\n  SPECIMEN: {brand_id.upper()} - {case_type.upper()} ({os.path.basename(sample_file)})")
            print(f"  VERDICT             : {result['verdict']}")
            print(f"  RULE TRIGGERED      : {result.get('rule_triggered', 'composite_score')}")
            print(f"  CONFIDENCE          : {int(result['confidence'] * 100)}% ({result['confidence']:.2f})")
            print(f"  1. Sharpness Score  : {result['sharpness_score']:.1f} / 100")
            print(f"  2. Edge Quality     : {result['edge_quality_score']:.1f} / 100")
            color_str = f"{result['color_match_score']:.1f} / 100" if result.get('color_match_score') is not None else "N/A (Reference-Free)"
            print(f"  3. Color Match Score: {color_str}")
            print(f"  4. Regulatory Fields: {result.get('ocr_fields_score', 0.0):.1f} / 100 (Batch: {result['extracted_fields'].get('batch_number')})")
            print(f"  5. Date Logic Score : {result.get('date_logic_score', 0.0):.1f} / 100 (Exp: {result['extracted_fields'].get('exp_date_str')})")
            print(f"  6. Database Match   : {result.get('database_match_score', 0.0):.1f} / 100 (Registered: {result['database_match_details'].get('matched_name')})")
            print(f"  7. Optical Barcode  : {result.get('barcode_score', 0.0):.1f} / 100 (Cross-Audit: {result.get('cross_audit_details', {}).get('status')})")
            print(f"  Physical Overlays   : {len(result.get('overlays', []))} detected bounding boxes")
            print(f"  Diagnostic Flags ({len(result['flags'])}):")
            for flag in result["flags"][:4]:
                print(f"    - [{flag['severity'].upper()}] {flag['issue']}")

    print("\n" + "=" * 80)
    print(f"Screened {total} demo images.")
    for failure in mismatches:
        print(f"  - {failure}")
    if not total or mismatches:
        return 1
    print("All demo screening checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(run_tests())
