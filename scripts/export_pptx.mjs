import pptxgen from 'pptxgenjs';
import path from 'path';
import fs from 'fs';

async function generatePptx() {
  const pptx = new pptxgen();
  
  // Explicitly define 13.333 x 7.5 Widescreen 16:9
  pptx.defineLayout({ name: 'WIDESCREEN_16_9', width: 13.333, height: 7.5 });
  pptx.layout = 'WIDESCREEN_16_9';

  pptx.author = 'Shine Studio';
  pptx.company = 'OpenVideo Team';
  pptx.title = 'Shine — System Architecture & Product Blueprint';

  const BG_COLOR = 'FCFDFF';
  const TEXT_MAIN = '0F172A';
  const TEXT_MUTED = '64748B';
  const TEXT_BODY = '334155';
  const CARD_BG = 'FFFFFF';
  const CARD_BORDER = 'E2E8F0';
  const BADGE_BG = 'F1F5F9';
  const CODE_BG = 'F8FAFC';

  // Usable area: x: 0.8 -> 12.533 (Width = 11.733 in), y: 0.4 -> 7.1 (Height = 6.7 in)
  function addHeader(slide, slideNum) {
    // Header Logo box
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y: 0.4, w: 0.42, h: 0.42,
      fill: { color: '0F172A' },
      line: { color: '0F172A' },
      rectRadius: 0.08
    });
    slide.addText('S', {
      x: 0.8, y: 0.4, w: 0.42, h: 0.42,
      fontSize: 14, fontFace: 'Segoe UI', color: 'FFFFFF', bold: true, align: 'center', valign: 'middle'
    });

    // Header Title
    slide.addText([
      { text: 'SHINE STUDIO  ', options: { bold: true, color: '0F172A' } },
      { text: '|  System Architecture & Product Blueprint', options: { color: '64748B', bold: false } }
    ], {
      x: 1.35, y: 0.4, w: 8.5, h: 0.42,
      fontSize: 12, fontFace: 'Segoe UI', valign: 'middle'
    });

    // Slide Counter Badge
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 11.3, y: 0.4, w: 1.2, h: 0.42,
      fill: { color: 'F1F5F9' },
      line: { color: 'E2E8F0', width: 1 },
      rectRadius: 0.15
    });
    slide.addText(`${String(slideNum).padStart(2, '0')} / 23`, {
      x: 11.3, y: 0.4, w: 1.2, h: 0.42,
      fontSize: 11, fontFace: 'Courier New', color: '64748B', align: 'center', valign: 'middle', bold: true
    });

    // Thin separator line
    slide.addShape(pptx.shapes.RECTANGLE, {
      x: 0.8, y: 0.95, w: 11.7, h: 0.015,
      fill: { color: 'E2E8F0' },
      line: { color: 'E2E8F0' }
    });
  }

  // ==========================================
  // SLIDE 1: Title & Overview
  // ==========================================
  {
    const slide = pptx.addSlide();
    slide.background = { color: BG_COLOR };
    addHeader(slide, 1);

    // Pill Badge
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y: 1.3, w: 3.8, h: 0.42,
      fill: { color: BADGE_BG },
      line: { color: CARD_BORDER, width: 1 },
      rectRadius: 0.15
    });
    slide.addText('End-to-End AI Video Studio Architecture', {
      x: 0.8, y: 1.3, w: 3.8, h: 0.42,
      fontSize: 11, fontFace: 'Segoe UI', color: TEXT_MAIN, align: 'center', valign: 'middle', bold: true
    });

    // Title & Subtitle
    slide.addText('Shine — Next-Gen AI Micro-Drama Studio', {
      x: 0.8, y: 1.85, w: 11.7, h: 0.8,
      fontSize: 28, fontFace: 'Segoe UI', color: TEXT_MAIN, bold: true, valign: 'top'
    });
    slide.addText('Transforming raw text prompts into viral 9:16 vertical drama series (20–50 episodes) with multi-agent AI directors, consistent character personas, in-browser WebGL editing, and Google Cloud serverless infrastructure.', {
      x: 0.8, y: 2.7, w: 11.5, h: 0.95,
      fontSize: 14.5, fontFace: 'Segoe UI', color: '475569', lineSpacingMultiple: 1.25
    });

    // 4 Bottom Cards
    const cards = [
      { tag: 'MARKET SEGMENT', title: 'Vertical Micro-Drama', desc: '$10B+ Global Market Boom' },
      { tag: 'CREATIVE BRAIN', title: 'Multi-Agent AI Director', desc: 'Gemini 3.5 Flash & Veo 3.1' },
      { tag: 'EDITOR CORE', title: 'Pixi.js WebGL NLE', desc: 'In-Browser Zero-Cost Render' },
      { tag: 'INFRASTRUCTURE', title: 'Cloud Run Serverless', desc: 'Scale-to-Zero ($0 Idle Cost)' }
    ];

    cards.forEach((c, idx) => {
      const xPos = 0.8 + idx * 2.98;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: xPos, y: 3.95, w: 2.75, h: 2.2,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.1
      });
      slide.addText([
        { text: `${c.tag}\n`, options: { fontSize: 10, bold: true, color: TEXT_MUTED } },
        { text: `${c.title}\n\n`, options: { fontSize: 14, bold: true, color: TEXT_MAIN } },
        { text: `${c.desc}`, options: { fontSize: 12, color: TEXT_MUTED } }
      ], {
        x: xPos + 0.2, y: 4.15, w: 2.35, h: 1.8,
        fontFace: 'Segoe UI', valign: 'top'
      });
    });
  }

  // ==========================================
  // SLIDE 2: Market Context
  // ==========================================
  {
    const slide = pptx.addSlide();
    slide.background = { color: BG_COLOR };
    addHeader(slide, 2);

    slide.addText('MARKET CONTEXT', { x: 0.8, y: 1.2, w: 10, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT_MUTED, bold: true });
    slide.addText('The Explosive Rise of Vertical Micro-Dramas', { x: 0.8, y: 1.55, w: 11.7, h: 0.6, fontSize: 26, fontFace: 'Segoe UI', color: TEXT_MAIN, bold: true });

    const stats = [
      { val: '$10B+', tag: 'GLOBAL MARKET BY 2027', body: 'Pioneered by Chinese Wēi Duǎnjù and rapidly expanding across the US, Southeast Asia, Latin America, and Europe via TikTok, ReelShort, DramaBox, and Shorts.' },
      { val: '1–3 Min', tag: 'EPISODIC FORMULA', body: 'Serialized 20–50 episode dramas with fast conflict escalation, intense emotional payoffs, and cliffhangers every 60–90 seconds to maximize viewer retention.' },
      { val: '3.5x', tag: 'HIGHER MONETIZATION VELOCITY', body: 'Micro-dramas convert viewers into paying subscribers 3.5x faster than traditional streaming platforms through pay-per-episode paywalls.' }
    ];

    stats.forEach((s, idx) => {
      const xPos = 0.8 + idx * 4.0;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: xPos, y: 2.35, w: 3.7, h: 3.3,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.1
      });
      slide.addText([
        { text: `${s.val}\n`, options: { fontSize: 26, bold: true, color: TEXT_MAIN } },
        { text: `${s.tag}\n\n`, options: { fontSize: 10.5, bold: true, color: TEXT_MUTED } },
        { text: `${s.body}`, options: { fontSize: 12.5, color: '475569', lineSpacingMultiple: 1.2 } }
      ], {
        x: xPos + 0.25, y: 2.55, w: 3.2, h: 2.9,
        fontFace: 'Segoe UI', valign: 'top'
      });
    });

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y: 5.9, w: 11.7, h: 0.7,
      fill: { color: CODE_BG },
      line: { color: CARD_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addText('📊 Opportunity: The creator economy needs automated software to produce hundreds of high-quality vertical drama episodes per month with minimal budget.', {
      x: 1.0, y: 5.9, w: 11.3, h: 0.7,
      fontSize: 12, fontFace: 'Segoe UI', color: '475569', valign: 'middle', bold: true
    });
  }

  // ==========================================
  // SLIDE 3: Market Pain Points
  // ==========================================
  {
    const slide = pptx.addSlide();
    slide.background = { color: BG_COLOR };
    addHeader(slide, 3);

    slide.addText('MARKET PAIN POINTS', { x: 0.8, y: 1.2, w: 10, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT_MUTED, bold: true });
    slide.addText('Core Production Bottlenecks in Vertical Drama', { x: 0.8, y: 1.55, w: 11.7, h: 0.6, fontSize: 26, fontFace: 'Segoe UI', color: TEXT_MAIN, bold: true });

    const p1 = [
      { t: '1. High Physical Production Costs', d: 'Traditional filming requires casting actors, renting sets, filming crews, and extensive editing suites, costing $30,000–$100,000+ per series.' },
      { t: '2. Character Visual Drift in Generative AI', d: 'Existing text-to-video tools fail to preserve consistent facial geometry, attire, and lighting across consecutive scenes, ruining narrative immersion.' }
    ];
    const p2 = [
      { t: '3. Prohibitive Localization & Dubbing Costs', d: 'Translating video series into foreign languages traditionally requires re-rendering video clips from scratch, incurring massive GPU compute bills.' },
      { t: '4. Disconnected Toolchains', d: 'Creators waste hours juggling separate tools for scriptwriting (ChatGPT), image gen (Midjourney), video gen (Runway), and NLE editors (Premiere).' }
    ];

    [p1, p2].forEach((col, cIdx) => {
      const xPos = 0.8 + cIdx * 6.0;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: xPos, y: 2.35, w: 5.7, h: 4.2,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.1
      });
      slide.addText([
        { text: `${col[0].t}\n`, options: { fontSize: 14.5, bold: true, color: TEXT_MAIN } },
        { text: `${col[0].d}\n\n`, options: { fontSize: 12.5, color: TEXT_MUTED, lineSpacingMultiple: 1.2 } },
        { text: `${col[1].t}\n`, options: { fontSize: 14.5, bold: true, color: TEXT_MAIN } },
        { text: `${col[1].d}`, options: { fontSize: 12.5, color: TEXT_MUTED, lineSpacingMultiple: 1.2 } }
      ], {
        x: xPos + 0.3, y: 2.55, w: 5.1, h: 3.8,
        fontFace: 'Segoe UI', valign: 'top'
      });
    });
  }

  // ==========================================
  // SLIDE 4: PMF & ICPs
  // ==========================================
  {
    const slide = pptx.addSlide();
    slide.background = { color: BG_COLOR };
    addHeader(slide, 4);

    slide.addText('TARGET MARKET', { x: 0.8, y: 1.2, w: 10, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT_MUTED, bold: true });
    slide.addText('Product-Market Fit & Ideal Customer Profiles', { x: 0.8, y: 1.55, w: 11.7, h: 0.6, fontSize: 26, fontFace: 'Segoe UI', color: TEXT_MAIN, bold: true });

    const icps = [
      { t: 'Independent Writers & Creators', d: 'Web novel authors and solo creators who want to transform written stories into monetizable vertical video series without camera crews.', v: 'Value: 100x faster production' },
      { t: 'Digital Media Studios & Agencies', d: 'Agencies producing high-volume serialized content for TikTok, YouTube Shorts, and Reels to capture ad revenue and subscriber paywalls.', v: 'Value: 80% cost reduction' },
      { t: 'Global Localization Teams', d: 'Publishers localizing domestic drama hits into international markets (EN, VI, ZH, JA, KO, ES) with instant neural voice swapping.', v: 'Value: Zero-video-render dubbing' }
    ];

    icps.forEach((icp, idx) => {
      const xPos = 0.8 + idx * 4.0;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: xPos, y: 2.35, w: 3.7, h: 3.4,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.1
      });
      slide.addText([
        { text: `${icp.t}\n\n`, options: { fontSize: 14.5, bold: true, color: TEXT_MAIN } },
        { text: `${icp.d}\n\n`, options: { fontSize: 12.5, color: TEXT_MUTED, lineSpacingMultiple: 1.2 } },
        { text: `[${icp.v}]`, options: { fontSize: 11, bold: true, color: TEXT_MAIN } }
      ], {
        x: xPos + 0.25, y: 2.55, w: 3.2, h: 3.0,
        fontFace: 'Segoe UI', valign: 'top'
      });
    });

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y: 6.0, w: 11.7, h: 0.65,
      fill: { color: CODE_BG },
      line: { color: CARD_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addText('🎯 The Shine Value Proposition: Turn a single creative individual or small team into a full-fledged serialized drama production studio.', {
      x: 1.0, y: 6.0, w: 11.3, h: 0.65,
      fontSize: 12, fontFace: 'Segoe UI', color: '475569', valign: 'middle', bold: true
    });
  }

  // ==========================================
  // SLIDE 5: 5-Layer System Blueprint with Diagram
  // ==========================================
  {
    const slide = pptx.addSlide();
    slide.background = { color: BG_COLOR };
    addHeader(slide, 5);

    slide.addText('SYSTEM BLUEPRINT', { x: 0.8, y: 1.15, w: 10, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT_MUTED, bold: true });
    slide.addText('High-Level System Architecture & 5-Tier Pipeline', { x: 0.8, y: 1.45, w: 11.7, h: 0.6, fontSize: 26, fontFace: 'Segoe UI', color: TEXT_MAIN, bold: true });

    const layers = [
      { l: '1. Client WebGL Studio', d: 'Vue 3 SPA + Pixi.js v8 NLE. Zero-render scrub & WebCodecs MP4.' },
      { l: '2. Cloud API Gateway', d: 'Node 22 Express :3001 + JWT Auth & 31 REST Controllers.' },
      { l: '3. AI Director Brain', d: 'Gemini 3.5 & Veo 3.1 + Parallel MCP & Grafana Loki MCP.' },
      { l: '4. Serverless Workers', d: 'Cloud Run Playwright Compositor + Meta Demucs v4 AI.' },
      { l: '5. Data & Storage', d: 'Firestore Native (shine-db), GCS Media Bucket & SynthID.' }
    ];

    // Left Column: 5 Layer Cards
    layers.forEach((lyr, idx) => {
      const yPos = 2.15 + idx * 0.84;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: 0.8, y: yPos, w: 4.8, h: 0.76,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.08
      });
      slide.addText([
        { text: `${lyr.l}\n`, options: { fontSize: 12, bold: true, color: TEXT_MAIN } },
        { text: `${lyr.d}`, options: { fontSize: 10.5, color: TEXT_MUTED } }
      ], {
        x: 0.95, y: yPos + 0.08, w: 4.5, h: 0.6,
        fontFace: 'Segoe UI', valign: 'top'
      });
    });

    // Right Column: System Architecture Diagram Image
    const diagramImgPath = path.resolve('docs/assets/shine-system-architecture-diagram.jpg');
    if (fs.existsSync(diagramImgPath)) {
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: 5.8, y: 2.15, w: 6.7, h: 4.15,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.1
      });
      slide.addImage({
        path: diagramImgPath,
        x: 5.9, y: 2.22, w: 6.5, h: 4.0
      });
    }

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y: 6.45, w: 11.7, h: 0.55,
      fill: { color: CODE_BG },
      line: { color: CARD_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addText('PROTOCOL: REST (HTTPS) • SSE Progress Streams • MCP Protocols • 100% Google Cloud Native', {
      x: 1.0, y: 6.45, w: 11.3, h: 0.55,
      fontSize: 10.5, fontFace: 'Courier New', color: '475569', valign: 'middle', bold: true
    });
  }

  // ==========================================
  // Helper for 2-column detail slides
  // ==========================================
  function addTwoColumnSlide(slideNum, category, title, col1, col2, note) {
    const slide = pptx.addSlide();
    slide.background = { color: BG_COLOR };
    addHeader(slide, slideNum);

    slide.addText(category.toUpperCase(), { x: 0.8, y: 1.2, w: 10, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT_MUTED, bold: true });
    slide.addText(title, { x: 0.8, y: 1.55, w: 11.7, h: 0.6, fontSize: 26, fontFace: 'Segoe UI', color: TEXT_MAIN, bold: true });

    [col1, col2].forEach((col, cIdx) => {
      const xPos = 0.8 + cIdx * 6.0;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: xPos, y: 2.35, w: 5.7, h: 3.9,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.1
      });
      slide.addText([
        { text: `${col.title}\n\n`, options: { fontSize: 15, bold: true, color: TEXT_MAIN } },
        { text: `${col.desc}\n\n`, options: { fontSize: 12.5, color: TEXT_MUTED, lineSpacingMultiple: 1.2 } },
        ...(col.bullets || []).map(b => ({ text: `• ${b}\n`, options: { fontSize: 12, color: TEXT_BODY, lineSpacingMultiple: 1.2 } })),
        ...(col.code ? [{ text: `\n${col.code}`, options: { fontSize: 11, fontFace: 'Courier New', color: TEXT_MAIN } }] : [])
      ], {
        x: xPos + 0.3, y: 2.55, w: 5.1, h: 3.5,
        fontFace: 'Segoe UI', valign: 'top'
      });
    });

    if (note) {
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: 0.8, y: 6.4, w: 11.7, h: 0.55,
        fill: { color: CODE_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.08
      });
      slide.addText(note, {
        x: 1.0, y: 6.4, w: 11.3, h: 0.55,
        fontSize: 11, fontFace: 'Segoe UI', color: '475569', valign: 'middle', bold: true
      });
    }
  }

  // SLIDE 6: WebGL
  addTwoColumnSlide(6, 'Layer 1: Presentation (Active Core)', 'OpenVideo Pixi.js WebGL & WebCodecs Engine',
    { title: '1. Real-Time WebGL Compositor (Pixi.js v8)', desc: 'The browser viewport renders 9:16 vertical frames at >= 30 FPS using client GPU hardware.', bullets: ['Zero-Render Preview: Scrub playhead across buffers with 0ms cloud latency.', 'GLSL Fragment Shaders: Real-time chroma keying & color grading.', 'Microsecond Timeline Model: Sub-millisecond timing precision (1s = 1,000,000µs).'] },
    { title: '2. In-Browser Export (WebCodecs API)', desc: 'Renders MP4 video directly on the user computer via hardware-accelerated WebCodecs (mediabunny).', bullets: ['Zero Server Cost ($0): 100% computed on client device.', 'Lightning Speed: Encodes a 90s 1080p episode in ~12 seconds.', 'In-Memory ISOBMFF Muxing: Assembles MP4 container in memory.'] }
  );

  // SLIDE 7: Real-Time Team Collaboration
  addTwoColumnSlide(7, 'Planned Roadmap Specification (Phase 2)', 'Real-Time Team Collaboration Architecture',
    { title: 'Delta Patch Protocol (PatchSyncService)', desc: 'Designed to broadcast atomic RFC 6902 delta patches (<1KB) over Socket.io instead of heavy 500KB blobs:', code: '{\n  "op": "update",\n  "path": "/clips/clip_01/timing/display/to",\n  "value": 4500000,\n  "author": "usr_sarah"\n}' },
    { title: 'Planned Concurrency Controls', desc: 'State synchronization engine ensuring smooth concurrent timeline workflows:', bullets: ['Clip-Level Mutex Locking: Optimistic locking to prevent race conditions.', 'Live Teammate Cursors: Playhead markers broadcasting peer listening at 30Hz.', 'Immutable Version Checkpoints: Continuous timeline revision snapshots saved to Firestore.'] },
    'Status: Architecture & Backend Service Designed ➔ Full Client Integration in Phase 2.'
  );

  // SLIDE 8: Multi-Agent AI Director
  {
    const slide = pptx.addSlide();
    slide.background = { color: BG_COLOR };
    addHeader(slide, 8);

    slide.addText('LAYER 3: AI BRAIN (ACTIVE CORE)', { x: 0.8, y: 1.2, w: 10, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT_MUTED, bold: true });
    slide.addText('Hierarchical Multi-Agent AI Director', { x: 0.8, y: 1.55, w: 11.7, h: 0.6, fontSize: 26, fontFace: 'Segoe UI', color: TEXT_MAIN, bold: true });

    const agents = [
      { t: '1. Discovery & Skeleton', d: 'TrendRadar: Scans viral drama trends via Parallel MCP.\n\nStorySkeleton: Designs 20–50 episode narrative master plans with cliffhangers.', m: 'Model: gemini-3.5-flash-lite' },
      { t: '2. Screenplay Breakdown', d: 'ScriptAgent: Breaks each episode into 15–45 short scene blocks (4–8s) with visual prompts, actions, and dialogues in JSON.', m: 'Model: gemini-3.5-flash-lite' },
      { t: '3. QA & In-Editor Copilot', d: 'SupervisionAgent: Audits pacing & safety.\n\nChatbotAgent: Modifies timeline state via natural language commands.', m: 'Model: gemini-3.5-flash-lite / 2.5-pro' }
    ];

    agents.forEach((ag, idx) => {
      const xPos = 0.8 + idx * 4.0;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: xPos, y: 2.35, w: 3.7, h: 3.5,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.1
      });
      slide.addText([
        { text: `${ag.t}\n\n`, options: { fontSize: 14.5, bold: true, color: TEXT_MAIN } },
        { text: `${ag.d}\n\n`, options: { fontSize: 12, color: TEXT_MUTED, lineSpacingMultiple: 1.2 } },
        { text: `[${ag.m}]`, options: { fontSize: 11, fontFace: 'Courier New', bold: true, color: TEXT_MAIN } }
      ], {
        x: xPos + 0.25, y: 2.5, w: 3.2, h: 3.2,
        fontFace: 'Segoe UI', valign: 'top'
      });
    });

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y: 6.0, w: 11.7, h: 0.65,
      fill: { color: CODE_BG },
      line: { color: CARD_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addText('🧠 4-Tier Memory Mesh: Active Session State ➔ Vertex Vector Search RAG (text-embedding-004) ➔ Series Knowledge Graph Lineage ➔ Token Compressor.', {
      x: 1.0, y: 6.0, w: 11.3, h: 0.65,
      fontSize: 11.5, fontFace: 'Segoe UI', color: '475569', valign: 'middle', bold: true
    });
  }

  // SLIDE 9: Decoupled Dubbing
  addTwoColumnSlide(9, 'Layer 3: Localization (Active Core)', 'Decoupled Audio-Visual Dubbing Engine',
    { title: 'Track 1: Pure Visual Motion (VIDEO 1)', desc: 'Generated as silent video clips via Google Veo 3.1 (veo-3.1-generate-001). Immutable during multi-language dubbing operations.', code: '[Scene 01: 6.00s] ── [Scene 02: 5.50s] (Fixed Visuals)' },
    { title: 'Track 2: Neural TTS Dialogue (AUDIO 1)', desc: 'Synthesized per language track via gemini-3.1-flash-tts-preview (30 distinct voices) with word-level phonetic timestamps.', code: 'EN: "Where are you?" (2.1s)\nVI: "Anh đang ở đâu?" (2.6s, Δt)' },
    '💡 Unfair Cost Advantage: To distribute in 5 languages, Shine only swaps the voice track and recalculates timeline timings (Δt). You never re-render expensive video AI clips!'
  );

  // SLIDE 10: Serverless Cloud Render Worker
  addTwoColumnSlide(10, 'Layer 4: Cloud Workers (Active Core)', 'Serverless Cloud Run Video Render Worker',
    { title: '1. Asynchronous Jobs & Headless Playwright', desc: 'Episode render tasks are dispatched asynchronously (/render-job), tracking progress from 0% to 100% via API polling or SSE stream.', bullets: ['shine-render-worker container launches headless Chromium WebCodecs compositors.', 'Renders master-quality 1080p/4K video frames on Cloud Run.'] },
    { title: '2. Scale-to-Zero & Parity Audit', desc: 'Container lifecycle engineered for extreme cost efficiency:', bullets: ['Scale-to-Zero ($0 Idle): Scales to 0 instances when idle, eliminating static server bills.', 'Automated SSIM diff tool ensures the final cloud video matches editor preview with SSIM > 0.999 parity.'] }
  );

  // SLIDE 11: AI Audio & Stem Separation
  addTwoColumnSlide(11, 'Layer 4: Audio AI (Active Core)', 'Meta Demucs v4 AI Stem Separation & 3D Audio',
    { title: 'FastAPI Demucs v4 AI Microservice', desc: 'Dedicated FastAPI Python microservice on Cloud Run (services/demucs-worker) separates mixed audio into isolated stems:', bullets: ['Vocal Isolation: Separates character dialogue from background ambient noise.', 'Music Extraction: Strips vocal tracks to create clean instrumental soundtracks.', 'Parametric Auto-Ducking: Attenuates BGM by 80% with 250ms attack during dialogue intervals.'] },
    { title: '3D Binaural Spatial Audio Engine', desc: 'Calculates real acoustic physics based on where characters stand on the phone screen:', bullets: ['Sabine RT60 Decay: Simulates realistic room reverb (hallway, bedroom, street).', 'Woodworth Head Model: Computes Interaural Time Differences (ITD) between ears.'] }
  );

  // SLIDE 12: Pluggable Persistence & Security
  addTwoColumnSlide(12, 'Layer 5: Storage & Trust (Active Core)', 'Pluggable Persistence, SynthID & C2PA Provenance',
    { title: 'Pluggable Database Architecture (IDatabaseProvider)', desc: 'Enforces strict repository interfaces, enabling database switching via environment variables:', bullets: ['Firestore Native (shine-db) — Primary Cloud NoSQL', 'MongoDB Atlas — Document Database', 'SQLite (shine.db) — Local Development'] },
    { title: 'Digital Watermarking & Provenance', desc: 'Enterprise trust and media integrity suite:', bullets: ['Google SynthID: Embeds imperceptible digital watermarks into audio & video.', 'C2PA Content Credentials: Cryptographically signs provenance manifests.', 'V4 Signed URLs: Generates temporary 30-minute GCS links for secure media streaming.'] }
  );

  // SLIDE 13: Google Cloud Synergy Services
  {
    const slide = pptx.addSlide();
    slide.background = { color: BG_COLOR };
    addHeader(slide, 13);

    slide.addText('INFRASTRUCTURE SYNERGY', { x: 0.8, y: 1.2, w: 10, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT_MUTED, bold: true });
    slide.addText('Google Cloud Unified Service Synergy', { x: 0.8, y: 1.55, w: 11.7, h: 0.6, fontSize: 26, fontFace: 'Segoe UI', color: TEXT_MAIN, bold: true });

    const syn = [
      { t: 'Compute & Scaling', d: 'Cloud Run: Serverless execution with --min-instances 0 scaling to 0 when idle.\n\nCloud Scheduler: Periodic cron (*/5 * * * *) token sync heartbeat.', b: '$0 Idle Compute Cost' },
      { t: 'Data & Messaging', d: 'Firestore Native: Document persistence for scripts, timelines & version snapshots.\n\nCloud Storage (GCS): V4 signed URLs for high-throughput media streaming.', b: 'gs://shine-studio-media' },
      { t: 'Security & Observability', d: 'Cloud IAM & Secret Manager: Least-privilege roles (aiplatform.user, datastore.user).\n\nCloud Logging: Real-time structured telemetry & P99 latency tracking.', b: 'Enterprise IAM & Audit Trails' }
    ];

    syn.forEach((s, idx) => {
      const xPos = 0.8 + idx * 4.0;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: xPos, y: 2.35, w: 3.7, h: 3.5,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.1
      });
      slide.addText([
        { text: `${s.t}\n\n`, options: { fontSize: 14.5, bold: true, color: TEXT_MAIN } },
        { text: `${s.d}\n\n`, options: { fontSize: 12, color: TEXT_MUTED, lineSpacingMultiple: 1.2 } },
        { text: `[${s.b}]`, options: { fontSize: 11, fontFace: 'Courier New', bold: true, color: TEXT_MAIN } }
      ], {
        x: xPos + 0.25, y: 2.5, w: 3.2, h: 3.2,
        fontFace: 'Segoe UI', valign: 'top'
      });
    });

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y: 6.0, w: 11.7, h: 0.65,
      fill: { color: CODE_BG },
      line: { color: CARD_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addText('🔗 Synergy Advantage: Native identity & networking across all GCP services eliminates ingress/egress transit bottlenecks and simplifies DevOps automation.', {
      x: 1.0, y: 6.0, w: 11.3, h: 0.65,
      fontSize: 11.5, fontFace: 'Segoe UI', color: '475569', valign: 'middle', bold: true
    });
  }

  // SLIDE 14: Multimodal AI Model Matrix (Table)
  {
    const slide = pptx.addSlide();
    slide.background = { color: BG_COLOR };
    addHeader(slide, 14);

    slide.addText('GENERATIVE AI STACK', { x: 0.8, y: 1.15, w: 10, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT_MUTED, bold: true });
    slide.addText('Multimodal Generative AI Model Matrix', { x: 0.8, y: 1.45, w: 11.7, h: 0.55, fontSize: 24, fontFace: 'Segoe UI', color: TEXT_MAIN, bold: true });

    const rows = [
      [
        { text: 'Domain / Task', options: { bold: true, color: TEXT_MUTED, fontSize: 11.5 } },
        { text: 'Active Production Model', options: { bold: true, color: TEXT_MUTED, fontSize: 11.5 } },
        { text: 'Supported Models & Fallbacks', options: { bold: true, color: TEXT_MUTED, fontSize: 11.5 } },
        { text: 'Technical Role in Shine', options: { bold: true, color: TEXT_MUTED, fontSize: 11.5 } }
      ],
      [{ text: 'Script & Planning', options: { fontSize: 11 } }, { text: 'gemini-3.5-flash-lite', options: { bold: true, fontSize: 11 } }, { text: 'gemini-2.5-pro, 3.1-pro', options: { fontSize: 10.5 } }, { text: 'Story master plan, 15–45 scene JSON breakdown, cliffhangers.', options: { fontSize: 11 } }],
      [{ text: 'Agent Orchestrator', options: { fontSize: 11 } }, { text: 'gemini-3.5-flash-lite', options: { bold: true, fontSize: 11 } }, { text: 'Multi-Agent ADK Router', options: { fontSize: 10.5 } }, { text: 'TrendRadar, ScriptAgent, SupervisionAgent coordinator.', options: { fontSize: 11 } }],
      [{ text: 'Video Generation', options: { fontSize: 11 } }, { text: 'veo-3.1-generate-001', options: { bold: true, fontSize: 11 } }, { text: 'veo-3.0, 2.0, 2.1', options: { fontSize: 10.5 } }, { text: '9:16 vertical silent video motion clips with camera steering.', options: { fontSize: 11 } }],
      [{ text: 'Facial Consistency', options: { fontSize: 11 } }, { text: 'gemini-3.1-flash-lite-image', options: { bold: true, fontSize: 11 } }, { text: 'imagen-3.0, imagen-3.5', options: { fontSize: 10.5 } }, { text: '8-angle facial consistency keyframes & character visual DNA.', options: { fontSize: 11 } }],
      [{ text: 'Neural TTS Speech', options: { fontSize: 11 } }, { text: 'gemini-3.1-flash-tts-preview', options: { bold: true, fontSize: 11 } }, { text: '30 Gemini Voices', options: { fontSize: 10.5 } }, { text: 'Multi-speaker dialogue with word-level timestamps in 6 languages.', options: { fontSize: 11 } }],
      [{ text: 'Live Audio Dialogue', options: { fontSize: 11 } }, { text: 'gemini-live-2.5-flash-native-audio', options: { bold: true, fontSize: 11 } }, { text: 'Bidirectional WebSocket', options: { fontSize: 10.5 } }, { text: 'Low-latency live interactive character voice conversations.', options: { fontSize: 11 } }],
      [{ text: 'Soundtrack & SFX', options: { fontSize: 11 } }, { text: 'lyria-3-clip-preview', options: { bold: true, fontSize: 11 } }, { text: 'Lyria-v1', options: { fontSize: 10.5 } }, { text: 'Dynamic mood-adaptive background music & suspense crescendo risers.', options: { fontSize: 11 } }],
      [{ text: 'Vector Search (RAG)', options: { fontSize: 11 } }, { text: 'text-embedding-004', options: { bold: true, fontSize: 11 } }, { text: 'Vertex Vector Search', options: { fontSize: 10.5 } }, { text: 'Sub-50ms semantic search across scene bibles & character lineage.', options: { fontSize: 11 } }],
      [{ text: 'Stem Separation', options: { fontSize: 11 } }, { text: 'Meta Demucs v4 (htdemucs)', options: { bold: true, fontSize: 11 } }, { text: 'FastAPI PyTorch Container', options: { fontSize: 10.5 } }, { text: 'Vocal isolation, BGM extraction, and parametric auto-ducking.', options: { fontSize: 11 } }],
      [{ text: 'Watermarking', options: { fontSize: 11 } }, { text: 'Google SynthID', options: { bold: true, fontSize: 11 } }, { text: 'C2PA Manifest Signing', options: { fontSize: 10.5 } }, { text: 'Steganographic imperceptible watermarking on generated waveforms.', options: { fontSize: 11 } }]
    ];

    slide.addTable(rows, {
      x: 0.8, y: 2.1, w: 11.7, h: 4.8,
      fontSize: 10.5, fontFace: 'Segoe UI',
      border: { color: CARD_BORDER, width: 1 },
      fill: { color: CARD_BG },
      color: TEXT_MAIN,
      rowH: [0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42],
      colW: [2.3, 2.6, 2.5, 4.3]
    });
  }

  // SLIDE 15: MCP Integration Fabric
  addTwoColumnSlide(15, 'Protocol Integration', 'Model Context Protocol (MCP) Integration Fabric',
    { title: '1. Parallel AI Search MCP (search.parallel.ai/mcp)', desc: 'Connects Shine multi-agent director to real-time web search for discovering viral drama tropes and performing safety audits:', bullets: ['Trend Radar Agent: Scans real-time trending tropes across 6 regions.', 'Supervision Agent: Automated pre-flight copyright check on titles & novel synopses.', 'SfxService: Discovers open sound effects across Freesound & web sources.'], code: 'Client: server/src/integrations/mcp/ParallelMCPClient.ts' },
    { title: '2. Grafana MCP & Loki Observability', desc: 'Unifies live system monitoring, container health, and error tracing through the official Grafana MCP endpoint:', bullets: ['Telemetry Streaming: Auto-flushes structured logs & RSS to Grafana Loki every 15s.', 'P99 Latency & Probes: Exposes GET /api/admin/observability tracking WebSockets.', 'Automated Alerts: Triggers instant email alerts upon critical AI pipeline failures.'], code: 'Service: server/src/services/observability/GrafanaObservabilityService.ts' }
  );

  // SLIDE 16: 4 USPs
  {
    const slide = pptx.addSlide();
    slide.background = { color: BG_COLOR };
    addHeader(slide, 16);

    slide.addText('COMPETITIVE EDGE', { x: 0.8, y: 1.2, w: 10, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT_MUTED, bold: true });
    slide.addText("Shine's 4 Unique Selling Points (USPs)", { x: 0.8, y: 1.55, w: 11.7, h: 0.6, fontSize: 26, fontFace: 'Segoe UI', color: TEXT_MAIN, bold: true });

    const usps = [
      { t: '1. Decoupled Multi-Language Dubbing', d: 'Silent visual clips + neural speech allow swapping dialogue into 6+ languages and auto-aligning timeline bounds (Δt) without re-rendering expensive video AI clips.' },
      { t: '2. In-Browser $0 GPU WebCodecs Render', d: 'Creators export 1080p MP4 episodes directly in browser memory in ~12 seconds, delivering fast turnarounds with zero server GPU overhead.' },
      { t: '3. Persona Studio & 8 Facial Anchors', d: 'Locks facial geometry, wardrobe, and character embeddings across 50 episodes, eliminating visual drift and inconsistency.' },
      { t: '4. Scale-to-Zero Serverless Economy', d: '100% serverless infrastructure on Google Cloud Run automatically scales containers to 0 instances when idle, ensuring $0 static maintenance costs.' }
    ];

    usps.forEach((usp, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const xPos = 0.8 + col * 6.0;
      const yPos = 2.35 + row * 2.15;

      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: xPos, y: yPos, w: 5.7, h: 1.95,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.1
      });
      slide.addText([
        { text: `${usp.t}\n`, options: { fontSize: 14.5, bold: true, color: TEXT_MAIN } },
        { text: `${usp.d}`, options: { fontSize: 12, color: TEXT_MUTED, lineSpacingMultiple: 1.2 } }
      ], {
        x: xPos + 0.25, y: yPos + 0.2, w: 5.2, h: 1.6,
        fontFace: 'Segoe UI', valign: 'top'
      });
    });
  }

  // SLIDE 17: Persona Studio
  addTwoColumnSlide(17, 'Consistency Engine', 'Persona Studio: 8 Facial Consistency Anchors',
    { title: '8-Angle Facial Consistency Locking', desc: 'When a character is registered, Persona Studio generates 8 multi-angle reference keyframes to lock their biometric DNA:', bullets: ['Frontal Portrait & 45° Left/Right Profile', 'Full Side Profile & High/Low Angle Cinematic Shots', 'Emotional Smirk & Dramatic Anger expressions'] },
    { title: 'Prompt DNA & Reference Injection', desc: 'During video and storyboard generation, the character visual traits and reference image URLs are automatically injected into Gemini and Veo prompts:', bullets: ['Preserves signature hairstyles, scars, and attire continuity.', 'Links voice IDs (Gemini Audio) to specific character personas.', 'Guarantees cast continuity across all 20–50 episodes.'] }
  );

  // SLIDE 18: Kinetic Captions & Cliffhangers
  addTwoColumnSlide(18, 'Audience Retention', 'Kinetic Subtitles & Dynamic Cliffhanger Engine',
    { title: 'Word-Level Animated Kinetic Captions', desc: 'Captions drive over 60% of short-form video watch time. Shine automatically generates viral animated subtitles:', bullets: ['Karaoke Pop-In: Active words highlight & bounce on beat with speech.', 'Typography Presets: Dramatic Punch, Neon Cyberpunk, Clean Minimalist.', 'One-Click Translation: Translates subtitles while preserving millisecond timings.'] },
    { title: 'Dynamic Cliffhanger Engine', desc: 'Automatically identifies the episode climax and injects an intense 3-second hook sequence:', bullets: ['GLSL Shaders: Triggers glitch, flash, or keyframe zoom-in effects.', 'Audio Stinger: Injects dramatic crescendo risers on AUDIO 3.', 'Call-to-Action Overlay: Displays "Episode 2 Unlocked in 3s".'] }
  );

  // SLIDE 19: Product Roadmap
  {
    const slide = pptx.addSlide();
    slide.background = { color: BG_COLOR };
    addHeader(slide, 19);

    slide.addText('DEVELOPMENT EVOLUTION', { x: 0.8, y: 1.2, w: 10, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT_MUTED, bold: true });
    slide.addText('Agile Engineering Roadmap (Sprints 1–7)', { x: 0.8, y: 1.55, w: 11.7, h: 0.6, fontSize: 26, fontFace: 'Segoe UI', color: TEXT_MAIN, bold: true });

    const sprints = [
      { s: 'Sprint 1', v: 'v0.1 Alpha', d: 'Foundation, Vertex AI SDK, Pluggable DBs (Firestore/SQLite), and Auth Suite.' },
      { s: 'Sprint 2', v: 'v0.2 Beta', d: 'Multi-Agent Script Pipeline, Trend Radar (Parallel MCP), Persona Studio.' },
      { s: 'Sprint 3', v: 'v0.5 NLE Beta', d: 'OpenVideo Pixi.js WebGL Editor, Undo/Redo Commands, Dual-Render Parity.' },
      { s: 'Sprint 4', v: 'v0.8 RC1', d: 'Neural Voiceover, Kinetic Subtitles, Cliffhanger Engine, Meta Demucs v4.' },
      { s: 'Sprint 5', v: 'v0.9 RC2', d: 'WebSocket Delta Sync Architecture, Quality Linter & i18n Key Parity.' },
      { s: 'Sprint 6 & 7', v: 'v1.1 Commercial', d: 'Multi-Platform Publishing, Grafana MCP Observability & Playwright E2E Suite.' }
    ];

    sprints.forEach((sp, idx) => {
      const yPos = 2.35 + idx * 0.75;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: 0.8, y: yPos, w: 11.7, h: 0.68,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.08
      });
      slide.addText([
        { text: `${sp.s}: `, options: { bold: true, color: TEXT_MAIN, fontSize: 12.5 } },
        { text: `${sp.d}`, options: { color: TEXT_BODY, fontSize: 12 } }
      ], {
        x: 1.0, y: yPos, w: 9.3, h: 0.68,
        fontFace: 'Segoe UI', valign: 'middle'
      });
      slide.addText(`[${sp.v}]`, {
        x: 10.4, y: yPos, w: 1.9, h: 0.68,
        fontSize: 11, fontFace: 'Courier New', bold: true, color: TEXT_MAIN, align: 'right', valign: 'middle'
      });
    });
  }

  // SLIDE 20: Future Planning
  {
    const slide = pptx.addSlide();
    slide.background = { color: BG_COLOR };
    addHeader(slide, 20);

    slide.addText('FUTURE PLANNING (PHASE 2 & 3 ROADMAP)', { x: 0.8, y: 1.2, w: 10, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: 'D97706', bold: true });
    slide.addText('Planned Roadmap Innovations', { x: 0.8, y: 1.55, w: 11.7, h: 0.6, fontSize: 26, fontFace: 'Segoe UI', color: TEXT_MAIN, bold: true });

    const futures = [
      { t: '1. Real-Time Multi-User Co-Editing', d: 'Full client integration of the Socket.io RFC 6902 JSON Pointer delta patch engine for live collaborative timeline editing.', p: 'Phase 2: Live Team Collaboration' },
      { t: '2. Distributed Batch Render Queue', d: 'Automated multi-episode batch queueing across a pool of parallel Cloud Run Playwright worker nodes via Cloud Pub/Sub.', p: 'Phase 2: Automated 50-Episode Batch Queue' },
      { t: '3. Platform Analytics & Synthetic Audience', d: 'Viewer retention heatmaps, drop-off prediction curves, and cross-platform publishing analytics (TikTok / Shorts / Reels).', p: 'Phase 3: Platform Analytics & Audience Simulator' },
      { t: '4. Live Interactive Drama & Marketplace', d: 'Branching narrative trees (@antv/g6) for live voting + AI character asset trading marketplace.', p: 'Phase 3: Branching Drama & Character Hub' }
    ];

    futures.forEach((f, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const xPos = 0.8 + col * 6.0;
      const yPos = 2.35 + row * 2.15;

      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: xPos, y: yPos, w: 5.7, h: 1.95,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.1
      });
      slide.addText([
        { text: `${f.t}\n`, options: { fontSize: 14.5, bold: true, color: TEXT_MAIN } },
        { text: `${f.d}\n\n`, options: { fontSize: 12, color: TEXT_MUTED, lineSpacingMultiple: 1.15 } },
        { text: `[${f.p}]`, options: { fontSize: 10.5, fontFace: 'Courier New', bold: true, color: TEXT_MAIN } }
      ], {
        x: xPos + 0.25, y: yPos + 0.18, w: 5.2, h: 1.65,
        fontFace: 'Segoe UI', valign: 'top'
      });
    });
  }

  // SLIDE 21: Cost Architecture
  {
    const slide = pptx.addSlide();
    slide.background = { color: BG_COLOR };
    addHeader(slide, 21);

    slide.addText('COST ARCHITECTURE', { x: 0.8, y: 1.2, w: 10, h: 0.35, fontSize: 11, fontFace: 'Courier New', color: TEXT_MUTED, bold: true });
    slide.addText('Cloud Run Sizing & $0 Idle Cost Model', { x: 0.8, y: 1.55, w: 11.7, h: 0.6, fontSize: 26, fontFace: 'Segoe UI', color: TEXT_MAIN, bold: true });

    const costRows = [
      [
        { text: 'Service', options: { bold: true, color: TEXT_MUTED, fontSize: 12.5 } },
        { text: 'Specs', options: { bold: true, color: TEXT_MUTED, fontSize: 12.5 } },
        { text: 'Autoscaling', options: { bold: true, color: TEXT_MUTED, fontSize: 12.5 } },
        { text: 'Concurrency', options: { bold: true, color: TEXT_MUTED, fontSize: 12.5 } },
        { text: 'Idle Cost', options: { bold: true, color: TEXT_MUTED, fontSize: 12.5 } }
      ],
      [{ text: 'shine-app', options: { bold: true, fontSize: 12 } }, { text: '2 vCPU / 4Gi', options: { fontSize: 12 } }, { text: '0 to 3 instances', options: { fontSize: 12 } }, { text: '80 req/instance', options: { fontSize: 12 } }, { text: '$0.00', options: { bold: true, fontSize: 12 } }],
      [{ text: 'shine-render-worker', options: { bold: true, fontSize: 12 } }, { text: '4 vCPU / 8Gi', options: { fontSize: 12 } }, { text: '0 to 3 instances', options: { fontSize: 12 } }, { text: '1 job (Isolated)', options: { fontSize: 12 } }, { text: '$0.00', options: { bold: true, fontSize: 12 } }],
      [{ text: 'demucs-worker', options: { bold: true, fontSize: 12 } }, { text: '2 vCPU / 4Gi', options: { fontSize: 12 } }, { text: '0 to 3 instances', options: { fontSize: 12 } }, { text: '2 req/instance', options: { fontSize: 12 } }, { text: '$0.00', options: { bold: true, fontSize: 12 } }]
    ];

    slide.addTable(costRows, {
      x: 0.8, y: 2.35, w: 11.7, h: 2.6,
      fontSize: 12, fontFace: 'Segoe UI',
      border: { color: CARD_BORDER, width: 1 },
      fill: { color: CARD_BG },
      color: TEXT_MAIN,
      rowH: [0.55, 0.55, 0.55, 0.55],
      colW: [2.5, 2.2, 2.3, 2.5, 2.2]
    });

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y: 5.3, w: 11.7, h: 0.75,
      fill: { color: CODE_BG },
      line: { color: CARD_BORDER, width: 1 },
      rectRadius: 0.08
    });
    slide.addText('💡 Scale-to-Zero Guarantee: When no users are actively editing or rendering, all 3 Cloud Run services scale to 0 instances. Zero monthly server bills when idle!', {
      x: 1.0, y: 5.3, w: 11.3, h: 0.75,
      fontSize: 12, fontFace: 'Segoe UI', color: '475569', valign: 'middle', bold: true
    });
  }

  // SLIDE 22: Deployment
  addTwoColumnSlide(22, 'DevOps & Automation', '1-Click Full Ecosystem Cloud Run Deployment',
    { title: 'Automated Cloud Provisioning Lifecycle', desc: 'Full automated deployment in 5 sequential steps:', bullets: ['1. Auto-enables 10 GCP APIs (run, pubsub, firestore, aiplatform, etc.).', '2. Grants least-privilege IAM roles to Default Compute Service Account.', '3. Auto-provisions Firestore Native database shine-db and GCS bucket.', '4. Creates Pub/Sub topics (shine-render-jobs, shine-render-status).', '5. Builds and deploys all 3 containers with dynamic YAML configuration.'] },
    { title: 'Single Execution Command', desc: 'Deploy entire ecosystem with a single command:', code: '# Windows PowerShell\n.\\scripts\\deploy-cloudrun.ps1\n\n# Linux / macOS / Cloud Shell\n./scripts/deploy-cloudrun.sh\n\n# Health Check\ncurl https://<APP_URL>/api/health' }
  );

  // SLIDE 23: Conclusion
  {
    const slide = pptx.addSlide();
    slide.background = { color: BG_COLOR };
    addHeader(slide, 23);

    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 5.1, y: 1.3, w: 3.1, h: 0.42,
      fill: { color: BADGE_BG },
      line: { color: CARD_BORDER, width: 1 },
      rectRadius: 0.15
    });
    slide.addText('Strategic Summary', {
      x: 5.1, y: 1.3, w: 3.1, h: 0.42,
      fontSize: 11, fontFace: 'Segoe UI', color: TEXT_MAIN, align: 'center', valign: 'middle', bold: true
    });

    slide.addText('Redefining Global Storytelling for the Short-Form Video Era', {
      x: 1.5, y: 1.85, w: 10.3, h: 0.7,
      fontSize: 28, fontFace: 'Segoe UI', color: TEXT_MAIN, bold: true, align: 'center', valign: 'top'
    });

    slide.addText('Shine unites cutting-edge Google generative AI models (gemini-3.5-flash-lite, veo-3.1, gemini-live-2.5, lyria-3), Model Context Protocol integrations (Parallel MCP & Grafana MCP), and serverless scale-to-zero infrastructure to turn any creator into a global micro-drama studio.', {
      x: 1.8, y: 2.65, w: 9.7, h: 1.1,
      fontSize: 14, fontFace: 'Segoe UI', color: '475569', align: 'center', lineSpacingMultiple: 1.3
    });

    const metrics = [
      { val: '100x Faster', tag: 'Script to Video' },
      { val: '80% Cheaper', tag: 'Zero-Render Dubbing' },
      { val: '$0 Idle Cost', tag: 'Serverless Run' }
    ];

    metrics.forEach((m, idx) => {
      const xPos = 2.4 + idx * 3.0;
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: xPos, y: 4.1, w: 2.6, h: 1.6,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.1
      });
      slide.addText([
        { text: `${m.val}\n`, options: { fontSize: 22, bold: true, color: TEXT_MAIN } },
        { text: `${m.tag}`, options: { fontSize: 12, color: TEXT_MUTED } }
      ], {
        x: xPos + 0.1, y: 4.35, w: 2.4, h: 1.1,
        fontFace: 'Segoe UI', align: 'center', valign: 'middle'
      });
    });
  }

  const outPptxPath = path.resolve('docs/shine-architecture-presentation.pptx');
  const artifactPptxPath = 'C:/Users/tanca/.gemini/antigravity/brain/31ef2d6a-03ca-4926-a915-85d4149a5f3f/shine_architecture_presentation.pptx';

  console.log('Writing PowerPoint presentation (.pptx) with enlarged legible fonts...');
  await pptx.writeFile({ fileName: outPptxPath });
  fs.copyFileSync(outPptxPath, artifactPptxPath);

  const stats = fs.statSync(outPptxPath);
  console.log(`\n======================================================`);
  console.log(`PPTX Export Complete (${(stats.size / 1024).toFixed(1)} KB):`);
  console.log(`  - Docs: ${outPptxPath}`);
  console.log(`  - Artifacts: ${artifactPptxPath}`);
  console.log(`======================================================\n`);
}

generatePptx().catch(err => {
  console.error('Error generating PPTX:', err);
  process.exit(1);
});
