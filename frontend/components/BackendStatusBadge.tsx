'use client';

import { useRef } from 'react';
import { ShieldCheck, X, CheckCircle2, Cpu } from 'lucide-react';

export function BackendStatusBadge() {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex items-center gap-2 rounded-[4px] border border-pharm-green-border bg-pharm-green-bg px-3 py-1.5 text-xs font-mono font-medium text-pharm-green-dark hover:bg-[#E2EFE7] transition-colors cursor-pointer shadow-hairline"
        title="View screening engine architecture"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pharm-green opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-pharm-green" />
        </span>
        <span>Service online</span>
        <CheckCircle2 className="h-3.5 w-3.5 text-pharm-green" />
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="gateway-title"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
        className="max-w-[calc(100%_-_2rem)] w-[28rem] rounded-[6px] border border-clinical-border bg-clinical-surface p-5 text-clinical-navy shadow-xl backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between gap-3 border-b border-clinical-border pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-pharm-green" />
            <h2 id="gateway-title" className="font-serif text-lg font-bold">
              Screening Engine Status
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => dialog.current?.close()}
            className="text-clinical-muted hover:text-clinical-navy p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 space-y-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-pharm-green-bg border border-pharm-green-border text-pharm-green-dark flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>Unified Computer Vision &amp; Forensic Engine Active</span>
          </div>

          <div className="space-y-1.5 text-clinical-subtext font-sans text-xs">
            <p>
              <strong>Zero-Latency Pipeline:</strong> Optical analysis, print sharpness,
              contour coherence, regulatory text recognition, and GS1 barcode decoding execute
              directly inside the application with zero external latency.
            </p>
            <ul className="list-disc pl-4 space-y-1 font-mono text-[11px] text-clinical-navy pt-1">
              <li>Laplacian Spatial Gradient Print Quality</li>
              <li>Canny Edge Density &amp; Stroke Coherence</li>
              <li>HSV Histogram Chromatic Gamut Correlation</li>
              <li>Indian Pharmacopeial Registry Match (100+ Brands)</li>
              <li>Chronological Date &amp; Active Shelf-Life Logic</li>
              <li>Optical 1D Barcode &amp; 2D GS1 DataMatrix Decode</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-clinical-border flex justify-end">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="px-3 py-1.5 bg-clinical-navy text-white text-xs font-mono rounded-[4px] hover:bg-clinical-navy-light"
          >
            Dismiss
          </button>
        </div>
      </dialog>
    </>
  );
}
