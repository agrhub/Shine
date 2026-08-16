# Master Agent Implementation Prompt Framework & Execution Guide

This guide provides standard prompt templates and frameworks for Project Managers and Tech Leads to delegate implementation tasks to AI Coding Agents, ensuring strict compliance with system documentation, zero code regressions, and empirical verification.

---

## 📋 The 5-Part Agent Execution Prompt Structure

Every task prompt assigned to an AI Developer Agent MUST contain these 5 structural components:

1. **Task Scope & Document Binding:** Specify exact feature IDs from `requirements-document.md` and relevant sections of `architecture-document.md` and `api-document.md`.
2. **File Paths & Code Context:** Explicitly list target file paths to inspect and modify.
3. **Safety Protocol Enforcement:** Instruct the agent to follow `safe-code-editing-guidelines.md` (Read-Before-Edit, Minimal Target Scoping).
4. **Empirical Verification Requirements (DoD):** Require running build (`pnpm build` / `tsc`) or test commands before declaring completion.
5. **Structured Status Reporting:** Require outputting a 3-tier status matrix (🟢 Production Ready, 🟡 Partial/Stub, 🔴 Blocked).

---

## 🎯 Master Prompt Template (Copy-Pasteable for Managers)

```markdown
# TASK: Implement [Feature Name / Sprint Module]

## Context & Specification Binding
You are tasked with implementing [Feature Name] for Shine.
Before writing code, inspect and strictly adhere to the following specification documents:
- Requirements: `docs/requirements-document.md` (Section: [FR-XXX to FR-YYY])
- Architecture: `docs/architecture-document.md` (Section: [Section Name])
- API Reference: `docs/api-document.md` (Section: [Endpoint Name])
- Design & Stitch MCP: `docs/design.md` & Google Stitch MCP local design assets in `docs/stitch_shine_app_design/`
- Mandatory Stitch Screen Registry: `docs/stitch-screen-registry.md` (Call `get_screen` + `read_url_content` for target screen HTML before coding!)
- Element Plus: Use `element-plus` components (`<el-button>`, `<el-card>`, `<el-table>`, `<el-tabs>`, etc.) and `@element-plus/icons-vue`.
- Test Cases: `docs/test-document.md` (Section: [TC-XXX to TC-YYY])
- Safety Protocols: `docs/safe-code-editing-guidelines.md`



## Target Files to Inspect & Modify
- Frontend: `src/[path/to/component.vue]`
- Backend: `server/[path/to/route.ts]`
- Types/State: `src/types/[type.ts]` / `src/stores/[store.ts]`

## Implementation Requirements
1. Implement full production logic for [Feature Name] matching the API request/response schemas.
2. DO NOT write dummy placeholders (`return null`, empty `TODO` functions, unhandled UI buttons) without flagging them.
3. Preserve all existing comments, docstrings, imports, and unrelated logic.

## Safety & Editing Protocol (Mandatory)
- **Protocol 1 (Read-Before-Edit):** Use `view_file` to inspect exact line numbers and surrounding context BEFORE editing.
- **Protocol 2 (Minimal Target Scoping):** Scope `replace_file_content` targets to exact 3–8 changing lines.
- **Protocol 3 (Multi-Chunk):** Use `multi_replace_file_content` for non-adjacent edits.

## Definition of Done (DoD) & Verification
You CANNOT declare this task "100% Complete" based solely on code edits or UI mockups.
You MUST execute the following verification steps and include empirical output in your response:
1. Run `pnpm build` or `npx tsc --noEmit` to verify zero TypeScript errors.
2. Run `pnpm run check-i18n` in `apps/shine/client` to verify ZERO hardcoded toast strings and 100% key parity across all 6 locales (`en`, `vi`, `zh`, `jp`, `es`, `fr`).
3. Run relevant unit/API tests (`pnpm test`) to verify passing status.


## Required Final Response Format
Provide a clean summary containing:
- Summary of changes made (grouped by file).
- Verification test/build command outputs.
- Implementation Status Matrix:
  - 🟢 **Production Ready (Verified)**: [List completed features with test proof]
  - 🟡 **Partial / Stub**: [List features needing API keys or pending backend]
  - 🔴 **Blocked**: [List blocked items]
```

---

## 💡 Concrete Manager Prompt Examples by Sprint

### Example 1: Manager Prompt for Sprint 1 (Vertex AI Client Integration)

