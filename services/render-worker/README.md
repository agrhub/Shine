# Shine Video Render Worker (Google Cloud Run)

Serverless Headless Video Compositor & Exporter utilizing **`@openvideo/video-renderer`** (Playwright Chromium + native WebCodecs acceleration) with a built-in **Render Instance Pool (`VideoRendererPool`)** to render vertical micro-dramas (9:16) in high resolution at 30/60fps

---

## 🚀 Features

- **Managed Render Instance Pool (`VideoRendererPool`)**: Dynamically pools and manages 1–100 reusable headless Chromium `VideoRenderer` instances based on available system RAM and CPU.
- **Out of Memory (OOM) Protection**: Automatically limits concurrent rendering processes to prevent memory spikes on container instances (e.g. max 4 instances for 4Gi RAM, max 2 instances for 2Gi RAM).
- **FIFO Job Queue & Concurrency Management**: When all pooled instances are busy, incoming render jobs are safely queued and dispatched immediately upon instance release.
- **Instance Recycling & Memory Hygiene**: Reuses browser instances across renders to amortize startup cost, automatically recycling and destroying instances every 25 renders (or on error) to prevent browser memory leaks.
- **Async Job Polling & Real-time Pub/Sub**: Accepts render requests immediately with a `jobId`, streams live progress (0–100%) to Cloud Pub/Sub, and notifies the Shine application.
- **Direct-to-GCS Zero-Disk Upload**: Directly saves rendered video Buffers to Google Cloud Storage (`gs://shine-studio-media`) and generates 30-minute V4 Signed URLs.
- **Serverless & Scalable**: Scales from `0` to `5+` instances on Google Cloud Run ($0 idle cost).

---

## ⚙️ Environment Variables & Pool Configuration

| Variable | Default | Description |
|---|---|---|
| `RENDER_WORKER_CPU` | `2` | Number of vCPUs allocated on Cloud Run |
| `RENDER_WORKER_MEMORY` | `4Gi` | Total RAM allocated on Cloud Run (`2Gi`, `4Gi`, `8Gi`) |
| `RENDER_WORKER_TIMEOUT` | `600` | Cloud Run request timeout in seconds (10 mins) |
| `RENDER_WORKER_MAX_INSTANCES`| `5` | Maximum autoscaling container instances on Cloud Run |
| `RENDER_WORKER_CONCURRENCY` | `10` | Maximum concurrent HTTP connections per container instance |
| `RENDER_POOL_SIZE` | `4` | Maximum parallel `VideoRenderer` instances within a single container |
| `RENDER_POOL_MIN` | `1` | Warm-up minimum `VideoRenderer` instances |
| `RENDER_MAX_PER_INSTANCE` | `25` | Number of renders before an instance is cleanly recycled |
| `GCS_BUCKET` | `shine-studio-media`| Google Cloud Storage destination bucket |
| `PUBSUB_TOPIC_STATUS` | `shine-render-status`| Pub/Sub topic for real-time progress broadcast |

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
  --memory 4Gi \
  --cpu 2 \
  --timeout 600 \
  --concurrency 10 \
  --min-instances 0 \
  --max-instances 5 \
  --set-env-vars "GCS_BUCKET=shine-studio-media,PUBSUB_TOPIC_STATUS=shine-render-status,RENDER_POOL_SIZE=4,RENDER_POOL_MIN=1,RENDER_MAX_PER_INSTANCE=25" \
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
    "prioritizeSpeed": false
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
  "status": "completed",
  "progress": 100,
  "downloadUrl": "https://storage.googleapis.com/shine-studio-media/temp-renders/rnd_abc1234567.mp4?X-Goog-Algorithm=...",
  "gcsUri": "gs://shine-studio-media/temp-renders/rnd_abc1234567.mp4",
  "renderTimeMs": 14200,
  "fileSize": 12450800
}
```

### 3. Direct Download with 302 Redirect to Signed URL
`GET /download/:jobId`
- Streams or redirects to the rendered MP4 file.

### 4. Health Check & Pool Telemetry
`GET /health`
```json
{
  "status": "healthy",
  "service": "shine-render-worker",
  "engine": "@openvideo/video-renderer (Playwright Chromium Instance Pool + WebCodecs)",
  "pool": {
    "totalInstances": 2,
    "busyInstances": 1,
    "idleInstances": 1,
    "queueLength": 0,
    "totalRendersCompleted": 18
  },
  "pubsubConnected": true,
  "gcsConnected": true,
  "bucket": "shine-studio-media",
  "activeJobs": 1,
  "uptime": 340
}
```
