import { AnalysisFlag, AnalysisResult, BoundingBoxOverlay, BreakdownCheck } from './types';

/** Only draw regions with coordinates supplied by the analysis. */
export function generateFlagOverlays(flags: AnalysisFlag[], existingOverlays?: BoundingBoxOverlay[]): BoundingBoxOverlay[] {
  const overlays = [...(existingOverlays || [])];
  flags.forEach((flag, index) => {
    if (flag.bbox && !overlays.some((overlay) => overlay.issue === flag.issue)) {
      overlays.push({
        ...flag.bbox,
        id: `flag-${index}`,
        label: `Flag ${index + 1}`,
        severity: flag.severity,
        issue: flag.issue,
      });
    }
  });
  return overlays;
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
        ? 'Sharpness falls below the severe-outlier threshold.'
        : sharpnessScore >= 70.0
        ? 'Sharpness meets the screening threshold.'
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
        ? 'Edge quality falls below the severe-outlier threshold.'
        : edgeScore >= 70.0
        ? 'Canny edge density & connected stroke continuity confirmed.'
        : 'Edge quality falls below the screening threshold.',
    },
  ];

  if (result.rule_triggered === 'browser_optical_only') {
    checks[0].notes = 'Local estimate of focus from pixel gradients.';
    checks[1].tolerance = '≥ 70.0 pts (edge density)';
    checks[1].notes = 'Local estimate of edge density from pixel gradients.';
    return checks;
  }

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
      notes: 'No reference image was compared.',
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
      : 'The requested label fields could not be read from the image.',
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
    isSkipped: !dateLog?.has_mfg_date && !dateLog?.has_exp_date,
    notes: dateLog?.timeline_error
      ? dateLog.timeline_error
      : dateLog?.is_expired
      ? `EXPIRED SPECIMEN: Expiry date (${exp}) has elapsed.`
      : `Manufacturing date: ${mfg}. Expiry date: ${exp}.`,
  });

  // Check 6: Pharmacopeial Database Cross-Check
  const db = result.database_match_details;
  checks.push({
    name: 'Medicine catalog comparison',
    code: 'CHK-DB-06',
    score: dbMatchScore,
    maxScore: 100,
    benchmark: 70.0,
    tolerance: '≥ 70.0 pts (catalog match)',
    isSkipped: !db?.matched_name,
    passed: dbMatchScore >= 70.0,
    notes: db?.is_typo_suspect
      ? 'SUSPECT BRAND TYPO: Near-miss spelling of registered pharmaceutical trademark detected.'
      : db?.matched_name
      ? `Correlated with registry master: ${db.matched_name} (${db.expected_composition || 'standard formulation'}).`
      : 'No medicine catalog entry was matched.',
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
    passed: Boolean(bar?.is_decoded),
    isSkipped: !bar?.visually_present && !bar?.is_decoded,
    notes: bar?.is_decoded && bar.primary_code
      ? `Decoded ${bar.primary_code.type}: Payload [${bar.primary_code.data.substring(0, 24)}...].`
      : bar?.visually_present
      ? 'WARNING: Barcode pattern physically present on carton but failed optical decode.'
      : 'No barcode was detected on the visible panel.',
  });

  // The separate GS1 panel displays the categorical result returned by the service.
  return checks;
}
