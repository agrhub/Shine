# Shine — AI Micro-Drama Video Studio
## 23-Slide System Architecture & Product Blueprint

---

### Part I: Market Context & Product-Market Fit (Slides 01–04)

#### Slide 01: Title & Executive Overview
# Shine — Next-Gen AI Micro-Drama Studio
### Transforming Prompts into Serialized 9:16 Vertical Drama Series (20–50 Episodes)

- **Market Segment:** Vertical Micro-Drama Video Creation ($10B+ Global Market Boom)
- **Core Technology Stack:**
  - **Client:** Vue 3 (Composition API), Pixi.js v8 WebGL Engine, WebCodecs (`mediabunny`).
  - **Backend:** Node.js 22, Express, Google GenAI SDK (`@google/genai`), Parallel MCP & Grafana MCP.
  - **Cloud Infrastructure:** Google Cloud Run (us-central1, Scale-to-Zero), Cloud Scheduler.
  - **Data Tier:** Google Cloud Firestore Native (`shine-db`), Google Cloud Storage (`gs://shine-studio-media`), MongoDB, SQLite.

---

#### Slide 02: The Global Micro-Drama Boom
##### The Explosive Rise of Vertical Micro-Dramas

- **$10B+ Global Market by 2027:** Pioneered by Chinese Wēi Duǎnjù and rapidly expanding across the US, Southeast Asia, Latin America, and Europe via TikTok, ReelShort, DramaBox, and YouTube Shorts.
- **1–3 Minute Episodic Formula:** Serialized 20–50 episode dramas with fast conflict escalation, intense emotional payoffs, and cliffhangers every 60–90 seconds to maximize viewer retention.
- **3.5x Higher Monetization Velocity:** Micro-dramas convert viewers into paying subscribers 3.5x faster than traditional streaming platforms through pay-per-episode paywalls.
- **The Opportunity:** The creator economy needs automated software to produce hundreds of high-quality vertical drama episodes per month with minimal budget.

---

#### Slide 03: Market Issues & Production Bottlenecks
##### Core Bottlenecks in Vertical Drama Creation

1. **High Physical Production Costs:** Traditional filming requires casting actors, renting sets, filming crews, and extensive editing suites, costing $30,000–$100,000+ per series.
2. **Character Visual Drift in Generative AI:** Existing text-to-video tools fail to preserve consistent facial geometry, attire, and lighting across consecutive scenes.
3. **Prohibitive Localization & Dubbing Costs:** Translating video series into foreign languages traditionally requires re-rendering video clips from scratch, incurring massive GPU compute bills.
4. **Disconnected Toolchains:** Creators waste hours juggling separate tools for scriptwriting (ChatGPT), image gen (Midjourney), video gen (Runway), and NLE editors (Premiere).

---

#### Slide 04: Product-Market Fit (PMF)
##### Ideal Customer Profiles & Value Proposition

- **Independent Writers & Creators:** Web novel authors and solo creators who want to transform written stories into monetizable vertical video series without camera crews. *(Value: 100x faster production)*
- **Digital Media Studios & Agencies:** Agencies producing high-volume serialized content for TikTok, YouTube Shorts, and Reels to capture ad revenue and subscriber paywalls. *(Value: 80% cost reduction)*
- **Global Localization Teams:** Publishers localizing domestic drama hits into international markets (EN, VI, ZH, JA, KO, ES) with instant neural voice swapping. *(Value: Zero-video-render dubbing)*
- **The Shine Value Proposition:** Turn a single creative individual or small team into a full-fledged serialized drama production studio.

---

### Part II: System Architecture & Core Engine (Slides 05–12)

#### Slide 05: The 5-Layer End-to-End Architecture
##### Distributed System Topology

