# Shine Studio — Google Cloud Run Automated Deployment Scripts

This directory contains automated, single-command deployment scripts for provisioning Google Cloud infrastructure and deploying the complete Shine Studio ecosystem to **Google Cloud Run (`us-central1`)**.

---

## 🚀 Quick Execution

### On Windows (PowerShell):
```powershell
# From anywhere in the project (root, scripts/, services/):
.\scripts\deploy-cloudrun.ps1
```

### On Linux / macOS / Google Cloud Shell:
```bash
# From anywhere in the project:
chmod +x ./scripts/deploy-cloudrun.sh
./scripts/deploy-cloudrun.sh
```

---

## 🛠️ Automated 6-Step Pipeline

| Step | Action | Description |
|---|---|---|
| **Step 1** | **API Check & Enablement** | Automatically scans and enables 10 GCP APIs (`run`, `cloudbuild`, `artifactregistry`, `pubsub`, `firestore`, `datastore`, `cloudscheduler`, `aiplatform`, `storage`, `texttospeech`). |
| **Step 2** | **Infrastructure Auto-Provisioning** | - Grants IAM roles (`datastore.user`, `pubsub.editor`, `storage.objectAdmin`, `aiplatform.user`) to Compute Default Service Account.<br>- Auto-creates GCS bucket `gs://shine-studio-media` if missing.<br>- Auto-creates Firestore Native database `shine-db` (`us-central1`) if missing.<br>- Auto-creates Pub/Sub topics (`shine-render-jobs`, `shine-render-status`) and subscriptions (`shine-render-sub`, `shine-render-status-sub`). |
| **Step 3** | **Demucs Worker** | Deploys/verifies `demucs-worker` (Meta Demucs v4 AI stem separator, 2 vCPU / 4Gi RAM, scale-to-zero). |
| **Step 4** | **Render Worker** | Deploys/verifies `shine-render-worker` (@openvideo/video-renderer Playwright WebCodecs compositor, 4 vCPU / 8Gi RAM, scale-to-zero). |
| **Step 5** | **Main Shine Application** | Builds Docker container for `shine-app` (2 vCPU / 2Gi RAM, scale-to-zero), automatically injecting 100% of `.env` variables via a dynamic YAML dictionary. |
| **Step 6** | **Cloud Scheduler Heartbeat** | Configures `shine-flow-token-sync` cron job (`*/5 * * * *`) calling `POST /api/admin/flow-accounts/sync` to maintain Google Flow token pool in Firestore. |

---

## ⚙️ Customizing Deployment Options

You can override default settings via environment variables before running:

```powershell
# Example: Deploy to a different region
$env:REGION = "us-east1"
.\scripts\deploy-cloudrun.ps1
```

```bash
# Example: Deploy to a different region
REGION="us-east1" ./scripts/deploy-cloudrun.sh
```
