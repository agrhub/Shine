import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { geminiClient } from '@/integrations/ai/gemini/GeminiClient.js';
import { ttsService } from '@/services/TtsService.js';
import { DspAudioService } from '@/services/DspAudioService.js';
import { StorageFactory } from '@/services/storage/StorageFactory.js';
import { getDatabaseProvider } from '@/database/index.js';
import { EnvConfig } from '@/config/env.js';
import { Logger } from '@/utils/logger.js';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as string);
}

export interface DeepgramWord {
  word: string;
  start: number;      // Seconds (float, 0-based in the media)
  end: number;        // Seconds (float, 0-based in the media)
  confidence?: number;
  punctuated_word?: string;
}

export interface CaptionWord {
  text: string;
  from: number;       // Milliseconds relative to start of this cue (0 to cueDurationMs)
  to: number;         // Milliseconds relative to start of this cue
  isKeyWord?: boolean;
}

export interface CaptionCue {
  id: string;
  text: string;
  startMs: number;    // Milliseconds from start of video/scene (0-based in the video)
  endMs: number;      // Milliseconds from start of video/scene
  fromUs: number;     // Microseconds in the video
  toUs: number;       // Microseconds in the video
  durationUs?: number;
  words: CaptionWord[];
}

export interface SceneAudioPipelineResult {
  videoUrl: string;
  bgmUrl: string;
  voiceoverUrl: string;
  voiceId: string;
  voiceStartUs: number;
  voiceDurationUs: number;
  speechOnsetDetected: boolean;
  words: DeepgramWord[];
  captionsData: CaptionCue[];
}

