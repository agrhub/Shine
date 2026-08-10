# AI Director Chatbot Long-Term Memory & Vector RAG Architecture

This document details the 4-tier long-term memory architecture, vector retrieval pipeline, and knowledge graph engine that enables the **AI Director Chatbot Agent** to seamlessly load and query massive multi-episode series data (projects, 50-episode scripts, character bibles, scene environments, voiceover WAVs, microsecond timeline JSONs, comment threads, and social retention analytics) in **Shine (DramaFlowAI)**.

---

## 🧠 The 4-Tier Memory Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   1. SHORT-TERM IN-SESSION MEMORY (WINDOW)                        │
│   Active Episode JSON State + Last 10 Chat Messages + Current Surface Context   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   2. HIERARCHICAL VECTOR MEMORY BANK (RAG)                        │
│   Vertex AI Vector Search / Embedding API -> Embeds Scripts, Characters & Analytics│
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                3. LONG-TERM PROJECT KNOWLEDGE GRAPH (NEO4J / JSON-LD)             │
│   Graph Entity Linking: Series -> Episode -> Scene -> Character -> Asset Lineage   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                  4. HYBRID CONTEXT RETRIEVER & COMPRESSOR MESH                   │
│   Query Rewriter -> Multi-Vector Search -> Token Compressor -> Prompt Injector   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Tier-by-Tier Technical Breakdown

### Tier 1: Short-Term Session Memory (Sliding Context Window)
- **Scope:** Active browser session and current workspace tab (`/workspace/:episodeId/edit`).
- **Data Stored:**
  - Active timeline state JSON snapshot (`studio.exportToJSON()`).
  - Currently selected clip ID (`selectedClipId`) and playhead position ($t_{\mu s}$).
  - Last 10 chat interaction turns stored in Pinia store & Redis session cache.

---

### Tier 2: Hierarchical Vector Memory Bank & RAG Engine (Vertex AI Vector Search)
- **Embedding Model:** Google Vertex AI Text Embeddings (`text-embedding-004` / Multimodal Embeddings).
- **Chunking & Indexing Strategy:**
  1. **Script Chunks:** Split per scene block (`sc_01`, `sc_02`), indexing scene headers, action lines, and character dialogue vectors.
  2. **Character Bibles:** Indexing character descriptions, 8 facial consistency anchor metadata, and outfit histories.
  3. **Collaboration Comments:** Indexing frame-accurate review notes timestamped at $t_{\mu s}$.
  4. **Analytics Vectors:** Indexing viewer retention drop-off events and performance heatmaps.
- **Retrieval Latency:** Sub-50ms similarity search returning Top-K relevant context blocks when creators query past episodes (*"What outfit did Mara wear in Episode 3 rooftop scene?"*).

---

### Tier 3: Long-Term Series Knowledge Graph (Graph Entity Lineage)
- **Graph Structure:** Series represented as a Directed Knowledge Graph (`Series` ➔ `Episode` ➔ `Scene` ➔ `Character` ➔ `Asset` ➔ `Analytics`).
- **Cross-Episode Entity Linking:**
  - Character entity `char_mara` is persistently linked across all 50 episodes, tracking her emotional arc and outfit continuity.
  - Asset lineage: Video clip `vid_102` is linked to source prompt, background virtual set `env_04`, and voiceover WAV `wav_88`.

---

### Tier 4: Dynamic Query Rewriter & Context Token Compressor
Before constructing the prompt for Gemini 3.5 Flash:
1. **Query Rewriter:** Expands ambiguous user prompts (*"Fix that drop in episode 2"*) into explicit entity IDs (`ep_02`, `retention_drop_t4.2s`).
2. **Context Token Compressor:** Strips structural JSON overhead, compressing a raw 500KB timeline JSON into a dense ~4KB Markdown summary payload injected into Gemini's context window.

---

## 📊 Summary of Vector Retrieval & Memory Bindings

| Data Type | Chunking Unit | Vector Index | Memory Tier |
|-----------|---------------|--------------|-------------|
| **Active Timeline** | Normalized JSON | Session State | Tier 1 (Short-Term) |
| **Episode Scripts** | Scene Blocks (4–8s) | `script_vector_idx` | Tier 2 (Vector RAG) |
| **Character Personas** | Character Bibles & Anchors | `persona_vector_idx` | Tier 3 (Knowledge Graph) |
| **Comments & Notes** | Frame Timecode $t_{\mu s}$ | `comment_vector_idx` | Tier 2 (Vector RAG) |
| **Retention Curves** | Drop-off Timestamp $t_{\text{sec}}$ | `analytics_vector_idx` | Tier 2 & Tier 3 |
