'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  ScanLine,
  Palette,
  Sliders,
  FileText,
  CalendarCheck,
  Database,
  QrCode,
  ShieldAlert,
} from 'lucide-react';

export function HowItWorks() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-clinical-surface border border-clinical-border rounded-[4px] shadow-hairline overflow-hidden">
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-clinical-panel/60 hover:bg-clinical-panel px-4 sm:px-6 py-3.5 flex items-center justify-between text-left transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-[2px] bg-white border border-clinical-border text-clinical-navy group-hover:border-clinical-navy transition-colors">
            <Cpu className="w-4 h-4 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif text-sm sm:text-base font-bold text-clinical-navy">
                How It Works: Reference-Free &amp; Optical Detection Architecture
              </span>
              <span className="text-[10px] font-mono uppercase bg-clinical-navy text-white px-1.5 py-0.5 rounded-[2px]">
                Universal Inspection
              </span>
            </div>
            <p className="text-xs font-sans text-clinical-subtext mt-0.5">
              Explainable multi-modal computer vision and regulatory forensic engine for ANY medicine packaging
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-clinical-muted flex-shrink-0 ml-2">
          <span className="hidden sm:inline">
            {isOpen ? '[HIDE ARCHITECTURE]' : '[EXPLAIN CHECKS]'}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-clinical-navy" />
          ) : (
            <ChevronDown className="w-4 h-4 text-clinical-navy" />
          )}
        </div>
      </button>

      {/* Accordion Content Body */}
      {isOpen && (
        <div className="p-4 sm:p-6 border-t border-clinical-border bg-graph-paper-white space-y-6">
          <p className="text-xs sm:text-sm font-sans text-clinical-subtext leading-relaxed">
            MedVerify does not require prior packaging templates for every medicine brand. It couples universal 
            physical print forensics with optical character recognition (OCR), regex timeline validation, and 
            Indian pharmacopeial database cross-checking:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Check 1: Sharpness */}
            <div className="bg-white border border-clinical-border rounded-[4px] p-4 shadow-hairline flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-clinical-navy">
                    <ScanLine className="w-4 h-4 text-clinical-navy stroke-[1.75]" />
                    <span>01. PRINT SHARPNESS</span>
                  </div>
                  <span className="text-[10px] font-mono text-clinical-navy bg-clinical-panel px-1.5 py-0.5 rounded-[2px] border border-clinical-border font-bold">
                    REFERENCE-FREE
                  </span>
                </div>
                <h4 className="font-serif text-sm font-bold text-clinical-navy mb-1.5">
                  Laplacian Spatial Focus Variance
                </h4>
                <p className="text-xs font-sans text-clinical-subtext leading-relaxed mb-3">
                  <strong className="text-clinical-navy">Plain English:</strong> Authentic medicine packaging is printed on 
                  industrial offset lithography presses yielding sharp micro-edges. Desktop counterfeit copies exhibit 
                  optical blur and low second-order derivative variance.
                </p>
              </div>
              <div className="bg-clinical-panel p-2 rounded-[2px] border border-clinical-border text-[10px] font-mono text-clinical-navy">
                <code>cv2.Laplacian(gray, CV_64F).var()</code>
              </div>
            </div>

            {/* Check 2: Edge Quality */}
            <div className="bg-white border border-clinical-border rounded-[4px] p-4 shadow-hairline flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-clinical-navy">
                    <Sliders className="w-4 h-4 text-clinical-navy stroke-[1.75]" />
                    <span>02. EDGE &amp; CONTOUR CONTINUITY</span>
                  </div>
                  <span className="text-[10px] font-mono text-clinical-navy bg-clinical-panel px-1.5 py-0.5 rounded-[2px] border border-clinical-border font-bold">
                    REFERENCE-FREE
                  </span>
                </div>
                <h4 className="font-serif text-sm font-bold text-clinical-navy mb-1.5">
                  Canny Coherence &amp; Connected Strokes
                </h4>
                <p className="text-xs font-sans text-clinical-subtext leading-relaxed mb-3">
                  <strong className="text-clinical-navy">Plain English:</strong> Counterfeits printed with consumer inkjets spray 
                  microscopic ink droplets (dithering) that leave ragged, fragmented letter edges. Canny stroke continuity 
                  flags jagged, fragmented typography.
                </p>
              </div>
              <div className="bg-clinical-panel p-2 rounded-[2px] border border-clinical-border text-[10px] font-mono text-clinical-navy">
                <code>cv2.Canny + connectedComponents()</code>
              </div>
            </div>

            {/* Check 3: OCR Fields */}
            <div className="bg-white border border-clinical-border rounded-[4px] p-4 shadow-hairline flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-clinical-navy">
                    <FileText className="w-4 h-4 text-clinical-navy stroke-[1.75]" />
                    <span>03. MANDATORY REGULATORY FIELDS</span>
                  </div>
                  <span className="text-[10px] font-mono text-clinical-navy bg-clinical-panel px-1.5 py-0.5 rounded-[2px] border border-clinical-border font-bold">
                    REFERENCE-FREE
                  </span>
                </div>
                <h4 className="font-serif text-sm font-bold text-clinical-navy mb-1.5">
                  OCR Text Segmentation &amp; Calibrated Regex
                </h4>
                <p className="text-xs font-sans text-clinical-subtext leading-relaxed mb-3">
                  <strong className="text-clinical-navy">Plain English:</strong> Under statutory drug laws, every genuine commercial 
                  pack must visibly display a Batch/Lot code, Maximum Retail Price (MRP), and Manufacturing License Number. 
                  Missing fields trigger regulatory non-compliance warnings.
                </p>
              </div>
              <div className="bg-clinical-panel p-2 rounded-[2px] border border-clinical-border text-[10px] font-mono text-clinical-navy">
                <code>pytesseract + Regex Pattern Suite</code>
              </div>
            </div>

            {/* Check 4: Date Logic */}
            <div className="bg-white border border-clinical-border rounded-[4px] p-4 shadow-hairline flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-clinical-navy">
                    <CalendarCheck className="w-4 h-4 text-clinical-navy stroke-[1.75]" />
                    <span>04. DATE TIMELINE &amp; SHELF-LIFE</span>
                  </div>
                  <span className="text-[10px] font-mono text-clinical-navy bg-clinical-panel px-1.5 py-0.5 rounded-[2px] border border-clinical-border font-bold">
                    REFERENCE-FREE
                  </span>
                </div>
                <h4 className="font-serif text-sm font-bold text-clinical-navy mb-1.5">
                  Chronological Consistency Audit
                </h4>
                <p className="text-xs font-sans text-clinical-subtext leading-relaxed mb-3">
                  <strong className="text-clinical-navy">Plain English:</strong> Counterfeiters frequently make egregious printing 
                  blunders like stamping an Expiry Date that precedes the Manufacturing Date (EXP &le; MFG) or distributing 
                  already expired medication.
                </p>
              </div>
              <div className="bg-clinical-panel p-2 rounded-[2px] border border-clinical-border text-[10px] font-mono text-clinical-navy">
                <code>EXP &gt; MFG &amp; Shelf-Life Validation</code>
              </div>
            </div>

            {/* Check 5: Database Cross-Check */}
            <div className="bg-white border border-clinical-border rounded-[4px] p-4 shadow-hairline flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-clinical-navy">
                    <Database className="w-4 h-4 text-clinical-navy stroke-[1.75]" />
                    <span>05. MEDICINE REGISTRY CROSS-CHECK</span>
                  </div>
                  <span className="text-[10px] font-mono text-clinical-navy bg-clinical-panel px-1.5 py-0.5 rounded-[2px] border border-clinical-border font-bold">
                    REFERENCE-FREE
                  </span>
                </div>
                <h4 className="font-serif text-sm font-bold text-clinical-navy mb-1.5">
                  Fuzzy String Matching &amp; Typo Detection
                </h4>
                <p className="text-xs font-sans text-clinical-subtext leading-relaxed mb-3">
                  <strong className="text-clinical-navy">Plain English:</strong> Cross-checks OCR text against 100+ Indian medicines 
                  in <code>/data/medicines.csv</code>. Flags near-miss typo spellings (e.g. &quot;Dollo 650&quot; or &quot;D0L0&quot;) and validates 
                  whether active ingredients and manufacturer names match official records.
                </p>
              </div>
              <div className="bg-clinical-panel p-2 rounded-[2px] border border-clinical-border text-[10px] font-mono text-clinical-navy">
                <code>rapidfuzz.fuzz.token_sort_ratio</code>
              </div>
            </div>

            {/* Check 6: Barcode & QR */}
            <div className="bg-white border border-clinical-border rounded-[4px] p-4 shadow-hairline flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-clinical-navy">
                    <QrCode className="w-4 h-4 text-clinical-navy stroke-[1.75]" />
                    <span>06. BARCODE &amp; GS1 DATAMATRIX</span>
                  </div>
                  <span className="text-[10px] font-mono text-clinical-navy bg-clinical-panel px-1.5 py-0.5 rounded-[2px] border border-clinical-border font-bold">
                    OPTICAL DECODE
                  </span>
                </div>
                <h4 className="font-serif text-sm font-bold text-clinical-navy mb-1.5">
                  1D/2D Machine Decodability
                </h4>
                <p className="text-xs font-sans text-clinical-subtext leading-relaxed mb-3">
                  <strong className="text-clinical-navy">Plain English:</strong> Scans for GS1 DataMatrix or EAN-13 barcodes. If a 
                  barcode pattern is visually present on the carton but cannot be optically decoded due to bleeding toner, 
                  it is flagged as a quality defect.
                </p>
              </div>
              <div className="bg-clinical-panel p-2 rounded-[2px] border border-clinical-border text-[10px] font-mono text-clinical-navy">
                <code>pyzbar + cv2.barcode.BarcodeDetector</code>
              </div>
            </div>
          </div>

          {/* Optional Color Match & Decision Rules Banner */}
          <div className="bg-clinical-panel border border-clinical-border rounded-[4px] p-4 space-y-3 text-xs font-mono text-clinical-navy">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-clinical-border pb-2.5">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-clinical-navy" />
                <span className="font-bold">OPTIONAL MASTER COLOR MATCH (HSV HISTOGRAM):</span>
              </div>
              <span className="text-[11px] text-clinical-subtext">
                Dynamic Re-normalization Active
              </span>
            </div>
            <p className="font-sans text-clinical-subtext text-xs leading-relaxed">
              When an authentic master reference image is registered for a specific brand, MedVerify runs 2D Hue-Saturation 
              histogram correlation (<code>cv2.compareHist</code>). If no reference exists, this check is gracefully omitted 
              and weights are automatically re-normalized across the 5 reference-free checks so the score is always out of 100.
            </p>

            <div className="pt-2 border-t border-clinical-border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-alert-red flex-shrink-0" />
                <strong className="text-alert-red-dark uppercase">
                  NON-NEGOTIABLE HARD RULE:
                </strong>
                <span className="font-sans text-clinical-subtext">
                  If ANY individual check triggers a HIGH-severity flag (e.g. brand typo, date paradox, unreadable blur), 
                  the overall verdict CANNOT be &quot;PASSED SCREENING&quot;.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
