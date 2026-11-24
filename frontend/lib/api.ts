import { AnalysisResult } from './types';
import { runUniversalPackagingAnalysis } from './computerVisionEngine';

export interface MedicineBrand {
  id: string;
  name: string;
  fullName: string;
  manufacturer: string;
  reference_image: string;
  lot_prefix: string;
  color_theme: string;
}

export const DEFAULT_BRANDS: MedicineBrand[] = [
  {
    id: 'dolo650',
    name: 'Dolo 650',
    fullName: 'Dolo 650 (Paracetamol Tablets IP 650mg)',
    manufacturer: 'Micro Labs Limited',
    reference_image: 'dolo650/genuine.png',
    lot_prefix: 'DL-650',
    color_theme: '#15803D',
  },
  {
    id: 'crocin',
    name: 'Crocin Advance',
    fullName: 'Crocin Advance (Paracetamol 500mg Fast Relief)',
    manufacturer: 'GlaxoSmithKline (GSK)',
    reference_image: 'crocin/genuine.png',
    lot_prefix: 'CR-ADV',
    color_theme: '#0047AB',
  },
  {
    id: 'combiflam',
    name: 'Combiflam',
    fullName: 'Combiflam (Ibuprofen 400mg & Paracetamol 325mg)',
    manufacturer: 'Sanofi India Limited',
    reference_image: 'combiflam/genuine.png',
    lot_prefix: 'CBF-IND',
    color_theme: '#9F1239',
  },
  {
    id: 'tretiva',
    name: 'Tretiva 20',
    fullName: 'Tretiva 20 (Isotretinoin Soft Gelatin Capsules USP 20mg)',
    manufacturer: 'Intas Pharmaceuticals Ltd',
    reference_image: 'tretiva/genuine.png',
    lot_prefix: 'S25',
    color_theme: '#8C1B20',
  },
  {
    id: 'azithromycin',
    name: 'Azithral 250',
    fullName: 'Azithral 250 (Azithromycin Tablets IP 250mg)',
    manufacturer: 'Alembic Pharmaceuticals Ltd',
    reference_image: 'azithromycin/genuine.png',
    lot_prefix: 'AZT-250',
    color_theme: '#0D9488',
  },
  {
    id: 'amoxicillin',
    name: 'Augmentin 625',
    fullName: 'Augmentin 625 (Amoxicillin & Clavulanate IP 625mg)',
    manufacturer: 'GlaxoSmithKline Pharmaceuticals Ltd',
    reference_image: 'amoxicillin/genuine.png',
    lot_prefix: 'AGM-625',
    color_theme: '#EA580C',
  },
];

export function getStoredApiUrl(): string | null {
  return null;
}

export function setStoredApiUrl(): void {
  // Integrated engine
}

export function getEffectiveApiUrl(): string {
  return 'Integrated Engine';
}

export async function analyzePackaging(
  file: File,
  brand = 'auto',
  includeAi = false,
): Promise<AnalysisResult> {
  // 1. Attempt High-Fidelity Multimodal AI Vision (/api/analyze)
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('brand', brand);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const aiResult = (await res.json()) as AnalysisResult;
      if (aiResult && aiResult.verdict) {
        return aiResult;
      }
    }
  } catch (err) {
    console.warn('Serverless AI analysis skipped, engaging in-app optical engine:', err);
  }

  // 2. High-Speed In-App Computer Vision & OCR Fallback Engine
  const result = await runUniversalPackagingAnalysis(file, brand);

  // If opted-in, request Gemini plain-language explanation
  if (includeAi) {
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verdict: result.verdict,
          confidence: result.confidence,
          sharpness_score: result.sharpness_score,
          flags: result.flags,
          extracted_fields: result.extracted_fields,
        }),
        signal: AbortSignal.timeout(12_000),
      });
      if (res.ok) {
        const aiData = await res.json();
        result.ai_explanation = aiData;
      } else {
        result.ai_explanation = { status: 'unavailable', summary: null };
      }
    } catch {
      result.ai_explanation = { status: 'unavailable', summary: null };
    }
  }

  return result;
}

export async function fetchBrands(): Promise<MedicineBrand[]> {
  return DEFAULT_BRANDS;
}

export async function checkBackendHealth(): Promise<{
  isOnline: boolean;
  message?: string;
  activeUrl: string;
}> {
  return {
    isOnline: true,
    activeUrl: 'MedVerify Unified Engine',
  };
}
