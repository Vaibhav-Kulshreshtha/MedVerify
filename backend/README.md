# MedVerify backend

The FastAPI service screens packaging photos using OCR, print measurements, a local medicine catalog, and optional reference images. A passing result cannot establish the chemical contents or authenticity of a medicine.

## Local setup

From the backend directory, install Tesseract with English language data for text extraction. The Docker image includes Tesseract and ZBar. For a local Python installation, run these commands with Python 3.10 or newer.

```sh
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp -n .env.example .env
uvicorn app.main:app --reload --port 8000
```

## Screening

Send a multipart POST to `/analyze` with a JPEG, PNG, or WebP file in the `image` field. Photos may contain up to 16 million pixels and weigh up to 15 MiB. Supply a `brand` ID from `GET /brands` to enable reference image comparison. Omit the field or pass `auto` for reference-free screening.

```sh
curl -F 'image=@demo_test_images/dolo650_genuine.png' -F 'brand=dolo650' http://localhost:8000/analyze
```

The response includes a verdict (`PASSED SCREENING`, `INCONCLUSIVE`, or `SUSPICIOUS`), measurements, observations, and available OCR and barcode evidence. The confidence field is a heuristic screening score. Send the optional `include_ai=true` form field to request a Gemini explanation when the server has a configured `GEMINI_API_KEY`.

Visit `/docs` for the full request and response schema. `GET /health` returns the service health status. To run the local regression suite, use `python scripts/test_engine.py` with the virtual environment active.

## Reference administration

Set `MEDVERIFY_REFERENCE_TOKEN` on the server to enable `POST /add-reference`. Call it from a trusted administrative client using an `Authorization: Bearer <token>` header and multipart fields `image`, `brand_id`, and optionally `brand_name` and `manufacturer`. Registration updates the reference against which future photos are compared. Use independently authenticated reference photos. Keep the token in server-side configuration.

The service stores registered photos and the updated `brands.json` in the active reference directory. Use persistent storage for registrations that must survive a deployment.
