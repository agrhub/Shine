# Safe Code Editing & Agent Pair-Programming Protocols

This document defines the mandatory guidelines and protocols for developers and AI Agents when modifying, editing, or refactoring codebase files in **Shine (DramaFlowAI)**.

## Purpose

To eliminate code regression, accidental deletion of existing logic, missing import statements, and swallowed functions during automated file replacements (`replace_file_content` / `multi_replace_file_content`).

---

## 5 Core Protocols

### Protocol 1: Read-Before-Edit (`view_file` Mandatory Inspection)
- Always inspect exact target lines, surrounding indentation, and method bounds using `view_file` before attempting any modification.
- Never rely on memory or unverified line estimates.

### Protocol 2: Minimal Target Scoping & Context Anchoring
- Keep `TargetContent` strictly scoped to the exact 3–8 lines changing.
- Include unique context anchors (function signatures, unique variable names, adjacent docstrings) before and after the target chunk to prevent multi-match collisions.

### Protocol 3: Non-Contiguous Multi-Chunk Editing (`multi_replace_file_content`)
- When modifying multiple non-adjacent methods or import blocks within a single file, NEVER wrap large intervening code blocks into a single replacement chunk.
- Use `multi_replace_file_content` with separate, targeted `ReplacementChunk` objects for each edit point.

### Protocol 4: Mandatory Post-Edit Verification & Audit
- Immediately inspect modified files or run project verification commands (`pnpm lint`, `tsc`, `npm test`) after applying changes.
- Never declare a task complete without empirical verification that the code compiles cleanly and existing behavior is preserved.

### Protocol 5: Strict Contract & Comment Preservation
- Retain all unrelated comments, docstrings, exported types, interfaces, and error handling branches unless explicitly instructed to refactor them.

---

## 6. Definition of Done (DoD) & Anti-Hallucination Protocols

To eliminate premature completion claims, dummy mockups reported as finished logic, and defensive reassurance loops:

### Rule 1: Empirical Verification Mandatory for "100% Complete"
- An AI Agent or developer MUST NOT claim a task is "100% complete" based solely on writing code or UI mockups.
- "100% Complete" requires attached empirical proof:
  - Clean build output (`pnpm build`, `tsc`).
  - Passing test runner logs (`vitest` / `pnpm test`).
  - Real runtime API response payload or UI screenshot.

### Rule 2: Explicit Status Tier Matrix
Every feature status update MUST categorize components clearly:
- 🟢 **Production-Ready (Verified)**: Full business logic written + passing test evidence attached.
- 🟡 **Partial / Stub / Skeleton**: Interface / UI mockup created; backend logic or database binding pending.
- 🔴 **Blocked / Not Started**: Feature planned but not implemented.

### Rule 3: Re-Verification Trigger Rule
When a user asks *"Did you check?"* or *"Are you sure?"*:
- DO NOT answer with a verbal affirmation (*"Yes, I checked"*).
- IMMEDIATELY execute an automated codebase audit (`grep_search` for `TODO`, `FIXME`, `return null`, empty stubs) and re-run build/test commands before outputting any status response.

### Rule 4: Anti-Symptom Patching Rule
- NEVER fix broken tests or errors by commenting out assertions, swallowing exceptions in try/catch, returning dummy arrays, or writing empty stub implementations.

