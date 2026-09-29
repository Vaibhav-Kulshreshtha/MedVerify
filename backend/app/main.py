import os
import json
import logging
from typing import Optional, List
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS, HOST, PORT
from app.schemas import AnalyzeResponse, FlagItem, AddReferenceResponse
from app.cv_analyzer import analyze_packaging_image, load_brands_config, REFERENCE_DIRS

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("medverify")

app = FastAPI(
    title="MedVerify API",
    description="Universal counterfeit medicine packaging detection service powered by Computer Vision & Reference-Free Forensics",
    version="3.0.0",
)

# Enable CORS for frontend communication across all local development origins and ports
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint for status check."""
    return {
        "service": "MedVerify API",
        "status": "online",
        "version": "3.0.0",
        "architecture": "Universal Reference-Free OCR & OpenCV Forensic Suite",
        "docs_url": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/brands", tags=["Metadata"])
async def get_brands():
    """Returns the list of registered medicine brands with authentic reference standards."""
    brands = load_brands_config()
    return {"brands": brands}


@app.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Analyze medicine packaging image",
    description="Upload a medicine packaging image to analyze for counterfeit indicators via multi-modal reference-free and reference-assisted checks.",
    tags=["Analysis"],
)
async def analyze_packaging(
    image: UploadFile = File(..., description="Medicine packaging photo (JPEG/PNG/WebP)"),
    brand: Optional[str] = Form(
        None,
        description="Target medicine brand ID (e.g., 'dolo650', 'crocin', or 'auto' for reference-free)",
    ),
    mock_verdict: Optional[str] = Query(
        None,
        description="Optional override for testing UI: 'passed', 'suspicious', or 'inconclusive'",
    ),
):
    """
    Accepts an uploaded image file, processes it via the multi-modal forensic engine,
    and returns packaging authenticity analysis.
    """
    if not image.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a filename.",
        )

    content_type = image.content_type or ""
    logger.info(
        f"Processing image analysis request: filename='{image.filename}', "
        f"brand='{brand}', content_type='{content_type}'"
    )

    # Read image bytes
    file_bytes = await image.read()
    file_size = len(file_bytes)
    logger.info(f"Read {file_size} bytes for '{image.filename}'")

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded image file is empty.",
        )

    # Optional manual override for demoing
    if mock_verdict:
        norm_mock = mock_verdict.lower().strip()
        if norm_mock in ("suspicious", "fail"):
            return AnalyzeResponse(
                verdict="SUSPICIOUS",
                confidence=0.42,
                flags=[
                    FlagItem(
                        issue="FAIL-SAFE PROTOCOL ACTIVATED: Classification forced to SUSPICIOUS due to high-severity flags.",
                        severity="high",
                    ),
                    FlagItem(
                        issue="Severe print blur detected (Laplacian variance 42.1 < 100): Micro-typography lacks optical definition.",
                        severity="high",
                    ),
                    FlagItem(
                        issue="COMPOSITION CONTRADICTION: Formulation did not match registered active ingredients in national medicine database.",
                        severity="high",
                    ),
                    FlagItem(
                        issue="Fragmented edge contours detected: Inkjet dither spray observed instead of offset lithography.",
                        severity="medium",
                    ),
                ],
                sharpness_score=44.0,
                edge_quality_score=48.2,
                color_match_score=38.0 if brand and brand != "auto" else None,
                reference_used=bool(brand and brand != "auto"),
                ocr_fields_score=35.0,
                date_logic_score=50.0,
                database_match_score=35.0,
                barcode_score=45.0,
                rule_triggered="severe_outlier_fail_safe",
            )
        elif norm_mock in ("inconclusive", "amber"):
            return AnalyzeResponse(
                verdict="INCONCLUSIVE",
                confidence=0.50,
                flags=[
                    FlagItem(
                        issue="INCONCLUSIVE SPECIMEN: Uploaded packaging image contains insufficient legible typography (12 characters extracted). Batch number, expiry, and manufacturer credentials cannot be verified.",
                        severity="medium",
                    ),
                ],
                sharpness_score=62.0,
                edge_quality_score=68.0,
                color_match_score=None,
                reference_used=False,
                ocr_fields_score=20.0,
                date_logic_score=50.0,
                database_match_score=50.0,
                barcode_score=75.0,
                rule_triggered="inconclusive_sparse_text",
            )
        elif norm_mock in ("passed", "genuine", "pass"):
            return AnalyzeResponse(
                verdict="PASSED SCREENING",
                confidence=0.96,
                flags=[
                    FlagItem(
                        issue="Print sharpness verified: Micro-typography meets pharmaceutical offset lithography criteria.",
                        severity="low",
                    ),
                    FlagItem(
                        issue="Mandatory regulatory typography verified (Batch, Expiry, License, and MRP present).",
                        severity="low",
                    ),
                    FlagItem(
                        issue="Registered formulation confirmed against pharmacopeial database.",
                        severity="low",
                    ),
                ],
                sharpness_score=94.5,
                edge_quality_score=96.0,
                color_match_score=97.0 if brand and brand != "auto" else None,
                reference_used=bool(brand and brand != "auto"),
                ocr_fields_score=100.0,
                date_logic_score=100.0,
                database_match_score=98.0,
                barcode_score=98.0,
                rule_triggered="composite_score",
            )

    # Execute Real Analysis Pipeline
    try:
        result = analyze_packaging_image(
            file_bytes=file_bytes,
            filename=image.filename,
            brand_id=brand,
        )
    except ValueError as e:
        logger.error(f"Image decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to process image: {str(e)}",
        )
    except Exception as e:
        logger.exception(f"Unexpected error during CV analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Packaging verification processing encountered an internal error.",
        )

    return AnalyzeResponse(
        verdict=result["verdict"],
        confidence=result["confidence"],
        flags=[FlagItem(issue=f["issue"], severity=f["severity"]) for f in result["flags"]],
        sharpness_score=result["sharpness_score"],
        edge_quality_score=result["edge_quality_score"],
        color_match_score=result.get("color_match_score"),
        reference_used=result.get("reference_used", False),
        matched_reference=result.get("matched_reference"),
        reference_missing=result.get("reference_missing", False),
        ocr_fields_score=result.get("ocr_fields_score", 0.0),
        date_logic_score=result.get("date_logic_score", 0.0),
        database_match_score=result.get("database_match_score", 0.0),
        barcode_score=result.get("barcode_score", 0.0),
        ocr_extracted_text=result.get("ocr_extracted_text"),
        extracted_fields=result.get("extracted_fields"),
        date_logic_details=result.get("date_logic_details"),
        database_match_details=result.get("database_match_details"),
        barcode_details=result.get("barcode_details"),
        rule_triggered=result.get("rule_triggered", "composite_score"),
        verdict_disclaimer=result.get("verdict_disclaimer"),
    )


@app.post(
    "/add-reference",
    response_model=AddReferenceResponse,
    summary="Register packaging image as genuine brand reference standard",
    description="Saves an authenticated packaging photo to /reference_images/{brand_id}/genuine.png and updates brands.json.",
    tags=["Metadata"],
)
async def add_reference(
    image: UploadFile = File(..., description="Genuine reference packaging photo"),
    brand_id: str = Form(..., description="Unique slug for the brand (e.g. 'crocin', 'augmentin')"),
    brand_name: Optional[str] = Form(None, description="Display name of the medicine brand"),
    manufacturer: Optional[str] = Form(None, description="Official licensed manufacturer name"),
):
    """
    Saves an authentic packaging specimen to disk and indexes it in brands.json.
    Future scans of this brand will automatically include the HSV color match check.
    """
    clean_id = brand_id.strip().lower().replace(" ", "-").replace("_", "-")
    if not clean_id or clean_id in ("auto", "other", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid unique brand identifier is required to register a reference master.",
        )

    file_bytes = await image.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded reference image file is empty.",
        )

    display_name = (brand_name or clean_id.capitalize()).strip()
    mfg_name = (manufacturer or "Authorized Pharmaceutical Manufacturer").strip()
    saved_paths = []

    # Write genuine.png to each recognized reference directory
    for ref_dir in REFERENCE_DIRS:
        try:
            target_brand_dir = os.path.join(ref_dir, clean_id)
            os.makedirs(target_brand_dir, exist_ok=True)
            target_file_path = os.path.join(target_brand_dir, "genuine.png")
            with open(target_file_path, "wb") as f:
                f.write(file_bytes)
            saved_paths.append(target_file_path)

            # Update brands.json in this directory
            cfg_path = os.path.join(ref_dir, "brands.json")
            brands_data = {"brands": []}
            if os.path.exists(cfg_path):
                try:
                    with open(cfg_path, "r", encoding="utf-8") as f:
                        brands_data = json.load(f)
                except Exception as e:
                    logger.error(f"Error reading {cfg_path}: {e}")

            # Check if brand already exists in config
            brands_list = brands_data.get("brands", [])
            brand_idx = -1
            for idx, b in enumerate(brands_list):
                if b.get("id", "").strip().lower() == clean_id:
                    brand_idx = idx
                    break

            new_brand_entry = {
                "id": clean_id,
                "name": display_name,
                "fullName": f"{display_name} ({mfg_name})",
                "manufacturer": mfg_name,
                "reference_image": f"{clean_id}/genuine.png",
                "lot_prefix": clean_id[:4].upper(),
                "color_theme": "#0F2A3F",
            }

            if brand_idx >= 0:
                brands_list[brand_idx].update(new_brand_entry)
            else:
                brands_list.append(new_brand_entry)

            brands_data["brands"] = brands_list
            with open(cfg_path, "w", encoding="utf-8") as f:
                json.dump(brands_data, f, indent=2)

        except Exception as e:
            logger.error(f"Failed to persist reference in {ref_dir}: {e}")

    if not saved_paths:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to write reference image to filesystem.",
        )

    logger.info(f"Registered brand reference master for '{clean_id}' at {saved_paths[0]}")
    return AddReferenceResponse(
        success=True,
        message=f"Successfully registered genuine reference master for '{display_name}'. Future scans will run color match verification.",
        brand_id=clean_id,
        saved_path=saved_paths[0],
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
