# MedVerify 💊

> **Automated Optical Packaging Screening & Anti-Counterfeiting Verification System**  
> *A Unified Edge & Multimodal Forensic AI Architecture for Real-Time Pharmaceutical Authentication.*

[![Live App](https://img.shields.io/badge/Live%20Platform-Vercel%20Edge-000?style=for-the-badge&logo=vercel)](https://med-verify-gamma.vercel.app)
[![Version](https://img.shields.io/badge/Version-2.4.0%20Production-0D9488?style=for-the-badge)](https://med-verify-gamma.vercel.app)
[![Documentation](https://img.shields.io/badge/Report-PDF%20Dossier-DC2626?style=for-the-badge&logo=adobeacrobatreader)](./MedVerify_Project_Report.pdf)
[![Presentation](https://img.shields.io/badge/Deck-16%3A9%20PPTX-D97706?style=for-the-badge&logo=microsoftpowerpoint)](./MedVerify_Presentation.pptx)

---

## 🌐 Live Platform Access
- **Production URL:** [https://med-verify-gamma.vercel.app](https://med-verify-gamma.vercel.app)
- **Zero-Latency In-App Engine:** Runs directly on any mobile or desktop browser with zero external server dependencies.

---

## 📑 Project Deliverables

| Deliverable | Description | Format | Direct Link |
| :--- | :--- | :--- | :--- |
| **Comprehensive Technical Report** | 5-page clinical and mathematical audit dossier covering algorithms, WHO crisis statistics, and benchmarks. | Print-Ready PDF | [MedVerify_Project_Report.pdf](./MedVerify_Project_Report.pdf) |
| **Executive Presentation Deck** | 12 widescreen (16:9) slides designed for stakeholder, investor, or academic jury evaluations. | PowerPoint (.pptx) | [MedVerify_Presentation.pptx](./MedVerify_Presentation.pptx) |
| **Live Web Application** | Production deployment with instant packaging screening, camera ROI focus, and multimodal AI. | Next.js 16 Edge | [med-verify-gamma.vercel.app](https://med-verify-gamma.vercel.app) |

---

## 🔬 The 8-Layer Forensic Inspection Pipeline

MedVerify executes a multi-layered forensic inspection on every packaging specimen in under one second:

1. **Print Sharpness (ROI Block Focus):** Noise-resistant Laplacian spatial gradient variance calculated over the top 35% active print blocks to eliminate background table/bedsheet noise from smartphone photos.
2. **Edge & Stroke Continuity:** Canny edge density combined with 8-neighborhood connected stroke coherence to detect crude laser/inkjet counterfeits.
3. **2D HSV Chromatic Gamut Correlation:** Pearson correlation against registered authentic packaging master standards.
4. **Regulatory OCR Text Extraction:** Optical character recognition parsing printed Batch Number, Manufacturing Date, Expiry Date, MRP, and Drug License Number.
5. **Chronological Timeline & Shelf-Life Validation:** Validates sequential date logic ($MFG < EXP$) and flags expired stock.
6. **Indian Pharmacopeial Registry (100+ Brands):** Levenshtein fuzzy string matching to detect lookalike trademark typos (e.g., *"Dollo 650"* instead of *"Dolo 650"*).
7. **GS1 Physical-to-Digital Cross-Audit:** Decodes 1D/2D GS1 DataMatrix codes via ZXing and cross-audits the digital encrypted batch against printed OCR text to catch label-swapping and batch cloning.
8. **Multimodal Gemini 3.5 AI Vision:** Serverless AI route (`/api/analyze`) reading embossed dot-matrix foil stamps without ink, validating active chemical salts, and generating plain-English clinical summaries.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+ (recommended Node.js 22 or 24)
- Python 3.11+ (optional for generating PDF/PPTX reports)

### Run Next.js Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Technology Stack

- **Frontend & Serverless Core:** Next.js 16 (App Router), React 19, TypeScript, TailwindCSS 3.4.
- **Client-Side Computer Vision:** Web Workers, Canvas 2D API, Float32Array math acceleration.
- **OCR & Optical Decoders:** Tesseract.js v7, `@zxing/library` (1D/2D Barcode & GS1 DataMatrix).
- **Forensic AI Engine:** Google Gemini 3.5 Flash Lite (`@google/genai` REST).
- **Deployment & Edge Infrastructure:** Vercel Global Edge Network with automated CI/CD push protection.

---

## ⚠️ Regulatory & Clinical Disclaimer

*MedVerify is an optical and packaging integrity screening tool. It inspects packaging typography, print sharpness, regulatory markings, and digital data carriers. It does not perform chemical spectrometry, HPLC, or molecular assays. Suspect packaging flagged by the system must be escalated to the drug manufacturer or national regulatory authorities (CDSCO / FDA) for official laboratory batch audit.*
