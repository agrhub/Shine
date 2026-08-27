# Shine Video Render Worker (Google Cloud Run)

Serverless Headless Video Compositor & Exporter utilizing **`@openvideo/video-renderer`** (Playwright Chromium + native WebCodecs acceleration) to render vertical micro-dramas (9:16) in high resolution at 30/60fps.

---

## 🚀 Features

- **Async Job Polling**: Accepts render requests immediately with a `jobId`, updates real-time progress (0–100%), and notifies clients.
- **Decoupled Architecture**: Render worker does not require S3/Cloud Storage credentials; it renders to local temporary disk.
- **Automatic 30-Minute TTL Cleanup**: Rendered files are automatically deleted after 30 minutes to keep disk usage lean.
- **Hardware-Accelerated WebCodecs**: Full H.264/AAC MP4 video export with zero frame drops.
- **Serverless & Scalable**: Scales from `0` to `10+` instances on Google Cloud Run ($0 idle cost).

---

## 🛠️ Deploy to Google Cloud Run

### Option 1: Using the 1-Click Deployment Script

#### On Linux / macOS / Cloud Shell:
```bash
cd services/render-worker
chmod +x deploy.sh
./deploy.sh
```

#### On Windows (PowerShell):
```powershell
cd services/render-worker
.\deploy.ps1
```

### Option 2: Using the `gcloud` CLI directly:
```bash
gcloud run deploy shine-render-worker \
  --source . \
  --region us-central1 \
  --memory 8Gi \
  --cpu 4 \
  --timeout 600 \
  --concurrency 1 \
  --min-instances 0 \
  --max-instances 10 \
  --allow-unauthenticated
```

---

## 🔌 API Endpoints

### 1. Submit Render Task (Async)
`POST /render`
```json
{
  "projectData": {
    "settings": { "width": 1080, "height": 1920, "fps": 30, "duration": 15000000 },
    "tracks": [...],
    "clips": {...}
  },
  "options": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "format": "mp4",
    "prioritizeSpeed": true
  }
}
```

**Response (HTTP 202 Accepted):**
```json
{
  "success": true,
  "jobId": "rnd_abc1234567",
  "status": "rendering",
  "message": "Render job initiated successfully"
}
```

### 2. Poll Job Status & Progress
`GET /jobs/:jobId`

**Response:**
```json
{
  "success": true,
  "jobId": "rnd_abc1234567",
  "status": "rendering",
  "progress": 45,
  "downloadUrl": "/download/rnd_abc1234567"
}
```

### 3. Download Rendered MP4 Video
`GET /download/:jobId`
- Streams the rendered MP4 file directly to the Shine Server backend.

### 4. Health Check
`GET /health`
```json
{
  "status": "healthy",
  "service": "shine-render-worker",
  "engine": "@openvideo/video-renderer (Playwright Chromium + WebCodecs)",
  "activeJobs": 1,
  "uptime": 120
}
```
