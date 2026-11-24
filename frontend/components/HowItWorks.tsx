export function HowItWorks() {
  return (
    <details className="rounded border border-clinical-border bg-clinical-surface shadow-hairline">
      <summary className="cursor-pointer px-5 py-4 font-serif font-bold text-clinical-navy">How screening works</summary>
      <dl className="grid gap-4 border-t border-clinical-border p-5 text-sm text-clinical-subtext sm:grid-cols-2">
        <div><dt className="font-semibold text-clinical-navy">Print and color</dt>
          <dd>Image gradients estimate focus and edge quality. Selecting a brand also enables a color comparison when a reference image is available.</dd></div>
        <div><dt className="font-semibold text-clinical-navy">Text and dates</dt>
          <dd>Optical character recognition reads visible label text. The service checks for batch markings, price, license information, and conflicting or expired dates.</dd></div>
        <div><dt className="font-semibold text-clinical-navy">Catalog and barcodes</dt>
          <dd>The service compares recognized text with its medicine catalog and checks readable barcode data against printed fields when available.</dd></div>
        <div><dt className="font-semibold text-clinical-navy">Integrated Engine</dt>
          <dd>All optical analysis, OCR text recognition, and GS1 barcode decoding run directly inside the application with zero latency, providing complete forensic screening.</dd></div>
      </dl>
    </details>
  );
}
