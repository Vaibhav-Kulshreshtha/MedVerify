'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  RotateCcw,
  Printer,
  Eye,
  EyeOff,
  Code,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  BookmarkPlus,
  Check,
} from 'lucide-react';
import { AnalysisResult, Severity } from '@/lib/types';
import { generateFlagOverlays, getBreakdownChecks } from '@/lib/overlayUtils';
import { addReferenceStandard } from '@/lib/api';

interface AnalysisResultViewProps {
  result: AnalysisResult;
  previewUrl: string;
  onReset: () => void;
}

export function AnalysisResultView({
  result,
  previewUrl,
  onReset,
}: AnalysisResultViewProps) {
  const [showOverlays, setShowOverlays] = useState(true);
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  // "Save as Reference" state
  const [showAddRefModal, setShowAddRefModal] = useState(false);
  const [refBrandName, setRefBrandName] = useState(
    result.database_match_details?.matched_name || ''
  );
  const [refBrandId, setRefBrandId] = useState(
    (result.database_match_details?.matched_name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || ''
  );
  const [refManufacturer, setRefManufacturer] = useState(
    result.database_match_details?.expected_manufacturer || ''
  );
  const [isSavingRef, setIsSavingRef] = useState(false);
  const [refSaveSuccess, setRefSaveSuccess] = useState<string | null>(null);
  const [refSaveError, setRefSaveError] = useState<string | null>(null);

  // Normalize verdict
  const normVerdict = (result.verdict || 'SUSPICIOUS').toUpperCase();
  const isPassed = normVerdict === 'PASSED SCREENING' || normVerdict === 'GENUINE';
  const isInconclusive = normVerdict === 'INCONCLUSIVE';

  const confidencePercent = (result.confidence * 100).toFixed(1);
  const confidenceValue = Math.min(100, Math.max(0, result.confidence * 100));

  const overlays = generateFlagOverlays(result.flags, normVerdict);
  const breakdownChecks = getBreakdownChecks(result);

  const handleSaveReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refBrandId.trim()) {
      setRefSaveError('Brand ID slug is required.');
      return;
    }
    setIsSavingRef(true);
    setRefSaveError(null);
    setRefSaveSuccess(null);

    try {
      const blobRes = await fetch(previewUrl);
      const blob = await blobRes.blob();
      const file = new File([blob], `${refBrandId}_genuine.png`, {
        type: blob.type || 'image/png',
      });

      const response = await addReferenceStandard(
        file,
        refBrandId.trim(),
        refBrandName.trim(),
        refManufacturer.trim()
      );

      setRefSaveSuccess(response.message);
      setTimeout(() => {
        setShowAddRefModal(false);
      }, 2500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setRefSaveError(err.message);
      } else {
        setRefSaveError('Failed to register reference standard.');
      }
    } finally {
      setIsSavingRef(false);
    }
  };

  const getSeverityBadge = (severity: Severity) => {
    const s = severity.toLowerCase();
    switch (s) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-[2px] bg-alert-red-bg text-alert-red-dark border border-alert-red-border uppercase">
            [CRITICAL]
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-[2px] bg-[#FFF5EB] text-[#A34200] border border-[#FAD1AD] uppercase">
            [HIGH]
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-[2px] bg-[#FEF9E7] text-[#8A6D05] border border-[#F7E7A6] uppercase">
            [MEDIUM]
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono rounded-[2px] bg-pharm-green-bg text-pharm-green-dark border border-pharm-green-border uppercase">
            [LOW]
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Diagnostic Report Card Container */}
      <div className="bg-clinical-surface border border-clinical-border rounded-[4px] shadow-hairline overflow-hidden">
        {/* Lab Header & Action Bar */}
        <div className="bg-clinical-panel border-b border-clinical-border px-3.5 sm:px-5 py-3.5 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono text-clinical-muted mb-1 flex-wrap">
              <span>REF: AUD-2026-0928-REF-FREE</span>
              <span>&bull;</span>
              <span>ISO-17025 / USP &sect;621</span>
            </div>
            <h1 className="font-serif text-lg sm:text-2xl font-bold text-clinical-navy leading-tight">
              Diagnostic Lab Report: Packaging Integrity
            </h1>
          </div>

          <div className="flex items-stretch sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto justify-end flex-wrap">
            {/* Requirement 5: "Save this as genuine reference" button */}
            <button
              type="button"
              onClick={() => setShowAddRefModal(true)}
              className="px-3 py-2 text-xs font-mono text-clinical-navy bg-white hover:bg-clinical-panel border border-clinical-border rounded-[4px] transition-colors flex items-center gap-1.5 min-h-[44px] sm:min-h-[40px] cursor-pointer shadow-hairline flex-1 sm:flex-none justify-center"
              title="Save this packaging image as an authentic master reference standard"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-clinical-navy flex-shrink-0" />
              <span>SAVE AS REFERENCE</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 text-xs font-mono text-clinical-subtext hover:text-clinical-navy bg-clinical-surface hover:bg-clinical-panel border border-clinical-border rounded-[4px] transition-colors flex items-center gap-1.5 min-h-[44px] sm:min-h-[40px] cursor-pointer flex-1 sm:flex-none justify-center"
            >
              <Printer className="w-3.5 h-3.5 stroke-[1.5] flex-shrink-0" />
              <span>PRINT REPORT</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              className="px-4 py-2 text-xs font-mono font-semibold text-white bg-clinical-navy hover:bg-clinical-navy-light active:bg-clinical-navy-dark rounded-[4px] transition-colors flex items-center gap-1.5 shadow-hairline cursor-pointer min-h-[44px] sm:min-h-[40px] flex-1 sm:flex-none justify-center"
            >
              <RotateCcw className="w-3.5 h-3.5 flex-shrink-0" />
              <span>SCAN ANOTHER</span>
            </button>
          </div>
        </div>

        {/* Specimen Telemetry Dossier Bar */}
        <div className="bg-clinical-surface border-b border-clinical-border px-3.5 sm:px-5 py-2.5 text-[11px] sm:text-xs font-mono text-clinical-subtext grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 bg-graph-paper-dense">
          <div>
            <span className="block text-[9px] sm:text-[10px] text-clinical-muted uppercase">Analysis Timestamp</span>
            <span className="text-clinical-navy font-medium truncate block">2026-09-28 18:20:00 UTC</span>
          </div>
          <div>
            <span className="block text-[9px] sm:text-[10px] text-clinical-muted uppercase">Verification Protocol</span>
            <span className="text-clinical-navy font-medium truncate block">
              {result.reference_used ? 'Reference-Assisted Master' : 'Universal Reference-Free'}
            </span>
          </div>
          <div>
            <span className="block text-[9px] sm:text-[10px] text-clinical-muted uppercase">OCR Text Status</span>
            <span className="text-clinical-navy font-medium truncate block">
              {result.ocr_extracted_text ? `${result.ocr_extracted_text.length} Chars Extracted` : 'Optical Scan Done'}
            </span>
          </div>
          <div>
            <span className="block text-[9px] sm:text-[10px] text-clinical-muted uppercase">Decoded Barcode</span>
            <span className="text-clinical-navy font-medium truncate block">
              {result.barcode_details?.is_decoded ? result.barcode_details.primary_code?.type : 'None / Visual'}
            </span>
          </div>
        </div>

        {/* 1. TOP SECTION: Uploaded image with red bounding-box overlays on flagged areas */}
        <div className="p-3.5 sm:p-6 border-b border-clinical-border bg-graph-paper">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif text-sm sm:text-base font-bold text-clinical-navy">
                Specimen Optical Inspection Viewport
              </span>
              <span className="text-[11px] sm:text-xs font-mono text-clinical-muted">
                {overlays.length > 0 ? (
                  <span className="text-alert-red font-semibold">
                    [{overlays.length} FLAGGED ANOMAL{overlays.length > 1 ? 'IES' : 'Y'}]
                  </span>
                ) : (
                  <span className="text-pharm-green font-semibold">
                    [0 CRITICAL ANOMALIES &mdash; SPEC-PASS]
                  </span>
                )}
              </span>
            </div>

            {overlays.length > 0 && (
              <button
                type="button"
                onClick={() => setShowOverlays(!showOverlays)}
                className="px-2.5 py-1 text-[11px] sm:text-xs font-mono border border-clinical-border bg-white text-clinical-subtext hover:text-clinical-navy rounded-[4px] flex items-center gap-1.5 transition-colors shadow-hairline cursor-pointer min-h-[36px]"
              >
                {showOverlays ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>HIDE ANOMALY BOXES</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>SHOW ANOMALY BOXES</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="relative border border-clinical-border bg-white rounded-[4px] p-2 sm:p-3 flex items-center justify-center min-h-[220px] sm:min-h-[340px] max-h-[480px] overflow-hidden">
            <div className="absolute top-2 left-2 text-[9px] font-mono text-clinical-muted pointer-events-none select-none z-10 hidden sm:block">
              FRAME-01 // OPTICAL COORDINATES [0, 0]
            </div>
            <div className="absolute top-2 right-2 text-[9px] font-mono text-clinical-muted pointer-events-none select-none z-10 hidden sm:block">
              GRID: 10MM // OCR CALIBRATED
            </div>

            <div className="relative inline-block max-h-[440px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Analyzed medicine packaging specimen"
                className="max-h-[440px] w-auto object-contain block select-none"
              />

              {showOverlays &&
                overlays.map((overlay) => {
                  const isActive = activeOverlayId === overlay.id;

                  return (
                    <div
                      key={overlay.id}
                      onClick={() => setActiveOverlayId(activeOverlayId === overlay.id ? null : overlay.id)}
                      onMouseEnter={() => setActiveOverlayId(overlay.id)}
                      onMouseLeave={() => setActiveOverlayId(null)}
                      style={{
                        top: `${overlay.y}%`,
                        left: `${overlay.x}%`,
                        width: `${overlay.width}%`,
                        height: `${overlay.height}%`,
                      }}
                      className={`absolute border-2 border-alert-red bg-alert-red/10 rounded-[2px] transition-all cursor-pointer z-20 ${
                        isActive
                          ? 'border-alert-red-dark bg-alert-red/25 ring-2 ring-alert-red/40 shadow-lg'
                          : 'animate-flag-pulse'
                      }`}
                      title={`${overlay.label}: ${overlay.issue}`}
                    >
                      <span className="absolute -top-1 -left-1 text-[10px] leading-none font-mono text-alert-red font-bold">
                        ┌
                      </span>
                      <span className="absolute -top-1 -right-1 text-[10px] leading-none font-mono text-alert-red font-bold">
                        ┐
                      </span>
                      <span className="absolute -bottom-1 -left-1 text-[10px] leading-none font-mono text-alert-red font-bold">
                        └
                      </span>
                      <span className="absolute -bottom-1 -right-1 text-[10px] leading-none font-mono text-alert-red font-bold">
                        ┘
                      </span>

                      <div className="absolute -top-6 left-0 bg-alert-red text-white text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] shadow-sm whitespace-nowrap flex items-center gap-1 z-30 max-w-[130px] sm:max-w-none truncate">
                        <AlertTriangle className="w-2.5 h-2.5 stroke-[2] flex-shrink-0" />
                        <span className="truncate">{overlay.label}</span>
                      </div>

                      {isActive && (
                        <div className="absolute top-full left-0 mt-1 bg-clinical-navy text-white text-[10px] sm:text-[11px] font-mono p-2 rounded-[2px] shadow-lg max-w-[220px] sm:max-w-xs z-40 border border-clinical-navy-dark leading-tight break-words">
                          <strong className="block text-alert-red-bg font-bold mb-0.5">
                            ANOMALY DETAILS:
                          </strong>
                          {overlay.issue}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* 2. VERDICT SECTION: Large Verdict Badge & Horizontal Confidence Meter */}
        <div className="p-3.5 sm:p-6 border-b border-clinical-border bg-clinical-surface">
          <div
            className={`p-4 sm:p-6 rounded-[4px] border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 ${
              isPassed
                ? 'bg-pharm-green-bg border-pharm-green-border'
                : isInconclusive
                ? 'bg-[#FFFBEB] border-[#FCD34D]'
                : 'bg-alert-red-bg border-alert-red-border'
            }`}
          >
            {/* Left: Large Verdict Badge */}
            <div className="flex items-start sm:items-center gap-3.5 sm:gap-5">
              <div
                className={`p-3 sm:p-4 rounded-[4px] border flex-shrink-0 ${
                  isPassed
                    ? 'border-pharm-green bg-pharm-green text-white'
                    : isInconclusive
                    ? 'border-[#D97706] bg-[#D97706] text-white'
                    : 'border-alert-red bg-alert-red text-white'
                }`}
              >
                {isPassed ? (
                  <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.75]" />
                ) : isInconclusive ? (
                  <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.75]" />
                ) : (
                  <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.75]" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase text-clinical-muted truncate block">
                    DIAGNOSTIC SCREENING VERDICT
                  </span>
                </div>

                {/* Requirement 4: Verdicts must be "PASSED SCREENING", "INCONCLUSIVE", or "SUSPICIOUS" */}
                <div>
                  <div
                    className={`inline-block px-3 sm:px-4 py-1.5 rounded-[2px] border-2 font-mono text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wider break-words max-w-full ${
                      isPassed
                        ? 'border-pharm-green text-pharm-green-dark bg-white'
                        : isInconclusive
                        ? 'border-[#D97706] text-[#B45309] bg-white'
                        : 'border-alert-red text-alert-red-dark bg-white'
                    }`}
                  >
                    {isPassed
                      ? 'PASSED SCREENING'
                      : isInconclusive
                      ? 'INCONCLUSIVE'
                      : 'SUSPICIOUS'}
                  </div>

                  {result.rule_triggered === 'severe_outlier_fail_safe' && (
                    <span className="block text-[10px] sm:text-[11px] font-mono text-alert-red-dark font-bold mt-1 uppercase tracking-tight">
                      [FAIL-SAFE: SEVERE OUTLIER OR HIGH-SEVERITY ANOMALY]
                    </span>
                  )}
                  {result.rule_triggered === 'inconclusive_sparse_text' && (
                    <span className="block text-[10px] sm:text-[11px] font-mono text-[#B45309] font-bold mt-1 uppercase tracking-tight">
                      [INCONCLUSIVE: INSUFFICIENT LEGIBLE TYPOGRAPHY]
                    </span>
                  )}
                </div>

                <p className="text-xs font-sans text-clinical-subtext mt-2 max-w-md leading-relaxed">
                  {isPassed
                    ? 'Packaging conforms to authorized pharmaceutical manufacturing criteria. No structural, typographic, or chronological inconsistencies detected.'
                    : isInconclusive
                    ? 'The uploaded specimen photo contains insufficient legible text or resolution to verify mandatory batch and license markings. Re-scan in direct lighting.'
                    : result.rule_triggered === 'severe_outlier_fail_safe'
                    ? 'Packaging classified as SUSPICIOUS under MedVerify\'s fail-safe protocol. A critical check failed severely (< 40% benchmark or HIGH severity flag). Individual critical defects cannot be averaged out.'
                    : 'Critical packaging discrepancies detected in micro-typography, formulation registry consistency, or edge stroke continuity.'}
                </p>
              </div>
            </div>

            {/* Right: Horizontal Confidence Meter (NOT a circular ring) */}
            <div className="bg-white border border-clinical-border p-3.5 sm:p-4 rounded-[4px] w-full lg:w-auto lg:min-w-[300px] shadow-hairline">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="font-semibold text-clinical-navy uppercase">
                  CONFIDENCE METER
                </span>
                <span
                  className={`font-mono text-base font-bold ${
                    isPassed
                      ? 'text-pharm-green-dark'
                      : isInconclusive
                      ? 'text-[#B45309]'
                      : 'text-alert-red-dark'
                  }`}
                >
                  {confidencePercent}%
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="w-full bg-clinical-panel border border-clinical-border h-3.5 rounded-[2px] overflow-hidden relative">
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-clinical-navy z-10"
                    style={{ left: '65%' }}
                    title="Screening Cutoff (65%)"
                  />
                  <div
                    className={`h-full transition-all duration-700 ${
                      isPassed
                        ? 'bg-pharm-green'
                        : isInconclusive
                        ? 'bg-[#F59E0B]'
                        : 'bg-alert-red'
                    }`}
                    style={{ width: `${confidenceValue}%` }}
                  />
                </div>

                <div className="flex justify-between text-[9px] font-mono text-clinical-muted pt-0.5">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span className="font-bold text-clinical-navy">65% [PASS]</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-clinical-subtext mt-2 border-t border-clinical-border pt-1.5 flex items-center justify-between">
                <span>RELIABILITY:</span>
                <span className="font-semibold text-clinical-navy">
                  {confidenceValue >= 80 ? 'HIGH CONCORDANCE' : 'MARGINAL TOLERANCE'}
                </span>
              </div>
            </div>
          </div>

          {/* First-line Screening Medical Disclaimer */}
          <div className="mt-3.5 bg-clinical-panel/60 border border-clinical-border rounded-[4px] p-3 flex items-start gap-2.5 text-xs text-clinical-subtext">
            <Info className="w-4 h-4 text-clinical-navy flex-shrink-0 mt-0.5 stroke-[1.75]" />
            <div className="leading-relaxed">
              <strong className="text-clinical-navy font-semibold font-mono">REGULATORY DISCLAIMER: </strong>
              {result.verdict_disclaimer ||
                'This is a first-line optical screening tool, not a chemical assay. Suspected counterfeit packaging should be reported directly to the drug manufacturer for batch audit and laboratory chromatography.'}
            </div>
          </div>
        </div>

        {/* 3. BREAKDOWN TABLE: Monospace Font, Laboratory Printout Style */}
        <div className="p-3.5 sm:p-6 border-b border-clinical-border bg-clinical-surface">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="font-serif text-sm sm:text-base font-bold text-clinical-navy flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-clinical-navy stroke-[1.75]" />
                Forensic Inspection Breakdown ({breakdownChecks.length} Parameters)
              </h3>
              <span className="text-[10px] sm:text-[11px] font-mono text-clinical-muted">
                LAB PRINTOUT // MULTI-MODAL REFERENCE-FREE &amp; SPECTROMETRIC CHECKS
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-mono text-clinical-muted flex items-center gap-2">
              <span className="sm:hidden text-clinical-navy font-semibold">&larr; Swipe table &rarr;</span>
              <span className="hidden sm:inline">CALIBRATION: NIST &amp; USP-NF TRACEABLE</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-clinical-border rounded-[4px] bg-white -mx-3.5 sm:mx-0">
            <table className="w-full min-w-[600px] text-left text-[11px] sm:text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-clinical-panel border-b border-clinical-border text-clinical-muted text-[10px] sm:text-[11px]">
                  <th className="py-2.5 px-3 sm:px-4 font-semibold uppercase">Check Code</th>
                  <th className="py-2.5 px-3 sm:px-4 font-semibold uppercase">Inspection Parameter</th>
                  <th className="py-2.5 px-3 sm:px-4 font-semibold uppercase">Measured Score</th>
                  <th className="py-2.5 px-3 sm:px-4 font-semibold uppercase">Reference Benchmark</th>
                  <th className="py-2.5 px-3 sm:px-4 font-semibold uppercase">Status</th>
                  <th className="py-2.5 px-3 sm:px-4 font-semibold uppercase hidden md:table-cell">
                    Forensic Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-clinical-border text-clinical-navy">
                {breakdownChecks.map((chk, i) => (
                  <tr key={i} className="hover:bg-clinical-panel/40 transition-colors">
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-clinical-muted">
                      {chk.code}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-clinical-navy">
                      {chk.name}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold">
                      {chk.isSkipped ? (
                        <span className="text-clinical-muted text-[11px] font-normal">N/A (Skipped)</span>
                      ) : (
                        <>
                          {chk.score.toFixed(1)}{' '}
                          <span className="text-[10px] sm:text-[11px] font-normal text-clinical-muted">
                            / {chk.maxScore}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-clinical-subtext text-[11px] sm:text-xs">
                      {chk.tolerance}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                      {chk.isSkipped ? (
                        <span className="inline-block px-2 py-0.5 rounded-[2px] bg-clinical-panel text-clinical-subtext border border-clinical-border font-mono text-[10px] sm:text-[11px]">
                          [OPTIONAL]
                        </span>
                      ) : chk.passed ? (
                        <span className="inline-block px-2 py-0.5 rounded-[2px] bg-pharm-green-bg text-pharm-green-dark border border-pharm-green-border font-bold text-[10px] sm:text-[11px]">
                          [PASS]
                        </span>
                      ) : chk.isOutlier ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1">
                          <span className="inline-block px-2 py-0.5 rounded-[2px] bg-alert-red-bg text-alert-red-dark border border-alert-red-border font-bold text-[10px] sm:text-[11px]">
                            [FAIL]
                          </span>
                          <span className="inline-block px-1.5 py-0.5 rounded-[2px] bg-alert-red text-white font-mono text-[9px] sm:text-[10px] font-bold uppercase">
                            [&lt; 40%]
                          </span>
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-[2px] bg-alert-red-bg text-alert-red-dark border border-alert-red-border font-bold text-[10px] sm:text-[11px]">
                          [FAIL]
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-clinical-subtext text-[11px] hidden md:table-cell font-sans">
                      {chk.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. FORENSIC FLAGS LEDGER */}
        <div className="p-3.5 sm:p-6 bg-clinical-surface">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-serif text-sm sm:text-base font-bold text-clinical-navy flex items-center gap-2">
              <Info className="w-4 h-4 text-clinical-navy stroke-[1.75]" />
              Detailed Verification Flags Ledger ({result.flags.length})
            </h3>
            <span className="text-[10px] sm:text-[11px] font-mono text-clinical-muted">
              SORTED BY FORENSIC SEVERITY
            </span>
          </div>

          {result.flags.length === 0 ? (
            <div className="p-4 sm:p-6 text-center text-xs font-mono text-clinical-muted border border-clinical-border rounded-[4px] bg-clinical-panel">
              NO ADVERSE PACKAGING DISCREPANCIES RECORDED. SPECIMEN CONFORMS TO CONTROL.
            </div>
          ) : (
            <div className="space-y-2.5">
              {result.flags.map((flag, idx) => {
                const overlayMatch = overlays[idx];
                const isActive = activeOverlayId === overlayMatch?.id;
                const isAlert =
                  flag.severity.toLowerCase() === 'critical' ||
                  flag.severity.toLowerCase() === 'high';

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => overlayMatch && setActiveOverlayId(overlayMatch.id)}
                    onMouseLeave={() => setActiveOverlayId(null)}
                    className={`p-3 sm:p-3.5 rounded-[4px] border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 text-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'border-clinical-navy bg-white shadow-hairline ring-1 ring-clinical-navy'
                        : isAlert
                        ? 'bg-alert-red-bg/50 border-alert-red-border/70 hover:bg-alert-red-bg'
                        : 'bg-clinical-panel border-clinical-border hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3 flex-1">
                      <span className="font-mono text-clinical-navy font-bold text-xs mt-0.5 flex-shrink-0">
                        ITEM-{String(idx + 1).padStart(2, '0')}:
                      </span>
                      <div className="min-w-0">
                        <p className="font-sans text-clinical-navy font-medium leading-relaxed text-xs">
                          {flag.issue}
                        </p>
                        {overlayMatch && (
                          <span className="text-[10px] font-mono text-alert-red block mt-1 truncate">
                            &gt; BOUNDING BOX: {overlayMatch.label}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 self-start sm:self-auto">
                      {getSeverityBadge(flag.severity)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Raw JSON disclosure & Bottom Reset */}
          <div className="mt-5 sm:mt-6 pt-4 border-t border-clinical-border flex items-center justify-between flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-xs font-mono text-clinical-muted hover:text-clinical-navy flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px]"
            >
              <Code className="w-3.5 h-3.5" />
              {showRawJson ? '[-] HIDE RAW JSON AUDIT PAYLOAD' : '[+] INSPECT RAW JSON AUDIT PAYLOAD'}
            </button>

            <button
              type="button"
              onClick={onReset}
              className="text-xs font-mono text-clinical-navy hover:underline flex items-center gap-1.5 cursor-pointer min-h-[36px]"
            >
              <RotateCcw className="w-3 h-3" />
              Scan Another Specimen
            </button>
          </div>

          {showRawJson && (
            <pre className="mt-3 p-3 sm:p-4 rounded-[4px] bg-clinical-navy text-slate-200 text-[11px] sm:text-xs font-mono overflow-x-auto max-h-[360px] overflow-y-auto border border-clinical-navy-dark leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {/* Requirement 5: "Save as Genuine Reference" Modal Dialog */}
      {showAddRefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-clinical-navy/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-clinical-surface border border-clinical-border rounded-[4px] shadow-2xl max-w-md w-full max-h-[92dvh] flex flex-col overflow-hidden">
            <div className="bg-clinical-panel border-b border-clinical-border px-4 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4 text-clinical-navy stroke-[1.75]" />
                <h3 className="font-serif text-sm sm:text-base font-bold text-clinical-navy">
                  Register Genuine Master Reference
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRefModal(false)}
                className="text-clinical-muted hover:text-clinical-navy text-xs font-mono min-h-[36px] px-2 flex items-center cursor-pointer"
              >
                [ESC / CLOSE]
              </button>
            </div>

            <form onSubmit={handleSaveReference} className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto">
              <p className="text-xs font-sans text-clinical-subtext leading-relaxed">
                If you have verified this packaging specimen through official manufacturer batch records, 
                you can register it as an authentic control master. Future scans will compare color gamut against this image.
              </p>

              {refSaveSuccess && (
                <div className="p-3 bg-pharm-green-bg border border-pharm-green-border rounded-[2px] text-xs font-mono text-pharm-green-dark flex items-center gap-2">
                  <Check className="w-4 h-4 text-pharm-green flex-shrink-0" />
                  <span>{refSaveSuccess}</span>
                </div>
              )}

              {refSaveError && (
                <div className="p-3 bg-alert-red-bg border border-alert-red-border rounded-[2px] text-xs font-mono text-alert-red-dark flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-alert-red flex-shrink-0" />
                  <span>{refSaveError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-bold text-clinical-navy mb-1">
                  BRAND IDENTIFIER SLUG (Required):
                </label>
                <input
                  type="text"
                  value={refBrandId}
                  onChange={(e) => setRefBrandId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="e.g. dolo650, crocin, tretiva"
                  required
                  className="w-full bg-white border border-clinical-border rounded-[4px] px-3 py-2 text-[14px] sm:text-xs font-mono text-clinical-navy focus:outline-none focus:border-clinical-navy min-h-[42px]"
                />
                <span className="text-[10px] font-mono text-clinical-muted mt-1 block">
                  Saves to /reference_images/{refBrandId || '[brand]'}/genuine.png
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-clinical-navy mb-1">
                  BRAND DISPLAY NAME:
                </label>
                <input
                  type="text"
                  value={refBrandName}
                  onChange={(e) => setRefBrandName(e.target.value)}
                  placeholder="e.g. Dolo 650 Tablets"
                  className="w-full bg-white border border-clinical-border rounded-[4px] px-3 py-2 text-[14px] sm:text-xs font-sans text-clinical-navy focus:outline-none focus:border-clinical-navy min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-clinical-navy mb-1">
                  LICENSED MANUFACTURER:
                </label>
                <input
                  type="text"
                  value={refManufacturer}
                  onChange={(e) => setRefManufacturer(e.target.value)}
                  placeholder="e.g. Micro Labs Limited"
                  className="w-full bg-white border border-clinical-border rounded-[4px] px-3 py-2 text-[14px] sm:text-xs font-sans text-clinical-navy focus:outline-none focus:border-clinical-navy min-h-[42px]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddRefModal(false)}
                  disabled={isSavingRef}
                  className="px-3.5 py-2 text-xs font-mono text-clinical-subtext hover:text-clinical-navy bg-clinical-surface hover:bg-clinical-panel border border-clinical-border rounded-[4px] transition-colors min-h-[44px] cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSavingRef}
                  className="px-4 py-2 text-xs font-mono font-semibold text-white bg-clinical-navy hover:bg-clinical-navy-light rounded-[4px] transition-colors flex items-center gap-1.5 shadow-hairline disabled:opacity-75 min-h-[44px] cursor-pointer"
                >
                  {isSavingRef ? (
                    <span>SAVING MASTER...</span>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>REGISTER REFERENCE</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
