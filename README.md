# MedVerify 💊

> **Counterfeit Medicine Packaging Detector** — A full-stack AI-ready verification system to detect fake, tampered, or sub-standard pharmaceutical packaging.

---

## 🏗 Architecture Overview

The repository is structured into two cleanly separated services:

```text
MedVerify/
├── frontend/                     # Next.js 14 (App Router) + TypeScript + Tailwind CSS
│   ├── app/                      # Next.js App Router (layout, page, styles)
│   ├── components/               # Modular UI components (Header, ImageUploader, AnalysisResultView, Status)
│   ├── lib/                      # API client, TypeScript types, and utilities
│   ├── .env.local                # Frontend environment variables (API URL)
│   ├── .env.example              # Template environment configuration
│   └── package.json
│
└── backend/                      # Python FastAPI Service
    ├── app/
    │   ├── __init__.py
    │   ├── main.py               # FastAPI application with /analyze endpoint & CORS
    │   ├── schemas.py            # Pydantic models for request & response
    │   └── config.py             # App settings and CORS origins
    ├── requirements.txt          # Python dependencies
    ├── .env                      # Backend environment variables
    ├── .env.example              # Template backend environment configuration
    └── README.md
```

---

## ⚡ Quick Start

### 1. Start the Backend (FastAPI)

```bash
cd backend

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```

- API Base URL: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### 2. Start the Frontend (Next.js 14)

In a separate terminal:

```bash
cd frontend

# Install dependencies (already installed)
npm install

# Start Next.js development server
npm run dev
```

- Web App: `http://localhost:3000`

---

## 📡 API Contract (`POST /analyze`)

### Request
- **Method**: `POST`
- **Path**: `/analyze`
- **Query Param (Optional)**: `mock_verdict=genuine` or `mock_verdict=suspicious` (useful for testing UI states)
- **Body**: `multipart/form-data`
  - `image`: Image file (`image/jpeg`, `image/png`, `image/webp`)

### Response Schema (`200 OK`)
```json
{
  "verdict": "genuine" | "suspicious",
  "confidence": 0.96,
  "flags": [
    {
      "issue": "Typography mismatch: micro-font weight deviates 18% from authentic pharmaceutical reference",
      "severity": "high"
    },
    {
      "issue": "Holographic security seal boundary is misaligned by 3.8mm",
      "severity": "critical"
    }
  ],
  "sharpness_score": 94.8,
  "color_match_score": 97.5
}
```

---

## ⚙️ Environment Variables

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (`backend/.env`)
```env
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```
