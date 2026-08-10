# In-Editor AI Director Chatbot Architecture & Timeline Command Loop

This document details the exact technical architecture, state ingestion pipeline, and command validation loop that enables the **AI Director Chatbot Agent** to understand user natural language requests and deterministically execute timeline modifications in **Shine (Vue Editor + OpenVideo Core)**.

---

## 🧠 The 6-Layer Execution Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                      1. USER CHAT PROMPT & UI CHIPS                    │
│      "Trim Scene 3 by 500ms and add a Glitch transition to Scene 4"    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               2. TIMELINE STATE INGESTION & NORMALIZATION               │
│  Export Timeline JSON (studio.exportToJSON()) -> Compact Context Payload│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             3. GEMINI STRUCTURED COMMAND GENERATION LAYER              │
│   Gemini 3.5 Flash + Structured JSON Schema -> OpenVideo Command[]      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               4. COMMAND PIPELINE VALIDATION & GUARD                   │
│   Check Timing Overlaps, Track IDs, and Microsecond Boundaries         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               5. OPENVIDEO CORE ATOMIC EXECUTION & SYNC                │
│ core.executeMany(commands) -> WebGL Canvas Re-render -> WebSocket Sync  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             6. NATURAL LANGUAGE FEEDBACK & UI GLOW HIGHLIGHT           │
│   Chatbot Confirmation Message + Blue Outline Glow on Affected Clips   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Layer-by-Layer Technical Specification

### Layer 1: Context Ingestion & Timeline Normalization
When the user dispatches a message in the Chatbot Drawer:
1. The Vue 3 editor executes `studio.exportToJSON()` to extract active episode state.
2. The state is normalized into a compact token-efficient payload sent to the API (`POST /ai/assistant/command-edit`):
   ```json
   {
     "playheadUs": 14500000,
     "selectedClipId": "clip_scene_03",
     "tracks": [
       { "id": "video_1", "type": "Video" },
       { "id": "audio_1", "type": "Audio" },
       { "id": "subs_1", "type": "Caption" }
     ],
     "clips": {
       "clip_scene_03": { "trackId": "video_1", "type": "Video", "timing": { "display": { "from": 12000000, "to": 18000000 } } },
       "clip_scene_04": { "trackId": "video_1", "type": "Video", "timing": { "display": { "from": 18000000, "to": 24000000 } } }
     }
   }
   ```

---

### Layer 2: Google Agent ADK Tool Binding & Command Schema Enforcement
The Chatbot Agent is built using **Google Agent ADK (Agent Development Kit)** and Google GenAI SDK (`@google/genai`). It initializes a `DirectorAgent` registered with specialized ADK Tools:

- `timelineCommandTool`: Translates natural language requests into structured OpenVideo `Command[]` arrays.
- `scriptGenTool`: Invokes multi-agent script pipeline (`POST /ai/generate-script`).
- `facialAnchorTool`: Extracts 8 facial anchors from uploaded actor images (`POST /characters/:id/facial-anchors`).
- `virtualSetTool`: Generates 3D scene backgrounds (`POST /environments/generate`).
- `veoVideoGenTool`: Synthesizes video clips with Veo 3.1 reference anchors (`POST /ai/video-gen`).
- `voiceDubbingTool`: Synthesizes TTS audio and auto-realigns timeline clip bounds ($\Delta t_{\mu s}$).
- `visualAudioQATool`: Executes Gemini Vision frame inspection and parametric EQ volume ducking.

The System Prompt instructs Gemini on the **OpenVideo Command Catalog**:
- `clip.add`: `{ trackId: string, clip: ClipObject }`
- `clip.update`: `{ clipId: string, patch: { [jsonPointerPath]: any } }`
- `clip.remove`: `{ clipId: string }`
- `clip.split`: `{ clipId: string, splitTimeUs: number }`


#### Example Gemini Output:
```json
{
  "explanation": "Shortened Scene 3 by 500ms and injected a 500ms Glitch transition bridging Scene 3 and Scene 4.",
  "commands": [
    {
      "id": "cmd_trim_01",
      "type": "clip.update",
      "payload": {
        "clipId": "clip_scene_03",
        "patch": {
          "timing.display.to": 17500000
        }
      }
    },
    {
      "id": "cmd_trans_01",
      "type": "clip.add",
      "payload": {
        "trackId": "video_1",
        "clip": {
          "id": "clip_trans_glitch_01",
          "type": "Transition",
          "transitionKey": "glitch",
          "fromClipId": "clip_scene_03",
          "toClipId": "clip_scene_04",
          "timing": { "display": { "from": 17000000, "to": 18000000 } }
        }
      }
    }
  ]
}
```

---