```mermaid
graph TD
    Client[1. Client Studio [ACTIVE]: Vue 3 + Pixi.js WebGL] <-->|REST (HTTPS)| Server[2. API Gateway [ACTIVE]: Express Backend API :3001]
    Client -->|WebGL Rendering| PIXI[Pixi.js v8 Canvas Engine]
    Client -->|Local Export| WebCodecs[Client WebCodecs Hardware Export]

    Server -->|Script & Direction| Gemini[3. AI Director [ACTIVE]: Google Vertex AI / Gemini 3.1]
    Server -->|Trending Scan| ParallelMCP[Parallel AI Search MCP]
    Server -->|Telemetry & Logs| GrafanaMCP[Grafana MCP & Loki]
    Server -->|Neural Voices / TTS| TTS[Gemini Audio & Google Cloud TTS]
    Server -->|Video Generation| VideoAI[Veo 3.1 & Imagen 3]
    Server -->|Stem Separation| Demucs[Meta Demucs v4 on Cloud Run]
    Server -->|Single Render Jobs| RenderWorker[4. Cloud Workers [ACTIVE]: Playwright WebCodecs Container]
    Server -->|Asset Storage| Storage[5. Storage & CDN [ACTIVE]: GCS gs://shine-studio-media]
    Server -->|Persistence Layer| DB[(Firestore Native: shine-db)]
    Scheduler[Cloud Scheduler: */5 min] -->|Heartbeat Sync Token| Server
```

---

#### Slide 06: Layer 1 — OpenVideo Pixi.js WebGL & WebCodecs Engine [ACTIVE]
##### In-Browser Hardware Compositor & $0 GPU Export

- **1. Real-Time WebGL Compositor (Pixi.js v8):**
  - Viewport renders 9:16 vertical frames at $\ge 30\text{ FPS}$ using client GPU hardware.
  - **Zero-Render Preview:** Scrub playhead across video, audio, and subtitle buffers with 0ms cloud latency.
  - **GLSL Fragment Shaders:** Real-time chroma keying, color grading, and dynamic transition blends.
  - **Microsecond Timeline Model:** Sub-millisecond timing precision ($1\text{s} = 1,000,000\mu\text{s}$).

- **2. In-Browser Export (WebCodecs API):**
  - **Zero Server Cost ($0):** 100% computed on client device, saving thousands in GPU hosting bills.
  - **Lightning Speed:** Encodes a 90-second 1080p episode in about 12 seconds.
  - **In-Memory ISOBMFF Muxing:** Assembles the final MP4 container in memory for immediate download.

---

#### Slide 07: Layer 2 — Real-Time Team Collaboration [PLANNED // PHASE 2 ROADMAP]
##### Multi-User Co-Editing Architecture (RFC 6902 JSON Pointer)

- **Delta Patch Protocol (`PatchSyncService`):**
  - Designed to broadcast atomic RFC 6902 delta patches ($<1\text{KB}$) over Socket.io:
    ```json
    { "op": "update", "path": "/clips/clip_01/timing/display/to", "value": 4500000, "author": "usr_sarah" }
    ```
- **Planned Concurrency Controls:**
  - **Clip-Level Mutex Locking:** Optimistic locking to prevent race conditions when multiple users edit the same scene clip.
  - **Teammate Cursors:** Live playhead markers broadcasting peer listening positions at 30Hz without DB write overhead.
  - **Immutable Version History:** Continuous timeline revision snapshots saved to Firestore for instant rollbacks.
  - **Status:** *Architecture & backend service designed ➔ Full client integration planned for Phase 2.*

---

#### Slide 08: Layer 3 — Hierarchical Multi-Agent AI Director [ACTIVE]
##### Autonomous AI Pipeline & 4-Tier Memory Mesh

