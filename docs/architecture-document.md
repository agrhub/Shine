# Architecture Document: Shine - AI Micro-Drama Video Studio

## 1. System Overview

Shine is an enterprise-grade AI-powered platform tailored for creating serialized vertical short dramas (9:16 aspect ratio, typically 20-50 episodes of 1-3 minutes each). The platform integrates a Vue 3 frontend, a Node.js (Express) backend, and heavily utilizes Google Vertex AI for all generative tasks via the official `@google/genai` SDK. By orchestrating a multi-agent AI pipeline and a specialized multi-modal generation pipeline (Video, Audio, Image, Text), Shine enables end-to-end creation, character consistency management, episode editing, and social platform distribution.

```mermaid
graph TD
    Client[Vue 3 SPA] <--> API[Node.js / Express API]
    API <--> DB[(MongoDB + SQLite)]
    API <--> S3[(S3 Object Storage)]
    
    API <--> VertexAI{Google Vertex AI}
    VertexAI --> |Text| Gemini(Gemini 2.5/3.x)
    VertexAI --> |Video| Veo(Veo 3.1)
    VertexAI --> |Audio| TTS(Gemini TTS)
    VertexAI --> |Music| Lyria(Lyria 3)
    VertexAI --> |Image| Imagen(Gemini Image Models)
    
    API <--> Social[TikTok, YouTube, Meta APIs]
    API --> Observability[Grafana / OpenTelemetry]
```

## 2. Content Model

The core hierarchy of Shine maps directly to the serialized short drama format.

```mermaid
erDiagram
    SERIES ||--|{ EPISODE : "contains"
    SERIES ||--|{ CHARACTER : "features"
    SERIES ||--|{ ASSET : "owns"
    EPISODE ||--|{ SCENE : "comprises"
    EPISODE ||--o{ ANALYTICS_EVENT : "generates"
    CHARACTER }|--|{ SCENE : "appears in"

    SERIES {
        string id
        string name
        string genre
        string tone
        string visualStyle
        int episodeCount
    }
    EPISODE {
        string id
        string seriesId
        int episodeNumber
        int duration
        int sceneCount
        string status
    }
    SCENE {
        string id
        string episodeId
        int index
        string prompt
        int durationSeconds
        string startFrameUrl
        string endFrameUrl
        string videoUrl
        string status
    }
    CHARACTER {
        string id
        string name
        string loraModelUrl
        string loraVersion
        string voiceId
    }
```

## 3. Modular Decoupled Workspace Architecture

The system is organized into a clean, decoupled modular workspace separating Frontend, Backend API Server, and Shared UI Component Packages:

- **Frontend SPA Application:** [`apps/shine/client`](../client) - Vue 3 + Vite + TypeScript NLE Studio & Creator Workspace.
- **Backend API Server:** [`apps/shine/server`](../server)) - Express Node.js Service, AI Provider Router, WebSocket server & Pluggable Database Abstraction.
- **Shared UI Package:** [`packages/vue-element-plus`](../../../packages/vue-element-plus) - Design system foundation built on Element Plus (`element-plus` v2.14.2), UnoCSS (`unocss` v66.7.4), Reka UI (`reka-ui` v2.10.1), `@openvideo/vue-admin`, and OKLCH color space variables defined in [`docs/design.md`](../docs/design.md).

```mermaid
graph TD
    subgraph Frontend Workspace [client]
        VueApp[Vue 3 SPA]
        PiniaStore[Pinia State Stores]
        VueRouter[Vue Router v5]
        DesignSystem[vue-element-plus Design Package]
    end

    subgraph Backend Workspace [server]
        ExpressServer[Node.js Express Server :3000]
        AIRouter[AIProviderRouter]
        DBLayer[IDatabaseProvider - SQLite/MongoDB]
        WSServer[WebSocket Atomic Patch Server]
    end

    subgraph Shared UI Package [packages/vue-element-plus]
        ElPlus[Element Plus UI Components]
        UnoCSS[UnoCSS Utility Engine & Preset Wind4]
        ThemeTokens[OKLCH Theme Tokens & vue-admin Themes]
    end

    VueApp --> DesignSystem
    DesignSystem --> Shared UI Package
    VueApp <--> |HTTP / REST API & WebSockets| ExpressServer
    ExpressServer <--> DBLayer
    ExpressServer <--> AIRouter
```

## 4. Frontend Architecture & Directory Structure

The frontend is a decoupled Vue 3 Single Page Application (SPA) built inside [`apps/shine/client`](../client) using Vite, TypeScript, Pinia, Axios, Element Plus (`element-plus`), and `@element-plus/icons-vue`. The visual design and screen layouts align 100% with **Google Stitch local design assets in `docs/stitch_shine_app_design/`** using the local design files in `docs/stitch_shine_app_design/`.


