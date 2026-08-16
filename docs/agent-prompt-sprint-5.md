# TASK: IMPLEMENT SPRINT 5 — WebSocket Collaboration, AI Director Chatbot & Code Guardrails
# Strictly follow the Implementation Plan at `docs/implementation-plan-sprint-5.md`

## ⚠️ MANDATORY DIRECTIVE — READ THIS BEFORE DOING ANYTHING

You are NOT allowed to design freely, choose your own styles, or make any decisions outside what is specified in the project documents. All design decisions have already been made. Your only job is to **EXECUTE PRECISELY** according to the existing documentation.

**Sprint 5 builds on Sprints 1–4. Confirm prerequisites are met before starting:**
- Client runs on `http://localhost:3000`, server on `http://localhost:3001` ✅
- `timelineStore.ts` with `execute()`, `executeMany()`, `exportToJSON()` exists ✅
- `EditPage.vue` (Timeline NLE) with `PreviewCanvas.vue` exists ✅
- `GeminiClient.ts` with `@google/genai` Vertex AI SDK exists ✅
- All Sprint 1–4 routes registered on server, all Pinia stores in place ✅

---

## STEP 0: READ ALL DOCUMENTS BEFORE WRITING ANY CODE (MANDATORY)

Read the following documents using `view_file` BEFORE writing any code:

1. **Implementation Plan (STRICT COMPLIANCE REQUIRED):**
   Read the entire file `docs/implementation-plan-sprint-5.md`.

2. **AI Chatbot Memory Architecture:**
   Read `docs/ai-chatbot-memory-architecture.md` — full 4-tier memory engine spec (session, RAG, knowledge graph, compressor).

3. **AI Chatbot Workspace Interaction:**
   Read `docs/ai-chatbot-workspace-interaction.md` — how the chatbot translates natural language to `Command[]` JSON and dispatches to workspace modules.

4. **UI Component Catalog:**
    Key components: `FaCard` (chat bubbles), `FaInput` (chat text input), `FaButton` (send/suggest), `FaScrollArea` (message history), `FaAlert` (Co-Pilot warnings), `FaBadge` (cost usage).

5. **Architecture Document:**
   Read `docs/architecture-document.md` Sections 8, 9.1, 10, 13.2, 15.4 — WebSocket patch sync, AI chatbot, Co-Pilot, cost guardrails.

6. **API Reference:**
   Read `docs/api-document.md` — WebSocket events, `/ai/assistant/*`, `/ai/copilot/*`, `/admin/cost-guardrails` sections.

7. **View the reference mockup:**
   The AI chatbot panel is positioned within the editor workspace. `view_file` `docs/stitch_shine_app_design/episode_editor_shadows_in_the_code/screen.png` to understand the layout context.

---

## STEP 1: AUDIT THE CURRENT CODEBASE (MANDATORY BEFORE ANY CHANGES)

```bash
# Check what collaboration/chat files already exist
find apps/shine/client/src -name "*chat*" -o -name "*Chat*" -o -name "*copilot*" 2>/dev/null
find apps/shine/client/src -name "*websocket*" -o -name "*WebSocket*" -o -name "*socket*" 2>/dev/null
find apps/shine/server/src -name "*socket*" -o -name "*patch*" -o -name "*assistant*" 2>/dev/null

# Check if socket.io is installed
cat apps/shine/server/package.json | grep "socket.io"
cat apps/shine/client/package.json | grep "socket.io-client"

# Check if husky is configured
ls .husky/ 2>/dev/null || echo "Husky not configured"
```

---

## STEP 2: MANDATORY ENFORCEMENT GATES — VIOLATING ANY GATE = AUTOMATIC FAILURE

### 🚫 GATE 0: MANDATORY GOOGLE STITCH MCP HTML CODE FETCH & ALIGNMENT
- **DO NOT GUESS OR INVENT LAYOUTS/TEXT:** Agent MUST NOT write generic dark templates or invent custom text.
- **MANDATORY FETCH WORKFLOW FOR EVERY PAGE:**
  1. Find the screen folder in `docs/stitch_shine_app_design/<screen_folder_name>`.
  2. Open and read the `code.html` template or `screen.png` image directly from that folder.
  3. Translate the local Stitch HTML layout, sections, headings, cards, text content, and color palette (`#006c45`, `#3ecf8e`, light/dark themes) 100% into the Vue `.vue` page using Element Plus (`element-plus`) components.