- **1. Discovery & Skeleton (`trend_radar.md` + `script_skeleton.md`):** Scans regional viral drama topics via Parallel MCP and designs 20–50 episode narrative master plans with cliffhangers via `gemini-3.1-flash-lite`.
- **2. Screenplay Breakdown (`script_scene.md`):** Breaks each episode into 15–45 short scene blocks (4–8s) with visual prompts, actions, and dialogues in JSON via `gemini-3.1-flash-lite`.
- **3. QA & In-Editor Copilot (`compliance_check.md` + Agent ADK):** Audits pacing and safety while modifying timeline state via `gemini-2.5-pro` / `3.1`.
- **4-Tier Memory Mesh:** Active Session State ➔ Vertex Vector Search RAG (`text-embedding-004`) ➔ Series Knowledge Graph Lineage ➔ Token Compressor (compresses 500KB JSON into ~4KB Markdown prompts).

---

#### Slide 09: Layer 3 — Decoupled Audio-Visual Dubbing Engine [ACTIVE]
##### Instant Global Localization Without Video Re-rendering

> **The Decoupled Rule:**
> - **Track 1 (`VIDEO 1`):** Pure visual motion clips generated via `veo-3.1-generate-001` are silent motion clips focusing on cinematography, lighting, and acting.
> - **Track 2 (`AUDIO 1`):** Dialogue is synthesized independently with neural TTS (`gemini-3.1-flash-tts-preview`) containing exact word timestamps and emotion parameters across 30 voices.

```
[Scene 01: 6.00s] ───────── [Scene 02: 5.50s]  (Track VIDEO 1 - Fixed Visuals)
        ↓                              ↓
[EN Voice: 4.2s]      ➔        [VI Voice: 5.1s (+900ms Δt)]  (Track AUDIO 1 - Flexible)
```

- **Unfair Cost Advantage:** To distribute in 5 languages, Shine only swaps the voice track and recalculates timeline timings ($\Delta t_{\mu s}$). **You never re-render expensive video AI clips!**

---

#### Slide 10: Layer 4 — Serverless Cloud Run Video Render Worker [ACTIVE]
##### Headless Browsers with $0 Idle Cost

- **1. Asynchronous Render Jobs:** Episode render tasks are dispatched asynchronously (`/render-job`), tracking progress from 0% to 100% via API polling or SSE stream.
- **2. Headless Playwright Worker:** `shine-render-worker` container launches headless Chromium WebCodecs compositors to render master-quality 1080p/4K video frames.
- **3. Scale-to-Zero ($0 Idle):** Cloud Run containers scale automatically to 0 instances when idle, eliminating static server compute expenses.
- **4. Dual-Render Parity Audit:** Automated SSIM diff tool ensures the final cloud video matches the editor preview with **SSIM > 0.999 parity**.

---

#### Slide 11: Layer 4 — Meta Demucs v4 AI Stem Separation & 3D Audio [ACTIVE]
##### Containerized Audio DSP Microservice

- **FastAPI Demucs v4 AI Microservice (`services/demucs-worker`):**
  - Dedicated FastAPI Python container on Cloud Run separating mixed audio into isolated stems:
    - **Vocal Isolation:** Cleans up speech from background noise.
    - **Music Extraction:** Strips vocals to create clean instrumental soundtracks.
    - **Parametric Auto-Ducking:** Attenuates BGM by 80% with 250ms attack during dialogue intervals.
- **3D Binaural Spatial Audio:**
  - Calculates Sabine Reverberation Decay ($RT_{60} = \frac{0.161 \cdot V}{S \cdot \alpha}$) and Woodworth spherical head model for Interaural Time Differences (ITD), delivering cinema-quality surround sound directly through standard headphones.

---

#### Slide 12: Layer 5 — Pluggable Persistence, SynthID & Provenance [ACTIVE]
##### Enterprise Storage & AI Content Guardrails

- **Pluggable Database Architecture (`IDatabaseProvider`):**
  - `firestore`: Cloud Firestore Native (`shine-db`) — Primary Cloud NoSQL
  - `mongodb`: MongoDB Atlas — Document Database
  - `sqlite`: Embedded local database (`shine.db`) — Local Development
