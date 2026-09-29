FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies: Tesseract OCR, OpenCV runtime libs, zbar barcode library
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    libglib2.0-0 \
    libzbar0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifest from backend/requirements.txt
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy all repository files
COPY . .

# Set PYTHONPATH so app module is importable
ENV PYTHONPATH="/app/backend:/app"

# Ensure data directory and reference images are available
RUN if [ -d "/app/backend/data" ] && [ ! -d "/app/data" ]; then cp -r /app/backend/data /app/data; fi
RUN if [ -d "/app/backend/reference_images" ] && [ ! -d "/app/reference_images" ]; then cp -r /app/backend/reference_images /app/reference_images; fi

EXPOSE 8000 10000

# Start FastAPI server listening on dynamic $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --app-dir backend"]
