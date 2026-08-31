import { geminiClient } from '@/integrations/ai/gemini/GeminiClient.js';
import { Logger } from '@/utils/logger.js';
import type { SceneDialogue, SceneCaption, CaptionWord, SceneCaptionWordLevel } from '@/types.js';

/**
 * Sanitizes dialogue line by stripping character name prefix (e.g. "Trần Minh Quân: ..."), quotes, and stage directions.
 */
export function cleanDialogueLine(rawLine: string, characterName?: string): string {
  if (!rawLine || typeof rawLine !== 'string') return '';
  let line = rawLine.trim();

  // 1. Remove specific character name prefix
  if (characterName && line.toLowerCase().startsWith(characterName.toLowerCase() + ':')) {
    line = line.slice(characterName.length + 1).trim();
  }

  // 2. Remove generic "[Speaker Name]: " pattern at start of line
  line = line.replace(/^[A-ZÀ-Ỹa-zà-ỹ0-9\s._-]{1,35}:\s*/u, '');

  // 3. Remove parenthesized stage directions at beginning e.g. "(crying) Hello"
  line = line.replace(/^\([^)]*\)\s*/, '').replace(/^\[[^\]]*\]\s*/, '');

  // 4. Remove surrounding quotes
  line = line.replace(/^["'“](.*)["'”]$/, '$1').trim();

  return line;
}

/**
 * Translate a list of SceneDialogue objects into target language using Gemini
 */
export async function translateDialogueList(
  dialogueList: SceneDialogue[],
  targetLanguage: string
): Promise<SceneDialogue[]> {
  if (!Array.isArray(dialogueList) || dialogueList.length === 0) return [];
  try {
    const cleanedInput = dialogueList.map(d => ({
      character: d.character || 'Character',
      emotion: d.emotion || 'Dramatic',
      line: cleanDialogueLine(d.line || (d as any).text || '', d.character),
      speech_tone: d.speech_tone || (d as any).speechTone || 'Standard',
    }));

    const prompt = `You are a professional cinematic localization translator for micro-dramas.
Translate the following dialogue lines into language code/name: "${targetLanguage}".
Ensure punchy, natural acting delivery while preserving character emotions, tone, and sentence rhythm.
DO NOT prepend character names into the "line" field.

Input Dialogue:
${JSON.stringify(cleanedInput, null, 2)}

Respond with a JSON array where each object has:
- character: string
- emotion: string
- line: string (translated line in ${targetLanguage}, containing ONLY spoken dialogue)
- speech_tone: string`;

    const raw = await geminiClient.generateText({
      prompt,
      systemInstruction: 'You are an expert film dialogue localization translator. Return ONLY a valid JSON array of SceneDialogue objects without character name prefixes in the line property.',
      jsonMode: true,
    });

    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : (parsed.dialogue || parsed.translations || []);
    if (Array.isArray(list) && list.length > 0) {
      return list.map((d: any, idx: number) => {
        const charName = String(d.character || dialogueList[idx]?.character || 'Character').trim();
        const rawTranslated = String(d.line || d.text || dialogueList[idx]?.line || '').trim();
        return {
          character: charName,
          emotion: String(d.emotion || dialogueList[idx]?.emotion || 'Dramatic').trim(),
          line: cleanDialogueLine(rawTranslated, charName),
          speech_tone: String(d.speech_tone || d.speechTone || dialogueList[idx]?.speech_tone || 'Standard').trim(),
        };
      });
    }
  } catch (err: any) {
    Logger.warn(`[translateDialogueList] Gemini translation to ${targetLanguage} failed: ${err.message}. Using original lines.`);
  }
  return dialogueList.map(d => ({
    ...d,
    line: cleanDialogueLine(d.line || (d as any).text || '', d.character),
  }));
}

/**
 * Builds word-by-word timestamps and multi-word kinetic caption cues from dialogue
 */
export function buildWordLevelCaptionsFromDialogue(
  dialogueList: SceneDialogue[],
  durSec: number,
  startSecOverride = 0.5
): {
  voice_start_us: number;
  voice_duration_us: number;
  captions_data: SceneCaption[];
  words: SceneCaptionWordLevel[];
} {
  if (!Array.isArray(dialogueList) || dialogueList.length === 0) {
    return {
      voice_start_us: 0,
      voice_duration_us: 0,
      captions_data: [],
      words: [],
    };
  }

  const fullLine = dialogueList.map(d => cleanDialogueLine(d.line || (d as any).text || '', d.character)).filter(Boolean).join(' ').trim();
  if (!fullLine) {
    return {
      voice_start_us: 0,
      voice_duration_us: 0,
      captions_data: [],
      words: [],
    };
  }

  const lineWords = fullLine.split(/\s+/).filter(Boolean);
  const startSec = Math.max(0.1, Number(startSecOverride) || 0.5);
  const estimatedDurSec = Math.max(1.0, Math.min(Math.max(1.0, durSec - startSec - 0.2), lineWords.length * 0.32));
  const endSec = startSec + estimatedDurSec;
  const voiceDurSec = Math.max(0.8, endSec - startSec);

  const voice_start_us = Math.round(startSec * 1_000_000);
  const voice_duration_us = Math.round(voiceDurSec * 1_000_000);

  // 1. Build word-by-word absolute timestamps
  const totalChars = lineWords.reduce((sum, w) => sum + w.length, 0) || 1;
  let curSec = startSec;
  const words: SceneCaptionWordLevel[] = lineWords.map((wordStr) => {
    const cleanWord = wordStr.toLowerCase().replace(/[.,!?;:"'()]/g, '');
    const wWeight = Math.max(0.08, wordStr.length / totalChars);
    const wDur = Math.max(0.15, voiceDurSec * wWeight);
    const wStart = Math.round(curSec * 1000) / 1000;
    const wEnd = Math.round(Math.min(endSec, wStart + wDur) * 1000) / 1000;
    curSec = wEnd;
    return {
      word: cleanWord,
      punctuated_word: wordStr,
      start: wStart,
      end: wEnd,
      confidence: 0.99,
    };
  });

  // 2. Group into kinetic subtitle cues (natural clause breaks or 3-5 words per cue)
  const MAX_WORDS_PER_CUE = 5;
  const captions_data: SceneCaption[] = [];
  let currentChunk: SceneCaptionWordLevel[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    currentChunk.push(w);

    const isPunctuationEnd = /[.!?…]$/.test(w.punctuated_word || w.word);
    const isChunkFull = currentChunk.length >= MAX_WORDS_PER_CUE;
    const isNextWordFar = (i < words.length - 1) && (words[i + 1].start - w.end > 0.4);

    if (isPunctuationEnd || isChunkFull || isNextWordFar || i === words.length - 1) {
      const firstW = currentChunk[0];
      const lastW = currentChunk[currentChunk.length - 1];
      const cueText = currentChunk.map(cw => cw.punctuated_word).join(' ');
      const cueStartMs = Math.round(firstW.start * 1000);
      const cueEndMs = Math.round(lastW.end * 1000);
      const fromUs = Math.round(firstW.start * 1_000_000);
      const toUs = Math.round(lastW.end * 1_000_000);
      const durationMs = Math.max(100, cueEndMs - cueStartMs);
      const durationUs = Math.max(100_000, toUs - fromUs);

      const cueWords: CaptionWord[] = currentChunk.map((cw, cIdx) => ({
        text: cw.punctuated_word,
        from: Math.round((cw.start - firstW.start) * 1000), // ms relative to start of cue
        to: Math.round((cw.end - firstW.start) * 1000),     // ms relative to start of cue
        is_key_word: cIdx === 0 || cIdx === currentChunk.length - 1 || cw.word.length > 4,
      }));

      captions_data.push({
        id: `cue_${captions_data.length + 1}`,
        text: cueText,
        start_ms: cueStartMs,
        end_ms: cueEndMs,
        from_us: fromUs,
        to_us: toUs,
        duration_ms: durationMs,
        duration_us: durationUs,
        words: cueWords,
      });

      currentChunk = [];
    }
  }

  return {
    voice_start_us,
    voice_duration_us,
    captions_data,
    words,
  };
}