- **Digital Watermarking & Provenance:**
  - **Google SynthID:** Embeds imperceptible digital watermarks into synthesized audio waveforms and video frames.
  - **C2PA Content Credentials:** Cryptographically signs provenance manifests declaring AI generative origin.
  - **V4 Signed URLs:** Generates temporary 30-minute GCS links for secure media streaming.

---

### Part III: Google Cloud Synergy, AI Models & MCP Integration (Slides 13–15)

#### Slide 13: Google Cloud Unified Service Synergy
##### The Complete GCP Infrastructure Fabric

- **Compute & Serverless:**
  - **Cloud Run:** Hosts `shine-app`, `shine-render-worker`, and `demucs-worker` with `--min-instances 0` ($0 idle compute cost).
  - **Cloud Scheduler:** Manages cron (`*/5 * * * *`) token sync heartbeat for uninterrupted session pool rotation.
- **Data & Media Messaging:**
  - **Firestore Native (`shine-db`):** Real-time document persistence for scripts, scenes, and revision snapshots.
  - **Cloud Storage (`gs://shine-studio-media`):** V4 Signed URLs for high-speed streaming and media storage.
- **Security & Observability:**
  - **Cloud IAM & Secret Manager:** Least-privilege roles (`aiplatform.user`, `datastore.user`, `storage.objectAdmin`).
  - **Cloud Logging & Monitoring:** Real-time structured telemetry and P99 latency tracking.
- **Synergy Benefit:** Native identity & networking across all GCP services eliminates ingress/egress transit bottlenecks and simplifies DevOps automation.

---

#### Slide 14: Multimodal Generative AI Model Matrix (Audited Codebase Registry)
##### The Full Vertex AI Generative Stack

| Domain / Task | Active Production Model | Supported Models & Fallbacks | Technical Role in Shine |
|---|---|---|---|
| **Script & Planning** | `gemini-3.1-flash-lite` | `gemini-2.5-pro`, `gemini-3.1-pro` | Story master plan, 15–45 scene JSON breakdown, cliffhanger pacing. |
| **Video Generation** | `veo-3.1-generate-001` | `veo-3.0`, `veo-2.0`, `veo-2.1` | 9:16 vertical silent video motion clips with camera trajectory steering. |
| **Facial Consistency** | `gemini-3.1-flash-lite-image` | `imagen-3.0-generate-002`, `imagen-3.5` | 8-angle facial consistency keyframes and character visual DNA. |
| **Neural TTS Speech** | `gemini-3.1-flash-tts-preview` | 30 Gemini Voices (`Zephyr`, `Puck`, `Kore`...) | Multi-speaker dialogue with word-level phonetic timestamps in 6 languages. |
| **Soundtrack & SFX** | `lyria-3-clip-preview` | `Lyria-v1` | Dynamic mood-adaptive background music & suspense crescendo risers. |
| **Vector Search (RAG)** | `text-embedding-004` | Vertex Vector Search | Sub-50ms semantic search across scene bibles and character lineage. |
| **Stem Separation** | `Meta Demucs v4 (htdemucs)` | FastAPI PyTorch Container | Vocal isolation, BGM extraction, and parametric auto-ducking. |
| **Watermarking** | `Google SynthID` | C2PA Manifest Signing | Steganographic imperceptible watermarking on generated waveforms. |

---

#### Slide 15: Model Context Protocol (MCP) Integration Fabric
##### Parallel AI Search MCP & Grafana Observability MCP

- **1. Parallel AI Search MCP (`search.parallel.ai/mcp`) [ACTIVE]:**
  - **Trend Radar Agent:** Scans real-time trending micro-drama tropes across 6 regions (`US`, `SEA_VN`, `CN`, `LATAM`, `JP_KR`, `EU`).
  - **Supervision Agent:** Automated pre-flight copyright check on titles, character names, and novel synopses.
  - **SfxService:** Discovers open sound effects across Freesound, Pixabay, and web sources.
  - *Client implementation:* `server/src/integrations/mcp/ParallelMCPClient.ts`.