```markdown
# TASK: Implement Vertex AI GeminiClient Integration (FR-004, FR-005)

## Context & Specification Binding
Implement `server/lib/ai/GeminiClient.ts` wrapping `@google/genai` (v2.16.0) using Google Vertex AI with Service Account JSON or ADC authentication.
- Reference SRS: `docs/requirements-document.md` (FR-004, FR-005)
- Reference Arch: `docs/architecture-document.md` (Section 3 & Section 12)
- Reference Safety: `docs/safe-code-editing-guidelines.md`

## Requirements
1. Support text generation (`gemini-2.5-flash`), image generation (`gemini-3.0-flash-preview-image-generation`), and video generation (`veo-3.1-generate-preview`).
2. Route `gemini-2.5-*` models to `us-central1` and `veo-*` models to `global` location.
3. Strictly format all AI prompt outputs as valid JSON (no XML tags).
4. Do NOT use API Key Pool or Antigravity accounts.

## Verification & DoD
- Run `tsx server/lib/ai/test-ai.ts` and attach empirical execution output demonstrating successful response.
```

### Example 2: Manager Prompt for Sprint 3 (OpenVideo WebGL & Command API)

```markdown
# TASK: Implement OpenVideo Command API & Zero-Render Preview (FR-079, FR-084)

## Context & Specification Binding
Implement the OpenVideo Command Execution Engine in `src/stores/timelineStore.ts` using `@openvideo/core` (v1.3.1) and `@openvideo/timeline`.
- Reference SRS: `docs/requirements-document.md` (FR-079, FR-084)
- Reference Arch: `docs/architecture-document.md` (Section 8)
- Reference API: `docs/api-document.md` (Section 5)

## Requirements
1. Implement `executeCommand(cmd)` handling `clip.add`, `clip.update`, `clip.remove`, and `clip.split`.
2. Implement `studio.exportToJSON()` and `studio.loadFromJSON()` for zero-render instant version previews.
3. Track inverse patches for deterministic 1-click Undo/Redo.

## Verification & DoD
- Execute `pnpm test` and verify test cases `TC-RND-001` and `TC-CMD-001` PASS.
```

### Example 3: Manager Prompt for Sprint 5 (AI Director Chatbot, ADK & 4-Tier Memory)

```markdown
# TASK: Implement Google Agent ADK AI Director Chatbot & 4-Tier Vector Memory (FR-086, FR-094, FR-095, FR-096)

## Context & Specification Binding
Implement `server/lib/ai/DirectorAgent.ts` using Google Agent ADK & Google GenAI SDK (`@google/genai`), binding natural language chat to registered ADK Tools (`timelineCommandTool`, `scriptGenTool`, `facialAnchorTool`, `virtualSetTool`, `veoVideoGenTool`, `voiceDubbingTool`, `visualAudioQATool`).
- Reference SRS: `docs/requirements-document.md` (FR-086, FR-094, FR-095, FR-096)
- Reference Arch: `docs/architecture-document.md` (Section 6, Section 8, Section 9.1, Section 10)
- Reference Memory: `docs/ai-chatbot-memory-architecture.md`
- Reference Interaction: `docs/ai-chatbot-workspace-interaction.md`

## Requirements
1. **Google Agent ADK Tool Calling:** Bind `DirectorAgent` to 7 registered ADK tools to execute OpenVideo `Command[]` arrays across all workspace modules.
2. **4-Tier Memory & RAG:** Implement Vertex AI Vector Search (`text-embedding-004`) for <50ms similarity retrieval (`GET /ai/assistant/memory/search`) across 50-episode scripts, character bibles, comments, and retention curves.
3. **Decoupled Audio/Video Architecture:** Generate silent visual MP4 scene clips on `VIDEO 1` via Veo 3.1 or Gemini Omni Flash, and separate Neural TTS dialogue audio on `AUDIO 1` for multi-market dubbing and auto-timeline realignment.
4. **Multimodal Drag-and-Drop & Microphone UI:** Support image, video, PDF/DOCX document uploads, and real-time voice streaming (`connectLive()`) with surface-aware dynamic prompt chips.

## Verification & DoD
- Execute `pnpm test` and attach empirical log proof for test cases `TC-PAT-001`, `TC-AIC-001`, `TC-AIC-002`, `TC-AIC-004`, and `TC-AIC-005`.
```

