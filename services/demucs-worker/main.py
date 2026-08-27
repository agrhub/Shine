import os
import shutil
import tempfile
import urllib.request
import subprocess
import base64
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

app = FastAPI(
    title="Demucs AI Audio Stem Separation Service",
    description="High-performance Serverless Stem Separator (Vocals vs BGM) for AI Video Pipelines",
    version="1.0.0"
)

# Enable CORS for cross-origin service requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SHINE_APP_URL = os.environ.get("SHINE_APP_URL") or os.environ.get("APP_URL") or "https://shine-app-asmlum4txq-uc.a.run.app"

@app.get("/")
def root_redirect():
    """Redirect root access directly to Shine Main Application"""
    return RedirectResponse(url=SHINE_APP_URL, status_code=302)

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    """Redirect browser 404s to Shine App, or return JSON error for API requests"""
    accept = request.headers.get("accept", "")
    if "application/json" in accept or request.method == "POST":
        return JSONResponse(status_code=404, content={"error": "Not Found", "message": "Invalid endpoint on Demucs Worker"})
    return RedirectResponse(url=SHINE_APP_URL, status_code=302)

import threading
import time
import json
import socket
from datetime import datetime

WORKER_ID = os.environ.get("K_REVISION") or f"worker-{socket.gethostname()}"
WORKER_NAME = f"Meta Demucs AI Node ({socket.gethostname()})"
SERVICE_NAME = "demucs-worker"
REGION = os.environ.get("GCP_REGION") or "us-central1"

def send_heartbeat():
    if not SHINE_APP_URL:
        return
    try:
        payload = {
            "workerId": WORKER_ID,
            "workerName": WORKER_NAME,
            "serviceName": SERVICE_NAME,
            "region": REGION,
            "status": "ONLINE",
            "cpuUsagePct": 15,
            "memoryUsageMb": 512,
            "activeJobsCount": 0,
            "completedJobsCount": 0,
            "failedJobsCount": 0,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "metadata": {
                "engine": "Meta Demucs v4 (htdemucs)",
            }
        }
        req_data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            f"{SHINE_APP_URL}/api/admin/workers/heartbeat",
            data=req_data,
            headers={'Content-Type': 'application/json', 'User-Agent': 'DemucsWorker/1.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            pass
    except Exception:
        pass

def heartbeat_loop():
    time.sleep(2)
    while True:
        send_heartbeat()
        time.sleep(30)

threading.Thread(target=heartbeat_loop, daemon=True).start()

class SeparationUrlRequest(BaseModel):
    audioUrl: str
    twoStems: Optional[str] = "vocals"  # "vocals" creates vocals.wav + no_vocals.wav (BGM)
    model: Optional[str] = "htdemucs"   # "htdemucs" (fast & high quality) or "htdemucs_ft"

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "demucs-worker",
        "engine": "Meta Demucs v4 (Hybrid Transformer)",
        "shine_app_url": SHINE_APP_URL,
        "worker_id": WORKER_ID
    }

def run_demucs(input_path: str, output_dir: str, model: str = "htdemucs", two_stems: str = "vocals"):
    """Execute Demucs stem separation CLI"""
    cmd = [
        "demucs",
        "-n", model,
        f"--two-stems={two_stems}",
        "-o", output_dir,
        input_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Demucs processing failed: {result.stderr}")

@app.post("/separate")
def separate_from_url(req: SeparationUrlRequest):
    """
    Separate audio from a remote URL (S3, GCS, HTTP).
    Returns Base64 audio data URIs for clean BGM and clean Vocals.
    """
    temp_dir = tempfile.mkdtemp(prefix="demucs_")
    try:
        input_file = os.path.join(temp_dir, "input_media")
        
        # 1. Download source media
        try:
            req_headers = {'User-Agent': 'DemucsWorker/1.0'}
            request = urllib.request.Request(req.audioUrl, headers=req_headers)
            with urllib.request.urlopen(request) as response, open(input_file, 'wb') as out_file:
                shutil.copyfileobj(response, out_file)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch audio from URL: {str(e)}")
        
        # 2. Run Demucs separation
        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir, exist_ok=True)
        run_demucs(input_file, output_dir, model=req.model or "htdemucs", two_stems=req.twoStems or "vocals")
        
        # 3. Locate output files
        model_name = req.model or "htdemucs"
        output_base = os.path.join(output_dir, model_name, "input_media")
        vocals_path = os.path.join(output_base, "vocals.wav")
        bgm_path = os.path.join(output_base, "no_vocals.wav")
        
        if not os.path.exists(bgm_path) or not os.path.exists(vocals_path):
            raise HTTPException(status_code=500, detail="Demucs finished but output files were not found")
        
        # 4. Encode to Base64 Data URIs
        with open(bgm_path, "rb") as f:
            bgm_base64 = f"data:audio/wav;base64,{base64.b64encode(f.read()).decode('utf-8')}"
            
        with open(vocals_path, "rb") as f:
            vocals_base64 = f"data:audio/wav;base64,{base64.b64encode(f.read()).decode('utf-8')}"
            
        return {
            "success": True,
            "bgmUrl": bgm_base64,
            "vocalsUrl": vocals_base64,
            "model": model_name
        }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.post("/separate/upload")
async def separate_from_upload(
    file: UploadFile = File(...),
    twoStems: Optional[str] = Form("vocals"),
    model: Optional[str] = Form("htdemucs")
):
    """
    Separate audio directly from uploaded file buffer.
    """
    temp_dir = tempfile.mkdtemp(prefix="demucs_upload_")
    try:
        input_file = os.path.join(temp_dir, file.filename or "input_media")
        with open(input_file, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir, exist_ok=True)
        run_demucs(input_file, output_dir, model=model or "htdemucs", two_stems=twoStems or "vocals")
        
        model_name = model or "htdemucs"
        base_name = os.path.splitext(file.filename or "input_media")[0]
        output_base = os.path.join(output_dir, model_name, base_name)
        vocals_path = os.path.join(output_base, "vocals.wav")
        bgm_path = os.path.join(output_base, "no_vocals.wav")
        
        if not os.path.exists(bgm_path) or not os.path.exists(vocals_path):
            raise HTTPException(status_code=500, detail="Demucs finished but output files were not found")
            
        with open(bgm_path, "rb") as f:
            bgm_base64 = f"data:audio/wav;base64,{base64.b64encode(f.read()).decode('utf-8')}"
            
        with open(vocals_path, "rb") as f:
            vocals_base64 = f"data:audio/wav;base64,{base64.b64encode(f.read()).decode('utf-8')}"
            
        return {
            "success": True,
            "bgmUrl": bgm_base64,
            "vocalsUrl": vocals_base64,
            "model": model_name
        }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