- **2. Grafana MCP & Loki Observability [ACTIVE]:**
  - **Telemetry Streaming:** Auto-flushes structured logs and memory RSS (MB) to Grafana Cloud Loki every 15 seconds.
  - **P99 Latency & Health Probes:** Exposes `GET /api/admin/observability` tracking active WebSocket connections and DB status.
  - **Automated Alerts:** Triggers instant email alerts to administrators upon critical AI pipeline failures.
  - *Service implementation:* `server/src/services/observability/GrafanaObservabilityService.ts`.

---

### Part IV: Unique Selling Points & Capabilities (Slides 16–18)

#### Slide 16: Shine's 4 Unique Selling Points (USPs)
##### Summary of Competitive Advantages

1. **Decoupled Multi-Language Dubbing:** Silent visual clips + neural speech allow swapping dialogue into 6+ languages and auto-aligning timeline bounds ($\Delta t_{\mu s}$) without re-rendering expensive video AI clips.
2. **In-Browser $0 GPU WebCodecs Render:** Creators export 1080p MP4 episodes directly in browser memory in ~12 seconds, delivering fast turnarounds with zero server GPU overhead.
3. **Persona Studio & 8 Facial Anchors:** Locks facial geometry, wardrobe, and character embeddings across 50 episodes, eliminating visual drift and inconsistency.
4. **Scale-to-Zero Serverless Economy:** 100% serverless infrastructure on Google Cloud Run automatically scales containers to 0 instances when idle, ensuring $0 static maintenance costs.

---

#### Slide 17: Persona Studio & Character Consistency
##### 8-Angle Facial Consistency Locking & Prompt DNA

- **8-Angle Facial Consistency Locking:** When a character is registered, Persona Studio generates 8 multi-angle reference keyframes (Frontal, 45° Left/Right, Profile, High/Low Angle, Smirk, Anger) to lock biometric DNA.
- **Prompt DNA & Reference Injection:** During video and storyboard generation, the character's visual traits and reference image URLs are automatically injected into Gemini and Veo prompts.
- **Result:** Guarantees cast continuity across all 20–50 episodes.

---

#### Slide 18: Kinetic Subtitles & Dynamic Cliffhanger Engine
##### Maximizing Audience Watch Time & Retention

- **Word-Level Animated Kinetic Captions:**
  - Active words highlight and bounce on beat with speech (Karaoke Pop-In, Neon Cyberpunk, Clean Minimalist presets).
  - One-click multi-language subtitle translation preserving millisecond timings.
- **Dynamic Cliffhanger Engine:**
  - Automatically identifies the episode climax and injects an intense 3-second hook sequence (GLSL glitch/flash shader + audio riser stinger on `AUDIO 3` + Call-to-Action overlay: *"Episode 2 Unlocked in 3s"*).

---

### Part V: Roadmap, Sizing & Vision (Slides 19–23)

#### Slide 19: Agile Engineering Roadmap (Sprints 1–7)
##### System Development Evolution

- **Sprint 1 (`v0.1 Alpha`):** Foundation, Vertex AI SDK, Pluggable DBs (Firestore/SQLite), and Auth Suite.
- **Sprint 2 (`v0.2 Beta`):** Multi-Agent Script Pipeline, Trend Radar (Parallel MCP), Persona Studio (8 Facial Anchors).
- **Sprint 3 (`v0.5 NLE Beta`):** OpenVideo Pixi.js WebGL Editor, Undo/Redo Commands, Dual-Render Parity.
- **Sprint 4 (`v0.8 RC1`):** Neural Voiceover, Kinetic Subtitles, Cliffhanger Engine, Meta Demucs v4.
- **Sprint 5 (`v0.9 RC2`):** WebSocket Delta Sync Architecture, Quality Linter & i18n Key Parity.
- **Sprint 6 & 7 (`v1.1 Commercial`):** Multi-Platform Publishing, Grafana MCP Observability & Verified Playwright E2E Suite.

