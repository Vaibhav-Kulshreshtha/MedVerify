import os
import hmac
import re
import logging
from typing import Optional
from fastapi import FastAPI, File, Form, Depends, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import CORS_ORIGINS, HOST, PORT
from app.gemini import explain_screening
from app.schemas import AnalyzeResponse, FlagItem, AddReferenceResponse, BoundingBoxOverlay
from app.cv_analyzer import analyze_packaging_image, load_brands_config
from app.reference_store import save_reference
from app.uploads import UploadSizeLimit, read_photo
from starlette.concurrency import run_in_threadpool

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("medverify")

app = FastAPI(
    title="MedVerify API",
    description="Universal counterfeit medicine packaging detection service powered by Computer Vision & Reference-Free Forensics",
    version="3.0.0",
)

app.add_middleware(UploadSizeLimit)

# Configure CORS explicitly for production frontend and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Origin", "X-Requested-With"],
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
    include_ai: bool = Form(False, description="Send screening metrics to Gemini for an explanation"),
    brand: Optional[str] = Form(
        None, max_length=256,
        description="Target medicine brand ID (e.g., 'dolo650', 'crocin', or 'auto' for reference-free)",
    ),
):
    """
    Accepts an uploaded image file, processes it via the multi-modal forensic engine,
    and returns packaging authenticity analysis.
    """
    file_bytes = await read_photo(image)

    # Execute Real Analysis Pipeline in worker thread to prevent event loop blocking
    try:
        result = await run_in_threadpool(
            analyze_packaging_image,
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

    report = AnalyzeResponse(
        verdict=result["verdict"],
        confidence=result["confidence"],
        flags=[
            FlagItem(
                issue=f["issue"],
                severity=f["severity"],
                bbox=f.get("bbox"),
            )
            for f in result.get("flags", [])
        ],
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
        gs1_details=result.get("gs1_details"),
        cross_audit_details=result.get("cross_audit_details"),
        overlays=[
            BoundingBoxOverlay(
                id=ov["id"],
                x=ov["x"],
                y=ov["y"],
                width=ov["width"],
                height=ov["height"],
                label=ov["label"],
                severity=ov["severity"],
                issue=ov["issue"],
            )
            for ov in result.get("overlays", [])
        ],
        rule_triggered=result.get("rule_triggered", "composite_score"),
        verdict_disclaimer=result.get("verdict_disclaimer"),
    )
    if include_ai:
        report.ai_explanation = await explain_screening(report)
    return report


@app.post(
    "/add-reference",
    response_model=AddReferenceResponse,
    summary="Register packaging image as genuine brand reference standard",
    description="Registers a reference photo and updates the brand catalog. Requires an administrator bearer token.",
    tags=["Metadata"],
)
async def add_reference(
    image: UploadFile = File(..., description="Genuine reference packaging photo"),
    brand_id: str = Form(..., description="Unique slug for the brand (e.g. 'crocin', 'augmentin')"),
    brand_name: Optional[str] = Form(None, max_length=200, description="Display name of the medicine brand"),
    manufacturer: Optional[str] = Form(None, max_length=200, description="Official licensed manufacturer name"),
    authorization: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
):
    expected = os.getenv("MEDVERIFY_REFERENCE_TOKEN", "").strip()
    token = authorization.credentials if authorization else ""
    if not expected or not hmac.compare_digest(token.encode(), expected.encode()):
        raise HTTPException(403, "Reference registration requires administrator authorization.")

    clean_id = brand_id.strip().lower().replace(" ", "-").replace("_", "-")
    if not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?", clean_id) or clean_id in ("auto", "other", "none"):
        raise HTTPException(400, "Enter a brand identifier of up to 64 letters, digits, or hyphens.")

    file_bytes = await read_photo(image)
    try:
        path = await run_in_threadpool(
            save_reference, file_bytes, clean_id, (brand_name or "").strip(), (manufacturer or "").strip()
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except OSError as exc:
        logger.exception("Failed to persist brand reference")
        raise HTTPException(500, "Unable to update the reference catalog.") from exc
    return AddReferenceResponse(
        success=True,
        message=f"Registered reference photo for {clean_id}.",
        brand_id=clean_id,
        saved_path=path,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