### 🚫 GATE 1: STRICT PROHIBITION OF GRADIENTS & NEON GLOWS
- NO colored gradients on any message bubble

Co-Pilot alert bubbles: `FaAlert` with `variant="warning"` or `variant="destructive"` — standard component, NO custom glow.

**Self-check:**
```bash
grep -rn "linear-gradient\|purple-[0-9]\|violet-[0-9]\|neon\|glow\|box-shadow.*purple" \
  apps/shine/client/src/components/chat/ \
  apps/shine/client/src/components/copilot/
# EXPECTED: 0 matches
```

### 🚫 GATE 2: MANDATORY BASIC UI COMPONENTS (`@/components/basic/`)
Read README before using each component. Required bindings:
- Chat message list container → `FaScrollArea` (auto-scroll to bottom)
- Each chat message → `FaCard` with `size="sm"` padding
- Chat text input → `FaInput` with Enter key submit
- Send button → `FaButton` with send icon
- Suggestion chips → `FaButton` `variant="outline"` `size="sm"` (horizontal row)
- Cost indicator → `FaBadge` in header toolbar
- Budget warning → `FaAlert` `variant="warning"`
- Co-Pilot floating alerts → `FaAlert` absolutely positioned over canvas

### 🚫 GATE 3: PORT LOCK (CLIENT: 3000 | SERVER: 3001)
WebSocket MUST connect to `ws://localhost:3001`. Client NEVER on `5173`.

### 🚫 GATE 4: STRICT PROHIBITION OF RAW FETCH()
All API calls MUST go through Pinia stores:
- `chatStore.sendMessage(content)` → `POST /v1/ai/assistant/command-edit`
- `chatStore.searchMemory(query)` → `GET /v1/ai/assistant/memory/search`
- `collaborationStore.broadcastLocalPatch(commands)` → WebSocket `patch:broadcast` event (via `useWebSocket` composable)

WebSocket events MUST be managed through `collaborationStore.ts` and `useWebSocket.ts` composable, NOT directly in components.

### 🚫 GATE 5: MANDATORY i18n FOR ALL TEXT STRINGS
Add key blocks to ALL 6 locale files: `chat.*`, `copilot.*`, `guardrails.*`, `toast.*`

Example:
```json
{
  "chat": {
    "title": "AI Director",
    "inputPlaceholder": "Ask AI Director to edit your timeline...",
    "sendBtn": "Send",
    "thinkingState": "AI is thinking...",
    "suggestionsTitle": "Suggested actions"
  },
  "copilot": {
    "alertTitle": "Co-Pilot Notice",
    "clipTooShort": "Clip is too short for a scene (< 3s)",
    "volumeSpike": "Volume spike detected at {time}"
  },
  "guardrails": {
    "budgetWarning": "AI budget at {percent}% — consider enabling proxy mode",
    "proxyModeEnabled": "Low-resolution proxy mode enabled"
  },
  "toast": {
    "commandExecuted": "AI command executed successfully!",
    "collaboratorJoined": "{name} joined the session",
    "collaboratorLeft": "{name} left the session"
  }
}
```

---

## STEP 3: FILES TO CREATE/MODIFY (STRICTLY FOLLOW `implementation-plan-sprint-5.md`)

### 3.1 Package Installation
```bash
cd apps/shine/server && pnpm add socket.io
cd apps/shine/client && pnpm add socket.io-client
```

### 3.2 TypeScript Contracts

**MODIFY:**
1. `client/src/types/api.ts` — Add: `ChatMessage`, `Command`, `CopilotAlert`, `CostGuardrails`, `PatchEvent`, `CollaboratorSession`

### 3.3 WebSocket Infrastructure

