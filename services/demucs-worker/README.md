# Demucs AI Audio Stem Separation Microservice (Google Cloud Run)

Serverless Stem Separator service utilizing **Meta's Demucs v4 (Hybrid Transformer)** to isolate **Vocals** and **Clean Background Music (BGM)** from media video/audio files with >95% accuracy.

---

## 🚀 Features

- **2-Stem Separation**: Accurately splits input media into `vocals.wav` (dialogue) and `no_vocals.wav` (BGM & Sound FX).
- **Serverless & Scalable**: Auto-scales to `0` instances when idle on Google Cloud Run (zero idle cost).
- **FastAPI Endpoints**: Supports both Remote URL and direct File Upload.
- **Model Pre-caching**: `htdemucs` model is baked directly into the Docker image layer for near-instant execution.

---

## 🛠️ Deploy to Google Cloud Run

### Option 1: Using the 1-Click Deployment Script

#### On Linux / macOS / Cloud Shell:
```bash
cd services/demucs-worker
chmod +x deploy.sh
./deploy.sh
```

#### On Windows (PowerShell):
```powershell
cd services/demucs-worker
.\deploy.ps1
```

### Option 2: Using the `gcloud` CLI directly:
```bash
gcloud run deploy demucs-worker \
  --source . \
  --region us-central1 \
  --memory 4Gi \
  --cpu 2 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 5 \
  --allow-unauthenticated
```

---

## 🔌 API Endpoints

### 1. Separate from URL
`POST /separate`
```json
{
  "audioUrl": "https://pub-xxx.r2.dev/renders/scene_1.mp4",
  "twoStems": "vocals",
  "model": "htdemucs"
}
```

**Response:**
```json
{
  "success": true,
  "bgmUrl": "data:audio/wav;base64,...",
  "vocalsUrl": "data:audio/wav;base64,...",
  "model": "htdemucs"
}
```

### 2. Separate from File Upload
`POST /separate/upload` (multipart/form-data)
- `file`: Media file (`.mp4`, `.wav`, `.mp3`, `.mov`, `.webm`)
- `twoStems`: `vocals` (optional)

### 3. Health Check
`GET /health`
```json
{
  "status": "healthy",
  "service": "demucs-worker",
  "engine": "Meta Demucs v4 (Hybrid Transformer)"
}
```

---

## 🧪 Local Testing with Docker

```bash
docker build -t demucs-worker .
docker run -p 8080:8080 demucs-worker
```
Test health endpoint:
```bash
curl http://localhost:8080/health
```
