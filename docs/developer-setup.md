# Shine Developer Setup Guide

This guide provides step-by-step instructions for setting up the local development environment for **Shine - AI Micro-Drama Video Studio**.

## 1. Prerequisites

Before you begin, ensure you have the following installed on your system:

* **Node.js**: >= 18 (along with npm, yarn, or pnpm)
* **Google Cloud SDK (gcloud CLI)**: Required for Application Default Credentials (ADC) setup.
* **Google Cloud Platform (GCP) Project**: With the following APIs enabled:
  * Vertex AI API
  * Cloud Storage API
  * Veo API (generativelanguage.googleapis.com)
* **MongoDB**: Local installation or MongoDB Atlas account.
* **MinIO or S3**: For local object storage.
* **Git**: Version control system.

## 2. Google Vertex AI Setup (Critical)

Shine uses Google Vertex AI exclusively for its AI capabilities (no API key pool, no Antigravity).

### Create GCP Project & Enable APIs
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Enable the required APIs: Vertex AI API, Cloud Storage API, and Veo API (`generativelanguage.googleapis.com`).

### Authentication Methods

There are two primary ways to authenticate with Vertex AI:

#### a) Service Account (Recommended for Production)
1. In the GCP Console, navigate to **IAM & Admin > Service Accounts**.
2. Create a new Service Account.
3. Grant the following roles:
   * **Vertex AI User**
   * **Storage Object Admin**
4. Create and download a JSON key for this Service Account.
5. Set the environment variable `GOOGLE_APPLICATION_CREDENTIALS` to point to the downloaded JSON file.
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
   ```

#### b) Application Default Credentials (ADC) (Recommended for Local Dev)
1. Install and initialize the Google Cloud SDK.
2. Run the following command to log in:
   ```bash
   gcloud auth application-default login
   ```
3. Set your active project:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

### Model Availability Notes
* **`gemini-2.5-*` models**: Generally available in the `us-central1` region.
* **`veo-3.1-*`, `lyria-*`, `gemini-3.x` models**: Require specifying a `global` location.
* **Veo API**: May require allowlist access. Ensure your GCP project has the necessary permissions.

## 3. Environment Variables

Create a `.env` file in the root of both your frontend and backend directories (or a shared root if applicable) based on the following template.

```env
# Google Vertex AI
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json # Optional if using ADC

# Gemini Models
GEMINI_MODEL_TEXT=gemini-3.5-flash
GEMINI_MODEL_IMAGE=gemini-3.0-flash-preview-image-generation
GEMINI_MODEL_VIDEO=gemini-omni-flash-preview
GEMINI_MODEL_VIDEO_HIGHRES=veo-3.1-generate-preview
GEMINI_MODEL_AUDIO=gemini-2.5-flash-preview-tts
GEMINI_MODEL_MUSIC=lyria-002
GEMINI_MODEL_VOICE=gemini-live-2.5-flash-preview




# Pluggable Primary Database Provider ('sqlite' | 'mongodb')
DB_PROVIDER=sqlite                                # Select primary DB: 'sqlite' (local file) or 'mongodb' (MongoDB Atlas)
SQLITE_PATH=./data/shine.db                       # Path to SQLite database file
MONGODB_URI=mongodb://localhost:27017/shine       # MongoDB connection URI



# Object Storage (S3-compatible)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=shine-assets

# Social APIs (optional)
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

