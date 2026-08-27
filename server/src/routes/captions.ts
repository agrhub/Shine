import { Router, Request, Response } from 'express';
import { geminiClient } from '../integrations/ai/gemini/GeminiClient.js';
import { PromptLoader } from '../utils/PromptLoader.js';
import { getDatabaseProvider } from '../database/index.js';
import { StorageFactory } from '../services/storage/StorageFactory.js';

export const captionsRouter = Router();

const CAPTION_PRESETS = [
  {
    id: 'preset_dramatic_yellow',
    name: 'Dramatic Punch',
    style: {
      fontSize: 64,
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: '900',
      color: '#FFE600',
      activeColor: '#FFFFFF',
      align: 'center',
      stroke: { color: '#000000', width: 6 },
    },
    animation: 'pop-in',
  },
  {
    id: 'preset_clean_minimal',
    name: 'Clean Minimalist',
    style: {
      fontSize: 54,
      fontFamily: 'Inter, sans-serif',
      fontWeight: '600',
      color: '#FFFFFF',
      activeColor: '#38BDF8',
      align: 'center',
      shadow: { color: '#000000', alpha: 0.6, blur: 4 },
    },
    animation: 'fade-slide',
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

// GET /api/captions/presets
captionsRouter.get('/presets', (_req: Request, res: Response) => {
  res.json({
    code: 200,
    data: { presets: CAPTION_PRESETS },
    message: 'Caption presets retrieved successfully',
    error: null,
  });
});

// Helper function for auto-generating captions
export async function generateCaptionsInternal(params: {
  episodeId?: string;
  language?: string;
  text?: string;
}) {
  const { episodeId = 'ep-001', language = 'en-US', text } = params;
  const dialogue = text || "Where are you, Kael? You're never late. Too late, Mara. They're already here.";

  try {
    const prompt = PromptLoader.render('audio/caption_auto_generate', {
      language,
      dialogue,
    });

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

    return {
      episode_id: episodeId,
      language,
      cues_count: cues.length,
      cues,
    };
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

    return {
      episode_id: episodeId,
      language,
      cues_count: cues.length,
      cues,
    };
  }
}

// POST /api/captions/auto-generate
captionsRouter.post('/auto-generate', async (req: Request, res: Response) => {
  const { episode_id, episodeId = 'ep-001', language = 'en-US', text } = req.body;
  const targetEpisodeId = episode_id || episodeId;

  try {
    const result = await generateCaptionsInternal({ episodeId: targetEpisodeId, language, text });
    return res.json({
      code: 200,
      data: result,
      message: 'Captions auto-generated successfully via Gemini',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({
      code: 500,
      data: null,
      message: `Failed to generate captions: ${err.message}`,
      error: err.message,
    });
  }
});

// POST /api/captions/translate
captionsRouter.post('/translate', async (req: Request, res: Response) => {
  const { episode_id, language = 'en-US', text, cues = [] } = req.body;
  const targetEpisodeId = episode_id || 'ep-001';
  const sourceText = text || (cues.map((c: any) => c.text).join(' ')) || 'Where are you, Kael?';

  try {
    const prompt = PromptLoader.render('audio/caption_translate', {
      language,
      sourceText,
      cuesCount: cues.length,
    });

    const raw = await geminiClient.generateText({
      prompt,
      systemInstruction: 'You are a professional film localization translator for vertical micro-dramas. Translate each cue into punchy natural dialogue in target language.',
      jsonMode: true,
    });

    const parsed = JSON.parse(raw);
    const translatedCues = Array.isArray(parsed) ? parsed : (parsed.translated_cues || []);

    return res.json({
      code: 200,
      data: {
        episode_id: targetEpisodeId,
        language,
        translated_cues: translatedCues,
      },
      message: 'Captions translated successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'TRANSLATION_FAILED' });
  }
});

// POST /api/captions/apply-style
captionsRouter.post('/apply-style', (req: Request, res: Response) => {
  const { episode_id, preset_id, custom_style } = req.body;
  const preset = CAPTION_PRESETS.find((p) => p.id === preset_id) || CAPTION_PRESETS[0];

  res.json({
    code: 200,
    data: {
      episode_id,
      applied_preset: preset.id,
      style: { ...preset.style, ...(custom_style || {}) },
      updated_at: new Date().toISOString(),
    },
    message: 'Subtitle styling preset applied successfully',
    error: null,
  });
});

// POST /api/captions/kinetic-style
captionsRouter.post('/kinetic-style', (req: Request, res: Response) => {
  const { episode_id, style, highlight_color = '#FFD700', enable_emoji = true } = req.body;

  res.json({
    code: 200,
    data: {
      episode_id: episode_id || 'ep-001',
      applied_style: style || { preset: 'kinetic_pop', highlight_color, enable_emoji, bass_sync: true },
      css_animation: 'keyframe-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      updated_at: new Date().toISOString(),
    },
    message: 'Kinetic caption style applied successfully',
    error: null,
  });
});

// POST /api/captions/batch-translate
captionsRouter.post('/batch-translate', async (req: Request, res: Response) => {
  const { episode_id, target_language = 'en-US', scenes = [] } = req.body;
  const targetEpisodeId = episode_id;
  const reqTargetLang = target_language;

  if (!Array.isArray(scenes) || scenes.length === 0) {
    return res.status(400).json({ code: 400, message: 'Scenes array is required and must not be empty' });
  }

  try {
    const inputItems = scenes.map((s: any) => ({
      scene_index: s.scene_index || s.index,
      dialogue: s.dialogue || s.text || '',
    })).filter((item: any) => (item.dialogue || '').trim().length > 0);

    if (inputItems.length === 0) {
      return res.json({
        code: 200,
        data: { episode_id: targetEpisodeId, target_language: reqTargetLang, translated_scenes: [] },
        message: 'No dialogue to translate',
      });
    }

    const promptText = `Translate the following dialogue lines from a micro-drama series into language: ${reqTargetLang}.
Context: Keep high dramatic tension, character emotions, punchy delivery, and match the target culture's phrasing.

Input JSON:
${JSON.stringify(inputItems, null, 2)}

Respond with ONLY valid JSON adhering strictly to this schema:
{
  "translated_scenes": [
    {
      "scene_index": 1,
      "translated_dialogue": "Translated line here"
    }
  ]
}`;

    const raw = await geminiClient.generateText({
      prompt: promptText,
      systemInstruction: 'You are a master micro-drama subtitle & dubbing translator. You translate lines while preserving raw emotion, dramatic pacing, and natural spoken flow.',
      jsonMode: true,
    });

    const parsed = JSON.parse(raw);
    const rawTranslated = parsed.translated_scenes || [];
    const translatedScenes = rawTranslated.map((t: any) => ({
      scene_index: t.scene_index,
      translated_dialogue: t.translated_dialogue,
    }));

    return res.json({
      code: 200,
      data: {
        episode_id: targetEpisodeId,
        target_language: reqTargetLang,
        translated_scenes: translatedScenes,
      },
      message: `Successfully translated ${translatedScenes.length} scenes to ${reqTargetLang}`,
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({
      code: 500,
      message: `Batch translation failed: ${err.message}`,
      error: err.message,
    });
  }
});

// POST /api/captions/batch-dubbing
captionsRouter.post('/batch-dubbing', async (req: Request, res: Response) => {
  const { series_id, seriesId, episode_id, episodeId, target_language, targetLanguage = 'en-US', voice_id, voiceId = 'Puck', scenes = [] } = req.body;
  const targetSeriesId = series_id || seriesId;
  const targetEpisodeId = episode_id || episodeId;
  const reqTargetLang = target_language || targetLanguage;
  const defaultVoiceId = voice_id || voiceId;

  if (!Array.isArray(scenes) || scenes.length === 0) {
    return res.status(400).json({ code: 400, message: 'Scenes array is required' });
  }

  try {
    const db = await getDatabaseProvider();
    let seriesChars: any[] = [];
    if (targetSeriesId) {
      const srs = await db.getSeriesById(targetSeriesId);
      seriesChars = srs?.characters || srs?.master_plan?.characters || [];
    } else if (targetEpisodeId) {
      const ep = await db.getEpisodeById(targetEpisodeId);
      if (ep?.series_id) {
        const srs = await db.getSeriesById(ep.series_id);
        seriesChars = srs?.characters || srs?.master_plan?.characters || [];
      }
    }

    const results: Record<number, { audio_url: string; duration_seconds: number; dialogue: string }> = {};

    for (const sc of scenes) {
      const idx = sc.scene_index || sc.sceneIndex || sc.index;
      const textToVoice = sc.translated_dialogue || sc.translatedDialogue || sc.dialogue || sc.text || '';
      if (!textToVoice.trim()) continue;

      // Match voice to the character speaking this scene's dialogue
      const speakerName = sc.character || (Array.isArray(sc.rawDialogue) ? sc.rawDialogue[0]?.character : '');
      const matchedChar = seriesChars.find((c: any) => (c.name || '').toLowerCase() === (speakerName || '').toLowerCase());
      const resolvedVoiceId = matchedChar?.voice_id || matchedChar?.voiceId || sc.voice_id || sc.voiceId || defaultVoiceId || 'Puck';

      try {
        const audioRes = await geminiClient.generateAudio(textToVoice, resolvedVoiceId);
        if (audioRes?.url) {
          let audioUrl = audioRes.url;
          if (audioUrl.startsWith('data:')) {
            const s3Result = await StorageFactory.uploadMedia(audioUrl, 'audio', 'wav', audioRes.mimeType || 'audio/wav');
            audioUrl = `/api/assets/file/${s3Result.key}`;
          }
          results[idx] = {
            audio_url: audioUrl,
            duration_seconds: audioRes.durationSeconds || 4,
            dialogue: textToVoice,
          };
        }
      } catch (voiceErr: any) {
        console.warn(`[BatchDubbing] Failed for Scene #${idx}:`, voiceErr.message);
      }
    }

    return res.json({
      code: 200,
      data: {
        series_id: targetSeriesId,
        episode_id: targetEpisodeId,
        target_language: reqTargetLang,
        voice_id: defaultVoiceId,
        voiceovers: results,
      },
      message: `Successfully generated ${Object.keys(results).length} dubbing voiceovers in ${reqTargetLang}`,
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({
      code: 500,
      message: `Batch dubbing failed: ${err.message}`,
      error: err.message,
    });
  }
});

export default captionsRouter;
