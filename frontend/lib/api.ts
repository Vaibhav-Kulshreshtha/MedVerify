import { AnalysisResult, BackendHealthResponse } from './types';
import { runClientForensicAnalysis } from './clientForensicEngine';

export const DEFAULT_API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL?.trim() || '/api/backend').replace(/\/+$/, '');

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
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('MEDVERIFY_API_URL')?.trim() || null;
  } catch {
    return null;
  }
}

export function setStoredApiUrl(url: string | null): void {
  if (typeof window === 'undefined') return;
  if (url) window.localStorage.setItem('MEDVERIFY_API_URL', url);
  else window.localStorage.removeItem('MEDVERIFY_API_URL');
  window.dispatchEvent(new Event('medverify-gateway-change'));
}

export function getEffectiveApiUrl(): string {
  return getStoredApiUrl() || DEFAULT_API_BASE_URL;
}

export async function analyzePackaging(
  file: File,
  brand = 'auto',
  includeAi = false,
): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('brand', brand);
  if (includeAi) formData.append('include_ai', 'true');

  // A scan sends the photo to the single gateway selected by the user.
  const gateway = getEffectiveApiUrl();
  let res: Response | undefined;
  try {
    res = await fetch(`${gateway}/analyze`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    if (!(error instanceof TypeError || error instanceof DOMException)) throw error;
  }
  // Next's rewrite can return 500 when it cannot connect to its upstream.
  const proxyOffline = res?.status === 500 && gateway === '/api/backend'
    && !(await checkBackendHealth(gateway)).isOnline;
  if (!res || proxyOffline || [502, 503, 504].includes(res.status)) {
    const result = await runClientForensicAnalysis(file);
    if (includeAi) result.ai_explanation = { status: 'unavailable' };
    return result;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const detail = typeof data?.detail === 'string' ? data.detail : `Screening failed (HTTP ${res.status}).`;
    throw new Error(detail);
  }
  const data = await res.json();
  if (!data || !['PASSED SCREENING', 'INCONCLUSIVE', 'SUSPICIOUS', 'genuine', 'suspicious'].includes(data.verdict)
      || !Number.isFinite(data.sharpness_score) || !Number.isFinite(data.confidence)
      || !Array.isArray(data.flags)) {
    throw new Error('The screening service returned an invalid report.');
  }
  if (includeAi && !data.ai_explanation) data.ai_explanation = { status: 'unavailable' };
  return data;
}

export async function fetchBrands(): Promise<MedicineBrand[]> {
  try {
    const res = await fetch(`${getEffectiveApiUrl()}/brands`, { cache: 'no-store', signal: AbortSignal.timeout(45_000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.brands)) return data.brands;
    }
  } catch {
    // Built-in samples are available offline.
  }
  return DEFAULT_BRANDS;
}

export async function checkBackendHealth(targetBase = getEffectiveApiUrl()): Promise<{
  isOnline: boolean;
  message?: string;
  activeUrl: string;
}> {
  const activeUrl = targetBase.trim().replace(/\/+$/, '');
  try {
    const res = await fetch(`${activeUrl}/health`, { cache: 'no-store', signal: AbortSignal.timeout(45_000) });
    if (!res.ok) return { isOnline: false, activeUrl, message: `The gateway returned HTTP ${res.status}.` };
    const data: BackendHealthResponse = await res.json();
    if (data.status === 'healthy') return { isOnline: true, activeUrl };
  } catch {
    // Missing, invalid or unreachable health endpoint.
  }
  return { isOnline: false, activeUrl, message: 'Could not reach a healthy MedVerify service at this address.' };
}
