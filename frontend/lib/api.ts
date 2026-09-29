import { AnalysisResult, BackendHealthResponse, AddReferenceResponse } from './types';

export const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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
    manufacturer: 'Sun Pharmaceutical Industries Ltd',
    reference_image: 'tretiva/genuine.png',
    lot_prefix: 'TRT-20',
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

// Active resolved endpoint candidate (cached once verified)
let resolvedApiBase: string | null = null;

export const API_BASE_URL = DEFAULT_API_BASE_URL;

/**
 * Returns prioritized API endpoint candidates to ensure connectivity across
 * Safari, Chrome, localhost, 127.0.0.1, and Next.js proxy rewrite.
 */
function getCandidateUrls(): string[] {
  const candidates: string[] = [];

  if (resolvedApiBase) {
    candidates.push(resolvedApiBase);
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl && !candidates.includes(envUrl)) {
    candidates.push(envUrl);
  }

  // Check if running in a remote production browser environment
  const isBrowser = typeof window !== 'undefined';
  const isLocalhost = !isBrowser || (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0'
  );

  // Only fall back to local direct endpoints when developing locally
  if (isLocalhost) {
    const ipv4Direct = 'http://127.0.0.1:8000';
    if (!candidates.includes(ipv4Direct)) {
      candidates.push(ipv4Direct);
    }

    const localhostDirect = 'http://localhost:8000';
    if (!candidates.includes(localhostDirect)) {
      candidates.push(localhostDirect);
    }
  }

  // Next.js reverse proxy rewrite (same-origin)
  const proxyUrl = '/api/backend';
  if (!candidates.includes(proxyUrl)) {
    candidates.push(proxyUrl);
  }

  return candidates;
}

/**
 * Executes a fetch across candidate URLs with automatic fallback.
 */
async function fetchWithFallback(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const candidates = getCandidateUrls();
  let lastError: Error | null = null;

  for (const base of candidates) {
    const cleanBase = base.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const targetUrl = `${cleanBase}${cleanPath}`;

    try {
      const res = await fetch(targetUrl, options);
      if (res.ok || res.status < 500) {
        resolvedApiBase = base;
        return res;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error(`Failed to communicate with diagnostic engine at ${DEFAULT_API_BASE_URL}`);
}

/**
 * Uploads an image file to the backend /analyze endpoint.
 */
export async function analyzePackaging(
  file: File,
  brand?: string,
  mockVerdict?: string
): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('image', file);

  if (brand && brand !== 'auto') {
    formData.append('brand', brand);
  } else {
    formData.append('brand', 'auto');
  }

  const queryParams = mockVerdict ? `?mock_verdict=${encodeURIComponent(mockVerdict)}` : '';
  const path = `/analyze${queryParams}`;

  try {
    const res = await fetchWithFallback(path, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let errorMessage = `Diagnostic engine error (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson.detail) {
          errorMessage =
            typeof errJson.detail === 'string'
              ? errJson.detail
              : JSON.stringify(errJson.detail);
        }
      } catch {}
      throw new Error(errorMessage);
    }

    const data: AnalysisResult = await res.json();
    return data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('failed to fetch') ||
        msg.includes('networkerror') ||
        msg.includes('load failed')
      ) {
        throw new Error(
          `Unable to connect to MedVerify backend at ${resolvedApiBase || DEFAULT_API_BASE_URL}. Ensure the FastAPI server is running.`
        );
      }
      throw error;
    }
    throw new Error('An unexpected error occurred during image analysis.');
  }
}

/**
 * Registers an authentic packaging specimen as a brand master reference.
 */
export async function addReferenceStandard(
  file: File,
  brandId: string,
  brandName?: string,
  manufacturer?: string
): Promise<AddReferenceResponse> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('brand_id', brandId);
  if (brandName) formData.append('brand_name', brandName);
  if (manufacturer) formData.append('manufacturer', manufacturer);

  const res = await fetchWithFallback('/add-reference', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let errorMessage = `Failed to register reference (${res.status})`;
    try {
      const err = await res.json();
      if (err.detail) errorMessage = err.detail;
    } catch {}
    throw new Error(errorMessage);
  }

  return await res.json();
}

/**
 * Fetches registered medicine brands from the backend.
 */
export async function fetchBrands(): Promise<MedicineBrand[]> {
  try {
    const res = await fetchWithFallback('/brands', {
      method: 'GET',
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.brands) && data.brands.length > 0) {
        return data.brands;
      }
    }
  } catch {
    // Return fallback defaults
  }
  return DEFAULT_BRANDS;
}

/**
 * Checks backend health status.
 */
export async function checkBackendHealth(): Promise<{
  isOnline: boolean;
  message?: string;
}> {
  try {
    const res = await fetchWithFallback('/health', {
      method: 'GET',
      cache: 'no-store',
    });

    if (res.ok) {
      const data: BackendHealthResponse = await res.json();
      return { isOnline: data.status === 'healthy' };
    }
    return { isOnline: false, message: `Status: ${res.status}` };
  } catch {
    return {
      isOnline: false,
      message: `Backend unreachable at ${resolvedApiBase || DEFAULT_API_BASE_URL}`,
    };
  }
}
