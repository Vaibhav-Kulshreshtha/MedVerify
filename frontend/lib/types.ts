export type Verdict =
  | 'PASSED SCREENING'
  | 'INCONCLUSIVE'
  | 'SUSPICIOUS'
  | 'genuine'
  | 'suspicious';

export type Severity = 'low' | 'medium' | 'high' | 'critical' | string;

export interface AnalysisFlag {
  issue: string;
  severity: Severity;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export interface ExtractedFields {
  batch_number?: string | null;
  mfg_date_str?: string | null;
  exp_date_str?: string | null;
  mrp_str?: string | null;
  mrp_value?: number | null;
  license_number?: string | null;
  batch_bbox?: { x: number; y: number; width: number; height: number } | null;
  mfg_bbox?: { x: number; y: number; width: number; height: number } | null;
  exp_bbox?: { x: number; y: number; width: number; height: number } | null;
  mrp_bbox?: { x: number; y: number; width: number; height: number } | null;
  license_bbox?: { x: number; y: number; width: number; height: number } | null;
}

export interface GS1Details {
  gtin?: string | null;
  expiry_date?: string | null;
  batch_number?: string | null;
  serial_number?: string | null;
  is_valid_gs1?: boolean;
}

export interface CrossAuditDetails {
  status: 'VERIFIED_MATCH' | 'CRITICAL_MISMATCH' | 'PHYSICAL_ONLY' | 'PARTIAL_AUDIT' | string;
  batch_match?: boolean | null;
  expiry_match?: boolean | null;
  digital_batch?: string | null;
  digital_expiry?: string | null;
  gtin?: string | null;
  summary?: string;
  flags?: AnalysisFlag[];
}

export interface DateLogicDetails {
  batch_present: boolean;
  mrp_present: boolean;
  license_present: boolean;
  has_mfg_date: boolean;
  has_exp_date: boolean;
  date_timeline_valid: boolean;
  timeline_error?: string | null;
  is_expired: boolean;
  score: number;
}

export interface DatabaseMatchDetails {
  matched_name?: string | null;
  expected_composition?: string | null;
  expected_manufacturer?: string | null;
  similarity: number;
  is_typo_suspect: boolean;
  composition_mismatch: boolean;
  manufacturer_mismatch: boolean;
  score: number;
  flags: AnalysisFlag[];
}

export interface BarcodeDetails {
  status: string;
  is_decoded: boolean;
  visually_present: boolean;
  primary_code?: {
    type: string;
    data: string;
  } | null;
  score: number;
  flags: AnalysisFlag[];
}

export interface AnalysisResult {
  ai_explanation?: {
    status: 'generated' | 'not_configured' | 'unavailable';
    summary?: string | null;
  } | null;
  verdict: Verdict;
  confidence: number | null;
  flags: AnalysisFlag[];
  sharpness_score: number;
  edge_quality_score?: number;
  color_match_score?: number | null;
  reference_used?: boolean;
  matched_reference?: string;
  reference_missing?: boolean;
  ocr_fields_score?: number;
  date_logic_score?: number;
  database_match_score?: number;
  barcode_score?: number;
  ocr_extracted_text?: string;
  extracted_fields?: ExtractedFields;
  date_logic_details?: DateLogicDetails;
  database_match_details?: DatabaseMatchDetails;
  barcode_details?: BarcodeDetails;
  gs1_details?: GS1Details;
  cross_audit_details?: CrossAuditDetails;
  overlays?: BoundingBoxOverlay[];
  rule_triggered?: string;
  verdict_disclaimer?: string;
}

export interface AddReferenceResponse {
  success: boolean;
  message: string;
  brand_id: string;
  saved_path?: string;
}

export interface BoundingBoxOverlay {
  id: string;
  x: number; // percentage from left (0 - 100)
  y: number; // percentage from top (0 - 100)
  width: number; // percentage width (0 - 100)
  height: number; // percentage height (0 - 100)
  label: string;
  severity: Severity;
  issue: string;
}

export interface BreakdownCheck {
  name: string;
  code: string;
  score: number;
  maxScore: number;
  benchmark: number;
  tolerance: string;
  passed: boolean;
  notes: string;
  isOutlier?: boolean;
  outlierThreshold?: number;
  isSkipped?: boolean;
}

export interface BackendHealthResponse {
  status: string;
}
