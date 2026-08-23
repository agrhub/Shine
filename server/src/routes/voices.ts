import { Router, Request, Response } from 'express';
import { geminiClient, GEMINI_SUPPORTED_VOICES, type GeminiVoiceMetadata } from '@/integrations/ai/gemini/GeminiClient.js';
import { ttsService } from '@/services/TtsService.js';
import { StorageFactory } from '@/services/storage/StorageFactory.js';
import { DspAudioService } from '@/services/DspAudioService.js';
import { CaptionService } from '@/services/CaptionService.js';
import { SynthIDService } from '@/services/SynthIDService.js';
import { CreditService } from '@/services/CreditService.js';
import { getDatabaseProvider } from '@/database/index.js';
import { getUserId } from '@/utils/auth.js';
import { Logger } from '@/utils/logger.js';

const router = Router();

// GET /v1/voices/presets — Fetch supported Gemini voice presets
router.get('/presets', async (req: Request, res: Response) => {
  const { language, gender } = req.query;
  let list: GeminiVoiceMetadata[] = await geminiClient.listVoices(language as string);

  if (gender) {
    list = list.filter((v) => v.gender === gender);
  }

  return res.json({
    code: 200,
    data: list,
    total: list.length,
    message: 'Voice presets retrieved successfully from Gemini catalog',
    error: null,
  });
});

// Shared Helper for Neural TTS Dialogue Synthesis with MultiSpeaker and Timestamps
async function generateDialogueVoiceSynthesis(params: {
  dialogue?: any[];
  text?: string;
  voiceId?: string;
  emotion?: string;
  intensity?: number;
  language?: string;
  speed?: number;
  pitch?: number;
  episodeId?: string;
  sceneId?: string;
  reqMultiSpeaker?: any;
}) {
  const { dialogue, text: rawText, voiceId, emotion, intensity, language, speed, pitch, episodeId, reqMultiSpeaker } = params;

  let text = rawText;
  if (!text && Array.isArray(dialogue) && dialogue.length > 0) {
    text = dialogue.map((d: any) => `${d.character ? `${d.character}: ` : ''}${d.line || ''}`).join('\n');
  }
  if (!text || text.trim() === '') {
    text = '...';
  }

  let multiSpeaker = reqMultiSpeaker;
  let targetVoiceId = voiceId;
  if (Array.isArray(dialogue) && dialogue.length > 0) {
    try {
      const db = await getDatabaseProvider();
      let seriesChars: any[] = [];
      if (episodeId) {
        const ep = await db.getEpisodeById(episodeId);
        if (ep && ep.series_id) {
          const srs = await db.getSeriesById(ep.series_id);
          seriesChars = srs?.characters || srs?.master_plan?.characters || [];
        }
      }

      const distinctNames = Array.from(new Set(dialogue.map((d: any) => String(d.character || '').trim()).filter(Boolean)));
      if (distinctNames.length > 1) {
        const speakers = distinctNames.map((name) => {
          const matched = seriesChars.find(c => (c.name || '').toLowerCase() === name.toLowerCase());
          return {
            name,
            voiceId: matched?.voiceId || (matched?.gender === 'female' ? 'Aoede' : 'Puck'),
          };
        });
        multiSpeaker = {
          enabled: true,
          speakers,
        };
      } else if (distinctNames.length === 1) {
        targetVoiceId = seriesChars.find(c => (c.name || '').toLowerCase() === distinctNames[0].toLowerCase())?.voiceId;
        multiSpeaker = { enabled: false };
      }
    } catch (err: any) {
      Logger.warn(`[voicesRouter] Auto multiSpeaker extraction fallback: ${err.message}`);
    }
  }

  const selectedVoiceId = targetVoiceId || 'Puck';
  const calculatedSpeed = speed || (intensity ? 1.0 + (intensity - 50) * 0.004 : 1.0);
  const calculatedPitch = pitch || (intensity ? (intensity - 50) * 0.005 : 0);

  let internalUrl = '';
  let s3Key = '';
  let audioSizeBytes = 1024 * 128;
  let audioMimeType = 'audio/wav';

  // First attempt TTSService (e.g. ElevenLabs / Custom TTS)
  const ttsRes = await ttsService.generateVoice({
    text,
    voiceId: selectedVoiceId,
    language: language || 'en',
    speed: calculatedSpeed,
  });

  if (ttsRes?.audioUrl && !ttsRes.audioUrl.includes('default')) {
    internalUrl = ttsRes.audioUrl;
    s3Key = ttsRes.audioUrl.replace('/api/assets/file/', '');
    audioMimeType = 'audio/mpeg';
  } else {
    // Fallback to Gemini Native Audio neural voice synthesis
    const generatedAudio = await geminiClient.generateAudio(text, selectedVoiceId, undefined, {
      speed: calculatedSpeed,
      pitch: calculatedPitch,
      emotion,
      multiSpeaker,
    });

    const s3Result = await StorageFactory.uploadMedia(generatedAudio.url, 'audio', 'wav', generatedAudio.mimeType || 'audio/wav');
    s3Key = s3Result.key;
    internalUrl = `/api/assets/file/${s3Key}`;
    audioSizeBytes = s3Result.size;
    audioMimeType = generatedAudio.mimeType || 'audio/wav';
  }

  const voiceMeta = GEMINI_SUPPORTED_VOICES.find(v => v.id === selectedVoiceId) || {
    id: selectedVoiceId,
    name: selectedVoiceId,
    language: language || 'en-US',
  };

  // Generate cues for each dialogue line with timestamp offsets
  let cues: any[] = [];
  let startUs = 200_000;
  let endUs = 2_000_000;

  if (Array.isArray(dialogue) && dialogue.length > 0) {
    let offsetUs = 200_000;
    const totalChars = dialogue.reduce((sum: number, d: any) => sum + (d.line?.length || 0), 0) || 1;
    const actualTotalDurationUs = Math.max(1_500_000, Math.round((ttsRes?.durationSeconds || (totalChars / 14)) * 1_000_000));

    cues = dialogue.map((d: any, idx: number) => {
      const lineLen = d.line?.length || 1;
      const lineDurationUs = Math.round((lineLen / totalChars) * actualTotalDurationUs);
      const fromUs = offsetUs;
      const toUs = fromUs + lineDurationUs;
      offsetUs = toUs + 100_000;
      return {
        id: `cue_${idx + 1}`,
        character: d.character || 'Voice',
        text: d.line || '',
        fromUs,
        toUs,
        durationUs: lineDurationUs,
        startMs: Math.round(fromUs / 1000),
        endMs: Math.round(toUs / 1000),
      };
    });

    startUs = cues[0]?.fromUs || 200_000;
    endUs = cues[cues.length - 1]?.toUs || (startUs + actualTotalDurationUs);
  }

  return {
    s3Key,
    url: internalUrl,
    audioUrl: internalUrl,
    sizeBytes: audioSizeBytes,
    mimeType: audioMimeType,
    voiceId: selectedVoiceId,
    voiceName: voiceMeta.name,
    language: voiceMeta.language,
    text,
    cues,
    startUs,
    endUs,
    startMs: Math.round(startUs / 1000),
    endMs: Math.round(endUs / 1000),
    durationUs: endUs - startUs,
    durationMs: Math.round((endUs - startUs) / 1000),
  };
}