### 4.1 Client Directory Structure Standard (`apps/shine/client/`)
```
apps/shine/client/
├── public/                 # Static public assets (favicons, images, loading HTML)
├── src/
│   ├── api/                # Centralized API service modules (auth.ts, series.ts, ai.ts)
│   ├── assets/             # Global CSS, SCSS resources, icons, and theme tokens
│   ├── components/         # Application components
│   │   ├── basic/          # NATIVE BASIC UI COMPONENTS (FaButton, FaInput, FaCard, FaForm, etc.)
│   │   ├── layout/         # Layout components (Header, Sidebar, UserMenu, ThemeToggle)
│   │   └── business/       # Domain business components (SeriesCard, ScriptItem, TimelineTrack)
│   ├── composables/        # Shared Vue 3 composition hooks (useI18n, useTheme, usePlayer)
│   ├── constants/          # Application constants, genre enums, API endpoints
│   ├── layouts/            # 5 Layout Shells (DefaultLayout.vue, HomeLayout.vue, AuthLayout.vue, AppLayout.vue, StudioLayout.vue)
│   ├── locales/            # 6 i18n locale JSON files (en.json, vi.json, zh.json, jp.json, es.json, fr.json)
│   ├── router/             # Vue Router configuration & route modules (modules/dashboard.ts, manual.ts)
│   ├── stores/             # Centralized Pinia Stores (authStore.ts, seriesStore.ts, timelineStore.ts)
│   ├── types/              # Shared TypeScript interfaces & API contract definitions (api.ts)
│   ├── utils/              # Helper utilities & Centralized Axios Client (http.ts)
│   ├── views/              # Page View Components (dashboard/index.vue, manual/index.vue, login.vue)
│   ├── App.vue             # Root component with dynamic layout resolver
│   └── main.ts             # Application entrypoint (Pinia, i18n, router, UnoCSS setup)
├── index.html              # HTML entrypoint
├── package.json            # Client workspace dependencies
├── tsconfig.json           # TypeScript configuration
├── uno.config.ts           # UnoCSS design token configuration
└── vite.config.ts          # Vite build & alias configuration

### 4.1.1 Application Layout Shell & Modal Architecture

The frontend application utilizes standardized layout shells and modal containers:

1. **`AuthLayout.vue` (Synchronized Auth Shell):**
   - Standardized Light Mint Brand Panel (Image 2) on the left side with logo "Shine", headline *"Start shipping vertical drama in minutes"*, 2 feature badges ("AI Scene Synthesis", "Professional Timeline"), and copyright info.
   - Wraps `Login.vue`, `Signup.vue`, `ForgotPassword.vue`, and `ResetPassword.vue` with 1:1 consistent form styling, `rounded-xl` input fields, `rounded-full` CTA buttons, and social auth buttons.

2. **`AppLayout.vue` (Core Application Shell):**
   - Left Sidebar Navigation: Overview, My Projects, Team Shared, Asset Library, Analytics, Training Center.
   - Header Bar: Global search, series selector, notifications, language switcher, user profile menu.
   - Main Canvas: `<router-view />` for Dashboard, Team Shared, Global Analytics, and Project Workspace.

3. **`ProjectWorkspacePage.vue` (Unified Tabbed Project Workspace):**
   - Mounted at `/projects/:id`.
   - Contains a top `<el-tabs>` header bar unifying 5 Stitch project views:
     - **Overview**: `ProjectOverview.vue`
     - **Episodes**: `ProjectEpisodes.vue`
     - **Analysis & Retention**: `ProjectAnalysis.vue`
     - **Distribution Network**: `DistributionPage.vue`
     - **Revenue**: `ProjectRevenue.vue`

4. **`StudioWorkspaceModal.vue` (Episode Production Studio Modal):**
   - Fullscreen `<el-dialog>` with left sidebar tab navigation grouping all production surfaces:
     - `script`: `ScriptStudio.vue` (Script & Scene Assembly)
     - `editor`: `EditPage.vue` (9:16 Timeline Video Editor)
     - `voice`: `VoiceDubbingPage.vue` (Neural Dubbing & Affect Steering)
     - `captions`: `CaptionsPage.vue` (Subtitles Studio & Caption Designer)
     - `export`: `PublishPage.vue` (Smart Cover Generator & Export Config)

5. **Modal System**:
   - **`SeriesWizardModal.vue`**: 3-step series creation wizard inside an `<el-dialog>` modal (Core DNA, Trend Hunt, Compliance).
   - **`MasterScriptModal.vue`**: AI Script breakdown dialog.
   - **`CharacterPersonaModal.vue`**: Persona Studio & Facial Consistency Anchors dialog.
   - Target Routes: `/terms`, `/privacy`, `/contact`, `/manual`

2. **`HomeLayout.vue` (Marketing Landing Page Shell):**
   - Header: Marketing header with Logo, nav links (Features, Pricing, Use Cases, Blog), LanguageSelect, Sign In button, Get Started button
   - Footer: Clean footer
   - Main content: `<router-view />`
   - Sidebar: No sidebar
   - Target Routes: Marketing landing page (`/`)

3. **`AuthLayout.vue` (Authentication Shell):**
   - Left column: Image/Video/Brand hero illustration (Shine branding)
   - Right column: Centered card with `<router-view />`
   - Target Routes: `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`

4. **`AppLayout.vue` (Main Workspace Management Shell):**
   - `.g-sub-sidebar`: Collapsible menu (Series Dashboard, My Projects, Team Shared, Assets Library, Analytics); top header menu is logo icon; bottom footer is User Profile Menu (Profile, Settings, LanguageSelect, Dark/Light toggle and logout) and collapse toggle button at the bottom
   - `.g-main-area`: Content area with `<router-view />`
   - Target Routes: `/dashboard`, `/projects`, `/team`, `/assets`, `/analytics`

5. **`StudioLayout.vue` (Dedicated Production Studio Shell):**
   - `.g-header`: Logo with "Back to Dashboard / My Projects / Team Shared" button and main workspace tabs (Script, Editor, Characters, Library, Voice & Dubbing, Captions, Analytics, Export & Publish)
   - `.g-main-area`: Content area with `<router-view />`
   - Target Routes: `/wizard`, `/script/*`, `/editor/*`, `/persona/*`, `/dubbing/*`, `/captions/*`, `/audio/*`, `/environment/*`, `/reviews/*`, `/export/*` / `/publish/*`

```

### 4.2 Store-Driven Data Fetching & Centralized Axios Client Rule
- **STRICT PROHIBITION OF RAW `fetch()`:** Raw `fetch()` calls scattered across Vue page templates or view scripts are STRICTLY PROHIBITED.
- **STORE-DRIVEN API DATA FETCHING:** All user interactions triggering network requests MUST call Pinia store actions (e.g., `authStore.login(credentials)`, `seriesStore.createSeries(payload)`). Views components MUST NOT invoke API endpoints directly.
- **CENTRALIZED AXIOS HTTP CLIENT (`src/utils/http.ts`):** All API calls MUST execute through the unified Axios instance featuring:
  1. **Request Interceptor:** Automatically injects JWT Bearer token (`Authorization: Bearer <token>`) from storage to every outgoing HTTP request.
  2. **Response Interceptor:** Automatically unwraps response payload, handles business error codes (`res.code`), triggers global 401 unauthorized redirects to `/login`, and handles toast error notifications.

---

## 5. Backend Architecture & Directory Structure

The backend is a completely decoupled Node.js Express service running inside [`apps/shine/server`](../server) designed as a robust orchestrator for AI generation tasks, WebSocket patch sync, and pluggable data persistence.

### 5.1 Server Directory Structure Standard (`apps/shine/server/`)
```
apps/shine/server/
├── data/                   # Embedded SQLite database storage (shine.db)
├── src/
│   ├── controllers/        # Express route controller logic (authController, seriesController)
│   ├── middleware/         # Auth JWT verification, rate limiting, error handling middleware
│   ├── routes/             # REST API endpoint definitions (auth.ts, series.ts, ai.ts)
│   ├── lib/                # Core library abstractions & services
│   │   ├── ai/             # AI Pipeline (GeminiClient.ts, AIProviderRouter.ts, FlowAdapter.ts)
│   │   ├── db/             # IDatabaseProvider interface & providers (SQLiteProvider, MongoDBProvider)
│   │   └── storage/        # Object storage service (S3 / MinIO client)
│   ├── types/              # Server-side TypeScript interfaces & DTO schemas
│   ├── utils/              # Helper utilities, logger, response wrappers
│   ├── app.ts              # Express application setup & middleware registration
│   └── index.ts            # Server entrypoint (HTTP server listener & port binding)
├── package.json            # Server workspace dependencies
└── tsconfig.json           # Server TypeScript configuration
```

### 5.2 Standardized Server API Response Data Format Specification
All Express backend REST API endpoints MUST return responses formatted strictly according to the unified `ApiResponse<T>` JSON schema:

```json
{
  "code": 200,
  "data": { ... },
  "message": "Operation completed successfully",
  "error": null
}
```

- **`code` (number)**: Standard HTTP status code or business response code (`200` / `0` for clean success, `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `500` Internal Error).
- **`data` (object | array | null)**: The primary payload result returned to the client when `code === 200`.
- **`message` (string)**: Human-readable response summary or localized notification message.
- **`error` (object | string | null)**: Structured error details object or stack string when `code !== 200` (returns `null` on success).

## 5. AI Pipeline Architecture

Shine employs a multi-agent "Director" pipeline and a multi-modal generation interface via `@google/genai`.

### Multi-Agent Pipeline (Decision Layer)
```mermaid
graph LR
    Director[Director Agent] --> Skeleton[Story Skeleton Agent]
    Director --> Adaptation[Adaptation Strategy Agent]
    Director --> Script[Script Agent]
    Director --> Supervision[Supervision Agent]
    
    Skeleton --> |Arc/Breakdown| Adaptation
    Adaptation --> |Tone/Mapping| Script
    Script --> |JSON Script| Supervision
    Supervision --> |Feedback/Approval| Script
```

### Vertex AI Modality Mapping & Routing
| Capability | Model | Method | Location |
| :--- | :--- | :--- | :--- |
| Text / Reasoning | gemini-2.5-flash / gemini-3.x | `generateContent()` | `us-central1` (2.5) / `global` (3.x) |
| Image Generation | Imagen / Gemini Native | `generateImage()` | `global` |
| Video Generation | veo-3.1-* | `generateVideo()` | `global` |
| TTS / Dialogue | Gemini TTS | `generateAudio()` | `global` |
| Music | Lyria 3 | `generateMusic()` | `global` |
| Real-time Interactivity| Gemini Live | `connectLive()` | `global` |

## 6. Video Generation Pipeline (Veo 3.1) & Decoupled Audio Architecture

The backend handles the async nature of Veo video generation through a distinct pipeline wrapped in `GeminiClient.ts`.

> [!IMPORTANT]
> **Decoupled Audio/Video Architecture for Multi-Market Dubbing:**
> Video clips generated by Google Veo (`veo-3.1-generate-preview`) are **purely visual (silent MP4 clips)** placed on the `VIDEO 1` track. Speech, dialogue, and voiceovers are generated **completely separately on dedicated audio tracks (`AUDIO 1`) using Neural TTS (`POST /voices/generate`)**. This decoupling allows creators to instantly switch languages for multi-market dubbing (English, Spanish LatAm, Vietnamese, Chinese, French) by swapping the TTS audio file on `AUDIO 1` and auto-realigning scene timing ($\Delta t_{\mu s}$) without re-rendering expensive video clips!

1. **Resolution**: Download/resolve reference images (HTTP URL / S3 key) and convert to base64.
2. **Payload Construction**: Build the request payload specifying `model=veo-3.1-generate-preview` and `location=global`.
   - **I2V (Image-to-Video)**: Uses a single `image` (start frame).
   - **Interpolation**: Uses `image` (start frame) and `lastFrame` (end frame).
   - **R2V (Reference-to-Video)**: Incorporates `referenceImages[]` containing LoRA anchors for character consistency.
3. **Execution**: Invoke `generateVideos()` to start the async operation.
4. **Polling**: Poll the operation ID (maximum 60 attempts × 10s interval = 10-minute timeout).
5. **Storage**: Receive `videoBytes` (inline) or `gcsUri`, and persist the final MP4 to S3-compatible storage.


## 7. Character Consistency System

Maintaining visual continuity across a series is critical.

- **LoRA Models**: Each primary character has a dedicated high-res LoRA model (e.g., 1.4GB) stored in S3.
- **Facial Consistency Anchors**: Up to 8 reference anchor images per character. These are injected into the `referenceImages` array in Veo API calls to ensure facial mesh matching (targeting 98.4% consistency).
- **Outfit Locks**: Texture and silhouette metadata are locked per episode to prevent hallucinated wardrobe changes.
- **Voice Profiles**: Stable Gemini TTS voice profiles (`voiceId`) are persisted per character.

## 8. Episode Editor Architecture

The editor uses a standard Non-Linear Editor (NLE) timeline model adapted for AI generation.

- **Canvas Workflow**: A scene transitions through states: Text Prompt → Start Frame → End Frame → Video Clip.
- **Track Structure**:
  - `VIDEO 1`: The primary visual sequence consisting of 15-45 scenes (4-8s each).
  - `AUDIO 1`: Composite track containing generated TTS dialogue (WAV) and background music (Lyria 3).
  - `SUBS 1`: Subtitle track driven by auto-generated timestamps from the script.
- **OpenVideo Command-Driven Architecture & Patch Sync**:
  - **Command Dispatch**: Every timeline modification is triggered by dispatching a structured JSON command: `interface Command { id: string; type: string; payload: T; meta?: { source: "user" | "agent" | "system"; timestamp: number } }`.
  - **Atomic Patch Generation**: Command execution produces an array of atomic JSON patches: `interface Patch { op: "add" | "update" | "remove"; path: string; value?: any; oldValue?: any }` targeted at JSON Pointer paths (e.g. `/clips/clip_04/timing/display/to`).
  - **Real-Time Collaboration Sync**: When multiple editors work on the same episode, the Express/WebSocket server broadcasts lightweight `Patch[]` payloads instead of full state objects. Receivers apply patches via `core.applyPatches(patches)` for real-time visual feedback.
  - **Deterministic Undo/Redo**: History manager maintains a stack of inverse patches (`oldValue` ↔ `value`), enabling instant time-travel without server round-trips.
- **Real-Time AI Director Assistant Chatbot Integration (Google Agent ADK Architecture)**:
  - Powered by **Google Agent ADK (Agent Development Kit)** and Google GenAI SDK (`@google/genai`), implementing a modular `DirectorAgent` bound with a Tool Calling Registry:
    - `timelineCommandTool`: Translates prompts into structured OpenVideo `Command[]` arrays executed via `core.executeMany(commands)`.
    - `scriptGenTool`: Executes multi-agent script pipeline (`POST /ai/generate-script`).
    - `facialAnchorTool`: Extracts 8 facial anchors from uploaded actor images (`POST /characters/:id/facial-anchors`).
    - `virtualSetTool`: Generates 3D scene backgrounds (`POST /environments/generate`).
    - `veoVideoGenTool`: Synthesizes video clips with Veo 3.1 reference anchors (`POST /ai/video-gen`).
    - `voiceDubbingTool`: Synthesizes TTS audio and auto-realigns timeline clip bounds ($\Delta t_{\mu s}$).
    - `visualAudioQATool`: Executes Gemini Vision frame inspection and parametric EQ volume ducking.
  - User prompts (e.g. *"Shorten Scene 3 by 500ms and add a cinematic fade transition"*) are sent to `POST /ai/assistant/command-edit`.
  - Vertex AI LLM evaluates normalized workspace state (`exportToJSON()`), executes registered ADK tools, and returns structured commands & explanations to the client.
  - Executes 6 Advanced Intelligence Capabilities: Visual/Audio QA (Gemini Vision + EQ inspection), Beat-Synced Smart Captions, Retention Diagnostic & Script Doctoring, Real-Time Voice Acting Coaching, Cost Budget Optimization Advisor, and Interactive AntV G6 Story Tree Generation.
  - **Multimodal & Context-Aware Engine:** Ingests Images, Videos, PDF/DOCX Documents, and Real-Time Voice streams (`connectLive()`); dynamically dispatches surface-aware quick-action prompt chips matching current editor context.



- **Timeline Revision History & Zero-Render Preview Architecture**:
  - **Audit Log**: Every timeline save (`PUT /episodes/:id/timeline`) writes a version snapshot (`versionId`, `author`, `timestamp`, `changeSummary`, `timelineData`).
  - **Zero-Render Preview**: Clicking 'Preview' on any historical version loads the timeline JSON snapshot (`settings`, `tracks`, `clips`) directly into the browser's Vue 3 editor state. The HTML5 Canvas/WebGL & Web Audio engine plays the version in real time without triggering cloud video rendering.
  - **Version Restore**: Reverting to a version updates the active timeline pointer to that snapshot's data and appends a new audit record (`v1.4 - Restored to v1.1`).


## 9. Data Storage Architecture

- **MongoDB (Global / Cloud)**: Stores Series metadata, User configurations, and Analytics/Reporting data.
- **SQLite (Local / Project)**: Stores highly granular Episode, Scene, and Timeline state. This allows fast, offline-capable local editing before cloud synchronization.
- **S3 Object Storage**: Hosts all heavy media assets: video clips, generated WAV audio, LoRA weights, and reference images.

### 9.1 Hierarchical Vector Memory Bank & Series Knowledge Graph Architecture
- **Tier 1 (Sliding Window Session Memory):** Pinia & Redis session cache holding active timeline JSON (`studio.exportToJSON()`) and last 10 chat messages.
- **Tier 2 (Vertex AI Vector Search RAG):** Vectorizes per-scene scripts (`script_vector_idx`), character bibles (`persona_vector_idx`), timestamped comments (`comment_vector_idx`), and drop-off analytics (`analytics_vector_idx`) via `text-embedding-004` for <50ms similarity search.
- **Tier 3 (Series Knowledge Graph):** Directed Knowledge Graph linking `Series` ➔ `Episode` ➔ `Scene` ➔ `Character` ➔ `Asset`, maintaining character continuity across 50 episodes.
- **Tier 4 (Context Token Compressor):** Query rewriter expands entity IDs and token compressor strips structural JSON into a dense ~4KB Markdown summary payload.


## 10. External Integrations & Google Cloud Infrastructure

- **Google Vertex AI / Gemini API**: Core intelligence, multi-agent script orchestration, and generation engine. Uses **Gemini 3.5 Flash** (`gemini-3.5-flash`) for LLM/scripting, **Google Veo 3.1** (`veo-3.1-generate-preview`) for primary 4–8s cinematic scene video rendering with R2V character reference anchors, and **Gemini Omni Flash** (`gemini-omni-flash-preview`) for instruction-based multimodal scene video editing, relighting, and visual modification via **Google GenAI SDK (`@google/genai` v2.16.0)**.
- **GCP Infrastructure Services**: Headless Node.js `@openvideo/core` Compositor batch render workers deployed on **GCP Cloud Run**, media assets hosted on **Google Cloud Storage (GCS)**, and async render jobs queued via **Cloud Pub/Sub**.



- **Parallel MCP Services (Model Context Protocol)**:

  - **Real-Time Viral Trend & Competitor Script Engine**: Parallel MCP service that continuously crawls TikTok, Douyin, X, and App Store top charts for trending drama topics, high-retention tropes, and competitor script formulas.
  - **Cultural Compliance & Copyright Safety Engine**: Parallel MCP / Gemini Guardrails engine that audits script text, audio WAVs, and visual assets against multi-region content safety rules, age rating policies, and copyright/IP infringement databases prior to publishing.
- **Social Platform APIs**:
  - **TikTok Open API**: Direct video publishing, metadata sync, and comment stream aggregation.
  - **YouTube Data API v3**: YouTube Shorts publishing and comment moderation API.
  - **Meta Graph API**: Instagram Reels publishing and engagement comment API.
- **AI Audience Engagement & Comment Moderation Subsystem**:
  - **Auto-Reply Agent**: Generates context-aware, engagement-boosting replies to viewer comments.
  - **Auto-Moderation Agent**: Evaluates comments against community guidelines; flags or deletes toxic/spam comments via social platform APIs.
  - **Viewer Feedback Script Adaptation Loop**: Performs sentiment clustering on comment streams and feeds audience preference signals back to the AI Director Agent to dynamically adjust script arcs for unreleased future episodes.
- **Observability**: Metrics and traces exported via OpenTelemetry to Grafana.


## 11. Authentication & Security

- **Vertex AI Auth**: 
  - Backend uses Service Account JSON (`GOOGLE_APPLICATION_CREDENTIALS`) or Application Default Credentials (ADC).
- **Client Auth**: JWT-based authentication for the Vue 3 frontend communicating with the Express backend.
- **RBAC**: Role-based access control to delineate between Creators, Editors, and Admins.

## 12. Deployment Architecture

Deployments are containerized and optimized for Google Cloud.

- **Development**: Managed via Docker Compose (spins up Node.js API, MongoDB, MinIO for S3 emulation).
- **Production**: 
  - Frontend: Served via CDN / Cloud Storage.
  - Backend: GCP Cloud Run (stateless, autoscaling containers).
  - Database: MongoDB Atlas.

### 12.1 OpenVideo Headless Cloud Rendering Pipeline (Server-Side Batch Workers)
For multi-episode series batch rendering (20–50 episodes produced simultaneously), Shine offloads rendering from the client browser to headless Node.js cloud workers:

```
[Browser Vue SPA] 
  └── studio.exportToJSON()  ➔ Serialized Timeline JSON
                                  │
                                  ▼
[API Server (Express / Cloud Run)] ➔ Dispatch to Batch Worker Pool
                                  │
                                  ▼
[Headless Node.js Worker (@openvideo/core)]
  ├── Node Polyfills: crypto (@peculiar/webcrypto), WebSocket (ws)
  ├── const compositor = new Compositor(settings)
  ├── await compositor.loadFromJSON(projectData)
  └── const stream = await compositor.output() ➔ Rendered MP4 Video ➔ Upload to S3
```

- **Client-Side Mode (Browser):** Real-time interactive NLE editing, zero-render instant version previews (`studio.loadFromJSON()`), and fast single-episode local exports via OpenVideo Pixi.js / WebGL engine.
- **Server-Side Mode (Cloud Headless Workers):** High-throughput, headless `@openvideo/core` `Compositor` instances in Docker / Cloud Run containers executing batch multi-episode rendering directly from serialized timeline JSON payloads without requiring a browser display context.


## 13. Data Flow Diagrams

### A. Series Creation Flow
```mermaid
sequenceDiagram
    actor User
    participant UI as Vue SPA
    participant API as Node API
    participant AI as Director Agent (Gemini)
    participant DB as MongoDB
    
    User->>UI: Enter concept/synopsis
    UI->>API: POST /api/series/generate
    API->>AI: Generate Story Skeleton & Characters
    AI-->>API: Series Arc, Episode Breakdown, Character Bios
    API->>DB: Save Series & Characters
    API-->>UI: Series Object
    UI-->>User: Display Series Dashboard
```

### B. Episode Generation Flow
```mermaid
sequenceDiagram
    participant UI as Vue SPA
    participant API as Node API
    participant JobMgr as Job Manager
    participant Veo as Vertex AI (Veo 3.1)
    participant S3 as S3 Storage
    
    UI->>API: POST /api/scenes/{id}/generate-video
    API->>S3: Fetch Character Anchors & Start Frame
    S3-->>API: Image Assets (Base64)
    API->>Veo: generateVideos(R2V/I2V payload)
    Veo-->>API: Operation ID
    API->>JobMgr: Register Polling Task
    API-->>UI: Task Accepted (Generating state)
    
    loop Every 10s
        JobMgr->>Veo: Poll Operation Status
        Veo-->>JobMgr: Status (Running / Done)
    end
    
    JobMgr->>S3: Upload Result Video
    JobMgr->>API: Update Scene State (Done)
```

### C. Export & Publish Flow
```mermaid
sequenceDiagram
    actor User
    participant UI as Vue SPA
    participant API as Node API
    participant Renderer as Cloud Renderer
    participant Social as TikTok/YouTube API
    
    User->>UI: Click "Publish"
    UI->>API: POST /api/episodes/{id}/publish
    API->>Renderer: Render Final MP4 (Video + Audio + Subs)
    Renderer-->>API: Rendered MP4 URL
    API->>Social: Upload Media & Post Data (OAuth)
    Social-->>API: Post URL / ID
    API-->>UI: Success Notification
```

---

## 13. Infrastructure, Parity & Virality Architecture

### 13.1 OpenVideo Dual-Rendering Parity Audit Pipeline
- **Automated Parity Checker**: Node.js worker dispatches identical timeline JSON payload (`studio.exportToJSON()`) to both a headless Puppeteer/WebGL instance and a Headless `@openvideo/core` `Compositor`.
- **Pixel-Diff & Audio Waveform Alignment**: Performs pixel-by-pixel SSIM diff and audio sample cross-correlation. Any drift > 0.05% alerts the deployment pipeline prior to batch rendering.

### 13.2 Vertex AI Resource & Cost Guardrail Controller
- **Rate & Token Limiter Middleware**: Sits between Node.js API and Vertex AI SDK (`GeminiClient.ts`).
- **Budget Tracking Engine**: Tracks real-time token spend per project in Redis. If cost approaches project ceiling (e.g. $3.50 USD), requests switch to proxy models (`gemini-2.5-flash` instead of `gemini-3.x` or low-res video previews).

### 13.3 Viral A/B Analytics & Narrative Adaptation Loop
- **Multi-Variant Pipeline**: AI Script Director produces 3 episode ending payloads (`Variant_A_Mystery`, `Variant_B_Action`, `Variant_C_Romance`).
- **Social Performance Ingestion Worker**: Cron task queries TikTok Analytics API and YouTube Data API every 6 hours for retention at $t=3\text{s}$ and $t=\text{end}$.
- **Narrative Arc Selector**: Automatically updates the `Series.adaptationStrategy` state with the winning variant's emotional tags for remaining episodes.

### 13.4 Subscription Tier Feature Gating & Metering Middleware
- **Feature Entitlement Middleware (`server/middleware/checkTierLimit.ts`)**: Validates active JWT user subscription tier (Free $0, Creator Pro $29, Studio Team $149, Enterprise $499+) before dispatching heavy AI operations (4K rendering, AntV G6 story trees, 3D product placement, multi-editor WebSocket co-editing).
- **AI Credit Metering Engine**: Tracks monthly credit consumption in Redis and deducts credits per operation (e.g., Veo video generation = 25 credits/scene).


---

## 14. Interactive Branching, Sponsored Compositing & Offline Hybrid Architecture

### 14.1 AntV G6 Multi-Module Graph Suite (`@antv/g6`)
The platform leverages `@antv/g6` graph engine across 5 core workspace modules:
1. **Interactive Branching Narrative DAG Tree (`workspace-branching-tree`)**: Renders episode choice decisions using `dagre` node layouts with live audience choice percentages (`72% Choice A`).
2. **Character Relationship & Social Lineage Graph (`workspace-persona-studio`)**: Uses `force-directed` layout to map inter-character dynamics (Love, Betrayal, Alliance) across 50 episodes.
3. **Multi-Agent Workflow Execution Monitor (`workspace-ai-director`)**: Renders live glowing node graph tracking data flow between agents (Director ➔ Script ➔ Veo ➔ TTS).
4. **Spatial Audio 3D Soundstage Matrix (`workspace-audio-mixer`)**: Renders listener and sound source nodes on a 2D/3D plane for interactive spatial panning dragging.
5. **Asset Dependency Lineage Graph (`workspace-asset-library`)**: Displays dependency trees mapping LoRAs, Persona Avatars, and Virtual Sets to specific episode clips.



### 14.2 OpenVideo Sponsored Object Layer Compositing Pipeline
- **Surface Detector**: Gemini Vision detects 3D spatial bounding boxes for background surfaces (e.g. coffee table $[x_1, y_1, x_2, y_2]$).
- **Layer Compositor**: Injects sponsored product asset as a discrete OpenVideo visual clip layer with transform keyframes, perspective skew, and optional Chroma Key transparency.

---

## 15. Advanced Polish & Real-Time Co-Pilot Architecture (Proposals 13–16)

### 15.1 Kinetic Subtitle & Bass-Synced Highlight Engine (Proposal 13)
- **Word-Level Timing Alignment**: Parses word-level timestamps from Neural TTS output and generates SVG/Canvas word-highlight keyframe tracks on `SUBS 1`.
- **Bass-Synced Font Dynamics**: Listens to low-frequency audio energy ($20-120\text{Hz}$) on `AUDIO 2` (Music) and applies real-time font scale transforms ($1.0x \rightarrow 1.15x$) and auto-detected sentiment emojis (`🔥`, `😱`, `💔`).

### 15.2 3D Spatial Audio Soundstage & Emotion-Tuned TTS (Proposal 14)
- **Spatial Audio Panning**: Calculates 3D audio listener position from video camera motion metadata, panning SFX/ambience across $L/R$ audio channels.
- **Emotion Curve Auto-Tuning**: Evaluates script sentiment curves and applies parametric EQ, pitch-shifting, and room reverb filters to dialogue tracks (`AUDIO 1`).

### 15.3 AI Viral Cover Aesthetic Scanner & Social A/B Publisher (Proposal 15)
- **Face Aesthetic Scoring**: Scans episode video frames using Gemini Vision aesthetic evaluation, selecting optimal keyframes with highest face mesh quality scores.
- **Title Overlay Compositor**: Composites viral hook typography over keyframes and outputs 3 cover image variants for TikTok/Shorts A/B API publishing.

### 15.4 Real-Time Video Canvas Copilot Overlay Runtime (Proposal 16)
- **Playback Analyzer Worker**: Evaluates playback state against pacing heuristics, audio loudness meters, and shot continuity models in real time.
- **Canvas Feedback Bubbles**: Renders floating non-blocking UI alert bubbles on the WebGL preview canvas pointing out pacing delays, volume spikes, or visual anomalies.


### 14.3 Offline IndexedDB Command Queue & Reconnection Sync Pipeline
- **IndexedDB Storage Adapter**: Vue 3 editor intercepts OpenVideo commands and writes serialized `Command` and `Patch[]` objects to LocalStorage / IndexedDB when offline.
- **Delta Reconnection Sync**: Upon `window.ononline` event, client dispatches bulk offline patch queue (`POST /collaboration/sync-offline-patches`) to server for reconciliation.

---

## 16. Admin Back-Office & Operations Architecture (`/admin`)

### 16.1 Role-Based Access Control (RBAC) & Impersonation Engine
- **RBAC Middleware (`server/middleware/rbac.ts`)**: Enforces access tokens with role scopes (`SystemAdmin`, `FinOpsManager`, `Supporter`, `User`).
- **User Impersonation Engine (`POST /admin/impersonate`)**: Issues temporary scoped JWT tokens allowing Supporters to view user workspace states in read-only or consent-based edit mode.

### 16.2 FinOps Compute Cluster Control & Token Metering
- **GCP Cloud Run Queue Gauge**: Monitors active rendering containers via Cloud Run Admin API and Pub/Sub queue depth gauges.
- **Vertex AI Token Rate Limiter**: Integrates Redis token buckets to enforce strict per-series cost caps ($3.50/ep).

### 16.3 Observability & Telemetry Pipeline
- **OpenTelemetry Collector**: Instruments Node.js API server and `@openvideo/core` rendering workers, exporting subagent execution traces to Grafana dashboards.

---

## 17. Public Routes, Authentication Router & Static Docs Architecture

### 17.1 Vue Router Navigation Guard (`src/router/index.ts`)
- **Public Route Whitelist (`/`, `/auth/*`, `/terms`, `/privacy`, `/contact`, `/manual`)**: Accessible without authentication; unauthenticated users accessing workspace routes (`/workspace/*`, `/admin/*`) automatically redirect to `/auth/login`.

### 17.2 Passport & JWT Authentication Middleware (`server/middleware/auth.ts`)
- **OAuth 2.0 Strategy**: Passport Google & GitHub OAuth 2.0 strategies with automatic user profile creation and JWT cookie setting (`access_token` and `refresh_token`).

### 17.3 SSG/Markdown Manual Engine (`/manual`)
- **VitePress / Content Pipeline**: User manual renders static markdown guides, interactive prompt copy buttons, and embedded YouTube video walkthroughs with client-side instant search.

---

## 18. Multi-Language System UI Localization Architecture (`vue-i18n`)

### 18.1 Client-Side `vue-i18n` Bundle Manager (`src/locales/`)
- **Locale Dictionaries (`en.json`, `vi.json`, `zh.json`, `jp.json`, `es.json`, `fr.json`)**: Dynamic JSON translation bundles loaded lazily via Vite dynamic imports (`import(./locales/${locale}.json)`).
- **Pinia Locale Store (`src/stores/localeStore.ts`)**: Manages active UI locale, persists selection to `localStorage.setItem('user_locale', locale)`, and updates HTTP `Accept-Language` headers.

### 18.2 AI Chatbot Multilingual Prompt Detection & Output Localizer
- **Language Detection Pipeline**: Gemini 3.5 Flash automatically detects prompt language and responds in the same language while maintaining valid structural OpenVideo JSON `Command[]` payloads.

---

## 19. Rendering Performance, Memory Safety & Copyright Architecture (Proposals 22–26)

### 19.1 Cloud Pub/Sub Async Render Streaming Engine (`FR-120`)
- **Pub/Sub Queue Routing**: Offloads 50-episode batch jobs to GCP Cloud Run background containers.
- **Server-Sent Events (SSE) Progress Stream (`GET /api/v1/render/stream`)**: Pushes real-time percentage progress and clip status to the frontend without HTTP 504 timeouts.

### 19.2 Virtual Canvas Viewport & RAM Memory Windowing (`FR-122`)
- **Texture Windowing**: Only decodes and binds WebGL textures for the 5 clips nearest to playhead position.
- **Automatic Garbage Collection**: Unbinds and releases WebGL textures for clips outside the active 5-clip window, preventing browser Out-Of-Memory crashes.

### 19.3 AI Audio Copyright Fingerprinting Engine (`FR-121`)
- **Pre-Publish Scan**: Runs audio fingerprinting (`POST /audio/copyright-verify`) comparing soundtrack frequency signatures against copyright databases, auto-substituting flagged audio with Lyria 3 AI music.

---

## 20. AI Compliance, Provenance & Ecosystem Architecture (Proposals 27–30)

### 20.1 C2PA Cryptographic Provenance & SynthID Engine (`FR-125`)
- **Metadata Injection**: Injects C2PA JUMBF cryptographic manifests and Google SynthID invisible video/audio steganographic watermarks during cloud rendering to satisfy EU AI Act & TikTok Content Credentials mandates.

### 20.2 Intra-Scene Vocal Affect Steering (`FR-126`)
- **SSML Affect Engine**: Generates micro-second SSML tags (`<express-as type="whisper">`, `<express-as type="shout">`) mapped to timeline keyframes for mid-sentence vocal shifts.

### 20.3 AI Multi-Platform Recutter Engine (`FR-127`)
- **Automated Pacing Re-trim**: Re-evaluates timeline JSON to generate platform-tailored edits (59s YouTube Shorts fast cut vs 90s TikTok Series cut vs 15s IG Reels teaser).

---

## 21. Hybrid Dual-Engine AI Provider Router & Flow Pool Architecture (Proposal 31, FR-129)

### 21.1 Provider Dispatch Routing Engine (`server/lib/ai/AIProviderRouter.ts`)
- **Routing Strategy**:
  - `tier === 'ENTERPRISE' || mode === 'COMMERCIAL_EXPORT'` ➔ Routes to Official **GCP Vertex AI** (`GeminiClient.ts` via Service Account / ADC).
  - `tier === 'FREE' || tier === 'PRO' || mode === 'DRAFT_STORYBOARD'` ➔ Routes to **Google Flow Account Pool** (`FlowAdapter.ts`).

### 21.2 Flow Account Pool Manager & Token Lifecycle (`FlowSyncService.ts`)
- **Session-to-Access Token Converter (`stToAt`)**: Converts session cookies (`flowST` from `__Secure-next-auth.session-token`) to OAuth access tokens (`flowAT`) via `https://labs.google/fx/api/auth/session`.
- **Project Auto-Resolver (`ensureProject`)**: Auto-creates or resolves PINHOLE project IDs on Google Labs FX (`https://labs.google/fx/api/trpc/project.createProject`).
- **30-Minute Background Token Sync**: Background cron refreshing access tokens and querying credit balances (`https://aisandbox-pa.googleapis.com/v1/credits`).

### 21.3 reCAPTCHA v3 Solver Pipeline (`CaptchaService.ts`)
- **reCAPTCHA Token Generation**: Solves reCAPTCHA v3 (`6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV`) for `IMAGE_GENERATION` and `VIDEO_GENERATION` actions using configured solver adapters (`yescaptcha`, `capsolver`, `capmonster`, `remote_browser`, or local Playwright browser).