export class CaptionService {
  /**
   * Fast FFmpeg extraction of compressed 64kbps mono MP3 audio from a video buffer.
   * Reduces payload from 15-25MB down to ~80-150KB for instant Gemini processing.
   */
  public static async extractAudioBufferFromVideo(
    videoBuffer: Buffer
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    return new Promise((resolve) => {
      const tempId = `shine_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const tempIn = path.join(os.tmpdir(), `${tempId}.mp4`);
      const tempOut = path.join(os.tmpdir(), `${tempId}.mp3`);

      try {
        fs.writeFileSync(tempIn, videoBuffer);
        ffmpeg(tempIn)
          .noVideo()
          .audioCodec('libmp3lame')
          .audioBitrate(64)
          .audioChannels(1)
          .audioFrequency(24000)
          .output(tempOut)
          .on('end', () => {
            try {
              const audioBuf = fs.readFileSync(tempOut);
              try { if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn); } catch {}
              try { if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut); } catch {}
              Logger.info(`[CaptionService] Extracted audio buffer from video: ${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB video -> ${(audioBuf.length / 1024).toFixed(1)}KB audio (99% lighter)`);
              resolve({ buffer: audioBuf, mimeType: 'audio/mp3' });
            } catch {
              resolve({ buffer: videoBuffer, mimeType: 'video/mp4' });
            }
          })
          .on('error', (err) => {
            Logger.warn(`[CaptionService] FFmpeg audio extraction fallback: ${err.message}`);
            try { if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn); } catch {}
            try { if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut); } catch {}
            resolve({ buffer: videoBuffer, mimeType: 'video/mp4' });
          })
          .run();
      } catch (err: any) {
        Logger.warn(`[CaptionService] extractAudioBufferFromVideo error: ${err.message}`);
        resolve({ buffer: videoBuffer, mimeType: 'video/mp4' });
      }
    });
  }

  /**
   * Helper to fetch media file buffer and automatically isolate lightweight audio for fast AI processing.
   */
  private static async fetchMediaBuffer(
    url: string,
    extractAudioOnly: boolean = true
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    let buffer: Buffer = Buffer.alloc(0);
    let mimeType = 'video/mp4';

    if (url.endsWith('.wav')) mimeType = 'audio/wav';
    else if (url.endsWith('.mp3')) mimeType = 'audio/mpeg';
    else if (url.endsWith('.mp4')) mimeType = 'video/mp4';
    else if (url.endsWith('.webm')) mimeType = 'video/webm';

    if (url.startsWith('/api/assets/file/') || url.startsWith('assets/')) {
      try {
        const stream = await StorageFactory.getFileStream(url);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        buffer = Buffer.concat(chunks);
      } catch (err: any) {
        Logger.warn(`[CaptionService] fetchMediaBuffer from storage stream failed: ${err.message}`);
      }
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        buffer = Buffer.from(res.data);
        const headerType = res.headers['content-type'];
        if (headerType) mimeType = String(headerType);
      } catch (err: any) {
        Logger.warn(`[CaptionService] fetchMediaBuffer http request failed: ${err.message}`);
      }
    } else if (url.startsWith('data:')) {
      const parts = url.split(',');
      mimeType = parts[0].split(':')[1]?.split(';')[0] || mimeType;
      buffer = Buffer.from(parts[1], 'base64');
    }

    if (extractAudioOnly && buffer.length > 0 && (mimeType.startsWith('video/') || url.includes('.mp4') || url.includes('.webm'))) {
      return await this.extractAudioBufferFromVideo(buffer);
    }

    return { buffer, mimeType };
  }

  /**
   * Directly passes the audio/video buffer to Gemini Multimodal to extract exact Deepgram Nova-3 formatted word timestamps and speech onset.
   */
  public static async extractWordLevelCaptionsFromVideo(params: {
    videoUrl: string;
    dialogue?: any[];
    language?: string;
    durationSeconds?: number;
  }): Promise<{ words: DeepgramWord[]; cues: CaptionCue[]; speechStartUs: number; speechEndUs: number; hasSpeechActivity: boolean }> {
    const { videoUrl, dialogue = [], language = 'vi-VN', durationSeconds = 6 } = params;

    const fullText = Array.isArray(dialogue)
      ? dialogue.map((d: any) => `${d.character ? `${d.character}: ` : ''}${d.line || d.text || ''}`).join(' ')
      : '';

    const { buffer, mimeType } = await this.fetchMediaBuffer(videoUrl);

    if (!buffer || buffer.length === 0) {
      throw new Error(`[CaptionService] Cannot fetch audio/video buffer from: ${videoUrl}`);
    }

    const promptText = `Listen carefully to the audio stream and transcribe the speech with exact word-level timestamps.
Task: Output speech transcription in Deepgram Nova-3 format.
Language: ${language}
Expected Dialogue Reference (if present): "${fullText || 'Transcribe all spoken words in audio'}"

Rules for Output:
1. Accurately detect each spoken word.
2. "start": start time of the word in SECONDS (float from 0.0s of the file, e.g. 0.40).
3. "end": end time of the word in SECONDS (float from 0.0s of the file, e.g. 1.04).
4. "word": the lowercase clean word.
5. "punctuated_word": word with proper capitalization and punctuation (e.g. "You've", "energy.").
6. "confidence": float between 0.85 and 1.0.

Respond with ONLY a JSON object matching this schema:
{
  "speechStart": 0.40,
  "speechEnd": 2.42,
  "words": [
    { "word": "you've", "punctuated_word": "You've", "start": 0.40, "end": 1.04, "confidence": 0.98 },
    { "word": "got", "punctuated_word": "got", "start": 1.04, "end": 1.28, "confidence": 1.0 },
    { "word": "the", "punctuated_word": "the", "start": 1.28, "end": 1.44, "confidence": 0.99 },
    { "word": "energy", "punctuated_word": "energy.", "start": 1.44, "end": 2.16, "confidence": 0.95 }
  ]
}`;

    const parts: any[] = [
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType,
        },
      },
      {
        text: promptText,
      },
    ];

    Logger.info(`[CaptionService] Analyzing audio (${(buffer.length / 1024).toFixed(1)} KB, ${mimeType}) with Gemini Multimodal for Deepgram Nova-3 word timestamps...`);

    let response: any;
    try {
      response = await geminiClient.generateContent(parts, EnvConfig.geminiModelText, {
        systemPrompt: 'You are a high-precision audio speech-to-text transcription engine. Output valid JSON matching Deepgram Nova-3 word format with start and end in seconds.',
        generationConfig: { responseMimeType: 'application/json' },
      });
    } catch (apiErr: any) {
      throw new Error(`Gemini Multimodal Transcription failed: ${apiErr.message}`);
    }

    const raw = response.text || '';
    let parsed: any = null;
    try {
      const cleanJson = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {}
      }
    }

    if (!parsed) {
      throw new Error(`Gemini Multimodal returned invalid JSON: ${raw.slice(0, 300)}`);
    }

    const rawWords: any[] = Array.isArray(parsed) ? parsed : (parsed?.words || parsed?.results?.words || []);

    if (rawWords.length === 0) {
      throw new Error(`Gemini Multimodal could not detect any spoken words in the audio stream.`);
    }

    const words: DeepgramWord[] = rawWords.map((w: any) => {
      const startSec = Number(w.start !== undefined ? w.start : (w.from !== undefined ? (w.from > 1000 ? w.from / 1000000 : w.from / 1000) : 0));
      const endSec = Number(w.end !== undefined ? w.end : (w.to !== undefined ? (w.to > 1000 ? w.to / 1000000 : w.to / 1000) : startSec + 0.3));
      const wordStr = String(w.word || w.text || '').trim();
      const punctuated = String(w.punctuated_word || w.punctuatedWord || wordStr);

      return {
        word: wordStr.toLowerCase(),
        punctuated_word: punctuated,
        start: Math.round(startSec * 1000) / 1000,
        end: Math.round(endSec * 1000) / 1000,
        confidence: Number(w.confidence || 0.98),
      };
    });

    // Group words into natural subtitle chunks (3-5 words per cue)
    const cues = this.groupDeepgramWordsIntoCues(words);
    const speechStartUs = Math.round(words[0].start * 1_000_000);
    const speechEndUs = Math.round(words[words.length - 1].end * 1_000_000);

    Logger.info(`[CaptionService] Gemini Deepgram transcription successful: ${words.length} words, ${cues.length} cues, speechStart: ${speechStartUs}us, speechEnd: ${speechEndUs}us`);

    return {
      words,
      cues,
      speechStartUs,
      speechEndUs,
      hasSpeechActivity: true,
    };
  }

  /**
   * Unified Pipeline: Automatically extracts clean BGM, synthesizes studio TTS voiceover, and performs video-based multimodal word-level transcription with Gemini.
   */
  public static async processSceneAudioAndCaptions(params: {
    videoUrl: string;
    episodeId?: string;
    sceneIndex: number;
    dialogue?: any[];
    language?: string;
    voiceId?: string;
    durationSeconds?: number;
  }): Promise<SceneAudioPipelineResult> {
    const {
      videoUrl,
      episodeId,
      sceneIndex,
      dialogue: reqDialogue,
      language: reqLanguage,
      voiceId: reqVoiceId,
      durationSeconds = 6,
    } = params;

    const db = await getDatabaseProvider();
    let seriesLanguage = reqLanguage || 'vi-VN';
    let targetVoiceId = reqVoiceId || 'Aoede';
    let dialogue = reqDialogue || [];

    // 1. Context lookup from Database if episodeId provided
    if (episodeId) {
      try {
        const ep = await db.getEpisodeById(episodeId);
        if (ep) {
          const rawScenes: any = ep.scenes || (typeof ep.script === 'object' ? (ep.script as any)?.scenes : []);
          const scenes: any[] = Array.isArray(rawScenes) ? rawScenes : [];
          const scene = scenes.find((s: any) => s.index === sceneIndex) || scenes[sceneIndex - 1];

          if ((!dialogue || dialogue.length === 0) && scene?.dialogue && scene.dialogue.length > 0) {
            dialogue = scene.dialogue;
          }

          if (ep.series_id) {
            const series = await db.getSeriesById(ep.series_id);
            if (series) {
              seriesLanguage = series.language || series.country || seriesLanguage;
              const firstChar = dialogue[0]?.character;
              const matchedChar = series.characters?.find(
                (c: any) => c.name?.toLowerCase().trim() === String(firstChar || '').toLowerCase().trim()
              );
              if (matchedChar?.voiceId) {
                targetVoiceId = matchedChar.voiceId;
              }
            }
          }
        }
      } catch (err: any) {
        Logger.warn(`[CaptionService.processSceneAudioAndCaptions] DB Context lookup notice: ${err.message}`);
      }
    }

    // 2. Synthesize Studio Neural TTS Voiceover for dialogue (if present)
    let voiceoverUrl = '';
    let totalVoiceDurationUs = Math.round(durationSeconds * 1_000_000);

    if (dialogue && dialogue.length > 0) {
      const dialogueText = dialogue
        .map((d: any) => `${d.character ? `${d.character}: ` : ''}${d.line || d.text || ''}`)
        .join('\n');

      try {
        const ttsRes = await ttsService.generateVoice({
          text: dialogueText,
          voiceId: targetVoiceId,
          language: seriesLanguage,
          speed: 1.0,
        });

        if (ttsRes?.audioUrl && !ttsRes.audioUrl.includes('default')) {
          voiceoverUrl = ttsRes.audioUrl;
          if (ttsRes.durationSeconds && ttsRes.durationSeconds > 0) {
            totalVoiceDurationUs = Math.round(ttsRes.durationSeconds * 1_000_000);
          }
        } else {
          // Fallback to Gemini Audio
          const generated = await geminiClient.generateAudio(dialogueText, targetVoiceId, undefined, {
            speed: 1.0,
          });
          const s3Res = await StorageFactory.uploadMedia(generated.url, 'audio', 'wav', generated.mimeType || 'audio/wav');
          voiceoverUrl = `/api/assets/file/${s3Res.key}`;
          if (generated.durationSeconds && generated.durationSeconds > 0) {
            totalVoiceDurationUs = Math.round(generated.durationSeconds * 1_000_000);
          }
        }
      } catch (e: any) {
        Logger.warn(`[CaptionService] TTS Voiceover generation notice: ${e.message}`);
      }
    }

    // 3. Extract clean BGM via DSP
    let bgmUrl = '';
    if (videoUrl) {
      try {
        const dspResult = await DspAudioService.separateVocalAndBgm(videoUrl);
        bgmUrl = dspResult?.bgmUrl || '';
      } catch (e: any) {
        Logger.warn(`[CaptionService] DSP BGM separation notice: ${e.message}`);
      }
    }

    // 4. Extract exact Word-by-Word Captions and Speech Timestamps directly with Gemini Multimodal
    let captionsData: CaptionCue[] = [];
    let speechStartUs = 0;
    let speechEndUs = totalVoiceDurationUs;
    let hasSpeechActivity = false;

    let extractedWords: DeepgramWord[] = [];
    const mediaForTranscription = voiceoverUrl || videoUrl;
    if (mediaForTranscription) {
      const extractionResult = await this.extractWordLevelCaptionsFromVideo({
        videoUrl: mediaForTranscription,
        dialogue,
        language: seriesLanguage,
        durationSeconds: Math.round(totalVoiceDurationUs / 1_000_000),
      });

      extractedWords = extractionResult.words;
      captionsData = extractionResult.cues;
      speechStartUs = extractionResult.speechStartUs;
      speechEndUs = extractionResult.speechEndUs;
      hasSpeechActivity = extractionResult.hasSpeechActivity;
    }

    // 5. Auto-update Episode Scene Assets in Database
    if (episodeId) {
      try {
        const ep = await db.getEpisodeById(episodeId);
        if (ep && Array.isArray(ep.scenes)) {
          const sIdx = ep.scenes.findIndex((s: any) => s.index === sceneIndex || s.id === `scene_${sceneIndex}`);
          if (sIdx !== -1) {
            if (bgmUrl) ep.scenes[sIdx].bgmUrl = bgmUrl;
            if (voiceoverUrl) ep.scenes[sIdx].voiceoverUrl = voiceoverUrl;
            if (captionsData.length > 0) ep.scenes[sIdx].captionsData = captionsData;
            ep.scenes[sIdx].voiceDurationUs = totalVoiceDurationUs;
            ep.scenes[sIdx].voiceStartUs = speechStartUs;
            await db.updateEpisode(ep.id, { scenes: ep.scenes });
          }
        }
      } catch (err: any) {
        Logger.warn(`[CaptionService] Auto-update episode scene assets failed: ${err.message}`);
      }
    }

    return {
      videoUrl,
      bgmUrl,
      voiceoverUrl,
      voiceId: targetVoiceId,
      voiceStartUs: speechStartUs,
      voiceDurationUs: totalVoiceDurationUs,
      speechOnsetDetected: hasSpeechActivity,
      words: extractedWords,
      captionsData,
    };
  }

  // ─── Internal Fallback & Grouping Helpers ─────────────────────────────────

  private static groupDeepgramWordsIntoCues(words: DeepgramWord[]): CaptionCue[] {
    if (!words || words.length === 0) return [];

    const cues: CaptionCue[] = [];
    let currentChunk: DeepgramWord[] = [];
    const MAX_WORDS_PER_CUE = 5;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      currentChunk.push(w);

      const isPunctuationEnd = /[.!?]$/.test(w.punctuated_word || w.word);
      const isChunkFull = currentChunk.length >= MAX_WORDS_PER_CUE;
      const isNextWordFar = (i < words.length - 1) && (words[i + 1].start - w.end > 0.6);

      if (isPunctuationEnd || isChunkFull || isNextWordFar || i === words.length - 1) {
        const firstW = currentChunk[0];
        const lastW = currentChunk[currentChunk.length - 1];

        const startMs = Math.round(firstW.start * 1000);
        const endMs = Math.round(lastW.end * 1000);
        const fromUs = Math.round(firstW.start * 1_000_000);
        const toUs = Math.round(lastW.end * 1_000_000);
        const durationUs = toUs - fromUs;

        const phraseText = currentChunk.map(cw => cw.punctuated_word || cw.word).join(' ');

        const cueWords: CaptionWord[] = currentChunk.map((cw, idx) => ({
          text: cw.punctuated_word || cw.word,
          from: Math.round((cw.start - firstW.start) * 1000),
          to: Math.round((cw.end - firstW.start) * 1000),
          isKeyWord: idx === 0 || idx === currentChunk.length - 1 || cw.word.length > 4,
        }));

        cues.push({
          id: `cue_${cues.length + 1}`,
          text: phraseText,
          startMs,
          endMs,
          fromUs,
          toUs,
          durationUs,
          words: cueWords,
        });

        currentChunk = [];
      }
    }

    return cues;
  }
}
