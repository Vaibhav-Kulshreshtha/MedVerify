import { AnalysisFlag, AnalysisResult, BoundingBoxOverlay, BreakdownCheck } from './types';

/**
 * Computes mock bounding-box overlays over the uploaded image
 * using the diagnostic flags returned from the forensic API.
 */
export function generateFlagOverlays(
  flags: AnalysisFlag[],
  verdict: string
): BoundingBoxOverlay[] {
  const normVerdict = verdict.toUpperCase();
  if (normVerdict === 'PASSED SCREENING' || normVerdict === 'GENUINE' || flags.length === 0) {
    return [];
  }

  return flags.map((flag, index) => {
    const issueLower = flag.issue.toLowerCase();

    // Check 1: Sharpness / Blur / Typography
    if (
      issueLower.includes('sharpness') ||
      issueLower.includes('blur') ||
      issueLower.includes('laplacian') ||
      issueLower.includes('focus')
    ) {
      return {
        id: `overlay-${index}`,
        x: 6,
        y: 12,
        width: 58,
        height: 24,
        label: `FLAG ${String(index + 1).padStart(2, '0')}: PRINT SHARPNESS / BLUR`,
        severity: flag.severity,
        issue: flag.issue,
      };
    }

    // Check 2: Edge quality / Canny / Contours / Dither
    if (
      issueLower.includes('edge') ||
      issueLower.includes('canny') ||
      issueLower.includes('contour') ||
      issueLower.includes('dither') ||
      issueLower.includes('fragment')
    ) {
      return {
        id: `overlay-${index}`,
        x: 6,
        y: 58,
        width: 55,
        height: 25,
        label: `FLAG ${String(index + 1).padStart(2, '0')}: CANNY EDGE COHERENCE`,
        severity: flag.severity,
        issue: flag.issue,
      };
    }

    // Check 3: Color gamut / HSV / Histogram
    if (
      issueLower.includes('color') ||
      issueLower.includes('gamut') ||
      issueLower.includes('hsv') ||
      issueLower.includes('histogram') ||
      issueLower.includes('foil') ||
      issueLower.includes('chromatic')
    ) {
      return {
        id: `overlay-${index}`,
        x: 62,
        y: 14,
        width: 32,
        height: 38,
        label: `FLAG ${String(index + 1).padStart(2, '0')}: COLOR GAMUT SHIFT`,
        severity: flag.severity,
        issue: flag.issue,
      };
    }

    // Check 4: Date logic / Expiry / Timeline
    if (
      issueLower.includes('date') ||
      issueLower.includes('expiry') ||
      issueLower.includes('expired') ||
      issueLower.includes('mfg') ||
      issueLower.includes('timeline')
    ) {
      return {
        id: `overlay-${index}`,
        x: 48,
        y: 50,
        width: 46,
        height: 22,
        label: `FLAG ${String(index + 1).padStart(2, '0')}: DATE LOGIC / EXPIRY`,
        severity: flag.severity,
        issue: flag.issue,
      };
    }

    // Check 5: Database / Typo / Formulation / Composition
    if (
      issueLower.includes('typo') ||
      issueLower.includes('composition') ||
      issueLower.includes('manufacturer') ||
      issueLower.includes('mimic') ||
      issueLower.includes('contradiction')
    ) {
      return {
        id: `overlay-${index}`,
        x: 8,
        y: 36,
        width: 60,
        height: 24,
        label: `FLAG ${String(index + 1).padStart(2, '0')}: FORMULATION / TYPO ANOMALY`,
        severity: flag.severity,
        issue: flag.issue,
      };
    }

    // Check 6: Mandatory fields (Batch, MRP, License)
    if (
      issueLower.includes('batch') ||
      issueLower.includes('mrp') ||
      issueLower.includes('license')
    ) {
      return {
        id: `overlay-${index}`,
        x: 48,
        y: 72,
        width: 46,
        height: 22,
        label: `FLAG ${String(index + 1).padStart(2, '0')}: REGULATORY FIELD ABSENT`,
        severity: flag.severity,
        issue: flag.issue,
      };
    }

    // Check 7: Barcode / QR / DataMatrix
    if (
      issueLower.includes('barcode') ||
      issueLower.includes('datamatrix') ||
      issueLower.includes('qr')
    ) {
      return {
        id: `overlay-${index}`,
        x: 64,
        y: 55,
        width: 30,
        height: 35,
        label: `FLAG ${String(index + 1).padStart(2, '0')}: OPTICAL CODE DEFECT`,
        severity: flag.severity,
        issue: flag.issue,
      };
    }

    // Default fallback coordinates
    const row = index % 3;
    const col = Math.floor(index / 3);
    return {
      id: `overlay-${index}`,
      x: 10 + col * 45,
      y: 18 + row * 26,
      width: 42,
      height: 22,
      label: `FLAG ${String(index + 1).padStart(2, '0')}: ${flag.severity.toUpperCase()} ANOMALY`,
      severity: flag.severity,
      issue: flag.issue,
    };
  });
}