**CREATE:**
2. `server/src/lib/websocket/PatchSyncService.ts` — Socket.io server with room management and patch broadcasting
3. `client/src/composables/useWebSocket.ts` — Vue composable wrapping socket.io-client
4. `client/src/stores/collaborationStore.ts` — Real-time collaboration Pinia store

**MODIFY:**
5. `server/src/index.ts` — Mount socket.io on HTTP server, register PatchSyncService

### 3.4 AI Director Chatbot

**CREATE:**
6. `server/src/routes/ai-assistant.ts` — `POST /v1/ai/assistant/command-edit`, `GET /v1/ai/assistant/memory/search`
7. `server/src/lib/ai/MemoryEngine.ts` — 4-tier memory (session window, Vertex AI RAG, knowledge graph, token compressor)
8. `client/src/components/chat/AiChatPanel.vue` — Full chatbot panel UI
9. `client/src/components/chat/SuggestionChips.vue` — Context-aware suggestion chip row
10. `client/src/components/chat/MultimodalInput.vue` — Drag-and-drop image/PDF/voice input
11. `client/src/stores/chatStore.ts` — Chatbot state, message thread, command dispatch

### 3.5 Co-Pilot Mode

**CREATE:**
12. `server/src/routes/copilot.ts` — `POST /v1/ai/copilot/analyze`
13. `client/src/components/copilot/CopilotAlertBubble.vue` — Absolutely-positioned FaAlert overlay on canvas

### 3.6 Cost Guardrails

**CREATE:**
14. `server/src/routes/cost-guardrails.ts` — `GET /v1/admin/cost-guardrails`, `PUT /v1/admin/cost-guardrails`

### 3.7 Pre-commit Guard

**CREATE:**
15. `.husky/pre-commit` — ESLint + stub detection hook

### 3.8 Locale Dictionaries

**MODIFY:**
16. `client/src/locales/{en,vi,zh,jp,es,fr}.json` — Add `chat.*`, `copilot.*`, `guardrails.*` keys

### 3.9 Workspace Integration

**MODIFY:**
17. `client/src/views/workspace/EditPage.vue` — Mount `<AiChatPanel>` as collapsible right drawer + `<CopilotAlertBubble>` as absolute overlay on PreviewCanvas

**MODIFY:**
18. `server/src/index.ts` — Register `aiAssistantRouter`, `copilotRouter`, `costGuardrailsRouter`

### 3.10 Testing

**CREATE:**
19. `tests/e2e/sprint-5-journey.spec.ts` — Playwright E2E test (includes 2-tab collaboration test)

---

## STEP 4: COMPONENT DESIGN RULES

### AiChatPanel.vue — LAYOUT
```
Right-side collapsible drawer panel inside EditPage.vue:
  HEADER:
    - Title: "AI Director" (FaIcon + text)
    - Close button: FaButton variant="ghost" size="icon"
    - Cost badge: FaBadge showing "$X.XX / $3.50"

  MESSAGE HISTORY:
    - FaScrollArea (fills available height, auto-scrolls to bottom)
    - User messages: FaCard (right-aligned, background: var(--primary), text-black)
    - Assistant messages: FaCard (left-aligned, background: var(--card))
    - "AI is thinking..." state: FaCard with animated dots (CSS keyframes, NO neon)
    - Multimodal attachments: thumbnail preview inside message bubble

  SUGGESTION CHIPS:
    - SuggestionChips.vue row (horizontal scroll)
    - FaButton variant="outline" size="sm" for each chip
    - Click auto-fills input and submits

  INPUT AREA:
    - MultimodalInput.vue drag-drop zone (subtle dashed border using var(--border))
    - FaInput for text + FaButton "Send" (icon only)
```

### CopilotAlertBubble.vue — POSITIONING
```
- Position: absolute, overlaid on top of PreviewCanvas.vue
- Each alert: FaAlert component (variant="warning" or "destructive")
- Location: derived from CopilotAlert.canvasPosition (x, y coordinates)
- Animation: CSS @keyframes fade-in pulse (NO purple neon glow)
- Click to dismiss or click "Fix" to open chat with pre-filled fix prompt
```

