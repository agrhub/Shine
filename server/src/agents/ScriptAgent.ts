import { geminiClient } from '../integrations/ai/gemini/GeminiClient.js';
import { loadSkill } from '../utils/SkillLoader.js';
import { Logger } from '../utils/logger.js';
import { getLanguageForCountry } from '../utils/LanguageMapping.js';

export interface ScriptAgentInput {
  seriesId?: string;
  episodeNumber: number;
  title?: string;
  genre?: string;
  tone?: string;
  synopsis?: string;
  sceneCore?: string;
  conflictEscalation?: string;
  cliffhangerHook?: string;
  characters?: Array<{
    name: string;
    role?: string;
    identity?: string;
    traits?: string;
    speechStyle?: string;
    loraAnchor?: string;
  }>;
  storyCore?: {
    coreAttraction?: string;
    psychologicalPleasure?: string;
    goldFingerRule?: string;
  };
  country?: string;
  ratio?: string;
  targetDurationSeconds?: number;
}

export interface ScriptScene {
  index: number;
  heading: string;
  location: string;
  timeOfDay: string;
  lightingMood?: string;
  cameraMovement?: string;
  action: string;
  characterCostumes?: Array<{
    character: string;
    wardrobe: string;
  }>;
  dialogue: Array<{
    character: string;
    line: string;
    emotion?: string;
    speechTone?: string;
  }>;
  durationSeconds: number; // Strictly <= 8s per AI video generation constraints
  bgmMood?: string;
  sfxCues?: string[];
  visualPrompt?: string;
  storyboardFrameUrl?: string;
}

export interface ScriptItem {
  episode: string;
  episodeNumber: number;
  title: string;
  synopsis: string;
  sceneCore?: string;
  conflictEscalation?: string;
  cliffhangerHook?: string;
  totalDurationSeconds: number;
  scenes: ScriptScene[];
}

