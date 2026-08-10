# Shine (DramaFlowAI) UI/UX Design & Enhancement Proposals

This document details the UI/UX enhancement proposals for **Shine (DramaFlowAI)** based on the 15 UI mockup samples in `docs/UI/`.

---

## 🎨 UI/UX Enhancement Proposals by Surface / Module

### 1. Timeline Editor Surface (`workspace-editor.png`)

#### Current State
Multi-track NLE timeline (VIDEO 1, AUDIO 1, SUBS) with 9:16 vertical preview canvas, media assets panel, and scene inspector.

#### Proposed Enhancements
- **Omni-Module AI Director Chatbot Drawer (Floating Right Drawer):**
  - Add a persistent, floating/collapsible right-side drawer available across all workspace surfaces (*"Ask AI Director..."*).
  - **Multimodal Drag-and-Drop Attachment Bar:** Input field includes attachment icons for uploading Images (`.png`/`.jpg` actor/costume photos), Videos (`.mp4` camera motion samples), and Documents (`.pdf`/`.docx` novel/script manuscripts).
  - **Real-Time Microphone Voice Button:** Integrated mic button triggering WebSocket `connectLive()` multimodal live audio streaming with waveform visualizer indicator.
  - **Dynamic Context-Aware Prompt Chips:** Surface-tailored smart action chips (Script: `[Suggest Twist]`, Persona: `[Extract Face Anchors]`, Timeline: `[Trim 500ms]`, Captions: `[Translate Spanish]`, Export: `[Viral A/B Endings]`).
  - **Clarification Option Cards:** Renders interactive choice cards when prompts are ambiguous (`[Speed up to 1.5x]`, `[Trim duration 2s]`).
  - **Visual Action Glow Feedback:** Affected clips flash a temporary 1.5s blue outline glow (`animate-pulse-glow`) on the canvas when commands execute.

- **Real-Time Collaboration Avatar Bar & Command History:**
  - Display live avatar badges of active co-editors at top-right of timeline header with live pulse indicators (reflecting WebSocket `patch:broadcast` sync).
  - Add a visual command history breadcrumb (`clip.add` ➔ `clip.update`) with single-click inverse patch undo/redo.
- **Dual-Render Status & Cost Ceiling Indicator:**
  - Header mode pill: `Client WebGL Studio (Zero-Render Preview)` vs `Headless Cloud Compositor (4K Batch Export)`.
  - Vertex AI budget progress meter (e.g. `$1.20 / $3.50 Cap (Proxy Mode Active)`).


---

### 2. Script & Scene Assembly Surface (`workspace-scripts.png`)

#### Current State
Left panel character bible & drama tone config; Center script editor; Right storyboard scene assembly grid.

#### Proposed Enhancements
- **Persona Studio Wardrobe & Prop Swap Picker:**
  - On each scene thumbnail card, add a dropdown tag for character outfit presets (`Mara: Cyberpunk Trenchcoat v2` ➔ `Mara: Gala Dress v1`).
  - Displays a visual **98.4% Face Mesh Match** indicator badge.
- **Cliffhanger Junction Highlight:**
  - Highlight the final scene card of each episode with a neon **"Cliffhanger Junction (3s Stinger)"** banner.
  - Dropdown select for GLSL shaders (`Glitch`, `Flash`, `Circle Reveal`) and stinger WAV preview.

---

### 3. Voice & Dubbing Surface (`workspace-voice-dubbing.png`)

#### Current State
Voice profiles list, dialogue line editor, emotion curve visualizer, performance controls.

#### Proposed Enhancements
- **Multi-Market Dubbing & Auto-Timeline Re-alignment Visualizer (Proposal 4):**
  - Dual-waveform display overlaying original dialogue WAV against translated voiceover WAV (e.g. English vs Spanish LatAm).
  - Visual delta marker ($\Delta t = +2.4\text{s}$) showing auto-aligned `VIDEO 1` clip boundary adjustments and updated OpenVideo `Caption` timing blocks.

---

### 4. Export & Smart Publishing Surface (`workspace-episode-export.png`)

#### Current State
9:16 final preview, Smart Cover Generator (3 options), target platforms (TikTok, Reels, Shorts), Cloud Render CTA.

