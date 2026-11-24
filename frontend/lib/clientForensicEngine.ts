import { AnalysisResult } from './types';

/** Calculate image-quality metrics when the screening service is unreachable. */
export async function runClientForensicAnalysis(file: File): Promise<AnalysisResult> {
  const image = new Image();
  const url = URL.createObjectURL(file);
  try {
    image.src = url;
    await image.decode();
    const scale = Math.min(600 / Math.max(image.naturalWidth, image.naturalHeight), 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const { width, height } = canvas;
    if (width < 3 || height < 3) throw new Error('Choose a larger packaging photo.');

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot read the photo for local inspection.');
    ctx.drawImage(image, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const gray = new Float32Array(width * height);
    for (let i = 0; i < gray.length; i++) {
      const p = i * 4;
      gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    }

    let sum = 0, sumSquares = 0, edgeCount = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = y * width + x;
        const laplacian = gray[p - width] + gray[p + width] + gray[p - 1] + gray[p + 1] - 4 * gray[p];
        sum += laplacian;
        sumSquares += laplacian * laplacian;
        if (Math.hypot(gray[p + 1] - gray[p - 1], gray[p + width] - gray[p - width]) > 38) edgeCount++;
      }
    }
    const count = (width - 2) * (height - 2);
    const variance = Math.max(0, sumSquares / count - (sum / count) ** 2);
    const score = (value: number) => Number(Math.min(100, value).toFixed(1));
    return {
      verdict: 'INCONCLUSIVE',
      confidence: null,
      sharpness_score: score(Math.sqrt(variance) * 4.2),
      edge_quality_score: score(edgeCount / count * 620),
      reference_used: false,
      flags: [],
      rule_triggered: 'browser_optical_only',
      verdict_disclaimer: 'The browser measured sharpness and edge density. Reconnect to the screening service to check label text, dates, reference images and barcodes.',
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