### Layer 3: Disambiguation & Clarification Protocol
If the user's natural language request is ambiguous (e.g., *"Make it faster"* or *"Fix this scene"*):
- The Chatbot Agent DOES NOT guess randomly.
- It returns an interactive clarification response with 2–3 quick selection chips:
  ```json
  {
    "explanation": "I found multiple ways to adjust Scene 3. Please select your desired option:",
    "clarificationOptions": [
      { "label": "Speed up playback to 1.5x", "prompt": "Set playback speed of Scene 3 to 1.5x" },
      { "label": "Trim duration by 2 seconds", "prompt": "Trim 2 seconds off Scene 3 duration" },
      { "label": "Cut scene at playhead", "prompt": "Split Scene 3 at current playhead position" }
    ]
  }
  ```

---

### Layer 4: Command Validation Sandbox (Pre-execution Safety)
Before running commands on the active OpenVideo Core engine instance:
1. **Timing Boundary Check:** Validates that `display.from < display.to` and `duration > 0`.
2. **Track Existence Check:** Verifies target `trackId` exists in active state.
3. **Collision Avoidance:** Ensures clip trimming/adding does not create illegal track collisions.

---

### Layer 5: Atomic Execution & WebSocket Patch Propagation
1. The Vue 3 client executes `core.executeMany(commands)` on the local `@openvideo/core` engine.
2. OpenVideo mutates timeline state, records inverse patches (`oldValue` ↔ `value`) in the Undo Stack, and triggers instantaneous WebGL canvas re-render.
3. If co-editors are online, the client broadcasts atomic delta patches (`patch:broadcast`) over WebSocket to all active peer sessions.

---

### Layer 6: Visual Feedback & UI Glow Highlight
1. The Chatbot displays the `explanation` text in the Chatbot Drawer.
2. In the NLE Timeline canvas, affected clips (`clip_scene_03`, `clip_trans_glitch_01`) trigger a **temporary 1.5s blue outline glow animation** (`animate-pulse-glow`), providing clear visual confirmation of exact changes made.

---

## 🌐 Omni-Module Execution Matrix (Beyond Timeline Editor)

The AI Director Chatbot Agent is an **Omni-Module Command Layer** spanning the ENTIRE product workspace, not just the timeline editor:

| Module / Surface | Natural Language Prompt Example | Chatbot Underlying Action / API Invocation |
|------------------|---------------------------------|--------------------------------------------|
| **Script & Scene Assembly** | *"Make Scene 4 more suspenseful and add a cliffhanger dialogue for Mara."* | Calls `POST /ai/optimize-script` to update scene script text and visual prompts. |
| **Character & Persona Studio** | *"Swap Mara's outfit to Cyberpunk Trenchcoat v2 for Scene 5."* | Triggers `POST /characters/:id/wardrobe` preset swap & updates Veo reference anchors. |
| **Series & Episode Manager** | *"Add 3 more episodes focused on Kael's backstory to the series."* | Calls `POST /series/:id/episodes` & updates the AntV G6 story DAG graph tree. |
| **Auto-Captions & Subtitle Styling** | *"Translate all subtitles to Spanish LatAm and apply Dynamic Pop-up style."* | Dispatches `POST /captions/translate` and updates `Caption` style presets in timeline JSON. |
| **Transitions, Animations & Effects** | *"Apply a Glitch transition between Scene 2 and 3, and add a Neo-Noir color filter."* | Dispatches `clip.add` for GLSL transition & sets OpenVideo shader filter properties. |
| **Cloud Batch Render** | *"Start cloud batch rendering for Episodes 1 to 5 in 4K 24fps."* | Dispatches `POST /export/render` offloading jobs to GCP Cloud Run Headless Compositor workers. |
| **Multi-Platform Publishing** | *"Generate a viral TikTok caption with hashtags and publish Episode 1 now."* | Calls `POST /export/ai-caption` and dispatches `POST /publish/tiktok` via TikTok Direct API. |
| **Viral A/B Testing & Product Placement** | *"Generate 3 A/B ending variants for Episode 1 and composite a drink can on the table."* | Calls `POST /ai/ab-variants/generate` and `POST /environments/product-placement`. |

---

## 🚀 Advanced AI Director Chatbot Intelligence Capabilities

Beyond direct editing commands, the AI Director Chatbot possesses 6 advanced intelligent capabilities:

### 1. Multimodal QA Inspection ("Visual & Audio Inspector Agent")
- **Visual QA:** Chatbot calls Gemini Vision to inspect video frames for motion blur, character framing issues, or composition defects (*"Check if Mara's face is framed correctly in Scene 3"*).
- **Audio QA:** Chatbot checks parametric EQ and audio waveform peaks to verify dialogue legibility against background ambience (*"Fix background music drowning out Mara's voice"*).

### 2. Beat-Synced Smart Typography & Animation Alignment
- Chatbot analyzes music track transient peaks ($t_{\text{beat}}$) and aligns subtitle pop-up keyframes to the precise rhythmic beats of the background music track (*"Sync caption pop-ups to the background beat"*).