### chatStore.ts — Command Dispatch Pattern
```typescript
async sendMessage(content: string, attachments?: string[]) {
  // 1. Add user message to messages[]
  // 2. POST to /v1/ai/assistant/command-edit
  // 3. Receive Command[] from response
  // 4. Dispatch each command to the appropriate store:
  //    - Command targeting 'timeline' → timelineStore.executeMany(commands)
  //    - Command targeting 'script' → scriptStore.applyCommands(commands)
  //    - Command targeting 'persona' → personaStore.applyCommands(commands)
  // 5. Add assistant message to messages[] with executed commands summary
  // 6. toast.success(i18n.global.t('toast.commandExecuted'))
}
```

---

## STEP 5: BACKEND IMPLEMENTATION RULES

### PatchSyncService.ts — Socket.io pattern
```typescript
export class PatchSyncService {
  constructor(io: Server) {
    io.on('connection', (socket) => {
      socket.on('join:series', (seriesId: string) => {
        socket.join(`series:${seriesId}`);
      });
      socket.on('patch:broadcast', async (event: PatchEvent) => {
        // Validate, persist patch to DB
        socket.to(`series:${event.seriesId}`).emit('patch:receive', event);
      });
    });
  }
}
```

### ai-assistant.ts — Command translation pattern
```typescript
// POST /v1/ai/assistant/command-edit
// Input: { prompt: string, context: TimelineState, sessionId: string }
// Process: MemoryEngine.retrieve() → GeminiClient.generateContent() → parse Command[]
// Output: { code: 200, data: { commands: Command[], memory: MemorySummary }, message: '...', error: null }
```

---

## STEP 6: MANDATORY VERIFICATION BEFORE DECLARING COMPLETION

```bash
# 1. TypeScript check
cd apps/shine/client && npx tsc --noEmit
cd apps/shine/server && npx tsc --noEmit

# 2. Run Playwright E2E test (includes 2-tab WebSocket collaboration)
pnpm exec playwright test tests/e2e/sprint-5-journey.spec.ts --reporter=list

# 3. Verify no gradients or neon glows
grep -rn "linear-gradient\|purple-[0-9]\|violet-[0-9]\|neon\|glow\|box-shadow.*purple" \
  apps/shine/client/src/components/chat/ \
  apps/shine/client/src/components/copilot/
# EXPECTED: 0 matches

# 4. Verify no raw fetch()
grep -rn "fetch(" apps/shine/client/src/components/ apps/shine/client/src/stores/
# EXPECTED: 0 matches

# 5. Verify socket.io is connected (check server startup log)
grep -rn "socket.io\|PatchSyncService" apps/shine/server/src/index.ts

# 6. Run automated i18n linter (MUST PASS WITH 0 ERRORS)
cd apps/shine/client && pnpm run check-i18n
# EXPECTED RESULT: 🎉 i18n AUDIT PASSED!

```

---

## STEP 7: MANDATORY COMPLETION REPORT

Save the report to `docs/reports/sprint-5-report.md` with all 5 required sections:

1. **Summary of Created/Modified Files** (grouped by: WebSocket Infrastructure / AI Chatbot / Co-Pilot / Cost Guardrails / Pre-commit Guard)
2. **Build & TypeCheck Results** (paste actual `npx tsc --noEmit` output)
3. **Playwright E2E Test Results** (paste actual test output with PASS/FAIL per step, including 2-tab collaboration sync test)
4. **Real Browser Screenshots** from `http://localhost:3000` — showing: AI chat panel open, command executed in timeline, Co-Pilot alert bubble, 2-tab collaboration sync. DO NOT use `generate_image`.
5. **FR Compliance Matrix** — Pass/Fail for: FR-085, FR-086, FR-087, FR-089, FR-094, FR-095, FR-096, FR-100. Include unit test results: `TC-PAT-001`, `TC-AIC-001`, `TC-AIC-002`, `TC-AIC-004`, `TC-AIC-005`, `TC-COP-001`, `TC-CST-001`, `TC-GRD-001`.
