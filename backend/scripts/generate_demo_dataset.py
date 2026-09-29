"""
MedVerify Reference Dataset & Demo Test Case Generator
======================================================
This script generates authentic reference packaging images for:
  1. Dolo 650 (Micro Labs Ltd)
  2. Crocin Advance (GSK)
  3. Combiflam (Sanofi India)

It also creates corresponding degraded/counterfeit test cases by applying:
  - Strong Gaussian blur (suppresses high-frequency Laplacian gradients -> low sharpness)
  - Color desaturation & hue shifting in HSV (drastically degrades histogram correlation)
  - High-frequency halftone speckle noise (breaks Canny edge continuity)

Outputs are organized in:
  - backend/reference_images/{brand}/genuine.png
  - reference_images/{brand}/genuine.png
  - backend/demo_test_images/{brand}_genuine.png & {brand}_fake.png
  - frontend/public/demo_samples/{brand}_genuine.png & {brand}_fake.png
"""

import os
import shutil
import cv2
import numpy as np


def draw_genuine_packaging(
    brand_name: str,
    subtitle: str,
    mfg_name: str,
    batch_lot: str,
    expiry: str,
    gtin_code: str,
    primary_bgr: tuple,
    secondary_bgr: tuple,
    accent_bgr: tuple = (255, 255, 255),
) -> np.ndarray:
    """Renders a high-resolution, crisp pharmaceutical carton with official details."""
    w, h = 860, 540
    # Clean warm clinical cardstock background
    img = np.ones((h, w, 3), dtype=np.uint8) * 248

    # Outer packaging border (double hairline)
    cv2.rectangle(img, (18, 18), (w - 18, h - 18), primary_bgr, 3)
    cv2.rectangle(img, (24, 24), (w - 24, h - 24), secondary_bgr, 1)

    # Top Brand Header Banner
    cv2.rectangle(img, (24, 24), (w - 24, 130), primary_bgr, -1)

    # Rx Symbol
    cv2.putText(img, "Rx", (45, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2, cv2.LINE_AA)

    # Main Brand Name in bold crisp lettering
    cv2.putText(img, brand_name, (95, 78), cv2.FONT_HERSHEY_SIMPLEX, 1.35, (255, 255, 255), 3, cv2.LINE_AA)

    # Subtitle / Generic formulation
    cv2.putText(img, subtitle, (95, 112), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (240, 245, 250), 1, cv2.LINE_AA)

    # Accent divider ribbon
    cv2.rectangle(img, (24, 130), (w - 24, 146), secondary_bgr, -1)

    # Schedule H Drug Warning Box (mandatory Indian pharma standard)
    cv2.rectangle(img, (45, 162), (w - 45, 205), (30, 30, 190), 1)
    cv2.rectangle(img, (45, 162), (75, 205), (30, 30, 190), -1)
    cv2.putText(img, "!", (55, 192), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(img, "SCHEDULE H PRESCRIPTION DRUG - CAUTION: Not to be sold by retail without prescription.", (85, 188), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (20, 20, 140), 1, cv2.LINE_AA)

    # Packaging Specifications
    cv2.putText(img, f"MANUFACTURED BY: {mfg_name}", (45, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (15, 42, 63), 2, cv2.LINE_AA)
    cv2.putText(img, f"BATCH LOT NO   : {batch_lot}", (45, 275), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (15, 42, 63), 2, cv2.LINE_AA)
    cv2.putText(img, f"EXPIRY DATE    : {expiry} | MFG: 02/2026 | MRP: Rs. 34.50 (INCL. TAXES)", (45, 310), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (50, 70, 90), 1, cv2.LINE_AA)
    cv2.putText(img, "DOSAGE & STORAGE: As directed by physician. Store protected from moisture at < 30C.", (45, 345), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (60, 80, 100), 1, cv2.LINE_AA)

    # Precision Barcode & GS1 DataMatrix area
    for x in range(45, 480, 4):
        thickness = 2 if (x % 3 == 0) else 1
        cv2.line(img, (x, 385), (x, 470), (15, 25, 35), thickness)
    cv2.putText(img, f"(01){gtin_code}(17)281231(10){batch_lot}", (45, 498), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (15, 42, 63), 1, cv2.LINE_AA)

    # Holographic Tamper Evident Seal Badge on the right
    seal_x, seal_y, seal_w, seal_h = w - 290, 370, 245, 130
    cv2.rectangle(img, (seal_x, seal_y), (seal_x + seal_w, seal_y + seal_h), secondary_bgr, 2)
    cv2.rectangle(img, (seal_x + 4, seal_y + 4), (seal_x + seal_w - 4, seal_y + seal_h - 4), (240, 248, 242), -1)

    cv2.putText(img, "[ GENUINE SECURITY SEAL ]", (seal_x + 18, seal_y + 35), cv2.FONT_HERSHEY_SIMPLEX, 0.5, primary_bgr, 2, cv2.LINE_AA)
    cv2.putText(img, "ORIGINAL PHARMA LABS", (seal_x + 25, seal_y + 68), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (45, 65, 85), 1, cv2.LINE_AA)
    cv2.putText(img, "ISO-17025 VERIFIED PACK", (seal_x + 25, seal_y + 98), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (60, 80, 100), 1, cv2.LINE_AA)

    # Fine optical registration crosshairs
    cv2.drawMarker(img, (32, 32), primary_bgr, cv2.MARKER_CROSS, 14, 1)
    cv2.drawMarker(img, (w - 32, 32), primary_bgr, cv2.MARKER_CROSS, 14, 1)
    cv2.drawMarker(img, (32, h - 32), primary_bgr, cv2.MARKER_CROSS, 14, 1)
    cv2.drawMarker(img, (w - 32, h - 32), primary_bgr, cv2.MARKER_CROSS, 14, 1)

    return img


def create_counterfeit_version(genuine_img: np.ndarray) -> np.ndarray:
    """
    Transforms an authentic image into an engineered 'counterfeit/suspicious' specimen:
      1. Blurs image (simulates low-res scan & cheap inkjet head)
      2. Desaturates & shifts colors in HSV (simulates non-standard CMYK toner)
      3. Injects high-frequency speckle dither noise (breaks Canny edge continuity)
    """
    fake = genuine_img.copy()

    # Step 1: Heavy Gaussian blur -> suppresses Laplacian variance
    fake = cv2.GaussianBlur(fake, (23, 23), 8.5)

    # Step 2: Color degradation in HSV
    hsv = cv2.cvtColor(fake, cv2.COLOR_BGR2HSV).astype(np.float32)
    # Desaturate by 60% (faded, cheap paper print)
    hsv[:, :, 1] = hsv[:, :, 1] * 0.40
    # Hue shift by +28 units (severe color gamut divergence)
    hsv[:, :, 0] = (hsv[:, :, 0] + 28.0) % 180.0
    # Slightly dim value/contrast
    hsv[:, :, 2] = np.clip(hsv[:, :, 2] * 0.90, 0, 255)
    fake = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

    # Step 3: Add digital dithering noise (simulates cheap dot-matrix printing)
    noise = np.random.normal(0, 18, fake.shape).astype(np.float32)
    fake = np.clip(fake.astype(np.float32) + noise, 0, 255).astype(np.uint8)

    # Step 4: Secondary micro-blur to soften speckle edges (ink bleed on absorbent paper)
    fake = cv2.GaussianBlur(fake, (3, 3), 0.8)

    return fake


def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    root_dir = os.path.abspath(os.path.join(base_dir, ".."))

    # Specifications for 3 major brands
    brands = [
        {
            "id": "dolo650",
            "name": "DOLO-650",
            "subtitle": "Paracetamol Tablets IP 650 mg",
            "mfg": "Micro Labs Limited, Bengaluru",
            "lot": "DL-650-9941B",
            "exp": "10/2028",
            "gtin": "08901148201015",
            # Dolo trademark green and amber yellow (BGR)
            "primary": (21, 128, 21),       # #15803D Forest Green
            "secondary": (8, 179, 234),     # #EAB308 Amber
        },
        {
            "id": "crocin",
            "name": "CROCIN ADVANCE",
            "subtitle": "Fast Relief Paracetamol 500 mg with Optizorb Technology",
            "mfg": "GlaxoSmithKline Consumer Healthcare",
            "lot": "CR-ADV-4418A",
            "exp": "12/2028",
            "gtin": "08901030381014",
            # GSK Crocin royal blue and crimson red (BGR)
            "primary": (171, 71, 0),        # #0047AB Royal Blue
            "secondary": (38, 38, 220),     # #DC2626 Crimson Red
        },
        {
            "id": "combiflam",
            "name": "COMBIFLAM",
            "subtitle": "Ibuprofen 400 mg & Paracetamol 325 mg Tablets",
            "mfg": "Sanofi India Limited, Mumbai",
            "lot": "CBF-IND-7734K",
            "exp": "08/2028",
            "gtin": "08901058000515",
            # Combiflam deep wine/magenta and cyan (BGR)
            "primary": (57, 18, 159),       # #9F1239 Magenta / Wine
            "secondary": (199, 132, 2),     # #0284C7 Blue/Cyan
        },
        {
            "id": "tretiva",
            "name": "TRETIVA-20",
            "subtitle": "Isotretinoin Soft Gelatin Capsules USP 20 mg",
            "mfg": "Sun Pharmaceutical Industries Ltd, Halol",
            "lot": "TRT-20-8819X",
            "exp": "05/2028",
            "gtin": "08901234567890",
            # Tretiva signature deep burgundy/wine and slate silver (BGR)
            "primary": (40, 20, 140),       # Deep Burgundy
            "secondary": (160, 150, 140),   # Silver Slate
        },
        {
            "id": "azithromycin",
            "name": "AZITHRAL-250",
            "subtitle": "Azithromycin Tablets IP 250 mg",
            "mfg": "Alembic Pharmaceuticals Ltd, Vadodara",
            "lot": "AZT-250-3104M",
            "exp": "11/2027",
            "gtin": "08901452003418",
            # Azithral deep teal and ocean cyan (BGR)
            "primary": (110, 80, 20),       # Deep Teal
            "secondary": (210, 150, 30),    # Cyan/Aqua
        },
        {
            "id": "amoxicillin",
            "name": "AUGMENTIN-625",
            "subtitle": "Amoxicillin and Potassium Clavulanate Tablets IP 625 mg",
            "mfg": "GlaxoSmithKline Pharmaceuticals Ltd",
            "lot": "AGM-625-5592L",
            "exp": "09/2028",
            "gtin": "08901030021057",
            # Augmentin terracotta orange and navy blue (BGR)
            "primary": (25, 90, 200),       # Terracotta Orange
            "secondary": (120, 40, 20),     # Navy Blue
        },
    ]

    for b in brands:
        print(f"\n[Generating Dataset] Brand: {b['name']} ({b['id']})...")

        # 1. Generate Authentic Reference
        genuine_img = draw_genuine_packaging(
            brand_name=b["name"],
            subtitle=b["subtitle"],
            mfg_name=b["mfg"],
            batch_lot=b["lot"],
            expiry=b["exp"],
            gtin_code=b["gtin"],
            primary_bgr=b["primary"],
            secondary_bgr=b["secondary"],
        )

        # 2. Generate Counterfeit/Suspicious Copy
        fake_img = create_counterfeit_version(genuine_img)

        # Save paths
        paths_to_save = [
            # Reference image locations
            (os.path.join(base_dir, "reference_images", b["id"], "genuine.png"), genuine_img),
            (os.path.join(root_dir, "reference_images", b["id"], "genuine.png"), genuine_img),
            # Demo test case locations in backend
            (os.path.join(base_dir, "demo_test_images", f"{b['id']}_genuine.png"), genuine_img),
            (os.path.join(base_dir, "demo_test_images", f"{b['id']}_fake.png"), fake_img),
            # Demo test case locations in frontend public folder for 1-click UI loading
            (os.path.join(root_dir, "frontend", "public", "demo_samples", f"{b['id']}_genuine.png"), genuine_img),
            (os.path.join(root_dir, "frontend", "public", "demo_samples", f"{b['id']}_fake.png"), fake_img),
        ]

        for filepath, img_data in paths_to_save:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            cv2.imwrite(filepath, img_data)
            print(f"  -> Saved: {os.path.relpath(filepath, root_dir)}")

    print("\n✅ Dataset generation complete! All reference and demo test cases created.")


if __name__ == "__main__":
    main()
