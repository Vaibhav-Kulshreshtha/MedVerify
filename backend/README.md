# MedVerify Backend

FastAPI backend service for counterfeit medicine packaging verification.

## Architecture

- **Framework**: Python 3.10+ FastAPI
- **Server**: Uvicorn ASGI
- **Validation**: Pydantic v2
- **CORS**: Configured for local frontend communication (`http://localhost:3000`)

## API Endpoints

### 1. `POST /analyze`
Accepts a packaging image file and returns packaging authenticity analysis.

- **Request**:
  - `image`: Multipart file upload (image/jpeg, image/png, image/webp)
  - `mock_verdict` (optional query parameter): `"genuine"` or `"suspicious"` for UI testing
- **Response**:
  ```json
  {
    "verdict": "genuine" | "suspicious",
    "confidence": 0.96,
    "flags": [
      {
        "issue": "Typography mismatch: micro-font weight deviates...",
        "severity": "high"
      }
    ],
    "sharpness_score": 94.8,
    "color_match_score": 97.5
  }
  ```

### 2. `GET /health`
Returns `{"status": "healthy"}`.

### 3. `GET /`
Returns service status and API docs link.

### 4. `GET /docs`
Interactive Swagger UI documentation.

---

## Local Setup & Running

1. **Activate virtual environment** (or create one):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Start the server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Or run:
   ```bash
   python3 -m app.main
   ```