# App
PORT=3001
JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:3000
```

## 4. Decoupled Workspace Local Development Setup

The project uses a decoupled modular workspace structure:

- **Frontend SPA Workspace:** [`apps/shine/client`](../client)
- **Backend Server Workspace:** [`apps/shine/server`](../server)
- **UI Component Framework:** Element Plus (`element-plus`)
- **UI Design Reference:** [`docs/design.md`](../docs/design.md)

Follow these steps to get the full stack running locally:

1. **Clone the repository & install dependencies:**
   ```bash
   git clone <repository-url>
   cd openvideo/apps/shine/client
   pnpm install
   ```

2. **Frontend SPA Application Setup:**
   - All UI views and components MUST use native Element Plus (`element-plus`) components and `@element-plus/icons-vue`.
   - Do NOT invent ad-hoc inline CSS or custom HTML controls. Use standardized Element Plus components.

3. **Start Infrastructure Services (MinIO & DB):**
   ```bash
   # Start MinIO (Object Storage)
   docker run -p 9000:9000 -p 9001:9001 -e "MINIO_ROOT_USER=minioadmin" -e "MINIO_ROOT_PASSWORD=minioadmin" quay.io/minio/minio server /data --console-address ":9001"
   ```
   *Note: SQLite runs embedded automatically at `./data/shine.db`. If using MongoDB (`DB_PROVIDER=mongodb`), start MongoDB with `docker run -p 27017:27017 -d mongo:latest`.*

4. **Start Decoupled Backend API Server:**
   ```bash
   cd apps/shine/server
   pnpm install
   pnpm dev   # Runs Express server at http://localhost:3001
   ```

5. **Start Decoupled Frontend SPA Application:**
   ```bash
   cd apps/shine/client
   pnpm install
   pnpm dev   # Runs Vite Vue 3 SPA at http://localhost:3000 consuming src/components/basic
   ```

6. **Start Full-Stack Simultaneously (Root script):**
   ```bash
   # From root workspace
   pnpm dev   # Concurrently launches backend server (:3001) and frontend SPA (:3000)
   ```

## 5. Testing Vertex AI Connection

Use the following quick test script to verify your Vertex AI connection is working. Save this as `test-ai.ts` in your backend directory and run it with `ts-node` or `tsx`.

```typescript
import { GeminiClient } from './src/integrations/ai/GeminiClient';

