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
}

export interface ExtractedFields {
  batch_number?: string | null;
  mfg_date_str?: string | null;
  exp_date_str?: string | null;
  mrp_str?: string | null;
  mrp_value?: number | null;
  license_number?: string | null;
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
  verdict: Verdict;
  confidence: number;
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