#### Proposed Enhancements
- **Viral A/B Variant Generator Tab (Proposal 8):**
  - Add tab toggle: `Single Export` vs `Viral A/B Multi-Ending Export`.
  - Preview cards for 3 ending variants (Mystery, Action, Romance) with automatic 24-hour social retention metrics ingestion.
- **AI In-Video Product Placement Overlay Manager (Proposal 10):**
  - Interactive bounding box selector on 9:16 preview canvas to tag background surfaces (tables, desks) for sponsored 3D product compositing and affiliate link binding.

---

### 5. Character Consistency & Persona Studio (`workspace-characters-2.png`)

#### Current State
Facial consistency anchors grid (4 of 8 slots used), outfit continuity locking, face weight sliders.

#### Proposed Enhancements
- **Wardrobe & Prop Swap Registry Grid (Proposal 1):**
  - Dedicated tab for **Wardrobe Presets** allowing creators to upload and lock 3D clothing silhouettes and prop vectors.
  - Interactive continuity check map highlighting any scar or earring placement drift across shots.

---

### 6. Analytics & Series Insights (`workspace-episode-analytic.png` & `analytics.png`)

#### Current State
KPI cards, retention chart, platform revenue donut, top performing episodes table.

#### Proposed Enhancements
- **AntV G6 Interactive Branching Story Graph View (Proposal 9):**
  - Interactive DAG node tree visualization powered by **AntV G6 (`@antv/g6`)**, displaying audience branching choices (`Episode 1` ➔ `Choice A: 72%` / `Choice B: 28%`).
  - Supports node zoom/pan, SVG custom episode thumbnail cards, animated edge data flows, and 1-click node navigation to jump straight into an episode's timeline editor.


---

### 7. Virtual Set & Environment Studio (`workspace-eposode-scene-environment.png`)

#### Current State
Text prompt input, environment categories, 9:16 preview, mood presets.

#### Proposed Enhancements
- **Product Placement Anchor Detection:**
  - Gemini Vision bounding-box highlighter overlay identifying compositing-ready physical surfaces in generated environments.

---

## 8. Fantastic Admin UI Component Integration Architecture (`@fantastic-admin/example`)

To ensure 100% design consistency across the CamHub/OpenVideo product ecosystem, Shine UI components adopt the **Fantastic Admin (`apps/example`) Component Framework**:

- **Core Primitives (`reka-ui` & `@fantastic-admin/components`):** Accessible, unstyled UI primitives wrapped in customized Dark-Mode themes (Dialog, Popover, Dropdown Menu, Tooltip).
- **Resizable Layout Panels (`splitpanes`):** Flexible, draggable resizable split panes for NLE Timeline Panels, AI Chatbot Drawers, and Storyboard Split Views.
- **Data Table & Grid System (`vxe-table` & `vxe-pc-ui`):** High-performance grid controls for Episode lists, Asset Library models, and Performance Analytics tables.
- **Charts & Visualization (`@visactor/vchart` & `echarts`):** Dashboard KPI charts, Viewer Retention curves, and Platform Revenue breakdown donuts.
- **Form Validation (`vee-validate` + `@vee-validate/zod`):** Strict Zod schema validation for AI prompt forms, character properties, and project configurations.
- **Styling Architecture (`class-variance-authority` + `tailwind-merge`):** Unified CVA component variant styling matching Fantastic Admin design tokens.

---

## 9. Dynamic UI Polish & Live Copilot Canvas Overlays (Proposals 13–16)

- **Kinetic Karaoke Subtitle Preview Overlay (Proposal 13):** Dynamic yellow text pop-up with bass-synced font scale bounce (`animate-bounce-bass`) and automatic emotion emoji badges (`🔥`, `😱`, `💔`) overlaid on the 9:16 vertical canvas.
- **3D Spatial Audio Soundstage Control (Proposal 14):** Interactive 3D binaural soundstage visualizer widget on the Audio Mixer panel allowing manual drag-and-drop spatial panning of sound effects.
- **AI Viral Cover Poster Selector (Proposal 15):** Smart modal displaying 3 generated cover posters with face aesthetic score badges (`96% Aesthetic Match`) and customizable viral hook title overlays.
- **Live Video Canvas Copilot Overlay Bubbles (Proposal 16):** Non-blocking glassmorphism alert bubbles rendered on the WebGL preview canvas pointing out live pacing delays, volume spikes, or visual framing issues during playback.


