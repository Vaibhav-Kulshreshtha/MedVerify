"""
MedVerify Automated Verification Test Suite
===========================================
Validates:
  1. API Health & Status endpoints
  2. CORS header restrictions
  3. Image file size validation (> 15MB -> 413)
  4. Real packaging OCR & Bounding Box extraction
  5. Calibrated print sharpness (Laplacian variance on blurred fake < 100 trips fail-safe)
  6. Edge continuity & Canny stroke coherence
  7. Mandatory regulatory field regex extraction (Batch, MFG, EXP, MRP, License)
  8. GS1 DataMatrix parsing & physical-to-digital cross-verification
  9. Brand reference database matching (rapidfuzz)
  10. End-to-end classification fail-safe protocols
"""

from datetime import date
from io import BytesIO
import json
import os
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import cv2
import numpy as np
import zxingcpp
from PIL import Image

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.cv_analyzer import (
    calculate_sharpness_score,
    calculate_edge_quality_score,
)
from app.reference_free_engine import (
    decode_barcode_and_qr,
    perform_ocr,
    extract_packaging_fields,
    evaluate_field_logic,
    parse_gs1_payload,
    cross_audit_physical_vs_digital,
)


class MedVerifyEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.demo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "demo_test_images"))
        cls.dolo_genuine_path = os.path.join(cls.demo_dir, "dolo650_genuine.png")
        cls.dolo_fake_path = os.path.join(cls.demo_dir, "dolo650_fake.png")

    def test_01_health_and_root_endpoints(self):
        """Validates /health and root status endpoints."""
        r_health = self.client.get("/health")
        self.assertEqual(r_health.status_code, 200)
        self.assertEqual(r_health.json()["status"], "healthy")

        r_root = self.client.get("/")
        self.assertEqual(r_root.status_code, 200)
        self.assertEqual(r_root.json()["service"], "MedVerify API")

    def test_02_brands_endpoint(self):
        """Validates /brands endpoint returns registered master pharmaceutical brands."""
        r_brands = self.client.get("/brands")
        self.assertEqual(r_brands.status_code, 200)
        brands = r_brands.json().get("brands", [])
        self.assertGreaterEqual(len(brands), 3)
        brand_ids = [b["id"] for b in brands]
        self.assertIn("dolo650", brand_ids)
        self.assertIn("crocin", brand_ids)

    def test_03_cors_headers(self):
        """Validates that CORS headers restrict methods and allowed origins."""
        response = self.client.options(
            "/analyze",
            headers={
                "Origin": "https://med-verify-gamma.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("access-control-allow-origin"),
            "https://med-verify-gamma.vercel.app",
        )
        self.assertIn("POST", response.headers.get("access-control-allow-methods", ""))

    def test_04_file_size_validation(self):
        """Validates that images exceeding 15MB are rejected with 413 Payload Too Large."""
        large_fake_bytes = b"0" * (16 * 1024 * 1024)
        response = self.client.post(
            "/analyze",
            files={"image": ("oversized.png", large_fake_bytes, "image/png")},
        )
        self.assertEqual(response.status_code, 413)

    def test_05_calibrated_sharpness_noise_inversion(self):
        """Validates that blurred/counterfeit printing trips critical outlier threshold."""
        img_fake = cv2.imread(self.dolo_fake_path)
        sharp_fake, var_fake = calculate_sharpness_score(img_fake)
        self.assertLess(var_fake, 100.0)
        self.assertLess(sharp_fake, 28.0)  # Below 40% benchmark outlier threshold (28.0)

        img_gen = cv2.imread(self.dolo_genuine_path)
        sharp_gen, var_gen = calculate_sharpness_score(img_gen)
        self.assertGreaterEqual(sharp_gen, 90.0)

    def test_06_edge_quality_coherence(self):
        """Validates edge density and stroke coherence analysis."""
        img_fake = cv2.imread(self.dolo_fake_path)
        score_fake, density_fake, _ = calculate_edge_quality_score(img_fake)
        self.assertLess(score_fake, 28.0)  # Counterfeit dither/blur

        img_gen = cv2.imread(self.dolo_genuine_path)
        score_gen, density_gen, _ = calculate_edge_quality_score(img_gen)
        self.assertGreaterEqual(score_gen, 90.0)

    def test_07_real_ocr_bounding_boxes(self):
        """Validates that pytesseract extracts true physical line bounding boxes."""
        img_gen = cv2.imread(self.dolo_genuine_path)
        ocr_res = perform_ocr(img_gen)
        self.assertGreater(ocr_res["character_count"], 100)
        self.assertGreater(len(ocr_res["line_boxes"]), 3)

        first_box = ocr_res["line_boxes"][0]
        self.assertIn("x", first_box)
        self.assertIn("y", first_box)
        self.assertIn("width", first_box)
        self.assertIn("height", first_box)
        self.assertGreater(first_box["width"], 0)

    def test_08_regex_batch_and_expiry_extraction(self):
        """Validates regex extracts true batch number and attaches line bounding coordinates."""
        img_gen = cv2.imread(self.dolo_genuine_path)
        ocr_res = perform_ocr(img_gen)
        fields = extract_packaging_fields(ocr_res["text"], line_boxes=ocr_res.get("line_boxes"))
        self.assertEqual(fields["batch_number"], "DL-650-9941B")
        self.assertIsNotNone(fields["batch_bbox"])
        self.assertEqual(fields["exp_date_str"], "10/2028")

    def test_09_gs1_parsing_and_cross_audit(self):
        """Validates GS1 DataMatrix string parsing and physical-to-digital cross-audit."""
        payload = "(01)08901148201015(17)281231(10)DL-650-9941B"
        gs1 = parse_gs1_payload(payload)
        self.assertEqual(gs1["gtin"], "08901148201015")
        self.assertEqual(gs1["batch_number"], "DL-650-9941B")
        self.assertEqual(gs1["expiry_date"], "2028-12-31")

        # Test matched cross-audit
        fields = {"batch_number": "DL-650-9941B", "exp_date_str": "12/2028"}
        audit_pass = cross_audit_physical_vs_digital(fields, gs1)
        self.assertEqual(audit_pass["status"], "VERIFIED_MATCH")
        self.assertTrue(audit_pass["batch_match"])

        self.assertTrue(audit_pass["expiry_match"])
        wrong_month = cross_audit_physical_vs_digital({**fields, "exp_date_str": "10/2028"}, gs1)
        self.assertEqual(wrong_month["status"], "CRITICAL_MISMATCH")
        self.assertFalse(wrong_month["expiry_match"])

        wrong_day = cross_audit_physical_vs_digital({**fields, "exp_date_str": "30/12/2028"}, gs1)
        self.assertEqual(wrong_day["status"], "CRITICAL_MISMATCH")
        self.assertFalse(wrong_day["expiry_match"])

        partial_batch = cross_audit_physical_vs_digital({**fields, "batch_number": "DL-650"}, gs1)
        self.assertEqual(partial_batch["status"], "CRITICAL_MISMATCH")
        self.assertFalse(partial_batch["batch_match"])

        # Test counterfeit tamper mismatch
        tampered_gs1 = {"gtin": "08901148201015", "batch_number": "COUNTERFEIT-BATCH-99", "is_valid_gs1": True}
        audit_fail = cross_audit_physical_vs_digital(fields, tampered_gs1)
        self.assertEqual(audit_fail["status"], "CRITICAL_MISMATCH")
        self.assertFalse(audit_fail["batch_match"])

    def test_scan_real_gs1_data_matrix(self):
        symbol = zxingcpp.create_barcode(
            "[01]09521101530001[17]281031[10]DEMO123", zxingcpp.BarcodeFormat.DataMatrix, gs1=True,
        )
        photo = cv2.cvtColor(np.asarray(symbol.to_image(scale=6)), cv2.COLOR_GRAY2BGR)
        decoded = decode_barcode_and_qr(photo)
        self.assertTrue(decoded["is_decoded"])
        self.assertEqual(decoded["primary_code"]["type"], "DATAMATRIX")
        self.assertGreater(decoded["primary_code"]["bbox"]["width"], 0)
        self.assertEqual(decoded["gs1_data"]["batch_number"], "DEMO123")
        self.assertEqual(decoded["gs1_data"]["expiry_date"], "2028-10-31")
        compared = cross_audit_physical_vs_digital(
            {"batch_number": "DEMO123", "exp_date_str": "10/2028"}, decoded["gs1_data"],
        )
        self.assertEqual(compared["status"], "VERIFIED_MATCH")

    def test_10_end_to_end_analyze_genuine_specimen(self):
        """Validates end-to-end API analysis on genuine packaging specimen."""
        with open(self.dolo_genuine_path, "rb") as f:
            img_bytes = f.read()

        response = self.client.post(
            "/analyze",
            files={"image": ("dolo650_genuine.png", img_bytes, "image/png")},
            data={"brand": "dolo650"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["verdict"], "PASSED SCREENING")
        self.assertGreaterEqual(data["confidence"], 0.85)
        self.assertGreater(len(data["overlays"]), 0)
        # This fixture contains human-readable GS1 text under decorative bars.
        self.assertEqual(data["cross_audit_details"]["status"], "PHYSICAL_ONLY")

    def test_same_month_printed_dates_retain_day_precision(self):
        timeline = evaluate_field_logic({"mfg_date_str": "01/04/2032", "exp_date_str": "19/04/2032"})
        self.assertTrue(timeline["date_timeline_valid"])
        reversed_dates = evaluate_field_logic({"mfg_date_str": "19/04/2032", "exp_date_str": "01/04/2032"})
        self.assertFalse(reversed_dates["date_timeline_valid"])

    def test_expiry_uses_smallest_printed_unit(self):
        with patch("app.reference_free_engine.datetime.date", wraps=date) as clock:
            clock.today.return_value = date(2032, 4, 15)
            self.assertTrue(evaluate_field_logic({"exp_date_str": "14/04/2032"})["is_expired"])
            self.assertFalse(evaluate_field_logic({"exp_date_str": "15/04/2032"})["is_expired"])
            self.assertFalse(evaluate_field_logic({"exp_date_str": "04/2032"})["is_expired"])

    def test_common_labels_preserve_printed_values(self):
        fields = extract_packaging_fields(
            "Batch No. AB-1234\nLicense No. XX-1234\nMfg: 20/02/26\nExpiry: 21-OCT-2028"
        )
        self.assertEqual(fields["batch_number"], "AB-1234")
        self.assertEqual(fields["license_number"], "XX-1234")
        self.assertEqual(fields["mfg_date_str"], "20/02/26")
        self.assertEqual(fields["exp_date_str"], "21-OCT-2028")
        self.assertTrue(evaluate_field_logic(fields)["date_order_confirmed"])

    def test_image_limits_and_unreadable_package(self):
        buffer = BytesIO()
        Image.new("RGB", (40, 40)).save(buffer, format="PNG")
        files = {"image": ("blank.png", buffer.getvalue(), "image/png")}
        with patch("app.cv_analyzer.MAX_IMAGE_PIXELS", 1000):
            self.assertEqual(self.client.post("/analyze", files=files).status_code, 400)
        report = self.client.post("/analyze", files=files, data={"brand": "dolo650"}).json()
        self.assertEqual(report["verdict"], "INCONCLUSIVE")
        self.assertIsNone(report["database_match_details"]["matched_name"])
        self.assertLess(report["date_logic_score"], 100)

    def test_report_requires_a_decodable_image_even_with_mock_query(self):
        response = self.client.post(
            "/analyze?mock_verdict=passed",
            files={"image": ("photo.png", b"missing image data", "image/png")},
        )
        self.assertEqual(response.status_code, 400)

    def test_reference_registration_requires_a_token_and_a_valid_image(self):
        sample = Path(self.dolo_genuine_path).read_bytes()

        def register(image=sample, token=None):
            return self.client.post(
                "/add-reference",
                files={"image": ("sample.png", image, "image/png")},
                data={"brand_id": "sample-brand", "brand_name": "Sample Brand"},
                headers={"Authorization": f"Bearer {token}"} if token else {},
            )

        with TemporaryDirectory() as directory, patch("app.cv_analyzer.REFERENCE_DIRS", [directory]):
            catalog = Path(directory, "brands.json")
            catalog.write_text('{"brands": []}', encoding="utf-8")
            with patch.dict(os.environ, MEDVERIFY_REFERENCE_TOKEN=""):
                self.assertEqual(register().status_code, 403)
            with patch.dict(os.environ, MEDVERIFY_REFERENCE_TOKEN="unit-test-reference-token"):
                self.assertEqual(register(token="wrong").status_code, 403)
                self.assertEqual(register(b"invalid image", token="unit-test-reference-token").status_code, 400)
                self.assertEqual(json.loads(catalog.read_text())["brands"], [])
                saved = register(token="unit-test-reference-token")
                self.assertEqual(saved.status_code, 200, saved.text)
                self.assertTrue(saved.json()["success"])
                self.assertTrue(Path(directory, saved.json()["saved_path"]).is_file())
                self.assertEqual([b["id"] for b in json.loads(catalog.read_text())["brands"]], ["sample-brand"])

    def test_11_end_to_end_analyze_counterfeit_specimen(self):
        """Validates end-to-end API analysis on counterfeit packaging specimen."""
        with open(self.dolo_fake_path, "rb") as f:
            img_bytes = f.read()

        response = self.client.post(
            "/analyze",
            files={"image": ("dolo650_fake.png", img_bytes, "image/png")},
            data={"brand": "dolo650"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["verdict"], "SUSPICIOUS")
        self.assertEqual(data["rule_triggered"], "severe_outlier_fail_safe")
        self.assertLess(data["confidence"], 0.50)
        self.assertGreater(len(data["flags"]), 0)


if __name__ == "__main__":
    unittest.main()