/**
 * Computes individual scores, benchmarks, and pass/fail indicators
 * across all active diagnostic checks for the laboratory printout table.
 */
export function getBreakdownChecks(result: AnalysisResult): BreakdownCheck[] {
  const sharpnessScore = Number((result.sharpness_score ?? 0).toFixed(1));
  const edgeScore = Number((result.edge_quality_score ?? 0).toFixed(1));
  const ocrFieldsScore = Number((result.ocr_fields_score ?? 0).toFixed(1));
  const dateLogicScore = Number((result.date_logic_score ?? 0).toFixed(1));
  const dbMatchScore = Number((result.database_match_score ?? 0).toFixed(1));
  const barcodeScore = Number((result.barcode_score ?? 0).toFixed(1));

  // 40% Benchmark Outlier Thresholds
  const sharpnessOutlierThreshold = 0.40 * 70.0; // 28.0
  const edgeOutlierThreshold = 0.40 * 70.0;      // 28.0
  const colorOutlierThreshold = 0.40 * 75.0;     // 30.0

  const isSharpnessOutlier = sharpnessScore < sharpnessOutlierThreshold;
  const isEdgeOutlier = edgeScore < edgeOutlierThreshold;

  const checks: BreakdownCheck[] = [
    {
      name: 'Print Sharpness',
      code: 'CHK-OPT-01',
      score: sharpnessScore,
      maxScore: 100,
      benchmark: 70.0,
      tolerance: '≥ 70.0 pts (Laplacian)',
      passed: sharpnessScore >= 70.0,
      isOutlier: isSharpnessOutlier,
      outlierThreshold: sharpnessOutlierThreshold,
      notes: isSharpnessOutlier
        ? 'CRITICAL OUTLIER (< 28.0 pts): Severe print blur detected; fails 40% benchmark threshold.'
        : sharpnessScore >= 70.0
        ? 'Micro-text edges match pharmaceutical industrial offset lithography standard.'
        : 'Low Laplacian spatial variance; blurred or low-resolution print detected.',
    },
    {
      name: 'Edge & Contour Quality',
      code: 'CHK-EDG-02',
      score: edgeScore,
      maxScore: 100,
      benchmark: 70.0,
      tolerance: '≥ 70.0 pts (Canny Coherence)',
      passed: edgeScore >= 70.0,
      isOutlier: isEdgeOutlier,
      outlierThreshold: edgeOutlierThreshold,
      notes: isEdgeOutlier
        ? 'CRITICAL OUTLIER (< 28.0 pts): Extreme stroke fragmentation & dithering; fails 40% benchmark threshold.'
        : edgeScore >= 70.0
        ? 'Canny edge density & connected stroke continuity confirmed.'
        : 'Fragmented edge contours detected; potential inkjet dither spray.',
    },
  ];

  // Check 3: Optional Brand Reference Color Match
  if (result.reference_used && result.color_match_score !== undefined && result.color_match_score !== null) {
    const colorScore = Number(result.color_match_score.toFixed(1));
    const isColorOutlier = colorScore < colorOutlierThreshold;
    checks.push({
      name: 'Color Consistency (Master Reference)',
      code: 'CHK-SPC-03',
      score: colorScore,
      maxScore: 100,
      benchmark: 75.0,
      tolerance: '≥ 75.0 (HSV Correlation)',
      passed: colorScore >= 75.0,
      isOutlier: isColorOutlier,
      outlierThreshold: colorOutlierThreshold,
      notes: colorScore >= 75.0
        ? `HSV color histogram correlates with authentic reference packaging (${result.matched_reference || 'master'}).`
        : isColorOutlier
        ? `CRITICAL OUTLIER (< 30.0): Severe chromatic divergence against authentic master (${result.matched_reference || 'master'}).`
        : `High chromatic divergence against genuine reference standard (${result.matched_reference || 'master'}).`,
    });
  } else {
    checks.push({
      name: 'Color Match (Master Reference)',
      code: 'CHK-SPC-03',
      score: 0,
      maxScore: 100,
      benchmark: 75.0,
      tolerance: 'OPTIONAL (Reference-Free Mode)',
      passed: true,
      isSkipped: true,
      notes: 'SKIPPED: Universal reference-free mode active. Weights dynamically re-normalized across remaining 5 checks.',
    });
  }

  // Check 4: Mandatory Regulatory Fields
  const ext = result.extracted_fields;
  const fieldsFound = [
    ext?.batch_number ? `Batch: ${ext.batch_number}` : null,
    ext?.mrp_str ? `MRP: ${ext.mrp_str}` : null,
    ext?.license_number ? `Lic: ${ext.license_number}` : null,
  ].filter(Boolean);

  checks.push({
    name: 'OCR Mandatory Regulatory Fields',
    code: 'CHK-REG-04',
    score: ocrFieldsScore,
    maxScore: 100,
    benchmark: 75.0,
    tolerance: '≥ 75.0 pts (Batch, MRP, Lic)',
    passed: ocrFieldsScore >= 75.0,
    notes: fieldsFound.length > 0
      ? `Extracted [${fieldsFound.join(' | ')}] via optical text character recognition.`
      : 'Incomplete regulatory markings: missing required batch number or manufacturing license.',
  });

  // Check 5: Chronological Date Logic
  const dateLog = result.date_logic_details;
  const mfg = ext?.mfg_date_str || 'N/A';
  const exp = ext?.exp_date_str || 'N/A';
  checks.push({
    name: 'Chronological Date & Expiry Logic',
    code: 'CHK-DAT-05',
    score: dateLogicScore,
    maxScore: 100,
    benchmark: 90.0,
    tolerance: 'MFG < EXP & Active Shelf-Life',
    passed: dateLogicScore >= 90.0,
    notes: dateLog?.timeline_error
      ? dateLog.timeline_error
      : dateLog?.is_expired
      ? `EXPIRED SPECIMEN: Expiry date (${exp}) has elapsed.`
      : `Valid shelf-life sequence (MFG: ${mfg} → EXP: ${exp}).`,
  });

  // Check 6: Pharmacopeial Database Cross-Check
  const db = result.database_match_details;
  checks.push({
    name: 'Pharmacopeial Database Cross-Check',
    code: 'CHK-DB-06',
    score: dbMatchScore,
    maxScore: 100,
    benchmark: 70.0,
    tolerance: '≥ 70.0% Indian Medicine Registry',
    passed: dbMatchScore >= 70.0,
    notes: db?.is_typo_suspect
      ? 'SUSPECT BRAND TYPO: Near-miss spelling of registered pharmaceutical trademark detected.'
      : db?.matched_name
      ? `Correlated with registry master: ${db.matched_name} (${db.expected_composition || 'standard formulation'}).`
      : 'Unindexed generic formulation; passed general typographic audit.',
  });

  // Check 7: Barcode & Optical Code Decoding
  const bar = result.barcode_details;
  checks.push({
    name: 'Barcode / GS1 DataMatrix Decode',
    code: 'CHK-BAR-07',
    score: barcodeScore,
    maxScore: 100,
    benchmark: 60.0,
    tolerance: 'Optical 1D/2D Machine Decodable',
    passed: barcodeScore >= 60.0,
    notes: bar?.is_decoded && bar.primary_code
      ? `Decoded ${bar.primary_code.type}: Payload [${bar.primary_code.data.substring(0, 24)}...].`
      : bar?.visually_present
      ? 'WARNING: Barcode pattern physically present on carton but failed optical decode.'
      : 'Optical barcode not present on visible carton panel (typical on primary blister front).',
  });

  return checks;
}
