# Sprint 5 Implementation Plan: WebSocket Collaboration, AI Director Chatbot & Code Guardrails

## Background

Sprint 5 covers **FR-085, FR-086, FR-087, FR-089, FR-094, FR-095, FR-096, FR-100**. The goal is to deliver real-time WebSocket atomic patch synchronization, the AI Director Assistant Chatbot with 4-tier memory engine, Live Director Co-Pilot mode (floating canvas alert bubbles), AI resource & cost guardrails, and automated agent pre-commit guard.

**What already exists in the codebase:**
- ✅ Express server with all Sprint 1-4 route modules
- ✅ Vue 3 StudioLayout shell with Timeline NLE, Voice, Captions, and Persona pages
- ✅ GeminiClient.ts with Vertex AI SDK (`@google/genai`) — Gemini 2.5 Flash/Pro ready
- ✅ Pinia stores (auth, series, script, persona, timeline, voice, caption)
- ✅ Centralized Axios client (`src/utils/http.ts`)
- ✅ 6-locale i18n with `$t()` throughout

**What is missing / needs to be built:**
- ❌ No `socket.io` WebSocket server integration in `server/src/index.ts`
- ❌ No `PatchSyncService.ts` — real-time atomic patch broadcaster
- ❌ No `collaborationStore.ts` Pinia store
- ❌ No `useWebSocket.ts` composable
- ❌ No `AiChatPanel.vue` AI Director chatbot UI
- ❌ No `MemoryEngine.ts` — 4-tier memory (session, RAG, knowledge graph, compressor)
- ❌ No `POST /ai/assistant/command-edit`, `GET /ai/assistant/memory/search`
- ❌ No `CopilotAlertBubble.vue` floating Co-Pilot canvas overlay
- ❌ No `POST /ai/copilot/analyze` endpoint
- ❌ No `GET/PUT /admin/cost-guardrails` endpoints
- ❌ No Husky pre-commit `eslint-plugin-agent-guard` setup
- ❌ No `tests/e2e/sprint-5-journey.spec.ts`
- ❌ No `docs/reports/sprint-5-report.md`

---

## Open Questions

> [!IMPORTANT]
> **`socket.io` vs native WebSocket:** Use `socket.io` v4 for the WebSocket layer (handles reconnection, namespacing, and fallback). Install `socket.io` on server and `socket.io-client` on client.
>
> **Vertex AI Vector Search (RAG):** The 4-tier memory RAG tier uses `text-embedding-004` model via `GeminiClient.ts` to embed user messages + series content, and stores vectors in Vertex AI Vector Search index. Ensure GCP project has Vertex AI Vector Search API enabled and an index endpoint created.
>
> **`eslint-plugin-agent-guard`:** This is a custom Husky pre-commit ESLint rule. If no published package is available, implement as a local `.eslintrc` custom rule blocking `TODO`, `FIXME`, `return null` in production code paths.

---

## Proposed Changes

### Component 0: Mandatory Implementation Gates (Enforce Before Writing Any Code)

> [!CAUTION]
> **ALL agents executing this sprint MUST enforce every gate below. Violating any gate is grounds for automatic sprint failure.**

1. **NO-GRADIENT / NO-NEON GATE:** STRICTLY FORBIDDEN — purple `linear-gradient(...)`, `bg-gradient-to-r`, `purple-600`, `violet-500`, neon `box-shadow` glows. UI MUST use clean dark-slate palette: `--background: #121218`, `--card: #1a1b23`, `--border: #2d2e3a`.
2. **BASIC UI COMPONENT MANDATE:** ALL components MUST use only the 44 native components in `@/components/basic/`.  Key components for this sprint: `FaCard` (chat message bubbles), `FaInput` (chat text input), `FaButton` (send/suggest buttons), `FaScrollArea` (chat history scrollable area), `FaAlert` (Co-Pilot warning bubbles), `FaBadge` (cost usage indicator).
3. **UI MOCKUP GROUND TRUTH:** The AI chatbot panel is an overlay within the editor workspace. Consult [`workspace-editor.png`](../docs/stitch_shine_app_design/episode_editor_shadows_in_the_code/screen.png) for the panel positioning context.
4. **PORT LOCK:** Client MUST run on `http://localhost:3000`. Server MUST run on `http://localhost:3001`. WebSocket connects to `ws://localhost:3001`. NEVER test on port `5173`.
5. **STORE-DRIVEN AXIOS/SOCKET:** All REST calls MUST go through Pinia stores + `src/utils/http.ts`. WebSocket events MUST be managed through `collaborationStore.ts` and `useWebSocket.ts` composable.
6. **STANDARDIZED API RESPONSE:** Express server MUST return `{ code: 200, data: {...}, message: "...", error: null }` for ALL REST endpoints.
7. **FULL i18n:** ALL user-facing strings (chat placeholders, suggestions, Co-Pilot alerts, cost warnings) MUST use `$t('...')` / `i18n.global.t('...')` across 6 locales. Add `chat.*`, `copilot.*`, `guardrails.*` keys to all locale files.

