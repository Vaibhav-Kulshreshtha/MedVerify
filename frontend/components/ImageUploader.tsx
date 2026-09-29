'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  X,
  FileText,
  Scan,
  Maximize2,
  CheckCircle,
  AlertTriangle,
  Building2,
  ScanLine,
  Sparkles,
} from 'lucide-react';
import { analyzePackaging, fetchBrands, DEFAULT_BRANDS, MedicineBrand } from '@/lib/api';
import { AnalysisResult } from '@/lib/types';

interface ImageUploaderProps {
  onAnalysisSuccess: (result: AnalysisResult, previewUrl: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function ImageUploader({
  onAnalysisSuccess,
  isLoading,
  setIsLoading,
  setError,
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Default to "auto" (Auto-detect / Other - Reference-free mode)
  const [selectedBrand, setSelectedBrand] = useState<string>('auto');
  const [brands, setBrands] = useState<MedicineBrand[]>(DEFAULT_BRANDS);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ticker for scanner passes during analysis
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      setScanStepIndex(0);
      timer = setInterval(() => {
        setScanStepIndex((prev) => (prev + 1) % 4);
      }, 700);
    }
    return () => clearInterval(timer);
  }, [isLoading]);

  // Fetch available brands on mount
  useEffect(() => {
    fetchBrands().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setBrands(loaded);
      }
    });
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Invalid specimen file format. Accepted types: JPEG, PNG, WebP.');
      return;
    }
    setError(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await analyzePackaging(selectedFile, selectedBrand);
      onAnalysisSuccess(result, previewUrl || '');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Specimen analysis halted: communication fault with diagnostics engine.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Demo test case loader for quick testing
  const loadDemoCase = async (brandId: string, type: 'genuine' | 'fake') => {
    setError(null);
    const targetBrand = brandId === 'auto' ? 'dolo650' : brandId;
    setSelectedBrand(targetBrand);
    const filename = `${targetBrand}_${type}.png`;
    const demoUrl = `/demo_samples/${filename}`;

    try {
      const res = await fetch(demoUrl);
      if (!res.ok) {
        throw new Error(`Demo sample file not found: ${demoUrl}`);
      }
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'image/png' });
      handleFile(file);
    } catch {
      generateCanvasFallback(targetBrand, type);
    }
  };

  const generateCanvasFallback = (brandId: string, type: 'genuine' | 'fake') => {
    const canvas = document.createElement('canvas');
    canvas.width = 860;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const brandInfo = brands.find((b) => b.id === brandId) || brands[0];
    const isGen = type === 'genuine';

    ctx.fillStyle = isGen ? '#FAF7F2' : '#F6ECEC';
    ctx.fillRect(0, 0, 860, 540);

    ctx.fillStyle = isGen ? brandInfo.color_theme : '#8C1B20';
    ctx.fillRect(25, 25, 810, 110);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px "Source Serif 4", serif';
    ctx.fillText(brandInfo.name.toUpperCase(), 50, 85);

    ctx.fillStyle = '#0F2A3F';
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.fillText(`SPECIMEN: ${isGen ? 'AUTHENTIC MASTER PACK' : 'SUSPICIOUS / COUNTERFEIT SAMPLE'}`, 50, 180);
    ctx.fillText(`BATCH LOT: ${brandInfo.lot_prefix}-9941B`, 50, 220);
    ctx.fillText(`MFG: ${brandInfo.manufacturer}`, 50, 260);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${brandId}_${type}.png`, { type: 'image/png' });
        handleFile(file);
      }
    }, 'image/png');
  };

  const currentBrandInfo = brands.find((b) => b.id === selectedBrand);

  const scanSteps = [
    'PASS 1/4: COMPUTING SPATIAL GRADIENTS (LAPLACIAN SHARPNESS & CANNY CONTOURS)...',
    'PASS 2/4: OPTICAL CHARACTER RECOGNITION (OCR TEXT SEGMENTATION & EXTRACTION)...',
    'PASS 3/4: REGULATORY REGEX FIELD AUDIT (BATCH, EXP > MFG TIMELINE, MRP, LIC)...',
    'PASS 4/4: PHARMACOPEIAL DATABASE CROSS-CHECK & OPTICAL BARCODE DECODING...',
  ];

  return (
    <div className="bg-clinical-surface border border-clinical-border rounded-[4px] shadow-hairline overflow-hidden">
      {/* Scanner Instrument Platen Bar */}
      <div className="bg-clinical-panel border-b border-clinical-border px-4 sm:px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Scan className="w-4 h-4 text-clinical-navy stroke-[1.75] flex-shrink-0" />
          <div>
            <h2 className="font-serif text-base sm:text-lg font-bold text-clinical-navy leading-none">
              Optical Document Scanner // Ingestion Bed
            </h2>
            <span className="text-[10px] sm:text-[11px] font-mono text-clinical-muted">
              STATION: FLATBED OPTICAL PLATEN A4 // 600 DPI CALIBRATED
            </span>
          </div>
        </div>

        {/* Demo Test Case Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <span className="text-[11px] font-mono text-clinical-muted hidden md:inline">
            TEST SPECIMENS:
          </span>
          <button
            type="button"
            onClick={() => loadDemoCase(selectedBrand, 'genuine')}
            disabled={isLoading}
            className="text-[11px] sm:text-xs font-mono px-2.5 py-1.5 rounded-[4px] border border-pharm-green-border text-pharm-green-dark bg-pharm-green-bg hover:bg-[#E2EFE7] transition-colors flex items-center gap-1.5 cursor-pointer flex-1 sm:flex-none justify-center"
            title="Load authentic reference test case"
          >
            <CheckCircle className="w-3.5 h-3.5 stroke-[1.75]" />
            TEST: GENUINE SPECIMEN
          </button>
          <button
            type="button"
            onClick={() => loadDemoCase(selectedBrand, 'fake')}
            disabled={isLoading}
            className="text-[11px] sm:text-xs font-mono px-2.5 py-1.5 rounded-[4px] border border-alert-red-border text-alert-red-dark bg-alert-red-bg hover:bg-[#F9E6E6] transition-colors flex items-center gap-1.5 cursor-pointer flex-1 sm:flex-none justify-center"
            title="Load blurred/desaturated fake test case"
          >
            <AlertTriangle className="w-3.5 h-3.5 stroke-[1.75]" />
            TEST: SUSPICIOUS FAKE
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Medicine Brand Dropdown with Auto-Detect as Default */}
        <div className="bg-clinical-panel/70 border border-clinical-border rounded-[4px] p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-clinical-navy stroke-[1.75] flex-shrink-0" />
            <div>
              <label
                htmlFor="brand-select-dropdown"
                className="text-xs font-mono font-bold text-clinical-navy block leading-none flex items-center gap-1.5"
              >
                SELECT MEDICINE BRAND:
                {selectedBrand === 'auto' && (
                  <span className="text-[10px] font-sans font-normal bg-clinical-navy text-white px-1.5 py-0.2 rounded-[2px]">
                    Universal Mode
                  </span>
                )}
              </label>
              <span className="text-[11px] font-sans text-clinical-subtext">
                {selectedBrand === 'auto'
                  ? 'Reference-free screening: OCR, date logic, database matching & sharpness'
                  : 'Target master reference for optional HSV color gamut comparison'}
              </span>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <select
              id="brand-select-dropdown"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full sm:w-auto bg-white border border-clinical-border text-clinical-navy font-mono text-xs px-3 py-2 rounded-[4px] focus:outline-none focus:border-clinical-navy shadow-hairline cursor-pointer"
            >
              {/* Requirement 3: Add "Auto-detect / Other" option as default */}
              <option value="auto">
                Auto-detect / Other (Reference-Free Universal Screening)
              </option>
              <optgroup label="Registered Authentic Reference Masters">
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.fullName}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileInputChange}
          className="hidden"
          id="scanner-image-input"
        />

        {/* View A: Empty Scanner Bed Ready for Upload */}
        {!previewUrl ? (
          <div className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`scanner-bed bg-graph-paper border border-dashed rounded-[4px] p-6 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative select-none ${
                dragActive
                  ? 'border-clinical-navy bg-clinical-panel'
                  : 'border-clinical-border-dark hover:border-clinical-navy hover:bg-clinical-panel/40'
              }`}
            >
              {/* Scanner Top Ruler Simulation */}
              <div className="absolute top-0 left-0 right-0 h-4 border-b border-clinical-border bg-clinical-panel/80 hidden sm:flex items-center justify-between px-3 text-[9px] font-mono text-clinical-muted pointer-events-none">
                <span>0mm</span>
                <span>50mm</span>
                <span>100mm</span>
                <span>150mm</span>
                <span>200mm</span>
                <span>250mm</span>
              </div>

              {/* Scanner Corner Alignment Guides */}
              <div className="absolute top-6 left-5 text-[10px] font-mono text-clinical-muted pointer-events-none hidden sm:block">
                ┌ ORIGIN [0, 0]
              </div>
              <div className="absolute top-6 right-3 text-[10px] font-mono text-clinical-muted pointer-events-none hidden sm:block">
                ┐
              </div>
              <div className="absolute bottom-3 left-5 text-[10px] font-mono text-clinical-muted pointer-events-none hidden sm:block">
                └
              </div>
              <div className="absolute bottom-3 right-3 text-[10px] font-mono text-clinical-muted pointer-events-none hidden sm:block">
                MAX [A4] ┘
              </div>

              {/* Scanner Center Optical Target */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[4px] border border-clinical-border bg-white flex items-center justify-center text-clinical-navy mb-3 sm:mb-4 shadow-hairline mt-2">
                <Upload className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
              </div>

              {/* Instructional Text */}
              <h3 className="font-serif text-base sm:text-xl font-bold text-clinical-navy mb-1.5 px-2">
                Place Medicine Packaging on Scanner Bed
              </h3>
              <p className="text-xs sm:text-sm font-sans text-clinical-subtext max-w-lg mb-4 leading-relaxed font-normal px-2">
                Upload a clear photo of the medicine packaging &mdash; front and batch number area for best results.
              </p>

              <div className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-mono text-clinical-muted bg-white px-3 py-1.5 border border-clinical-border rounded-[2px] max-w-full">
                <span>DRAG &amp; DROP</span>
                <span>&bull;</span>
                <span className="text-clinical-navy font-semibold underline underline-offset-2">
                  CLICK TO BROWSE
                </span>
                <span>&bull;</span>
                <span>JPG, PNG, WEBP</span>
              </div>
            </div>
          </div>
        ) : (
          /* View B: Preview Stage with Document Scanner Laser Sweep Animation during analysis */
          <div className="space-y-4 sm:space-y-5">
            <div className="relative border border-clinical-border bg-graph-paper-dense p-3 sm:p-5 rounded-[4px] overflow-hidden">
              {/* Scanner Top Telemetry */}
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-clinical-muted mb-2 sm:mb-3 pb-2 border-b border-clinical-border">
                <span className="flex items-center gap-1.5 text-clinical-navy font-semibold truncate">
                  <Maximize2 className="w-3.5 h-3.5 flex-shrink-0" />
                  OPTICAL SCANNER PLATEN // {selectedBrand === 'auto' ? 'UNIVERSAL REFERENCE-FREE' : currentBrandInfo?.name.toUpperCase()}
                </span>
                <span className="hidden sm:inline">600 DPI CALIBRATED</span>
              </div>

              {/* Preview Thumbnail Container */}
              <div className="relative rounded-[2px] overflow-hidden bg-white border border-clinical-border flex items-center justify-center min-h-[260px] sm:min-h-[340px] max-h-[460px] p-2 sm:p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Packaging scanner preview thumbnail"
                  className={`max-h-[420px] w-auto object-contain select-none transition-opacity duration-300 ${
                    isLoading ? 'opacity-90' : 'opacity-100'
                  }`}
                />

                {/* Optical Document Scanner Laser Sweep Animation */}
                {isLoading && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-pharm-green to-transparent shadow-[0_0_16px_#2D6A4F] animate-scan-laser">
                      <div className="h-14 -mt-14 bg-gradient-to-b from-transparent to-pharm-green/20" />
                    </div>

                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="bg-clinical-navy/90 text-white font-mono text-[10px] px-2 py-0.5 rounded-[2px] border border-clinical-border flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-pharm-green animate-pulse" />
                        DOCUMENT SCANNER IN PROGRESS
                      </span>
                    </div>

                    <div className="absolute bottom-3 inset-x-3 bg-clinical-navy/95 text-slate-200 border border-clinical-border p-2 rounded-[2px] text-[11px] font-mono flex items-center justify-between shadow-lg">
                      <div className="flex items-center gap-2 truncate">
                        <ScanLine className="w-3.5 h-3.5 text-pharm-green flex-shrink-0 animate-pulse" />
                        <span className="truncate text-white font-semibold">
                          {scanSteps[scanStepIndex]}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 hidden sm:inline flex-shrink-0">
                        OPENCV + OCR
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Specimen File Metadata Bar */}
              <div className="mt-2.5 sm:mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2 text-xs font-mono text-clinical-subtext border-t border-clinical-border pt-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-clinical-muted" />
                    FILE: <strong className="text-clinical-navy truncate max-w-[180px] sm:max-w-none">{selectedFile?.name}</strong>
                  </span>
                  <span>
                    SIZE: <strong className="text-clinical-navy">{selectedFile ? (selectedFile.size / 1024).toFixed(1) : 0} KB</strong>
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-clinical-muted">
                  MODE:{' '}
                  {selectedBrand === 'auto' ? (
                    <span className="text-clinical-navy font-semibold">
                      Universal Reference-Free (No Reference Needed)
                    </span>
                  ) : (
                    <span>
                      Target Reference: {currentBrandInfo?.reference_image}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs font-mono text-clinical-subtext justify-between sm:justify-start">
                <span>ANALYSIS PROTOCOL:</span>
                <span className="font-semibold text-clinical-navy bg-clinical-panel px-2 py-0.5 rounded-[2px] border border-clinical-border text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pharm-green" />
                  {selectedBrand === 'auto'
                    ? 'Reference-Free Forensic Suite (OCR + Date + DB + Sharpness)'
                    : 'Reference-Assisted (Master Color + Full Forensic Suite)'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={isLoading}
                  className="px-4 py-2.5 text-xs font-mono text-clinical-subtext hover:text-clinical-navy bg-clinical-surface hover:bg-clinical-panel border border-clinical-border rounded-[4px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                >
                  <X className="w-3.5 h-3.5" />
                  REPLACE SPECIMEN
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-6 py-2.5 text-xs font-mono font-semibold text-white bg-clinical-navy hover:bg-clinical-navy-light active:bg-clinical-navy-dark disabled:opacity-75 rounded-[4px] transition-colors border border-clinical-navy flex items-center justify-center gap-2 shadow-hairline cursor-pointer min-h-[42px]"
                >
                  {isLoading ? (
                    <>
                      <ScanLine className="w-4 h-4 text-pharm-green animate-pulse" />
                      <span>SCREENING PACKAGING (OPENCV + OCR)...</span>
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4 stroke-[1.75]" />
                      <span>ANALYZE PACKAGING</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
