# MedVerify

MedVerify screens medicine packaging photos for visible anomalies. The FastAPI backend measures print sharpness, compares colors when a brand reference is selected, reads label text with Tesseract and checks decoded barcodes against readable fields. The Next.js frontend shows the measurements and the evidence available for each scan. Bundled examples and the local medicine catalog are demonstration data. A packaging photo alone cannot establish the authenticity or contents of a medicine.

## Run locally

Use Python 3.11 or later and Node.js 22 or 24. The backend needs the Tesseract executable with English language data for OCR. Install ZBar for the additional barcode formats supported by pyzbar. Both Dockerfiles include these dependencies. On macOS with Homebrew, run `brew install tesseract zbar`.

From the repository root, start the API:

```sh
cd backend
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

In a second terminal, start the web app:

```sh
cd frontend
npm ci
npm run dev
```

Open [MedVerify](http://localhost:3000). The development frontend can proxy requests to port 8000. For separate deployments, set `NEXT_PUBLIC_API_URL` to the backend URL and add the frontend origin to the backend's comma-separated `CORS_ORIGINS`. The [API documentation](http://localhost:8000/docs) lists the full request and response schemas.

## Gemini explanations

Set `GEMINI_API_KEY` in `backend/.env` or in the backend host's secret settings, then restart the API. The optional `GEMINI_MODEL` setting defaults to `gemini-3.5-flash-lite`. Get a key from [Google AI Studio](https://aistudio.google.com/apikey).

Select **Explain results with Gemini** before running a scan. The backend sends Google the screening verdict, numeric optical measurements, and indicators for readable fields and barcode checks. The photo, filename, label text, and label identifiers stay out of the request. Gemini returns a short explanation alongside the original screening. Each backend worker limits explanations to 10 attempts per minute. Scans still return their findings when the key is missing, the quota is reached, or Google is unavailable.

## Analyze a sample

```sh
curl -sS http://localhost:8000/analyze \
  -F image=@backend/demo_test_images/dolo650_genuine.png \
  -F brand=dolo650 \
  -F include_ai=true
```

The `brand` and `include_ai` form fields are optional. The report contains a `verdict` of `PASSED SCREENING`, `INCONCLUSIVE`, or `SUSPICIOUS`. An opted-in scan adds `ai_explanation` with a status and, on success, a summary. When the backend is offline, the browser can perform a limited image-quality check and labels the result inconclusive.

The operator workflow for registering a reference is in the [backend guide](backend/README.md).

## Verify changes

From the repository root, with backend and frontend dependencies installed:

```sh
backend/venv/bin/python -m unittest discover -s backend/scripts -p 'test_*.py'
npm run lint
npm run build
```

The automated Gemini tests use mocked responses and work without a key.