export class ScriptAgent {
  async execute(input: ScriptAgentInput): Promise<ScriptItem | null> {
    const epNum = input.episodeNumber || 1;
    const epStr = `EP ${String(epNum).padStart(2, '0')}`;
    const epTitle = input.title || `${epStr}: The Turning Point`;
    const genre = input.genre || 'Suspense / Drama';
    const tone = input.tone || 'Cinematic Neon';
    const country = input.country || 'US';
    const ratio = input.ratio || '9:16';
    const langInfo = getLanguageForCountry(country);

    const sceneSkill = loadSkill('script_scene');

    const targetDuration = Number(input.targetDurationSeconds) || 90;
    const minScenes = Math.max(4, Math.floor(targetDuration / 8));
    const maxScenes = Math.max(6, Math.ceil(targetDuration / 5));

    Logger.info(`[ScriptAgent] Generating screenplay for "${epTitle}" (${epStr}, target ${targetDuration}s) in ${langInfo.name}...`);

    const prompt = `
You are the Lead Episode Screenplay Writing Agent for vertical micro-dramas.

Episode Target:
- Episode Identifier: ${epStr} (Episode ${epNum})
- Title: ${epTitle}
- Genre: ${genre}
- Visual Tone: ${tone}
- Market Country: ${country} (Target Language: ${langInfo.name} - ${langInfo.nativeName})
- Aspect Ratio: ${ratio}
- Planned Episode Duration: ${targetDuration} seconds (${Math.floor(targetDuration / 60)}m ${targetDuration % 60 ? `${targetDuration % 60}s` : ''})

CRITICAL RULES (NON-NEGOTIABLE):
1. LANGUAGE DIRECTIVE:
   ${langInfo.dialogueInstruction}
   - Dialogue MUST sound completely natural, high-impact, and colloquial for speakers in ${country}.
   - Do not output English dialogue for non-English target countries.

2. EPISODE DURATION & SHOT DURATION LIMIT:
   - Current generative video LLMs (Veo-2 / Kling / Runway / Sora) enforce a strict maximum shot duration of 8 seconds.
   - EVERY individual scene's "durationSeconds" MUST BE between 5 and 8 seconds (5 <= durationSeconds <= 8).
   - Generate between ${minScenes} and ${maxScenes} concise, rapid-fire scenes so the sum of all scenes' "durationSeconds" equals approximately ${targetDuration} seconds!

3. CHARACTER COSTUME & VISUAL CONTINUITY:
   - Every scene must explicitly describe each appearing character's costume and wardrobe tailored to the location and dramatic situation (e.g. casual homewear, luxury office suit, rain-soaked jacket, evening attire).
   - The "visualPrompt" MUST explicitly integrate the character's LoRA tag, costume/wardrobe description, environment, and cinematography style.

Master Plan Continuity Context:
- Story Core: ${input.storyCore?.coreAttraction || input.synopsis || 'High-stakes micro-drama conflict'}
- Golden Rule / Leverage: ${input.storyCore?.goldFingerRule || 'Hidden family empire and corporate authority'}
- Episode Synopsis: ${input.synopsis || 'The protagonist encounters a critical dilemma.'}
- Scene Core (Emotional Peak): ${input.sceneCore || 'A sudden escalation pushing stakes to breaking point'}
- Conflict Escalation: ${input.conflictEscalation || 'Direct confrontation between rivals'}
- Cliffhanger Hook: ${input.cliffhangerHook || 'Shocking reveal ending on high tension'}
- Cast Characters:
${(input.characters || []).map((c: any) => `- ${c.name} (${c.role || 'protagonist'}): ${c.identity || ''} | Appearance: ${c.appearance || 'Authentic local'} | Wardrobe Style: ${c.costumeStyle || 'Signature styling'} | Speech: ${c.speechStyle || 'Sharp'} | LoRA: ${c.loraAnchor || 'master_lora_anchor'}`).join('\n')}

Task:
Generate a complete, production-ready screenplay broken down into ${minScenes} to ${maxScenes} consecutive scenes totaling ${targetDuration} seconds for this episode:
1. Every scene must have:
   - "heading": e.g., "INT. LUXURY BOARDROOM - NIGHT"
   - "location": Specific setting details
   - "timeOfDay": Lighting ambiance (e.g., "Fluorescent Night", "Moody Dawn")
   - "cameraMovement": Vertical camera blocking (e.g., "Close-up slow dolly in", "POV quick pan", "Low-angle tracking")
   - "action": Concrete character blocking and physical expressions in vertical 9:16 framing (under 40 words, in ${langInfo.name}).
   - "characterCostumes": Array of objects [{ "character": "Character Name", "wardrobe": "Exact clothing details in this scene" }].
   - "dialogue": Sharp, impactful lines conforming to each character's speechStyle in ${langInfo.name}.
   - "bgmMood": Background music emotional direction.
   - "sfxCues": Array of sound effect triggers (e.g., ["Teacup crash", "Door slam", "Subtle heartbeat"]).
   - "visualPrompt": Highly descriptive image/video prompt in English including character LoRA tags, costume description, and lighting for Midjourney/Flux/Veo-2.
   - "durationSeconds": 5 to 8 seconds per scene (sum of all scenes = ${targetDuration} seconds).

Respond strictly in JSON matching the ScriptItem schema:
{
  "episode": "${epStr}",
  "episodeNumber": ${epNum},
  "title": "${epTitle}",
  "synopsis": "${input.synopsis || ''}",
  "sceneCore": "${input.sceneCore || ''}",
  "conflictEscalation": "${input.conflictEscalation || ''}",
  "cliffhangerHook": "${input.cliffhangerHook || ''}",
  "totalDurationSeconds": ${targetDuration},
  "scenes": [
    {
      "index": 1,
      "heading": "INT. LUXURY PENTHOUSE - NIGHT",
      "location": "High-rise penthouse office",
      "timeOfDay": "NIGHT",
      "lightingMood": "Cinematic Neon Rim Light",
      "cameraMovement": "Medium close-up slow dolly in",
      "action": "Description of action...",
      "characterCostumes": [
        {
          "character": "Lead Name",
          "wardrobe": "Dark navy tailored suit, untied collar, silver wristwatch"
        }
      ],
      "dialogue": [
        {
          "character": "Lead Name",
          "line": "Dialogue line...",
          "speechTone": "cold and commanding"
        }
      ],
      "bgmMood": "Tense cinematic pulse",
      "sfxCues": ["Clock ticking"],
      "visualPrompt": "Vertical 9:16 shot, master_lora_anchor handsome Asian male lead in dark navy tailored suit...",
      "durationSeconds": 6
    }
  ]
}
`;

    try {
      const rawText = await geminiClient.generateText({
        prompt,
        systemInstruction: `${sceneSkill || 'Produce structured screenplay output for vertical micro-drama episodes.'}\n\nCRITICAL LANGUAGE: ${langInfo.dialogueInstruction}\nCRITICAL DURATION RULE: Every scene durationSeconds must be <= 8 seconds.`,
        jsonMode: true,
      });

      const parsed = JSON.parse(rawText);
      if (parsed && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
        // Enforce strict duration <= 8s per scene rule
        const sanitizedScenes: ScriptScene[] = parsed.scenes.map((s: any, idx: number) => {
          const rawDuration = Number(s.durationSeconds) || 6;
          const clampedDuration = Math.min(Math.max(rawDuration, 4), 8); // Strictly 4 to 8s
          return {
            index: s.index || idx + 1,
            heading: s.heading || `INT. SCENE ${idx + 1} - NIGHT`,
            location: s.location || 'Interior Setting',
            timeOfDay: s.timeOfDay || 'NIGHT',
            lightingMood: s.lightingMood || 'Cinematic Neon',
            cameraMovement: s.cameraMovement || 'Vertical slow push-in',
            action: s.action || '',
            dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
            durationSeconds: clampedDuration,
            bgmMood: s.bgmMood || 'Atmospheric suspense',
            sfxCues: Array.isArray(s.sfxCues) ? s.sfxCues : [],
            visualPrompt: s.visualPrompt || `Vertical 9:16 cinematic shot, ${genre} mood, photorealistic 8k`,
          };
        });

        const totalDuration = sanitizedScenes.reduce((sum: number, s) => sum + s.durationSeconds, 0);

        return {
          episode: parsed.episode || epStr,
          episodeNumber: parsed.episodeNumber || epNum,
          title: parsed.title || epTitle,
          synopsis: parsed.synopsis || input.synopsis || '',
          sceneCore: parsed.sceneCore || input.sceneCore,
          conflictEscalation: parsed.conflictEscalation || input.conflictEscalation,
          cliffhangerHook: parsed.cliffhangerHook || input.cliffhangerHook,
          totalDurationSeconds: totalDuration,
          scenes: sanitizedScenes,
        };
      }
    } catch (e: any) {
      Logger.warn(`[ScriptAgent] AI Screenplay generation failed (${e.message})`);
      throw new Error(`[ScriptAgent] AI Screenplay generation failed: ${e.message}`);
    }
    return null;
  }
}

export const scriptAgent = new ScriptAgent();