---

### Component 1: Package Installation

#### [MODIFY] `server/package.json` — Install WebSocket & guardrail packages
```bash
cd apps/shine/server
pnpm add socket.io
```

#### [MODIFY] `client/package.json` — Install WebSocket client
```bash
cd apps/shine/client
pnpm add socket.io-client
```

---

### Component 2: TypeScript Contracts

#### [MODIFY] `client/src/types/api.ts`
Add TypeScript interfaces:
```typescript
interface ChatMessage { id: string; role: 'user'|'assistant'; content: string; timestamp: number; commands?: Command[] }
interface Command { type: string; targetModule: string; payload: any }
interface CopilotAlert { id: string; severity: 'info'|'warning'|'error'; message: string; canvasPosition: { x: number; y: number } }
interface CostGuardrails { maxBudgetUsd: number; currentSpendUsd: number; lowResProxyMode: boolean }
interface PatchEvent { userId: string; sessionId: string; commands: Command[] }
```

---

### Component 3: WebSocket Infrastructure

#### [NEW] `server/src/lib/websocket/PatchSyncService.ts`
Socket.io server-side atomic patch broadcaster:
- On `connection`: register client to series-specific room (`series:{seriesId}`)
- On `patch:broadcast` event: validate `PatchEvent`, persist to DB, broadcast `patch:receive` to all room members except sender
- On `render:progress` events from `CompositorWorker`: broadcast to series room

#### [MODIFY] `server/src/index.ts`
Mount `socket.io` on the HTTP server. Register `PatchSyncService` and connect to `io`.

#### [NEW] `client/src/composables/useWebSocket.ts`
Vue 3 composable wrapping `socket.io-client`:
- `connect(seriesId)`: establishes `ws://localhost:3001` connection, joins series room
- `onPatchReceive(handler)`: registers `patch:receive` event listener
- `broadcastPatch(commands)`: emits `patch:broadcast` with current user session
- `disconnect()`: cleans up on component unmount via `onUnmounted`

#### [NEW] `client/src/stores/collaborationStore.ts`
Pinia store for real-time collaboration:
- `activeUsers: CollaboratorSession[]` — list of currently connected editors
- `applyRemotePatch(event: PatchEvent)`: applies incoming patch commands via `timelineStore.executeMany()`
- `broadcastLocalPatch(commands)`: calls `useWebSocket().broadcastPatch()`

---

### Component 4: AI Director Assistant Chatbot

#### [NEW] `server/src/routes/ai-assistant.ts`
- `POST /v1/ai/assistant/command-edit` — Accept natural language prompt + current `TimelineState` context → return `Command[]` JSON array
- `GET /v1/ai/assistant/memory/search?query=...` — Vector RAG search across series knowledge base

#### [NEW] `server/src/lib/ai/MemoryEngine.ts`
4-tier memory engine:
1. **Sliding Window Session Memory:** Last 20 messages kept in-memory per session
2. **Vertex AI Vector Search RAG:** Embed query using `text-embedding-004`, retrieve top-5 relevant series knowledge chunks
3. **Series Knowledge Graph:** Structured JSON of series metadata (characters, plot points, episode summaries)
4. **Context Token Compressor:** Summarize older context using `gemini-2.5-flash` to keep total tokens < 8k

#### [NEW] `client/src/components/chat/AiChatPanel.vue`
AI Director chatbot panel (right-side drawer in workspace):
- `FaScrollArea` for scrollable message history with `FaCard` message bubbles
- `FaInput` text input + `FaButton` send button
- `SuggestionChips.vue` row above input
- `MultimodalInput.vue` drag-drop zone for image/PDF/voice
- All text via `$t('chat.*')` keys

#### [NEW] `client/src/components/chat/SuggestionChips.vue`
Context-aware dynamic suggestion chips using `FaButton` with `variant="outline"` and `size="sm"`:
- Chips populated from `GET /v1/ai/assistant/suggestions?context=...`
- Clicking chip auto-fills the chat input and submits

#### [NEW] `client/src/components/chat/MultimodalInput.vue`
Drag-and-drop multimodal input zone:
- Drop zone for image files, PDF/DOCX manuscripts → uploaded to S3, URL passed to assistant API
- Microphone button for voice input (Web Speech API `connectLive()` stream)

