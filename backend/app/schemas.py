"""
MedVerify Data Schemas
======================
Pydantic data models for MedVerify packaging verification requests and responses.
Defines diagnostic flags, forensic metric payloads, reference-free analysis readouts,
and brand reference management structures.
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class BoundingBoxOverlay(BaseModel):
    id: str = Field(..., description="Unique overlay identifier (e.g. 'overlay-0')")
    x: float = Field(..., description="Top-left horizontal coordinate as percentage of image width (0-100)")
    y: float = Field(..., description="Top-left vertical coordinate as percentage of image height (0-100)")
    width: float = Field(..., description="Bounding box width as percentage of image width (0-100)")
    height: float = Field(..., description="Bounding box height as percentage of image height (0-100)")
    label: str = Field(..., description="Readable diagnostic flag category label")
    severity: str = Field(..., description="Severity level: 'low', 'medium', 'high', or 'critical'")
    issue: str = Field(..., description="Detailed explanation of the localized packaging defect")


class FlagItem(BaseModel):
    issue: str = Field(..., description="Description of the detected issue, anomaly, or discrepancy")
    severity: str = Field(..., description="Severity level: 'low', 'medium', 'high', or 'critical'")
    bbox: Optional[Dict[str, float]] = Field(None, description="Physical coordinates of localized defect: x, y, width, height")


class GeminiExplanation(BaseModel):
    status: Literal["generated", "not_configured", "unavailable"]
    summary: Optional[str] = None


class AnalyzeResponse(BaseModel):
    ai_explanation: Optional[GeminiExplanation] = Field(
        default=None, description="Optional plain-language interpretation of the screening metrics"
    )
    verdict: Literal["PASSED SCREENING", "INCONCLUSIVE", "SUSPICIOUS"] = Field(
        ...,
        description="Forensic packaging classification: 'PASSED SCREENING', 'INCONCLUSIVE', or 'SUSPICIOUS'",
    )
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Overall confidence score normalized between 0.0 and 1.0"
    )
    flags: List[FlagItem] = Field(
        default_factory=list, description="Diagnostic flags and forensic observations"
    )
    
    # Core reference-free physical printing metrics
    sharpness_score: float = Field(
        ..., description="Spatial gradient sharpness score (Laplacian variance) representing print clarity"
    )
    edge_quality_score: float = Field(
        ..., description="Edge continuity and stroke coherence score (Canny + Connected Components)"
    )
    
    # Optional brand reference color metric
    color_match_score: Optional[float] = Field(
        default=None, description="HSV color histogram correlation score (only if reference packaging exists)"
    )
    reference_used: bool = Field(
        default=False, description="Whether a brand genuine master reference image was utilized for color comparison"
    )
    matched_reference: Optional[str] = Field(
        default=None, description="Path or identifier of genuine reference standard if utilized"
    )
    reference_missing: Optional[bool] = Field(
        default=False, description="Flag indicating if a specifically requested brand had no master image"
    )
    
    # Reference-free regulatory & semantic metrics
    ocr_fields_score: float = Field(
        default=0.0, description="Compliance score for mandatory regulatory fields (Batch, MRP, License)"
    )
    date_logic_score: float = Field(
        default=0.0, description="Chronological date consistency score (MFG < EXP, current date active shelf life)"
    )
    database_match_score: float = Field(
        default=0.0, description="Pharmacopeial database cross-check score against Indian medicine registry"
    )
    barcode_score: float = Field(
        default=0.0, description="Optical barcode / GS1 DataMatrix decodability and physical presence score"
    )
    
    # Detailed forensic payloads for inspection
    ocr_extracted_text: Optional[str] = Field(
        default=None, description="Full text transcript extracted from packaging via OCR"
    )
    extracted_fields: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Structured fields extracted via regex (batch, mfg, exp, mrp, license)"
    )
    date_logic_details: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Date timeline evaluation details"
    )
    database_match_details: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Medicine database fuzzy match and typo audit details"
    )
    barcode_details: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Barcode/QR optical decoding details"
    )
    gs1_details: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Parsed GS1 standard identifiers (GTIN, Batch, Expiry, Serial)"
    )
    cross_audit_details: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Physical-to-digital cross-verification (OCR batch vs Barcode batch)"
    )
    overlays: List[BoundingBoxOverlay] = Field(
        default_factory=list, description="Localized physical defect bounding boxes detected on packaging specimen"
    )
    
    # Classification metadata & disclaimer
    rule_triggered: Optional[str] = Field(
        default="composite_score",
        description="Decision rule: 'composite_score', 'severe_outlier_fail_safe', or 'inconclusive_sparse_text'",
    )
    verdict_disclaimer: str = Field(
        default=(
            "First-line optical screening tool only. Not a chemical assay. "
            "Suspected counterfeit or unverified packaging must be reported to the drug manufacturer for batch audit."
        ),
        description="Regulatory medical disclaimer",
    )


class AddReferenceResponse(BaseModel):
    success: bool = Field(..., description="Whether reference image was successfully registered")
    message: str = Field(..., description="Confirmation details or error explanation")
    brand_id: str = Field(..., description="Identifier of the brand under which reference was saved")
    saved_path: Optional[str] = Field(None, description="Disk path where the master packaging image was saved")