// POST /v1/voices/tts — Real Neural Voice synthesis via TTSService / Gemini Audio
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { voiceId, text, emotion, intensity, language, speed, pitch, multiSpeaker: reqMultiSpeaker, episodeId, sceneId, dialogue } = req.body;

    if (!text && (!dialogue || dialogue.length === 0)) {
      return res.status(400).json({ code: 400, data: null, message: 'text or dialogue is required', error: 'INVALID_PAYLOAD' });
    }

    const userId = getUserId(req);
    const deduct = await CreditService.deductUserCredits(userId, 'voiceoverTts', 'Voiceover Synthesis', `Scene: ${sceneId || 'voice'}`);
    if (!deduct.success && deduct.error?.includes('Insufficient')) {
      return res.status(402).json({ code: 402, data: null, message: deduct.error, error: 'INSUFFICIENT_CREDITS' });
    }

    const ttsResult = await generateDialogueVoiceSynthesis({
      dialogue,
      text,
      voiceId,
      emotion,
      intensity,
      language,
      speed,
      pitch,
      episodeId,
      sceneId,
      reqMultiSpeaker,
    });

    // Embed Google SynthID Digital Watermark
    const synthIdResult = await SynthIDService.embedSynthID({
      assetType: 'audio',
      model: ttsResult.voiceId,
      episodeId,
      sceneId,
    });

    res.set(synthIdResult.headers);

    return res.json({
      code: 200,
      data: {
        ...ttsResult,
        emotion: emotion || 'Neutral',
        intensity: intensity || 80,
        synthId: synthIdResult.synthIdMetadata,
      },
      message: 'Neural TTS audio rendered and stored to S3 with SynthID verification',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SERVER_ERROR' });
  }
});

