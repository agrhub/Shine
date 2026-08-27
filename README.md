# <img src="./client/public/favicon.png" alt="Shine Logo" width="48" height="48" /> Shine — AI Micro-Drama Video Studio

<p align="center">
  <strong>Next-Generation End-to-End AI Micro-Drama Creation Platform</strong><br>
  Transform prompts into viral vertical video dramas (9:16) with scriptwriting agents, character consistency, neural voice acting, dynamic kinetic captions, multi-language dubbing, and a professional multi-track WebGL editor.
</p>

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-architecture--tech-stack">Tech Stack</a> •
  <a href="#-cloud-run-serverless-ecosystem">Cloud Run Deployment</a> •
  <a href="#-pipeline-workflow-b1--b10">Pipeline</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-environment-variables">Configuration</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-license">License</a>
</p>

---

## 🌟 Overview

**Shine** is a vertical short-form video creation suite engineered specifically for the explosive micro-drama format (TikTok, YouTube Shorts, Instagram Reels, Kuaishou). It unifies AI generative pipelines with a non-linear multi-track timeline editor powered by **Pixi.js** and the **OpenVideo Engine**, enabling creators to produce multi-episode series in minutes.

---

## ✨ Key Features

### 🎭 1. AI Director & Master Scriptwriting
- **Automated Series Architect**: Generate complete 10–50 episode drama arcs with cliffhangers, conflict escalation, and character backstory.
- **Scene-by-Scene Breakdown**: Generates precise scene headers, actions, visual descriptions, camera instructions, and character dialogues.

### 👥 2. Character Consistency & Persona Engine
- **Visual Identity Preservation**: Generates character reference sheets and avatars for consistent appearances across episodes.
- **LoRA / Prompt DNA**: Automatic prompt injection ensures visual continuity for all cast members.

### 🎙️ 3. Multi-Language Neural Voiceover & Dubbing
- **Multi-Speaker TTS**: Assign distinct AI voices to each character with granular control over intensity, pacing, emotion, and pitch.
- **Multi-Language Tracks**: Create separate voice tracks (`vi-VN`, `en-US`, `zh-CN`, `ja-JP`, `ko-KR`) for global distribution.
- **AI Dubbing Re-alignment**: Automatic syllable density time-expansion adjustment to align dubbed audio with scene visuals.

### 📝 4. Kinetic Subtitles & Translation
- **Word-Level Kinetic Timing**: Auto-generates viral pop-in, bounce, and glowing subtitle animations.
- **One-Click Multi-Language Translation**: AI-powered translation of subtitle cues while preserving micro-drama timing and tone.

### 🎞️ 5. Scene-to-Video Generation
- **Image-to-Video Engine**: Transform storyboard scene backgrounds into cinematic video clips with camera movement (dolly, pan, zoom).
- **Smart Batch Rendering**: Intelligently skips already-rendered assets to optimize generation cost and speed.

### 🎛️ 6. OpenVideo Multi-Track WebGL Timeline
- **Non-Linear Editing**: Video, image, voiceover, BGM, SFX, captions, and transition tracks.
- **Interactive Canvas**: Real-time PIXI-accelerated preview, clip splitting, trimming, layering, and property manipulation.
- **Auto-Ducking & Soundscapes**: Intelligent background music volume ducking during dialogue.

### 🚀 7. Dual-Mode Render & Export (B8)
- **Local In-Browser Render**: Zero-server-cost fast client rendering via WebCodecs (`mediabunny` / `ExportModal`).
- **Cloud Serverless Queue**: Scalable asynchronous rendering via `@openvideo/video-renderer` headless Playwright workers on Google Cloud Run + Pub/Sub.
- **Post-Render Review**: In-app video preview player with instant download and direct publishing triggers.

### 🛡️ 8. AI Watermarking & Provenance
- **Google SynthID Integration**: Digital audio/video watermarking.
- **C2PA / Content Credentials**: Cryptographic provenance tracking for AI-generated media authenticity.

---

## 🏗 Architecture & Tech Stack