async function testConnection() {
  try {
    const client = new GeminiClient();
    const result = await client.generateContent('Say hello from Shine', 'gemini-2.5-flash');
    console.log('AI Response:', result.text);
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testConnection();
```

## 6. Running Reference Apps

The `tmp/` directory contains reference applications useful for learning patterns:

* **LocalMiniDrama**: Node.js + Vue 3. Run using `run_dev.bat` or manually with `npm start` in its respective directory.
* **Toonflow**: Node.js backend. Features socket-based agents.
* **Jellyfish**: FastAPI backend + React frontend. Run using Docker Compose (`docker-compose up`).
* **BigBanana**: Fully Dockerized. Run using `docker-compose up`.

## 7. Docker Compose (Full Stack)

For a complete local stack, you can use this `docker-compose.yml` template:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:3000
    volumes:
      - ./frontend:/app
      - /app/node_modules

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    env_file:
      - .env
    depends_on:
      - mongodb
      - minio
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  minio:
    image: quay.io/minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  mongodb_data:
  minio_data:
```

## 8. Common Issues & Troubleshooting

* **Veo API not available**: Check if your GCP project has allowlist access. As a fallback, try using `veo-2.0`.
* **ADC not found**: Ensure you have run `gcloud auth application-default login` in your terminal.
* **`GOOGLE_CLOUD_PROJECT` not set**: This is required for Vertex AI. Verify your `.env` file or environment variables.
* **`gemini-2.5` model error at global location**: Ensure you are using `us-central1` as the location for `gemini-2.5-*` models.
* **S3 upload fails**: Verify that MinIO is running and that the `shine-assets` bucket has been created manually or via a setup script.
* **MongoDB connection refused**: Ensure the `mongod` service (or Docker container) is started and running.

## 9. IDE Setup

* **Recommended IDE**: VS Code
* **Recommended Extensions**:
  * Vue - Official (Volar)
  * TypeScript Vue Plugin (Volar)
  * ESLint
  * Prettier
* **AI Assistance**: [Cursor](https://cursor.sh/) is highly recommended for AI pair programming.
* **Debugging**: Configure `launch.json` in VS Code for both the Node.js backend and Vite frontend to enable breakpoints and stepping through code.

---

## 10. Safe Code Editing & Agent Pair-Programming Protocols

To prevent accidental code deletion, regression, or corruption during automated or AI agent code generation, all developers and AI agents MUST adhere to these 5 core safety protocols:

### Protocol 1: Read-Before-Edit (`view_file` Mandatory Inspection)
- Always inspect exact target lines, surrounding indentation, and method bounds using code viewing tools (`view_file`) before applying code edits.
- Never guess file line numbers or code blocks from memory.

### Protocol 2: Minimal Target Scoping & Context Anchoring
- Scope replacement targets (`TargetContent`) strictly to the exact 3–8 lines changing.
- Always include unique context anchors (function signatures, unique variable names, adjacent docstrings) before and after the edit target to prevent multi-match collisions.

### Protocol 3: Non-Contiguous Multi-Chunk Editing (`multi_replace_file_content`)
- When modifying multiple non-adjacent methods or import blocks within a single file, NEVER wrap the entire file or large intervening code blocks into a single replacement chunk.
- Use `multi_replace_file_content` with separate, targeted `ReplacementChunk` objects for each edit point.

### Protocol 4: Mandatory Post-Edit Verification & Audit
- Immediately inspect modified files or run project verification commands (`pnpm lint`, `tsc`, `npm test`) after applying changes.
- Never declare a task complete without empirical verification that the code compiles cleanly and existing behavior is preserved.

### Protocol 5: Strict Contract & Comment Preservation
- Retain all unrelated comments, docstrings, exported types, interfaces, and error handling branches unless explicitly instructed to refactor them.

### Protocol 6: Zero Hardcoded Strings & i18n Dictionary Integrity
- NEVER hardcode raw English or Vietnamese text strings directly inside Vue component templates.
- ALL user-facing text strings MUST be bound to `$t('...')` / `useI18n()` translation keys.
- Developers and AI Agents MUST populate all 6 locale JSON dictionary files (`src/locales/{en,vi,zh,jp,es,fr}.json`) whenever creating or modifying UI components.

---

## 11. Anti-Hallucination & Definition of Done (DoD) Protocols

To eliminate premature victory declarations, dummy mockups reported as complete, and defensive claim loops, all developers and AI agents MUST abide by the following Definition of Done (DoD) rules:

### Rule 1: Empirical Evidence Requirement
- An AI Agent or developer MUST NOT claim a feature or task is "100% complete" based solely on code edits or high-level function stubs.
- Claiming 100% completion requires attached **empirical runtime verification evidence**:
  - Clean build/compilation logs (`pnpm build`, `tsc`).
  - Passing test suite output (`pnpm test` / `vitest` PASS logs).
  - Empirical API runtime responses or rendered UI screenshots.

### Rule 2: Explicit Implementation Status Classification
All feature walkthroughs and progress updates MUST classify implementation items into 3 clear status tiers:
- 🟢 **Production Ready (Verified)**: Fully implemented production code with empirical test evidence attached.
- 🟡 **Partial / Stub / Skeleton**: Interface or UI mockup created; underlying logic, database integration, or API handling pending.
- 🔴 **Blocked / Not Started**: Feature planned but not implemented.

### Rule 3: Re-Verification & Audit Trigger Protocol
When a user asks *"Did you double check?"* or raises a verification query:
- The Agent MUST NOT reply with a verbal reassurance (e.g. *"Yes, I verified everything 100%"*).
- The Agent MUST treat the prompt as an automated trigger to re-inspect code using `grep_search` / `view_file` for unresolved stubs (`TODO`, `FIXME`, `return null`, empty handlers) and re-run build/test commands before outputting any response.

### Rule 4: Prohibition of Superficial Symptom Patches
- NEVER resolve errors or pass tests by swallowing exceptions, commenting out broken assertions, returning dummy 0-byte fallbacks, or creating empty stub functions.
- Always fix the root-cause data flow and preserve underlying system contracts.

### Rule 5: Store-Driven Data Fetching & Centralized Axios Client
- Raw `fetch()` calls scattered across Vue page templates or view scripts are STRICTLY PROHIBITED.
- All network interactions MUST call Pinia store actions (`src/stores/` or `src/store/modules/`).
- All HTTP requests MUST use the centralized Axios client (`src/utils/http.ts`) featuring automatic JWT Bearer header injection and global 401 unauthorized redirect handlers.

### Rule 6: Standardized Server API Response Format
- All Express backend REST API endpoints MUST return JSON payloads formatted strictly as:
  ```json
  {
    "code": 200,
    "data": { ... },
    "message": "Operation completed successfully",
    "error": null
  }
  ```


