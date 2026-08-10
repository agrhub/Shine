# Ready-to-Use Master Execution Prompts for Shine (Sprint 1 to Sprint 6)

This document contains copy-pasteable execution prompts for Project Managers and Developers to delegate implementation tasks for each sprint to AI Coding Agents.

---

## 📌 Sprint 1 Master Execution Prompt: Foundation, Infrastructure & Core Setup

```markdown
# SPRINT 1 TASK: Foundation, Infrastructure, Vertex AI & Project Hub Setup

## Specification & Document Bindings
Inspect and strictly follow these authoritative project documents:
- Roadmap: `docs/sprint-roadmap.md` (Sprint 1)
- SRS Requirements: `docs/requirements-document.md` (FR-001 to FR-008, FR-074, FR-075, FR-107 to FR-113)
- System Architecture: `docs/architecture-document.md` (Section 1 to Section 3, Section 17, Section 18)
- API Reference: `docs/api-document.md` (Auth, Public & Series endpoints)
- Test Plan: `docs/test-document.md` (TC-001 to TC-008)
- Safe Editing Guidelines: `docs/safe-code-editing-guidelines.md`

## Scope of Work
1. **Infrastructure & Environment:**
   - Configure Express server in `server/index.ts` with SQLite DB (`better-sqlite3`) and S3 client.
   - Setup Vertex AI SDK (`@google/genai` v2.16.0) in `server/lib/ai/GeminiClient.ts`.
2. **Public Surfaces & Authentication Suite (FR-107 to FR-113):**
   - Build Marketing Landing Page (`src/pages/Home.vue`), Login/Signup Auth pages (`src/pages/auth/Login.vue`, `Signup.vue`) with Google/GitHub OAuth SSO & Password Reset, Legal pages (`Terms.vue`, `Privacy.vue`), Contact Form (`Contact.vue`), Interactive User Manual (`src/pages/Manual.vue`), and Multi-Language System UI Engine (`vue-i18n`, supporting 6 languages: `en`, `vi`, `zh`, `jp`, `es`, `fr`).

3. **Vertex AI Authentication & Location Routing:**
   - Implement Service Account & ADC auth. Route `gemini-2.5-*` to `us-central1` and `veo-3.1-*` to `global`.
4. **Series & Project Management CRUD:**
   - Implement REST endpoints: `GET /series`, `POST /series`, `GET /series/:id`, `POST /series/:id/episodes`.
5. **Dashboard UI:**
   - Wire `src/pages/Dashboard.vue` with Series list/grid and New Series wizard shell matching Fantastic Admin UI layout (`@fantastic-admin/components`, `reka-ui`).


## Safety Protocols (Mandatory)
- Use `view_file` to inspect target lines before calling `replace_file_content`.
- Scope edits to minimal 3–8 line targets with unique context anchors.

## Verification & DoD
1. Run `npx tsc --noEmit` and confirm zero TypeScript errors.
2. Run `tsx server/lib/ai/test-ai.ts` and attach empirical log proof of Vertex AI connection.
```

---

## 📌 Sprint 2 Master Execution Prompt: Multi-Agent Script & Persona Studio

```markdown
# SPRINT 2 TASK: Multi-Agent Script Pipeline & Persona Studio (FR-009 to FR-015, FR-081)

## Specification & Document Bindings
Inspect and strictly follow these authoritative project documents:
- Roadmap: `docs/sprint-roadmap.md` (Sprint 2)
- SRS Requirements: `docs/requirements-document.md` (FR-009 to FR-015, FR-081)
- System Architecture: `docs/architecture-document.md` (Section 7, Section 11)
- API Reference: `docs/api-document.md` (Section 3: AI Script & Scene Generation)
- Test Plan: `docs/test-document.md` (TC-009 to TC-018, TC-WRD-001)
- Prompt Engineering Guide: `docs/ai-prompt-guide.md` (Section 1 to Section 6, Section 11)

## Scope of Work
1. **Genre Onboarding Wizard (`src/components/wizard/`):**
   - 3-step genre selection (Suspense, Romance, Action, Satire) & tone config mapping.
2. **Multi-Agent Script Pipeline:**
   - Implement Director Agent, Story Skeleton, Adaptation Strategy, Script Agent, Supervision Agent.
   - Endpoint: `POST /ai/generate-script`. Output structured JSON per-episode scenes.
3. **Persona Studio & Wardrobe Registry (Proposal 1):**
   - Implement character creation, 8 facial anchor extraction, outfit continuity locking.
   - Endpoint: `POST /characters/:characterId/wardrobe`. Inject reference images in Veo calls while maintaining 98.4% face mesh match.

## Verification & DoD
1. Run `pnpm build` and confirm clean build.
2. Run unit tests and attach log proof for `TC-WRD-001`.
```