---

#### Slide 20: Phase 2 & 3 Planned Innovations [PLANNED ROADMAP]
##### Planned Roadmap Items

1. **Real-Time Multi-User Co-Editing (Phase 2):** Full client integration of the Socket.io RFC 6902 JSON Pointer delta patch engine for live collaborative timeline editing.
2. **Distributed Batch Render Queue (Phase 2):** Automated multi-episode batch queueing across a pool of parallel Cloud Run Playwright worker nodes via Cloud Pub/Sub.
3. **Platform Analytics & Synthetic Audience (Phase 3):** Viewer retention heatmaps, drop-off prediction curves, and cross-platform publishing analytics (TikTok / Shorts / Reels).
4. **Live Interactive Drama & Marketplace (Phase 3):** Branching narrative trees (`@antv/g6`) for live voting + AI character asset trading marketplace.

---

#### Slide 21: Cloud Run Sizing & $0 Idle Cost Model
##### Serverless Infrastructure Resource Allocations

| Service Name | Compute Specs | Autoscaling Policy | Timeout | Concurrency | Idle Cost |
|---|---|---|---|---|:---:|
| **`shine-app`** | 2 vCPU / 4Gi RAM | Min: 0, Max: 3 | 300s | 80 req/inst | **$0.00** |
| **`shine-render-worker`** | 4 vCPU / 8Gi RAM | Min: 0, Max: 3 | 600s | 1 job/inst (Isolated) | **$0.00** |
| **`demucs-worker`** | 2 vCPU / 4Gi RAM | Min: 0, Max: 3 | 300s | 2 req/inst | **$0.00** |

- **Scale-to-Zero Guarantee:** When no users are actively editing or rendering, all 3 Cloud Run services scale to 0 instances. Zero monthly server bills when idle!

---

#### Slide 22: 1-Click Full Ecosystem Cloud Run Deployment
##### Automated Cloud Provisioning Lifecycle

```powershell
# Windows PowerShell
.\scripts\deploy-cloudrun.ps1

# Linux / macOS / Cloud Shell
./scripts/deploy-cloudrun.sh
```

- **What the script automatically handles:**
  1. Auto-enables 10 GCP APIs (`run`, `pubsub`, `firestore`, `aiplatform`, `storage`, etc.).
  2. Configures IAM security roles (`datastore.user`, `pubsub.editor`, `storage.objectAdmin`, `aiplatform.user`).
  3. Provisions Firestore Native database `shine-db` and GCS bucket `gs://shine-studio-media`.
  4. Creates Pub/Sub topics (`shine-render-jobs`, `shine-render-status`).
  5. Builds and deploys all 3 containers with dynamic YAML configuration.

---

#### Slide 23: Conclusion & Strategic Vision
##### Redefining Global Storytelling for the Short-Form Video Era

```text
User Prompt / Web Novel
  └── 1. AI Director Breakdown (TrendRadar [Parallel MCP] ➔ StorySkeleton ➔ ScriptAgent)
  └── 2. Asset Synthesis (Veo 3.1 Video ➔ Neural Voices ➔ Demucs Audio)
  └── 3. In-Browser WebGL Assembly (Pixi.js Editor & In-Browser Export)
  └── 4. Cloud Worker Render (Single Episode / Cloud Run Compositor)
  └── 5. Distribution & Monitoring (TikTok / Shorts + SynthID & Grafana MCP)
```

- **Key Metrics:**
  - **100x Faster:** Script to video production in minutes.
  - **80% Cheaper:** Zero-video-render multi-language dubbing.
  - **$0 Idle Cost:** 100% serverless scale-to-zero infrastructure.