```mermaid
graph TD
    Client[Vue 3 Client App] -->|REST / Socket.io| Server[Express Backend API / shine-app]
    Client -->|WebGL Rendering| PIXI[Pixi.js & OpenVideo Engine]
    Client -->|Local Export| WebCodecs[Client WebCodecs / Mediabunny]

    Server -->|Script & Direction| Gemini[Google Vertex AI / Gemini 3.5 & 3.1]
    Server -->|Neural Voices / TTS| TTS[Gemini Audio & Google Cloud TTS]
    Server -->|Video Generation| VideoAI[Veo 3.1 & Imagen 3]
    Server -->|Stem Separation| Demucs[Meta Demucs v4 on Cloud Run]
    Server -->|Async Render Jobs| PubSub[Google Cloud Pub/Sub]
    PubSub -->|Event Trigger| RenderWorker[shine-render-worker Playwright WebCodecs]
    Server -->|Asset Storage| Storage[Google Cloud Storage gs://shine-studio-media / B2]
    Server -->|Persistence Layer| DB[(Google Cloud Firestore Native: shine-db)]
    Scheduler[Google Cloud Scheduler] -->|Heartbeat Sync Token */5 min| Server
```

| Layer | Technologies |
|---|---|
| **Frontend Framework** | [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`), [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 7](https://vitejs.dev/), [pnpm](https://pnpm.io/) |
| **UI & Styling** | [Element Plus](https://element-plus.org/), [TailwindCSS v4](https://tailwindcss.com/), Tabler & Lucide Icons |
| **Video & Canvas Engine** | [`@openvideo/video-renderer`](https://www.npmjs.com/package/@openvideo/video-renderer), `@openvideo/engine-pixi`, `@openvideo/timeline`, [Pixi.js v8](https://pixijs.com/) |
| **State Management** | [Pinia](https://pinia.vuejs.org/), VueUse |
| **Internationalization** | [Vue I18n](https://vue-i18n.intlify.dev/) (EN, VI, ZH, JA, KO) |
| **Backend API** | [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [Socket.io](https://socket.io/) |
| **Database Providers** | [Google Cloud Firestore](https://cloud.google.com/firestore) Native (`shine-db`), [MongoDB](https://www.mongodb.com/), MapDB, SQLite |
| **Cloud Infrastructure** | **Google Cloud Run** (`us-central1`), **Cloud Pub/Sub**, **Cloud Scheduler**, **Google Cloud Storage** (`gs://shine-studio-media`) |
| **Audio Stem Separation** | [Meta Demucs v4](https://github.com/facebookresearch/demucs) Serverless Microservice on **Google Cloud Run** |
| **Media Processing** | [`@openvideo/video-renderer`](https://www.npmjs.com/package/@openvideo/video-renderer) (Playwright WebCodecs Headless), [FFmpeg](https://ffmpeg.org/) |
| **AI Services** | Google Vertex AI / Gemini 3.5 & 3.1 Flash / Imagen 3 / Veo 3.1 |

---

## ☁️ Cloud Run Serverless Ecosystem

The entire backend and processing engine is architected for **Serverless Scale-to-Zero ($0 idle cost)** with automated infrastructure provisioning:

| Microservice | Default Region | Resource Specs | Behavior & Cost Optimization |
|---|---|---|---|
| **`shine-app`** | `us-central1` | 2 vCPU / 2Gi RAM | Main API + Vue SPA (`--min-instances 0`, `--cpu-throttling`). Scales to zero when idle. |
| **`shine-render-worker`** | `us-central1` | 4 vCPU / 8Gi RAM | Headless Chromium + WebCodecs compositor for asynchronous 4K/1080p MP4 exports (`--min-instances 0`). |
| **`demucs-worker`** | `us-central1` | 2 vCPU / 4Gi RAM | Meta Demucs v4 AI worker for vocal/BGM isolation (`--min-instances 0`). |
| **Cloud Scheduler** | `us-central1` | `*/5 * * * *` | Calls `POST /api/admin/flow-accounts/sync` to maintain Google Flow token freshness in Firestore. |

### 🚀 1-Click Complete Ecosystem Deployment

Deploy all 3 Cloud Run services, Cloud Scheduler, Pub/Sub topics, Firestore Database, and GCS Bucket in one command:

```powershell
# Windows PowerShell
.\scripts\deploy-cloudrun.ps1
```

```bash
# Linux / macOS / Cloud Shell
./scripts/deploy-cloudrun.sh
```

**Automated Deployment Steps Handled by Script:**
1. **API Check & Activation**: Auto-checks and enables 10 GCP APIs (`run`, `cloudbuild`, `artifactregistry`, `pubsub`, `firestore`, `datastore`, `cloudscheduler`, `aiplatform`, `storage`, `texttospeech`).
2. **IAM & Security**: Auto-grants `roles/datastore.user`, `roles/pubsub.editor`, `roles/storage.objectAdmin`, and `roles/aiplatform.user` to the Compute Service Account.
3. **Database & Storage**: Auto-creates Firestore Native database `shine-db` and GCS Bucket `gs://shine-studio-media` if missing.
4. **Message Queue**: Auto-creates Pub/Sub topics (`shine-render-jobs`, `shine-render-status`) and subscriptions (`shine-render-sub`, `shine-render-status-sub`).
5. **Full Configuration Injection**: Forwards 100% of `.env` variables via YAML dictionary.
6. **Token Sync Heartbeat**: Automatically sets up Google Cloud Scheduler.

---

## 🔄 Pipeline Workflow (B1 – B9)

```
[B1: Storyboards] ➔ [B2: Characters/Assets] ➔ [B3: Image2Video] ➔ [B4: Multi-Lang Voiceover]
       ➔ [B5: Kinetic Captions] ➔ [B6: WebGL Preview]
              ➔ [B7: Dual Export] ➔ [B8: Auto-Save] ➔ [B9: Multi-Publish]
```

1. **B1: Storyboard Backgrounds** — Generates initial 9:16 scene visual concepts.
2. **B2: Consistent Cast** — Generates and locks character avatars and visual assets.
3. **B3: Scene Image-to-Video** — Converts storyboard scenes into motion video clips.
4. **B4: Neural Voiceover (TTS)** — Synthesizes multi-speaker dialogue per language track.
5. **B5: Kinetic Captions** — Generates word-level animated subtitles with translation capabilities.
6. **B6: Interactive Timeline Preview** — Synchronizes all assets into the OpenVideo canvas editor.
7. **B7: Dual-Mode Export** — Fast local browser render or high-performance server job queue.
8. **B8: Auto-Save & State Sync** — Automatically persists timeline state, scenes, and language tracks.
9. **B9: Multi-Platform Publish** — Prepares and packages exports for TikTok, YouTube Shorts, and Reels.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **Package Manager**: `pnpm` (`v9.x` or `v10.x`)
- **Google Cloud SDK (`gcloud`)**: Configured with project authentication

### 1. Clone the Repository

```bash
git clone https://github.com/agrhub/shine.git
cd shine
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Environment Variables

Copy the example configuration file:

```bash
cp .env.example .env
```

Edit `.env` with your API credentials (see [Configuration](#-environment-variables) below).

### 4. Run in Development Mode

Run both client and server concurrently:

```bash
pnpm run dev
```

- **Client Application**: [http://localhost:3000](http://localhost:3000) (or assigned Vite port)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Environment Variables

Configure these variables in your root `.env` file (see [`.env.example`](./.env.example) for reference):

```env
# --- 1. Database Configuration ---
DB_PROVIDER="firestore" # "firestore" | "mongodb" | "sqlite" | "mapdb"
FIRESTORE_PROJECT_ID="your-gcp-project-id"
FIRESTORE_DATABASE_ID="shine-db"

# --- 2. Google Cloud Run Microservices (us-central1) ---
DEMUCS_SERVICE_URL="https://demucs-worker-xxxx-uc.a.run.app"
RENDER_WORKER_URL="https://shine-render-worker-xxxx-uc.a.run.app"

# --- 3. Storage Provider (Google Cloud Storage / Backblaze B2 / AWS S3) ---
STORAGE_PROVIDER="gcs" # "gcs" | "b2" | "s3" | "local"
GCS_BUCKET_NAME="shine-studio-media"
S3_BUCKET_NAME="microcine"
S3_ACCESS_KEY="your_s3_access_key"
S3_SECRET_KEY="your_s3_secret_key"
S3_REGION="us-east-005"
S3_ENDPOINT="https://s3.us-east-005.backblazeb2.com"

# --- 4. Google Cloud Pub/Sub ---
PUBSUB_TOPIC_RENDER="shine-render-jobs"
PUBSUB_TOPIC_STATUS="shine-render-status"
PUBSUB_SUBSCRIPTION_RENDER="shine-render-sub"
PUBSUB_SUBSCRIPTION_STATUS="shine-render-status-sub"

# --- 5. Stock Video, Audio & SFX APIs ---
PEXELS_URL="https://api.pexels.com"
PEXELS_API_KEY="your_pexels_api_key"
PIXABAY_URL="https://pixabay.com/api"
PIXABAY_API_KEY="your_pixabay_api_key"
FREESOUND_URL="https://freesound.org/apiv2/search/text"
FREESOUND_CLIENT_ID="your_freesound_client_id"
FREESOUND_API_KEY="your_freesound_api_key"

# --- 6. Google AI & Vertex AI Models ---
GEMINI_MODEL_TEXT="gemini-3.5-flash-lite"
GEMINI_MODEL_IMAGE="gemini-3.1-flash-lite-image"
GEMINI_MODEL_VIDEO="veo-3.1-generate-001"
GEMINI_MODEL_TTS="gemini-3.1-flash-tts-preview"
GEMINI_MODEL_VOICE="gemini-live-2.5-flash-native-audio"
GEMINI_MODEL_MUSIC="lyria-3-clip-preview"
GEMINI_MODEL_AGENT="gemini-3.5-flash-lite"

GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
GOOGLE_CLOUD_LOCATION="global"
GOOGLE_GENAI_USE_VERTEXAI="1"
```

---

## 📁 Project Structure

```
shine/
├── client/                     # Vue 3 Frontend Application
│   ├── src/
│   │   ├── components/         # Modals, Editor UI, CanvasPanel, Timeline
│   │   │   ├── editor/         # Timeline tracks, Header, MediaPanel, ExportModal
│   │   │   └── modals/         # MasterScript, CharacterPersona, ManageCast
│   │   ├── composables/        # useStudioStore, usePlaybackStore, useExport
│   │   ├── pages/              # ProjectWorkspacePage, SeriesPage, Analytics
│   │   │   └── projects/workspace/ # PipelineTab, ScriptTab, AudioTab, CaptionsTab
│   │   ├── stores/             # Pinia stores (useSeriesStore, usePipelineStore, etc.)
│   │   ├── locales/            # i18n translation bundles (en, vi, zh, ja, ko)
│   │   └── lib/                # OpenVideo core wrapper & PIXI engine bindings
│   └── vite.config.ts
│
├── server/                     # Express Backend Application
│   ├── src/
│   │   ├── agents/             # AI Pipeline Agents (ChatbotAgent, PipelineTools)
│   │   ├── routes/             # REST Endpoints (series, voices, captions, render, etc.)
│   │   ├── database/           # Firestore, MapDB, MongoDB, SQLite providers
│   │   ├── integrations/       # GeminiClient, FlowAdapter, SynthID, StorageFactory
│   │   └── services/           # TimelineService, VideoService, CaptionService, CompositorWorker
│   └── tsconfig.json
│
├── services/                   # Standalone Microservices
│   ├── demucs-worker/          # Meta Demucs v4 AI Stem Separator for Google Cloud Run (us-central1)
│   │   ├── main.py             # FastAPI stem separation service
│   │   ├── Dockerfile          # Container with pre-cached htdemucs model
│   │   ├── deploy.sh           # 1-Click Cloud Run deploy script (Linux/macOS)
│   │   ├── deploy.ps1          # 1-Click Cloud Run deploy script (Windows PowerShell)
│   │   └── requirements.txt
│   │
│   └── render-worker/          # Serverless Video Renderer (@openvideo/video-renderer on Cloud Run)
│       ├── src/server.ts       # Express headless compositor server
│       ├── Dockerfile          # Container with Playwright Chromium & WebCodecs
│       ├── deploy.sh           # 1-Click Cloud Run deploy script (Linux/macOS)
│       ├── deploy.ps1          # 1-Click Cloud Run deploy script (Windows PowerShell)
│       └── package.json
│
├── docs/                       # Technical architecture, guides, & API documents
├── scripts/                    # 1-Click End-to-End Cloud Run deployment scripts
│   ├── deploy-cloudrun.ps1     # Complete deployment script (Windows PowerShell)
│   └── deploy-cloudrun.sh      # Complete deployment script (Linux/macOS)
├── package.json
└── README.md
```

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `pnpm run dev` | Runs both backend and frontend in development mode |
| `pnpm run client` | Starts Vite client dev server only |
| `pnpm run server` | Starts Express backend in tsx watch mode |
| `pnpm run build` | Builds client production bundle and compiles server |
| `pnpm run client:build` | Compiles client Vue/Vite application |
| `pnpm run server:build` | Compiles server TypeScript application |
| `pnpm run start` | Runs the compiled production server |
| `.\scripts\deploy-cloudrun.ps1` | Full 1-Click Deployment to Google Cloud Run (`us-central1`) |
| `./scripts/deploy-cloudrun.sh` | Full 1-Click Deployment to Google Cloud Run (Linux/macOS) |

---

## 📄 License

This project is licensed under the [AGPL License](LICENSE).