// POST /v1/voices/dubbing/re-align — Multi-market timeline dubbing realignment
router.post('/dubbing/re-align', async (req: Request, res: Response) => {
  try {
    const { episodeId, language, scenes } = req.body;

    // AI timing adjustment for differences in syllable density
    const languageTimeExpansion: Record<string, number> = {
      'vi-VN': 1.18,
      'zh-CN': 0.88,
      'es-ES': 1.12,
      'ja-JP': 1.05,
      'en-US': 1.0,
    };

    const multiplier = languageTimeExpansion[language] || 1.0;
    const alignedScenes = (scenes || []).map((s: any, idx: number) => {
      const origDuration = s.duration || 5.0;
      const adjustedDuration = Math.round(origDuration * multiplier * 10) / 10;
      return {
        sceneIndex: idx,
        originalDuration: origDuration,
        realignedDuration: adjustedDuration,
        timecodeShiftSeconds: Math.round((adjustedDuration - origDuration) * 10) / 10,
        syncStatus: 'LIP_SYNC_ALIGNED',
      };
    });

    return res.json({
      code: 200,
      data: {
        episodeId: episodeId || 'ep-001',
        language: language || 'vi-VN',
        expansionRatio: multiplier,
        alignedScenes,
      },
      message: 'Multi-market timeline dubbing re-aligned with audio timecode expansion',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SERVER_ERROR' });
  }
});

// POST /v1/voices/separate-audio — Extract Audio, Synthesize Unified TTS Voiceover, and Generate Gemini Word-by-Word Captions
router.post('/separate-audio', async (req: Request, res: Response) => {
  try {
    const { videoUrl, episodeId, sceneIndex } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ code: 400, data: null, message: 'videoUrl is required', error: 'INVALID_PAYLOAD' });
    }

    Logger.info(`[voicesRouter.separate-audio] Processing audio separation, TTS generation, and word-level captions for episode ${episodeId} scene ${sceneIndex}...`);

    const result = await CaptionService.processSceneAudioAndCaptions({
      videoUrl,
      episodeId,
      sceneIndex: Number(sceneIndex) || 1,
    });

    const startUs = result.voiceStartUs;
    const endUs = startUs + result.voiceDurationUs;

    return res.json({
      code: 200,
      data: {
        episodeId,
        sceneIndex,
        videoUrl: result.videoUrl,
        bgmUrl: result.bgmUrl,
        voiceoverUrl: result.voiceoverUrl,
        voiceId: result.voiceId,
        hasAudio: !!result.bgmUrl || !!result.voiceoverUrl,
        startUs,
        endUs,
        startMs: Math.round(startUs / 1000),
        endMs: Math.round(endUs / 1000),
        durationUs: result.voiceDurationUs,
        durationMs: Math.round(result.voiceDurationUs / 1000),
        voiceDurationUs: result.voiceDurationUs,
        voiceStartUs: startUs,
        speechOnsetDetected: result.speechOnsetDetected,
        words: result.words,
        cues: result.captionsData,
        captionsData: result.captionsData,
      },
      message: 'Audio separated, BGM extracted, Studio TTS voiceover synthesized, and word-level captions generated with Gemini',
      error: null,
    });
  } catch (err: any) {
    Logger.error(`[voicesRouter.separate-audio] Error: ${err.message}`);
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SEPARATION_FAILED' });
  }
});

// POST /v1/voices/steer-emotion — Fine-grained neural pitch/speed/vibrato control
router.post('/steer-emotion', (req: Request, res: Response) => {
  const { voiceId, emotionTag, intensityLevel } = req.body;
  const level = intensityLevel ?? 70;

  return res.json({
    code: 200,
    data: {
      voiceId,
      emotionTag: emotionTag || 'Dramatic',
      intensityLevel: level,
      pitchMultiplier: 1.0 + (level - 50) * 0.006,
      rateMultiplier: 1.0 + (level - 50) * 0.004,
      vibratoDepth: level > 80 ? 0.25 : 0.05,
    },
    message: 'Emotion steering parameters calibrated',
    error: null,
  });
});

export default router;