#### [NEW] `client/src/stores/chatStore.ts`
Pinia store for chatbot state:
- `messages: ChatMessage[]` — full message thread
- `sendMessage(content, attachments?)` — calls `POST /v1/ai/assistant/command-edit`, handles `Command[]` response by dispatching to relevant Pinia stores (`timelineStore`, `scriptStore`, etc.)
- `searchMemory(query)` — calls `GET /v1/ai/assistant/memory/search`
- All toasts: `i18n.global.t('toast.commandExecuted')`, `i18n.global.t('toast.memorySearched')`

#### [MODIFY] `client/src/views/workspace/EditPage.vue`
- Mount `<AiChatPanel />` as a collapsible right-panel drawer
- Mount `<CopilotAlertBubble />` as absolute-positioned overlay on `PreviewCanvas`

---

### Component 5: Live Director Co-Pilot Mode

#### [NEW] `server/src/routes/copilot.ts`
- `POST /v1/ai/copilot/analyze` — Analyze current `TimelineState` for issues (pacing delays, volume spikes, framing problems). Return `CopilotAlert[]` with canvas x/y positions.

#### [NEW] `client/src/components/copilot/CopilotAlertBubble.vue`
Floating Co-Pilot alert bubbles positioned absolutely over `PreviewCanvas.vue`:
- Renders `FaAlert` variant bubbles (`info`/`warning`/`error`) at canvas coordinates from `CopilotAlert.canvasPosition`
- Pulsing animation to draw attention (CSS keyframe `@keyframes copilot-pulse`, NO neon glow)
- Click to dismiss or open suggested fix in `AiChatPanel`

---

### Component 6: AI Cost Guardrails

#### [NEW] `server/src/routes/cost-guardrails.ts`
- `GET /v1/admin/cost-guardrails` — Return current cost config and spend
- `PUT /v1/admin/cost-guardrails` — Update max budget and low-res proxy mode flag

Display `FaBadge` in admin header showing `$currentSpend / $maxBudget`. When budget > 80%, show `FaAlert` warning.

---

### Component 7: Pre-Commit Agent Guard

#### [NEW] `.husky/pre-commit`
Husky pre-commit hook running `eslint` with agent-guard rules:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx eslint --rule 'no-console: warn' --rule 'no-debugger: error' src/ && \
grep -rn 'TODO\|FIXME\|return null;\|throw new Error.*not implemented' src/ && echo "BLOCKED: Unresolved stubs found!" && exit 1 || exit 0
```

---

### Component 8: Locale Dictionaries

#### [MODIFY] `client/src/locales/{en,vi,zh,jp,es,fr}.json`
Add key blocks: `chat.*`, `copilot.*`, `guardrails.*`, `toast.commandExecuted`, `toast.memorySearched`, `toast.collaboratorJoined`, `toast.collaboratorLeft`

---

### Component 9: E2E Tests

#### [NEW] `tests/e2e/sprint-5-journey.spec.ts`
Interactive Playwright E2E test covering:
1. Open editor in Browser Tab 1 and Tab 2 simultaneously → assert both connected (collaboration)
2. In Tab 1: Drag clip to new position → assert `patch:broadcast` sent, Tab 2 DOM updates to reflect new clip position
3. In Tab 1: Open AI Chat Panel → type "Move clip 1 to 00:05" → assert `Command[]` returned, clip moves in timeline
4. Click suggestion chip "Add cliffhanger at end" → assert chatbot executes cliffhanger command
5. Drag an image into multimodal input → assert image thumbnail preview appears
6. Assert Co-Pilot alert bubble appears when a clip has duration < 3s
7. Navigate to `/admin/cost-guardrails` → assert budget display shows current spend
8. Screenshots: `01_collaboration_sync.png` → `02_chat_command_executed.png` → `03_suggestion_chip.png` → `04_copilot_alert.png` → `05_cost_guardrails.png`

---

## Verification Plan

### Automated Tests
- `cd apps/shine/client && npx tsc --noEmit` — zero TypeScript errors
- `cd apps/shine/server && npx tsc --noEmit` — zero TypeScript errors
- `pnpm exec playwright test tests/e2e/sprint-5-journey.spec.ts`
- Unit tests: `TC-PAT-001`, `TC-AIC-001`, `TC-AIC-002`, `TC-AIC-004`, `TC-AIC-005`, `TC-COP-001`, `TC-CST-001`, `TC-GRD-001`

### Manual Verification
- Dev server: `npm run dev` (client port 3000, server port 3001)
- Open two browser tabs at `/editor/series-001/episode-001` and verify clip move syncs in real-time
- Type a natural language command in AI chat and verify timeline updates accordingly
- Verify Co-Pilot alert bubbles appear and can be dismissed
- Verify cost guardrails badge in header shows correct spend

### Report
- Create `docs/reports/sprint-5-report.md` with all 5 required sections + embedded screenshots
