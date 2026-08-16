# Research Notes — Sprint 7 Architectural Patterns & Extraction

## 1. Toonflow AI Multi-Agent Script Architecture
- **3-Layer Agent Pipeline**: `Decision → Supervision → Execution`
  - `Decision AI` (`script_agent_decision.md`): Evaluates project metadata, viral tropes, target audience, and determines high-level hook strategy.
  - `Execution AI` (`script_execution_skeleton.md`, `script_execution_script.md`): Produces XML-structured output (`<storySkeleton>`, `<scriptItem>`) containing episode scene breakdowns, dialogue lines, camera movements, and timing.
  - `Supervision AI` (`script_agent_supervision.md`): Audits pacing density, cliffhanger quality, and emotional curve.
- **WebSocket Streaming**: Uses real-time Socket.io channels to stream reasoning steps (`reasoning-start`, `text-delta`, `reasoning-end`) to client UI so users see live thinking progress.

## 2. LocalMiniDrama Multi-Provider & Storyboard Pipeline
- **AI Client Provider Routing**: Node.js `aiClient.js` pattern wraps HTTP requests to Gemini, OpenAI, DeepSeek with configurable timeout and retry logic.
- **Episode Storyboard Service**: Converts text script into per-shot visual frame prompts with character anchor tags.
- **Character LoRA Library**: Manages facial anchor images (front, profile, expression sheet) and maps them to LoRA trigger tokens (`<char_id_lora>`).

## 3. Jellyfish Episode State Machine & Element Extraction
- **State Machine Rules**:
  - `pending` = Script generated, candidate elements extracted.
  - `ready` = Character anchors & assets confirmed.
  - `video-readiness` = Frame prompts validated, ready for video render engine.
  - `generating` = Render job running in background task queue.
  - `completed` = Final video rendered & exported.
- **Element Extractor Agent**: Parses scripts to extract characters, props, locations, and wardrobe cues.

## 4. BigBanana AI Director Multi-Stage Chain
- **Director Prompt Chain**: `Series Skeleton → Episode Scripts → Scene Shots → Frame Prompts → Cloud Render Plan`.
- Links regional trend radar parameters into prompt context to optimize viral engagement.

## 5. OpenVideo NLE Engine Integration (`@openvideo/*`)
- **Core Instance**: Created via `new Core({ settings: { width: 1080, height: 1920, fps: 30 } })` with `BrowserMetadataProvider` setup via `CoreConfig.setMetadataProvider()`.
- **Canvas Mount**: Mounted via `new Studio({ canvas, core, width: 1080, height: 1920, fps: 30, interactivity: true })`.
- **Playback & Command Execution**: Direct API calls to `core.playback.play()`, `core.playback.pause()`, `core.playback.seek()`, `core.undo()`, `core.redo()`, and `core.execute({ type: 'clip.split', ... })`.