---

## 📌 Sprint 3 Master Execution Prompt: Timeline NLE Editor & Dual Rendering

```markdown
# SPRINT 3 TASK: OpenVideo Timeline Editor, Dual Rendering & AntV G6 Graph Suite (FR-016 to FR-021, FR-079, FR-080, FR-084, FR-088, FR-114)

## Specification & Document Bindings
Inspect and strictly follow these authoritative project documents:
- Roadmap: `docs/sprint-roadmap.md` (Sprint 3)
- SRS Requirements: `docs/requirements-document.md` (FR-016 to FR-021, FR-079, FR-080, FR-084, FR-088, FR-114)
- System Architecture: `docs/architecture-document.md` (Section 8, Section 12, Section 13.1, Section 14.1)
- API Reference: `docs/api-document.md` (Section 4, Section 5, Section 6)
- Test Plan: `docs/test-document.md` (TC-RND-001 to TC-RND-003, TC-CMD-001, TC-PAR-001)

## Scope of Work
1. **Timeline Editor UI (`src/pages/workspace/EditPage.vue`):**
   - Multi-track timeline (VIDEO 1, AUDIO 1, SUBS) using `@openvideo/timeline` and `splitpanes` resizable panels.
   - 9:16 vertical preview canvas powered by `@openvideo/engine-pixi` / WebGL.
2. **AntV G6 Multi-Module Graph Suite (`@antv/g6`, FR-114):**
   - Integrate `@antv/g6` graph visualization across 5 workspace modules: Interactive Branching Narrative DAG Trees, Character Relationship & Social Lineage Graphs, Multi-Agent Workflow Execution Monitors, Spatial Audio 3D Soundstage Matrix, and Asset Dependency Lineage Graphs.
3. **OpenVideo Command Engine (`src/stores/timelineStore.ts`):**
   - Implement `core.execute(cmd)` for `clip.add`, `clip.update`, `clip.remove`, `clip.split`. Track inverse patches for 1-click Undo/Redo.
4. **Serialization & Zero-Render Preview:**
   - Implement `studio.exportToJSON()` and `studio.loadFromJSON()`.
5. **Cloud Compositor Worker:**
   - Node.js server worker executing `@openvideo/core` `Compositor.output()` from serialized JSON payloads.
6. **Dual-Rendering Parity Audit Engine (Proposal 6):**
   - Implement SSIM pixel-diff test runner (`POST /export/parity-check`).


## Verification & DoD
1. Verify `pnpm test` passes for `TC-RND-001`, `TC-CMD-001`, and `TC-PAR-001` (SSIM > 0.999).
```

---

## 📌 Sprint 4 Master Execution Prompt: AI Creative Studio (Voice, Captions, Cliffhanger & Dubbing)

