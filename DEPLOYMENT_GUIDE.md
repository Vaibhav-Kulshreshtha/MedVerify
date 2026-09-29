# MedVerify — 100% Free Production Deployment Guide

This guide walks you through deploying **MedVerify** (Next.js 14 frontend + FastAPI / OpenCV / Tesseract OCR backend) completely for free with zero credit card required.

---

## Architecture Overview

| Component | Stack | Recommended Free Host | Free Tier Highlights |
|---|---|---|---|
| **Backend API** | FastAPI + Python 3.11 + Tesseract + OpenCV | **[Render.com](https://render.com)** | Free Docker Web Service (512MB RAM, HTTPS URL, auto-deploy from GitHub) |
| **Alternative Backend** | Same Docker container | **[Hugging Face Spaces](https://huggingface.co/spaces)** | 100% Free, 16GB RAM, 2 vCPUs, never sleeps |
| **Frontend UI** | Next.js 14 + TailwindCSS + Lucide Icons | **[Vercel](https://vercel.com)** | Unlimited deployments, fast global CDN, custom domain support |

---

## Step 1: Push Code to GitHub

Make sure your latest code is committed and pushed to a GitHub repository:

```bash
git add .
git commit -m "feat: configure free deployment with Dockerfile, render.yaml, and production api routing"
git push origin main
```

---

## Step 2: Deploy Backend for Free (Render.com)

Render supports Docker containers on its free tier, which allows us to install system binaries (`tesseract-ocr`, `libgl1`, `libzbar0`).

1. Go to **[https://dashboard.render.com](https://dashboard.render.com)** and sign up / log in with your GitHub account.
2. Click **New +** $\rightarrow$ **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your `MedVerify` repository.
4. Fill in the settings:
   - **Name**: `medverify-backend` (or your choice)
   - **Region**: Choose one close to you (e.g. `Oregon (US West)` or `Frankfurt`)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: **Docker** *(Render detects `backend/Dockerfile` automatically)*
   - **Instance Type**: **Free**
5. Click **Create Web Service**.
6. Render will build the Docker container and start your FastAPI service.
7. Once deployment shows **Live**, copy your public URL:
   `https://medverify-backend.onrender.com`
8. Verify it by visiting `https://medverify-backend.onrender.com/health` in your browser. It should return `{"status": "healthy"}`.

> **Note on Render Free Tier**: Services spin down after 15 minutes of inactivity and wake up automatically on the next request (~30s cold start).

---

## Step 3: Deploy Frontend for Free (Vercel)

Vercel is the creator of Next.js and provides the fastest, most reliable free hosting.

1. Go to **[https://vercel.com](https://vercel.com)** and log in with your GitHub account.
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your `MedVerify` repository.
4. In the configuration screen:
   - **Framework Preset**: Next.js
   - **Root Directory**: Click *Edit* and select **`frontend`**
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
5. Expand **Environment Variables**:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: Your Render backend URL from Step 2 (e.g., `https://medverify-backend.onrender.com` — *without trailing slash*)
6. Click **Deploy**.
7. In ~60 seconds, Vercel will give you a public URL (e.g. `https://medverify.vercel.app`).

---

## Alternative: Deploy Backend on Hugging Face Spaces (16 GB RAM, Always Active)

If you prefer a backend that never sleeps and has 16GB RAM:

1. Go to **[https://huggingface.co/spaces](https://huggingface.co/spaces)** and create an account.
2. Click **Create new Space**.
3. Space name: `medverify-api`
4. License: `mit` or `apache-2.0`
5. Space SDK: Select **Docker** $\rightarrow$ **Blank**.
6. Clone the space or push your `backend/` files (`Dockerfile`, `requirements.txt`, `app/`, `data/`, `reference_images/`).
7. In the Space `Dockerfile`, change the port to `7860`:
   ```dockerfile
   CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 7860"]
   ```
8. Your permanent API URL will be:
   `https://<your-username>-medverify-api.hf.space`
9. Use this URL for `NEXT_PUBLIC_API_URL` in Vercel.

---

## Testing Your Live Deployment

1. Open your Vercel URL in your mobile phone or laptop browser.
2. Drag and drop or snap a photo of any medicine packaging.
3. Click **Analyze Packaging**.
4. The system will run real-time print sharpness, Canny edge continuity, multi-angle OCR, date logic validation, and database cross-checking!
