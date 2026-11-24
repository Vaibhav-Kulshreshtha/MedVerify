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
  title: "MedVerify | Packaging screening",
  description: "Screen medicine packaging photos for visible print and label discrepancies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-clinical-bg text-clinical-text font-sans antialiased min-h-screen flex flex-col selection:bg-clinical-navy selection:text-white">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {children}
        </main>

      </body>
    </html>
  );
}
