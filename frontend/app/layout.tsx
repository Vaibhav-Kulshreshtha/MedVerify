import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0F2A3F",
};

export const metadata: Metadata = {
  title: "MedVerify // Pharmaceutical Packaging Verification Laboratory",
  description: "Clinical-grade optical and spectrophotometric inspection system for counterfeit medicine packaging detection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-clinical-bg text-clinical-text font-sans antialiased min-h-screen flex flex-col selection:bg-clinical-navy selection:text-white">
        {/* Lab Top Utility Strip - Responsive */}
        <div className="bg-clinical-navy text-slate-300 text-[10px] sm:text-[11px] font-mono border-b border-clinical-navy-dark px-3 sm:px-4 py-1.5 sm:py-1 flex items-center justify-between tracking-wider overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-4 truncate">
            <span className="flex items-center gap-1.5 text-slate-200 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-pharm-green flex-shrink-0 animate-pulse"></span>
              <span className="truncate">INSTITUTIONAL QC // LAB-04</span>
            </span>
            <span className="hidden md:inline text-slate-400">
              PROTOCOL: USP-NF &sect;621 PACKAGING INTEGRITY
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-slate-400 flex-shrink-0 text-[10px] sm:text-[11px]">
            <span className="hidden sm:inline">SPECTRO-CALIBRATION: ACTIVE</span>
            <span>SPECIMEN: IDLE</span>
          </div>
        </div>

        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {children}
        </main>

        <footer className="border-t border-clinical-border bg-clinical-surface py-4 sm:py-5 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 text-center sm:text-left text-[11px] sm:text-xs text-clinical-subtext font-mono">
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
              <span className="font-semibold text-clinical-navy">MEDVERIFY DIAGNOSTICS</span>
              <span className="hidden xs:inline">&mdash;</span>
              <span>OPTICAL VERIFICATION CORE V1.0.4</span>
            </div>
            <div>
              <span className="block sm:inline">FOR REGULATORY AUDIT &amp; QUALITY ASSURANCE SPECIMEN SCREENING</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
