# MedVerify deployment guide

Run the FastAPI screening service in the backend container and the Next.js frontend on Vercel. The backend host needs writable persistent storage if you register reference images that must survive redeployments.

## Step 1: Push Code to GitHub

Review the changes, commit the source files you intend to deploy, and push that commit to your GitHub repository. These commands show what has changed:

```bash
git status --short
git diff --stat
```

---

## Step 2: Deploy the backend (Render.com)

Render supports Docker containers on its free tier, which allows us to install system binaries (`tesseract-ocr`, `libgl1`, `libzbar0`).

1. Go to **[https://dashboard.render.com](https://dashboard.render.com)** and sign up / log in with your GitHub account.
2. Click **New +** $\rightarrow$ **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your `MedVerify` repository.
4. Fill in the settings:
   - **Name**: `medverify-backend` (or your choice)
   - **Region**: Choose one close to you (e.g. `Oregon (US West)` or `Frankfurt`)
   - **Branch**: `main`
   - **Root Directory**: Leave **EMPTY / BLANK** *(Important: builds from repository root using the root `Dockerfile`)*
   - **Runtime**: **Docker** *(Render detects the root `Dockerfile` automatically)*
   - **Instance Type**: **Free**
5. Expand **Environment Variables** and add:
   - **`HOST`**: `0.0.0.0`
   - **`CORS_ORIGINS`**: `https://med-verify-gamma.vercel.app,http://localhost:3000,http://127.0.0.1:3000`
   - **`GEMINI_API_KEY`** (optional backend secret) enables the opt-in explanation on the scan form. Set it in the backend host's secret settings. Restart the backend after rotating it.
   - **`GEMINI_MODEL`** (optional) selects the Gemini model. The default is `gemini-3.5-flash-lite`. Provider usage is subject to your Google project's quota and billing settings.
   - **`MEDVERIFY_REFERENCE_TOKEN`** (optional backend secret) enables authenticated reference registration for operators.
   *(Note: Render automatically injects its dynamic port into `$PORT`; do not hardcode the port).*
6. Click **Create Web Service**.
7. Render will build the Docker container and start your FastAPI service.
8. Once deployment shows **Live**, copy your public URL:
   `https://medverify-backend.onrender.com` (or your chosen service name).
9. Verify it by visiting `https://medverify-backend.onrender.com/health` in your browser. It should return `{"status": "healthy"}`.

> **Note on Render Free Tier**: Services spin down after 15 minutes of inactivity and wake up automatically on the next request (~30s cold start).

---

## Step 3: Connect the frontend on Vercel

In Vercel, select the Next.js framework preset, set the project root directory to `frontend`, and use Node.js 22 or 24. Connect the frontend to your backend:

1. Go to **[https://vercel.com](https://vercel.com)** and open your `MedVerify` project.
2. Navigate to **Settings** $\rightarrow$ **Environment Variables**.
3. Add or update the variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: Your Render backend URL from Step 2 (e.g., `https://medverify-backend.onrender.com` — *without trailing slash*)
   - **Environments**: Check **Production**, **Preview**, and **Development**.
4. Click **Save**.
5. Go to the **Deployments** tab in Vercel $\rightarrow$ Click the three dots `...` on the latest deployment $\rightarrow$ Click **Redeploy**.
6. Once redeployment finishes (~60 seconds), open `https://med-verify-gamma.vercel.app/` in your browser.
7. Check the backend status badge, then run a demo scan. Select **Explain results with Gemini** to verify the backend secret and the live provider response.

---

## Alternative deployment on Hugging Face Spaces

To deploy the backend as a Docker Space:

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
