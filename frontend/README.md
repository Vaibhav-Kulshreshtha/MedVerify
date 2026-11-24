# MedVerify frontend

The Next.js app screens packaging photos through the FastAPI service and displays the results. An optional Gemini explanation uses the backend’s screened findings.

## Run locally

Use Node.js 22 or 24 LTS and run these commands in the frontend directory.

```sh
npm ci
npm run dev
```

Open [the local app](http://localhost:3000). The default API route forwards requests to the backend at 127.0.0.1 on port 8000. To select a different backend for a deployment, set `NEXT_PUBLIC_API_URL` to its HTTPS origin before building. Store Gemini credentials in the backend environment.

## Verify

```sh
npm run lint
npm run build
npm start
```