```markdown
# SPRINT 4 TASK: AI Creative Studio (FR-022 to FR-025, FR-082, FR-083, FR-097, FR-098)

## Specification & Document Bindings
Inspect and strictly follow these authoritative project documents:
- Roadmap: `docs/sprint-roadmap.md` (Sprint 4)
- SRS Requirements: `docs/requirements-document.md` (FR-022 to FR-025, FR-082, FR-083, FR-097, FR-098)
- System Architecture: `docs/architecture-document.md` (Section 4, Section 5, Section 11, Section 15.1, Section 15.2)
- API Reference: `docs/api-document.md` (Voice, Captions, Spatial Audio, Cliffhanger endpoints)
- Test Plan: `docs/test-document.md` (TC-CLF-001, TC-DUB-001, TC-KAP-001, TC-SPT-001)
- Prompt Engineering Guide: `docs/ai-prompt-guide.md` (Section 10, Section 12)

## Scope of Work
1. **Voice & Dubbing Engine:** Neural TTS (30 voices), emotion tags, intensity control, lip-sync frame alignment.
2. **Multi-Market Dubbing Timeline Re-alignment (Proposal 4):**
   - Endpoint: `POST /voices/dubbing/re-align`. Calculate audio duration delta ($\Delta t_{\mu s}$) and re-align `VIDEO 1` clip bounds and OpenVideo `Caption` timing.
3. **Dynamic Kinetic Subtitle Engine (Proposal 13, FR-097):**
   - Endpoint: `POST /captions/kinetic-style`. Word-level karaoke pop-up text, bass-synced font bounce, and auto-generated sentiment emojis (`🔥`, `😱`, `💔`).
4. **Spatial Audio 3D Soundstage & Voice Coach (Proposal 14, FR-098):**
   - Endpoint: `POST /audio/spatial-mix`. 3D spatial audio panning matched to video camera motion and emotion-tuned TTS reverb.
5. **Dynamic Cliffhanger Hook Engine (Proposal 3):**
   - Endpoint: `POST /ai/cliffhanger/generate`. OpenVideo GLSL shader transitions (`glitch`, `flash`), keyframe zoom (`zoomIn`), 3s audio stinger WAV injection, CTA caption overlay.

## Verification & DoD
1. Run test suite and attach empirical log outputs for `TC-CLF-001`, `TC-DUB-001`, `TC-KAP-001`, and `TC-SPT-001`.
```

---

## 📌 Sprint 5 Master Execution Prompt: WebSocket Collaboration, AI Chatbot & Code Guardrails

```markdown
# SPRINT 5 TASK: Real-time WebSocket Collaboration, AI Chatbot & Guardrails (FR-085, FR-086, FR-087, FR-089, FR-094, FR-095, FR-096, FR-100)

## Specification & Document Bindings
Inspect and strictly follow these authoritative project documents:
- Roadmap: `docs/sprint-roadmap.md` (Sprint 5)
- SRS Requirements: `docs/requirements-document.md` (FR-085, FR-086, FR-087, FR-089, FR-094, FR-095, FR-096, FR-100)
- System Architecture: `docs/architecture-document.md` (Section 8, Section 9.1, Section 10, Section 13.2, Section 15.4)
- API Reference: `docs/api-document.md` (WebSocket events, `POST /ai/assistant/command-edit`, `GET /ai/assistant/memory/search`, `POST /ai/copilot/analyze`)
- Test Plan: `docs/test-document.md` (TC-PAT-001, TC-AIC-001, TC-AIC-002, TC-AIC-004, TC-AIC-005, TC-COP-001, TC-CST-001, TC-GRD-001)
- Chatbot Interaction Architecture: `docs/ai-chatbot-workspace-interaction.md`
- Chatbot Memory Architecture: `docs/ai-chatbot-memory-architecture.md`

## Scope of Work
1. **OpenVideo WebSocket Atomic Patch Sync:**
   - Real-time delta patch broadcasting (`patch:broadcast`, `patch:receive`) over WebSockets.
2. **Real-Time AI Director Assistant Chatbot (FR-086, FR-094, FR-095, FR-096):**
   - Endpoint: `POST /ai/assistant/command-edit`. Translates natural language chat prompts into OpenVideo `Command[]` JSON arrays executed via `core.executeMany()` across all workspace modules (Timeline, Script, Personas, Captions, Transitions, Render, Publish).
   - Implement 4-Tier Memory Engine (Sliding Window Session Memory, Vertex AI Vector Search RAG `text-embedding-004`, Series Knowledge Graph, and Context Token Compressor) via `GET /ai/assistant/memory/search`.
   - Implement Multimodal Inputs (Image drag-and-drop, Video samples, PDF/DOCX manuscripts, Microphone Voice Stream via `connectLive()`) & Context-Aware Dynamic Suggestion Chips.
   - Implement End-to-End Chat-Driven Creative Pipeline & 6 Advanced Intelligence Capabilities.
3. **Live Director Co-Pilot Mode (Proposal 16, FR-100):**
   - Endpoint: `POST /ai/copilot/analyze`. Renders non-blocking floating alert bubbles directly on the preview canvas pointing out live pacing delays, volume spikes, or visual framing issues.
4. **AI Resource & Cost Guardrails (Proposal 7):**
   - Endpoints: `GET/PUT /admin/cost-guardrails`. Enforce max compute budget ceiling ($3.50 cap) & low-res proxy preview mode.
5. **Automated Agent Pre-Commit Guard (Proposal 5):**
   - Setup Husky hooks + `eslint-plugin-agent-guard` blocking unverified stubs (`TODO`, `return null`).

## Verification & DoD
1. Run test suite and attach empirical log proof for `TC-PAT-001`, `TC-AIC-001`, `TC-AIC-002`, `TC-AIC-004`, `TC-AIC-005`, `TC-COP-001`, `TC-CST-001`, `TC-GRD-001`.
```