### 3. Retention Diagnostic & Automatic Script Doctor
- Chatbot queries social retention API metrics, identifies exact viewer drop-off points (e.g. drop at $t=4.2\text{s}$), and automatically inserts visual jump-cuts or dramatic sound risers to boost retention (*"Diagnose why viewers drop off at second 4 in Episode 2 and fix it"*).

### 4. Real-Time Emotion & Pitch Director (Voice Acting Coach)
- Chatbot fine-tunes TTS emotion curves and acoustic parameters in real time (*"Make Kael sound 20% more sarcastic and lower his pitch by 1.2x in Line 2"*), instantly re-synthesizing line audio.

### 5. Cost & Compute Budget Optimization Advisor
- Chatbot analyzes project timeline complexity and advises creators on how to minimize compute spend (*"Show me how to reduce Vertex AI rendering cost for Episode 4"*), offering 1-click optimization to switch to proxy models or reuse virtual sets.

### 6. Interactive Story Decision Tree Generator
- Chatbot auto-generates Bandersnatch-style branching choices at episode climax points, constructs dynamic AntV G6 DAG nodes, and inserts choice button overlays on the video canvas (*"Build 2 branch endings where the audience chooses revenge vs forgiveness"*).

---

## 🎬 End-to-End Chat-Driven Creative Pipeline

Creators can build an entire vertical micro-drama series from scratch **exclusively via conversational natural language prompts** through the AI Director Chatbot:

```
[Conversational Prompt]
   │
   ├── 1. Project Initialization ──> POST /series (Creates series metadata & genre settings)
   ├── 2. Multi-Agent Scripting ──> POST /ai/generate-script (Generates 20-50 episode scenes)
   ├── 3. Persona Studio Anchoring ──> POST /characters (Creates profiles & 8 facial anchors)
   ├── 4. Virtual Set Generation ──> POST /environments/generate (Builds 3D scene backgrounds)
   ├── 5. Veo Video Generation ──> POST /ai/video-gen (Renders silent visual scene clips on VIDEO 1 track)
   ├── 6. Voice & Music Synthesis ──> POST /voices/generate (Renders TTS dialogue on AUDIO 1 & Lyria 3 music on AUDIO 2)
   └── 7. Auto-Captions & Subtitles ──> POST /captions/auto-generate (Pop-up captions on SUBS 1)

```

---

## 💡 Context-Aware Dynamic Prompt Chips & Multimodal Inputs

### 1. Context-Aware Dynamic Suggestion Chips
The Chatbot Drawer automatically inspects the user's active page/surface and dynamically renders targeted **Smart Action Chips**:

- **Script & Scene Assembly Surface (`/workspace/:id/script`):**
  - `[Suggest Suspense Twist]`, `[Auto-Generate Next Scene Hook]`, `[Inject Mara Cliffhanger Line]`.
- **Persona Studio Surface (`/workspace/:id/characters`):**
  - `[Swap Mara Outfit to Cyberpunk Trenchcoat]`, `[Extract 8 Facial Anchors]`, `[Audit Wardrobe Continuity]`.
- **Timeline Editor Surface (`/workspace/:id/edit`):**
  - `[Trim Selected Clip 500ms]`, `[Add Glitch Transition]`, `[Sync Subtitles to Beat]`, `[Fix Music Drowning Dialogue]`.
- **Auto-Captions Surface (`/workspace/:id/captions`):**
  - `[Translate to Spanish LatAm]`, `[Apply Dynamic Pop-up Preset]`, `[Word-Level Yellow Highlight]`.
- **Export & Publishing Surface (`/workspace/:id/export`):**
  - `[Generate 3 Viral A/B Endings]`, `[Create 3 Smart Cover Options]`, `[Tag Sponsored Product on Table]`, `[Publish to TikTok]`.

---

### 🎙️ 2. Multimodal Input Processing (Image, Video, Docs, Voice)

The AI Director Chatbot natively ingests 4 multimodal input types via Gemini 3.5 Flash / Gemini Vision:

1. **Image Input (Actors, Costumes, Concept Art):**
   - User drags and drops `.png`/`.jpg` photos into chat.
   - *Use Case:* *"Extract facial anchors from this photo and set as Mara's persona profile"* (`POST /characters/:id/facial-anchors`).
2. **Video Input (Reference B-roll & Motion Samples):**
   - User uploads short `.mp4`/`.webm` clips.
   - *Use Case:* *"Analyze camera movement in this sample clip and apply steady handheld zoom to Scene 2."*
3. **Document Input (PDF, DOCX, TXT Manuscripts):**
   - User drops novel manuscripts or script text documents into chat.
   - *Use Case:* *"Adapt Chapter 3 of this document into a 20-episode micro-drama script outline."*
4. **Voice Input (Real-Time Microphone Stream):**
   - User speaks naturally via Microphone icon or WebSocket `connectLive()` multimodal live stream.
   - *Use Case:* User speaks: *"Cut Scene 3 at playhead and make Mara's dialogue sound angrier."* Chatbot executes speech-to-text, parses intent, and dispatches `clip.split` + TTS emotion adjustments in real time!




