'use client';

import React, { useEffect, useState } from 'react';
import { ImageUploader } from '@/components/ImageUploader';
import { AnalysisResultView } from '@/components/AnalysisResultView';
import { HowItWorks } from '@/components/HowItWorks';
import { AnalysisResult } from '@/lib/types';
import { AlertCircle, X } from 'lucide-react';

export default function Home() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzedPreviewUrl, setAnalyzedPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!analyzedPreviewUrl) return;
    return () => URL.revokeObjectURL(analyzedPreviewUrl);
  }, [analyzedPreviewUrl]);

  const handleAnalysisSuccess = (result: AnalysisResult, file: File) => {
    setAnalysisResult(result);
    setAnalyzedPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setAnalyzedPreviewUrl(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-clinical-border pb-4 sm:pb-5">
        <h1 className="font-serif text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-clinical-navy">
          Pharmaceutical packaging screening
        </h1>
        <p className="text-sm text-clinical-subtext mt-2 max-w-3xl">
          Check a packaging photo for print quality, readable label fields and barcode discrepancies.
          Confirm authenticity with the manufacturer or a pharmacist.
        </p>
      </div>

      {/* Error Callout Strip */}
      {error && (
        <div role="alert" className="rounded-[4px] border border-alert-red-border bg-alert-red-bg p-4 text-alert-red-dark flex items-start gap-3 text-xs font-mono">
          <AlertCircle className="w-4 h-4 text-alert-red flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block uppercase mb-0.5">
              Screening notice
            </span>
            <span className="font-sans text-xs">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-alert-red hover:text-alert-red-dark p-0.5 rounded cursor-pointer transition-colors"
            title="Dismiss notice"
            aria-label="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Analysis Stage */}
      {!analysisResult ? (
        <div className="space-y-6">
          <ImageUploader
            onAnalysisSuccess={handleAnalysisSuccess}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setError={setError}
          />

          <HowItWorks />
        </div>
      ) : (
        <div className="space-y-6">
          <AnalysisResultView
            result={analysisResult}
            previewUrl={analyzedPreviewUrl || ''}
            onReset={handleReset}
          />

          <HowItWorks />
        </div>
      )}
    </div>
  );
}