---

## 📌 Sprint 6 Master Execution Prompt: Growth Innovations, Publishing & Launch

```markdown
# SPRINT 6 TASK: Multi-Platform Publishing, Growth Innovations, Admin Portal & Launch (FR-026 to FR-030, FR-090 to FR-093, FR-099, FR-101 to FR-106)

## Specification & Document Bindings
Inspect and strictly follow these authoritative project documents:
- Roadmap: `docs/sprint-roadmap.md` (Sprint 6)
- SRS Requirements: `docs/requirements-document.md` (FR-026 to FR-030, FR-090 to FR-093, FR-099, FR-101 to FR-106)
- System Architecture: `docs/architecture-document.md` (Section 13.3, Section 13.4, Section 14, Section 15.3, Section 16)
- API Reference: `docs/api-document.md` (`POST /publish/multi-platform`, `GET /billing/subscription`, `POST /admin/impersonate`, `GET /admin/users`, `GET /admin/render-cluster`, `GET /admin/observability`)
- Test Plan: `docs/test-document.md` (TC-BRN-001, TC-PPL-001, TC-OFF-001, TC-ABV-001, TC-CVR-001)
- UI/UX Proposals: `docs/ui-ux-design-proposals.md`
- Commercial Strategy: `docs/product-market-strategy.md`

## Scope of Work
1. **Export & Smart Publishing:** Multi-platform direct API publishing (TikTok, YouTube Shorts, Instagram Reels, Facebook Reels, Douyin via `POST /publish/multi-platform`), AI cover generator, viral hashtags.
2. **Subscription Tiers & Stripe Billing (FR-101, FR-102):** Stripe Checkout Integration, Feature Gating Middleware (`checkTierLimit.ts`), AI credit metering, and Free tier watermark compositing.
3. **Admin & Operations Back-Office Portal (FR-103 to FR-106):** User directory management (`/admin/users`), FinOps Cloud Run render cluster dashboard (`/admin/render-cluster`), Customer Supporter Session Impersonation (`/admin/impersonate`), and OpenTelemetry Grafana Observability (`/admin/observability`).
4. **AI Viral Cover Poster & A/B Hook Generator (Proposal 15, FR-099):** Scans video frames for face aesthetic scores, generates 3 viral cover variants with hook title overlays for social A/B testing.
5. **Viral A/B Hook & Multi-Ending Generator (Proposal 8):**
   - Endpoints: `POST /ai/ab-variants/generate`, `GET /ai/ab-variants/:seriesId/performance`. Generate 3 ending variants, track 24h retention, auto-select winning arc.
6. **AI In-Video Product Placement (Proposal 10):**
   - Endpoint: `POST /environments/product-placement`. Composite 3D sponsored products onto visual layers using OpenVideo Chroma/Layering.
7. **Interactive Branching Drama Engine (Proposal 9):**
   - Endpoint: `POST /series/:id/branches`. Overlay choice buttons & render interactive AntV G6 (`@antv/g6`) story DAG tree graph.
8. **Offline-First Hybrid Sync Engine (Proposal 12):**
   - Endpoint: `POST /collaboration/sync-offline-patches`. IndexedDB patch caching & auto-reconnection bulk sync.


   - Endpoint: `POST /collaboration/sync-offline-patches`. IndexedDB patch caching & auto-reconnection bulk sync.

## Verification & DoD
1. Run complete End-to-End Test Suite and verify 100% PASS.
2. Attach empirical log outputs for `TC-BRN-001`, `TC-PPL-001`, `TC-OFF-001`, and `TC-ABV-001`.
```
