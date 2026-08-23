import { Router, Request, Response } from 'express';
import { geminiClient } from '../integrations/ai/gemini/GeminiClient.js';

const router = Router();

const CAPTION_PRESETS = [
  {
    id: 'preset_dynamic_popup',
    name: 'Dynamic Pop-up (Viral)',
    style: {
      fontSize: 76,
      fontFamily: 'Outfit, sans-serif',
      fontWeight: '800',
      color: '#FFFFFF',
      activeColor: '#FFD700',
      align: 'center',
      stroke: { color: '#000000', width: 4 },
      shadow: { color: '#000000', alpha: 0.7, blur: 6, offsetX: 2, offsetY: 2 },
    },
    animation: 'pop-in',
  },
  {
    id: 'preset_minimal_clean',
    name: 'Minimal Clean',
    style: {
      fontSize: 54,
      fontFamily: 'Inter, sans-serif',
      fontWeight: '600',
      color: '#FFFFFF',
      align: 'center',
      shadow: { color: '#000000', alpha: 0.5, blur: 4 },
    },
    animation: 'fade',
  },
  {
    id: 'preset_comic_action',
    name: 'Comic Action',
    style: {
      fontSize: 82,
      fontFamily: 'Bangers, cursive',
      fontWeight: '900',
      color: '#FFF200',
      activeColor: '#FF3366',
      align: 'center',
      stroke: { color: '#000000', width: 6 },
    },
    animation: 'bounce',
  },
  {
    id: 'preset_neon_cyberpunk',
    name: 'Neon Cyberpunk',
    style: {
      fontSize: 68,
      fontFamily: 'Outfit, sans-serif',
      fontWeight: '700',
      color: '#00FFFF',
      activeColor: '#FF00FF',
      align: 'center',
      shadow: { color: '#00FFFF', alpha: 0.8, blur: 10 },
    },
    animation: 'glow-pulse',
  },
];

// GET /v1/captions/presets
router.get('/presets', (_req: Request, res: Response) => {
  res.json({
    code: 200,
    data: { presets: CAPTION_PRESETS },
    message: 'Caption presets retrieved successfully',
    error: null,
  });
});

// POST /v1/captions/auto-generate
router.post('/auto-generate', async (req: Request, res: Response) => {
  const { episodeId = 'ep-001', language = 'en-US', text } = req.body;
  const dialogue = text || "Where are you, Kael? You're never late. Too late, Mara. They're already here.";

  try {
    const prompt = `Break down the following dialogue into timed micro-drama caption cues with word-level breakdown:
Language: ${language}
Dialogue: "${dialogue}"

Respond in strict JSON (words timestamps must be relative in milliseconds from 0 to cue duration):
[
  {
    "id": "cue_1",
    "text": "Where are you, Kael?",
    "fromUs": 0,
    "toUs": 1800000,
    "words": [
      { "text": "Where", "from": 0, "to": 400, "isKeyWord": false },
      { "text": "are", "from": 400, "to": 700, "isKeyWord": false },
      { "text": "you,", "from": 700, "to": 1100, "isKeyWord": false },
      { "text": "Kael?", "from": 1100, "to": 1800, "isKeyWord": true }
    ]
  }
]`;

    const raw = await geminiClient.generateText({
      prompt,
      systemInstruction: 'You are an AI Subtitle & Kinetic Caption Timing Engine for vertical short-form video. word.from and word.to must be relative milliseconds from 0.',
      jsonMode: true,
    });

    const parsed = JSON.parse(raw);
    const rawCues = Array.isArray(parsed) ? parsed : (parsed.cues || []);
    const cues = rawCues.map((c: any) => ({
      ...c,
      words: Array.isArray(c.words)
        ? c.words.map((w: any) => ({
            ...w,
            from: w.from > 10000 ? Math.round(w.from / 1000) : w.from,
            to: w.to > 10000 ? Math.round(w.to / 1000) : w.to,
          }))
        : undefined,
    }));

    return res.json({
      code: 200,
      data: {
        episodeId,
        language,
        cuesCount: cues.length,
        cues,
      },
      message: 'Captions auto-generated successfully via Gemini',
      error: null,
    });
  } catch (err: any) {
    const words = dialogue.split(' ');
    let timeUs = 200000;
    const cues: any[] = [];
    for (let i = 0; i < words.length; i += 4) {
      const chunk = words.slice(i, i + 4);
      const fromUs = timeUs;
      const durationUs = chunk.length * 400000;
      const toUs = fromUs + durationUs;
      timeUs = toUs + 200000;

      cues.push({
        id: `cue_${i / 4 + 1}`,
        text: chunk.join(' '),
        timing: { display: { from: fromUs, to: toUs }, duration: durationUs },
        words: chunk.map((w: string, idx: number) => ({
          text: w,
          from: idx * 380,
          to: (idx + 1) * 380,
          isKeyWord: idx === chunk.length - 1,
        })),
      });
    }

    return res.json({
      code: 200,
      data: {
        episodeId,
        language,
        cuesCount: cues.length,
        cues,
      },
      message: 'Captions auto-generated successfully',
      error: null,
    });
  }
});

// POST /v1/captions/translate
router.post('/translate', async (req: Request, res: Response) => {
  const { episodeId = 'ep-001', language = 'vi-VN', text, cues = [] } = req.body;
  const sourceText = text || (cues.map((c: any) => c.text).join(' ')) || 'Where are you, Kael?';

  try {
    const prompt = `Translate this micro-drama subtitle dialogue into ${language}:
Source: "${sourceText}"

Respond with strict JSON:
{
  "translatedText": "Exact translated text"
}`;

    const raw = await geminiClient.generateText({
      prompt,
      systemInstruction: 'You are a professional subtitle translator for high-velocity vertical dramas.',
      jsonMode: true,
    });

    const parsed = JSON.parse(raw);
    const translatedText = parsed.translatedText || sourceText;

    return res.json({
      code: 200,
      data: {
        episodeId,
        language,
        translatedText,
        cuesCount: cues.length || 1,
      },
      message: `Captions translated to ${language} successfully via Gemini`,
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({
      code: 500,
      data: null,
      message: 'Failed to translate captions',
      error: err.message,
    });
  }
});

// POST /v1/captions/apply-style
router.post('/apply-style', (req: Request, res: Response) => {
  const { episodeId, presetId, customStyle } = req.body;
  const preset = CAPTION_PRESETS.find((p) => p.id === presetId) || CAPTION_PRESETS[0];

  res.json({
    code: 200,
    data: {
      episodeId,
      appliedPreset: preset.id,
      style: { ...preset.style, ...(customStyle || {}) },
      updatedAt: new Date().toISOString(),
    },
    message: 'Subtitle styling preset applied successfully',
    error: null,
  });
});

// POST /v1/captions/kinetic-style
router.post('/kinetic-style', (req: Request, res: Response) => {
  const { episodeId, style, highlightColor = '#FFD700', enableEmoji = true } = req.body;

  res.json({
    code: 200,
    data: {
      episodeId: episodeId || 'ep-001',
      appliedStyle: style || { preset: 'kinetic_pop', highlightColor, enableEmoji, bassSync: true },
      cssAnimation: 'keyframe-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      updatedAt: new Date().toISOString(),
    },
    message: 'Kinetic caption style applied successfully',
    error: null,
  });
});

export default router;
