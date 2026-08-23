import { geminiClient } from '../integrations/ai/gemini/GeminiClient.js';
import { aiProviderRouter } from '../integrations/ai/router/AIProviderRouter.js';
import { renderSkill, loadSkill } from '../utils/SkillLoader.js';
import { PromptLoader } from '../utils/PromptLoader.js';
import { Logger } from '../utils/logger.js';
import { getLanguageForCountry } from '../utils/LanguageMapping.js';
import { getVisualStylePrompt } from '../constants/VisualStyles.js';
import { ShotFrame } from '../database/IDatabaseProvider.js';
import { nanoid } from 'nanoid';

export interface ScriptAgentInput {
  seriesId?: string;
  episodeNumber: number;
  title?: string;
  genre?: string;
  visualStyle?: string;
  visualStylePrompt?: string;
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

export interface ScriptShot {
  index: number;
  sceneNumber: number;
  shotNumber: number;
  title?: string;
  heading: string;
  location: string;
  timeOfDay: string;
  lightingMood?: string;
  frameDescription?: string;
  cameraMovement?: string;
  action: string;
  characterCostumes?: Array<{
    character: string;
    wardrobe: string;
    variantId: string;
  }>;
  props?: string[];
  dialogue: Array<{
    character: string;
    line: string;
    emotion?: string;
    speechTone?: string;
  }>;
  durationSeconds: number; // Strictly <= 8s per AI video generation constraints
  bgmMood?: string;
  sfxCues?: string[];
  referenceAssets?: {
    characters?: string[];
    locations?: string[];
    props?: string[];
  };
  visualPrompt?: string;
  endFramePrompt?: string;
  sceneContext?: string;
  propDetails?: string;
  transitionEffect?: string;
  storyboardFrameUrl?: string;
  storyboardEndFrameUrl?: string;
}

export interface ScriptSceneGroup {
  sceneNumber: number;
  heading: string;
  location: string;
  timeOfDay: string;
  lightingMood?: string;
  shots: ScriptShot[];
}

export type ScriptScene = ScriptShot; // Alias for backward compatibility with timeline clips

export interface CharacterAssetDef {
  id: string;
  name: string;
  role?: string;
  frameDescription?: string;
  physicalCharacteristics?: string;
  clothingAndAccessories?: string;
  wardrobeVariants?: Array<{
    variantId: string;
    name: string;
    clothingAndAccessories: string;
    associatedScenes?: number[];
  }>;
  backstory?: string;
  voiceId?: string;
  imageUrl?: string;
}

export interface LocationAssetDef {
  id: string;
  name: string;
  timeOfDay?: string;
  frameDescription?: string;
  physicalCharacteristics?: string;
  imageUrl?: string;
}

export interface PropAssetDef {
  id: string;
  name: string;
  owner?: string;
  frameDescription?: string;
  physicalCharacteristics?: string;
  imageUrl?: string;
}

export interface ScriptItem {
  episode: string;
  episodeNumber: number;
  title: string;
  synopsis: string;
  screenplay?: string;
  sceneCore?: string;
  conflictEscalation?: string;
  cliffhangerHook?: string;
  totalDurationSeconds: number;
  scenes: ScriptScene[]; // Flat list of shots for timeline clips
  sceneGroups?: ScriptSceneGroup[]; // Hierarchical scenes
  characters?: CharacterAssetDef[];
  locations?: LocationAssetDef[];
  props?: PropAssetDef[];
}

export class ScriptAgent {
  // ── 1. DURATION & SCENE/SHOT TIER SCALING ─────────────────────────────────

  public calculateDurationTiers(durationSec?: number) {
    const targetDuration = Math.min(Math.max(Number(durationSec) || 90, 30), 600);
    // An average shot is 6-7s. Ensure minShots is high enough to reach targetDuration
    const minShots = Math.max(8, Math.ceil(targetDuration / 7));
    const maxShots = Math.max(minShots + 6, Math.ceil(targetDuration / 5));
    const minShotsPerScene = targetDuration <= 120 ? 3 : targetDuration <= 300 ? 4 : 5;
    const maxShotsPerScene = targetDuration <= 120 ? 6 : targetDuration <= 300 ? 8 : 10;
    const minScenes = targetDuration <= 120 ? 2 : targetDuration <= 300 ? 4 : 6;
    const maxScenes = targetDuration <= 120 ? 4 : targetDuration <= 300 ? 8 : 12;
    const useBatchGeneration = targetDuration > 240;

    return {
      targetDuration,
      minShots,
      maxShots,
      minShotsPerScene,
      maxShotsPerScene,
      minScenes,
      maxScenes,
      useBatchGeneration,
    };
  }

  // ── 2. ASSET NORMALIZATION HELPERS ────────────────────────────────────────

  public normalizeCharacters(
    raw: Array<any | string>,
    existing: any[] = [],
    descriptions: Record<string, { physicalCharacteristics?: string; clothingAndAccessories?: string; backstory?: string; wardrobeVariants?: any[] }> = {}
  ): CharacterAssetDef[] {
    const existingMap = new Map(existing.map((c: any) => [c.name?.toLowerCase().trim(), c]));
    return (raw || []).map((item, i) => {
      const name = typeof item === 'string' ? item : item.name || `Character ${i + 1}`;
      const existingObj = existingMap.get(name.toLowerCase().trim());
      const desc = descriptions[name] || {};

      const rawVariants = (typeof item === 'object' && Array.isArray(item.wardrobeVariants) && item.wardrobeVariants.length > 0)
        ? item.wardrobeVariants
        : (desc.wardrobeVariants && desc.wardrobeVariants.length > 0)
        ? desc.wardrobeVariants
        : existingObj?.wardrobeVariants || [];

      const slug = (typeof item === 'object' && item.id) || existingObj?.id || `char_${i + 1}`;
      const defaultCloth = (typeof item === 'object' && (item.clothingAndAccessories || item.wardrobe)) || desc.clothingAndAccessories || existingObj?.clothingAndAccessories || '';

      const wardrobeVariants = (rawVariants.length > 0
        ? rawVariants.map((v: any, vi: number) => ({
            variantId: v.variantId || `${slug}_variant_${vi + 1}`,
            name: v.name || `Outfit ${vi + 1}`,
            clothingAndAccessories: v.clothingAndAccessories || defaultCloth || '',
            associatedScenes: Array.isArray(v.associatedScenes) ? v.associatedScenes : [],
            imageUrl: v.imageUrl || undefined,
          }))
        : (defaultCloth
          ? [{
              variantId: `${slug}_default`,
              name: 'Default',
              clothingAndAccessories: defaultCloth,
              associatedScenes: [1],
            }]
          : []));

      return {
        id: slug,
        name,
        role: (typeof item === 'object' && item.role) || existingObj?.role || (i === 0 ? 'protagonist' : 'supporting'),
        frameDescription: (typeof item === 'object' && item.frameDescription) || existingObj?.frameDescription || 'A character sheet with a head and shoulders shot showing the characters face on the left and a full body shot of the character on the right wearing the same clothing and accessories against a seamless white background.',
        physicalCharacteristics: (typeof item === 'object' && (item.physicalCharacteristics || item.appearance)) || desc.physicalCharacteristics || existingObj?.physicalCharacteristics || '',
        clothingAndAccessories: defaultCloth,
        wardrobeVariants,
        backstory: (typeof item === 'object' && item.backstory) || desc.backstory || existingObj?.backstory || '',
        voiceId: (typeof item === 'object' && item.voiceId) || existingObj?.voiceId || (existingObj?.gender === 'female' ? 'Kore' : 'Fenrir'),
        imageUrl: (typeof item === 'object' && item.imageUrl) || existingObj?.imageUrl || '',
      };
    });
  }

  public normalizeLocations(
    raw: Array<any | string>,
    existing: any[] = [],
    descriptions: Record<string, { physicalCharacteristics?: string; timeOfDay?: string }> = {}
  ): LocationAssetDef[] {
    const existingMap = new Map(existing.map((l: any) => [l.name?.toLowerCase().trim(), l]));
    return (raw || []).map((item, i) => {
      const name = typeof item === 'string' ? item : item.name || `Location ${i + 1}`;
      const existingObj = existingMap.get(name.toLowerCase().trim());
      const desc = descriptions[name] || {};

      return {
        id: (typeof item === 'object' && item.id) || existingObj?.id || `loc_${i + 1}`,
        name,
        timeOfDay: (typeof item === 'object' && item.timeOfDay) || desc.timeOfDay || existingObj?.timeOfDay || 'NIGHT',
        frameDescription: (typeof item === 'object' && item.frameDescription) || existingObj?.frameDescription || 'Make a single image with 4 different 16:9 views of this same location with perfect continuity.',
        physicalCharacteristics: (typeof item === 'object' && item.physicalCharacteristics) || desc.physicalCharacteristics || existingObj?.physicalCharacteristics || '',
        imageUrl: (typeof item === 'object' && item.imageUrl) || existingObj?.imageUrl || '',
      };
    });
  }

  public normalizeProps(
    raw: Array<any | string>,
    existing: any[] = [],
    descriptions: Record<string, { physicalCharacteristics?: string }> = {}
  ): PropAssetDef[] {
    const existingMap = new Map(existing.map((p: any) => [p.name?.toLowerCase().trim(), p]));
    return (raw || []).map((item, i) => {
      const name = typeof item === 'string' ? item : item.name || `Prop ${i + 1}`;
      const existingObj = existingMap.get(name.toLowerCase().trim());
      const desc = descriptions[name] || {};

      return {
        id: (typeof item === 'object' && item.id) || existingObj?.id || `prop_${i + 1}`,
        name,
        owner: (typeof item === 'object' && item.owner) || existingObj?.owner || '',
        frameDescription: (typeof item === 'object' && item.frameDescription) || existingObj?.frameDescription || 'A product image of just the item described against a white background.',
        physicalCharacteristics: (typeof item === 'object' && item.physicalCharacteristics) || desc.physicalCharacteristics || existingObj?.physicalCharacteristics || '',
        imageUrl: (typeof item === 'object' && item.imageUrl) || existingObj?.imageUrl || '',
      };
    });
  }

  public extractCanonicalAssets(parsed: any) {
    return {
      characters: this.normalizeCharacters(Array.isArray(parsed?.characters) ? parsed.characters : []),
      locations: this.normalizeLocations(Array.isArray(parsed?.locations) ? parsed.locations : []),
      props: this.normalizeProps(Array.isArray(parsed?.props) ? parsed.props : []),
    };
  }

  public formatCharactersContext(characters: CharacterAssetDef[]): string {
    return (characters || [])
      .map(c => {
        let text = `- ${c.name} (${c.role || 'character'}): ${c.physicalCharacteristics || 'Authentic'} | Wardrobe: ${c.clothingAndAccessories || 'Signature styling'}`;
        if (Array.isArray(c.wardrobeVariants) && c.wardrobeVariants.length > 0) {
          const variantsStr = c.wardrobeVariants
            .map(v => `[variantId: "${v.variantId}", name: "${v.name}", outfit: "${v.clothingAndAccessories || ''}", scenes: ${JSON.stringify(v.associatedScenes || [])}]`)
            .join(', ');
          text += ` | Wardrobe Variants: ${variantsStr}`;
        }
        return text;
      })
      .join('\n');
  }

  public formatLocationsContext(locations: LocationAssetDef[]): string {
    return (locations || [])
      .map(l => `- ${l.name} (${l.timeOfDay || 'DAY'}): ${l.physicalCharacteristics || 'Standard cinematic environment'}`)
      .join('\n');
  }

  public formatPropsContext(props: PropAssetDef[]): string {
    return (props || [])
      .map(p => `- ${p.name}: ${p.physicalCharacteristics || 'Key cinematic item'}`)
      .join('\n');
  }

  // ── 3. VISUAL PROMPT BUILDER ──────────────────────────────────────────────

  public buildVisualPrompt(
    frameDesc: string,
    locName: string,
    charNames: string[],
    costumes: any[],
    propNames: string[],
    localLocations: LocationAssetDef[] = [],
    localCharacters: CharacterAssetDef[] = [],
    localProps: PropAssetDef[] = []
  ): string {
    let vp = `FrameDescription: ${frameDesc || 'Cinematic shot'}\n`;
    if (locName) {
      const locObj = localLocations.find(l => l.name?.toLowerCase() === locName.toLowerCase());
      vp += `Locations: ${locName}: ${locObj?.physicalCharacteristics || locName}\n`;
    }
    if (charNames.length > 0) {
      const charDescList = charNames.map(cName => {
        const cObj = localCharacters.find(c => c.name?.toLowerCase() === cName.toLowerCase());
        const costObj = (costumes || []).find((cc: any) => cc.character?.toLowerCase() === cName.toLowerCase());
        const wardrobe = costObj?.wardrobe || cObj?.clothingAndAccessories || 'Signature wardrobe';
        const phys = cObj?.physicalCharacteristics || 'Authentic facial traits';
        return `${cName}: ${phys}, wearing ${wardrobe}`;
      });
      vp += `Characters: ${charDescList.join('. ')}\n`;
    }
    if (propNames.length > 0) {
      const propDescList = propNames.map(pName => {
        const pObj = localProps.find(p => p.name?.toLowerCase() === pName.toLowerCase());
        return `${pName}: ${pObj?.physicalCharacteristics || 'Detailed prop'}`;
      });
      vp += `Props: ${propDescList.join('. ')}`;
    }
    return vp.trim();
  }

  // ── 4. SCENE & SHOT FLATTENING AND NORMALIZATION ─────────────────────────

  public normalizeCharacterCostumes(
    rawCostumes: any[],
    charNames: string[],
    sceneNumber: number,
    localCharacters: CharacterAssetDef[]
  ): Array<{ character: string; wardrobe: string; variantId: string }> {
    const result: Array<{ character: string; wardrobe: string; variantId: string }> = [];
    const processedChars = new Set<string>();
    const costumesArr = Array.isArray(rawCostumes) ? rawCostumes : [];

    for (const cost of costumesArr) {
      if (!cost || !cost.character) continue;
      const charName = String(cost.character).trim();
      const charNameLower = charName.toLowerCase();
      processedChars.add(charNameLower);

      const charDef = localCharacters.find(c => c.name?.toLowerCase().trim() === charNameLower);
      const variants = Array.isArray(charDef?.wardrobeVariants) ? charDef.wardrobeVariants : [];

      let matchedVariant: any = null;
      if (cost.variantId && variants.length > 0) {
        matchedVariant = variants.find(v => v.variantId?.toLowerCase() === String(cost.variantId).toLowerCase());
      }
      if (!matchedVariant && sceneNumber && variants.length > 0) {
        matchedVariant = variants.find(v => Array.isArray(v.associatedScenes) && v.associatedScenes.includes(sceneNumber));
      }
      if (!matchedVariant && cost.wardrobe && variants.length > 0) {
        const wLower = String(cost.wardrobe).toLowerCase();
        matchedVariant = variants.find(v =>
          (v.name && wLower.includes(v.name.toLowerCase())) ||
          (v.clothingAndAccessories && wLower.includes(v.clothingAndAccessories.toLowerCase()))
        );
      }
      if (!matchedVariant && variants.length > 0) {
        matchedVariant = variants[0];
      }

      const slug = charDef?.id || charName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const resolvedVariantId = matchedVariant?.variantId || cost.variantId || `${slug}_default`;
      const resolvedWardrobe = matchedVariant?.clothingAndAccessories || cost.wardrobe || charDef?.clothingAndAccessories || 'Signature attire';

      result.push({
        character: charDef?.name || charName,
        wardrobe: resolvedWardrobe,
        variantId: resolvedVariantId,
      });
    }

    for (const cName of charNames) {
      if (!cName) continue;
      const cNameLower = cName.toLowerCase().trim();
      if (processedChars.has(cNameLower)) continue;
      processedChars.add(cNameLower);

      const charDef = localCharacters.find(c => c.name?.toLowerCase().trim() === cNameLower);
      const variants = Array.isArray(charDef?.wardrobeVariants) ? charDef.wardrobeVariants : [];

      let matchedVariant: any = null;
      if (sceneNumber && variants.length > 0) {
        matchedVariant = variants.find(v => Array.isArray(v.associatedScenes) && v.associatedScenes.includes(sceneNumber));
      }
      if (!matchedVariant && variants.length > 0) {
        matchedVariant = variants[0];
      }

      const slug = charDef?.id || cName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const resolvedVariantId = matchedVariant?.variantId || `${slug}_default`;
      const resolvedWardrobe = matchedVariant?.clothingAndAccessories || charDef?.clothingAndAccessories || 'Signature attire';

      result.push({
        character: charDef?.name || cName,
        wardrobe: resolvedWardrobe,
        variantId: resolvedVariantId,
      });
    }

    return result;
  }

  public flattenAndEnrichShots(
    rawScenes: any[],
    context: { characters?: CharacterAssetDef[]; locations?: LocationAssetDef[]; props?: PropAssetDef[] } = {}
  ): ScriptShot[] {
    if (!Array.isArray(rawScenes) || rawScenes.length === 0) return [];
    const localCharacters = context.characters || [];
    const localLocations = context.locations || [];
    const localProps = context.props || [];

    const shots: ScriptShot[] = [];
    let globalIdx = 1;

    const hasNested = rawScenes.some((s: any) => Array.isArray(s.shots) && s.shots.length > 0);

    if (hasNested) {
      rawScenes.forEach((sc: any, scIdx: number) => {
        const scNum = sc.sceneNumber || scIdx + 1;
        const scHeading = sc.heading || `INT. SCENE ${scNum} - NIGHT`;
        const scLoc = sc.location || 'Scene Location';
        const scTime = sc.timeOfDay || 'NIGHT';
        const scLighting = sc.lightingMood || 'Atmospheric cinematic';
        (Array.isArray(sc.shots) ? sc.shots : []).forEach((sh: any, shIdx: number) => {
          const dur = Math.min(Math.max(Number(sh.durationSeconds) || 6, 4), 8);
          const rawProps = Array.isArray(sh.props) ? sh.props : [];
          const rawDialogue = Array.isArray(sh.dialogue)
            ? sh.dialogue
            : (sh.dialogue?.speaker && sh.dialogue?.text ? [sh.dialogue] : (sh.dialogue?.character && sh.dialogue?.line ? [sh.dialogue] : []));
          const rawCostumes = Array.isArray(sh.characterCostumes) ? sh.characterCostumes : [];
          const charNames = Array.from(new Set([
            ...rawCostumes.map((c: any) => c.character),
            ...rawDialogue.map((d: any) => d.character || d.speaker),
            ...(Array.isArray(sh.referenceAssets?.characters) ? sh.referenceAssets.characters : []),
          ])).filter(Boolean) as string[];

          const charCostumes = this.normalizeCharacterCostumes(rawCostumes, charNames, scNum, localCharacters);
          const shotProps = Array.from(new Set([
            ...rawProps,
            ...(Array.isArray(sh.referenceAssets?.props) ? sh.referenceAssets.props : []),
          ])).filter(Boolean) as string[];
          const frameDesc = sh.frameDescription || sh.action || '';
          shots.push({
            index: globalIdx++,
            sceneNumber: scNum,
            shotNumber: shIdx + 1,
            title: sh.title || `Shot ${shIdx + 1}`,
            heading: scHeading,
            location: scLoc,
            timeOfDay: scTime,
            lightingMood: scLighting,
            sceneContext: sh.sceneContext || sc.sceneContext || '',
            propDetails: sh.propDetails || sc.propDetails || '',
            frameDescription: frameDesc,
            cameraMovement: sh.cameraMovement || 'Slow push-in',
            action: sh.action || '',
            characterCostumes: charCostumes,
            props: shotProps,
            dialogue: rawDialogue,
            durationSeconds: dur,
            bgmMood: sh.bgmMood || sc.bgmMood || 'Atmospheric suspense',
            sfxCues: Array.isArray(sh.sfxCues) ? sh.sfxCues : [],
            referenceAssets: { characters: charNames, locations: [scLoc], props: shotProps },
            visualPrompt: sh.visualPrompt || this.buildVisualPrompt(frameDesc, scLoc, charNames, charCostumes, shotProps, localLocations, localCharacters, localProps),
            endFramePrompt: sh.endFramePrompt || '',
            transitionEffect: sh.transitionEffect || 'cut',
          });
        });
      });
    } else {
      // Flat scenes
      const perSceneShotCounter: Record<number, number> = {};
      rawScenes.forEach((s: any, idx: number) => {
        const dur = Math.min(Math.max(Number(s.durationSeconds) || 6, 4), 8);
        const scLoc = s.location || (localLocations[0]?.name || 'Interior Setting');
        const rawCostumes = Array.isArray(s.characterCostumes) ? s.characterCostumes : [];
        const rawProps = Array.isArray(s.props) ? s.props : [];
        const rawDialogue = Array.isArray(s.dialogue)
          ? s.dialogue
          : (s.dialogue?.speaker && s.dialogue?.text ? [s.dialogue] : (s.dialogue?.character && s.dialogue?.line ? [s.dialogue] : []));
        const charNames = Array.from(new Set([
          ...rawCostumes.map((c: any) => c.character),
          ...rawDialogue.map((d: any) => d.character || d.speaker),
          ...(Array.isArray(s.referenceAssets?.characters) ? s.referenceAssets.characters : []),
        ])).filter(Boolean) as string[];
        const sceneNum = s.sceneNumber || 1;
        if (!perSceneShotCounter[sceneNum]) perSceneShotCounter[sceneNum] = 0;
        perSceneShotCounter[sceneNum]++;
        const localShotNum = s.shotNumber || perSceneShotCounter[sceneNum];
        const charCostumes = this.normalizeCharacterCostumes(rawCostumes, charNames, sceneNum, localCharacters);
        const shotProps = Array.from(new Set([
          ...rawProps,
          ...(Array.isArray(s.referenceAssets?.props) ? s.referenceAssets.props : []),
        ])).filter(Boolean) as string[];
        const frameDesc = s.frameDescription || s.action || '';
        shots.push({
          index: s.index || globalIdx++,
          sceneNumber: sceneNum,
          shotNumber: localShotNum,
          title: s.title || `Shot ${localShotNum}`,
          heading: s.heading || `INT. SCENE ${sceneNum} - NIGHT`,
          location: scLoc,
          timeOfDay: s.timeOfDay || 'NIGHT',
          lightingMood: s.lightingMood || 'Cinematic lighting',
          sceneContext: s.sceneContext || '',
          propDetails: s.propDetails || '',
          frameDescription: frameDesc,
          cameraMovement: s.cameraMovement || 'Slow push-in',
          action: s.action || '',
          characterCostumes: charCostumes,
          props: shotProps,
          dialogue: rawDialogue,
          durationSeconds: dur,
          bgmMood: s.bgmMood || 'Atmospheric suspense',
          sfxCues: Array.isArray(s.sfxCues) ? s.sfxCues : [],
          referenceAssets: { characters: charNames, locations: [scLoc], props: shotProps },
          visualPrompt: s.visualPrompt || this.buildVisualPrompt(frameDesc, scLoc, charNames, charCostumes, shotProps, localLocations, localCharacters, localProps),
          endFramePrompt: s.endFramePrompt || '',
          transitionEffect: s.transitionEffect || 'cut',
        });
      });
    }

    return shots;
  }

  // ── 5. SHOT EXPANSION & SCREENPLAY FORMATTING ────────────────────────────

  public expandShotsToMinimum(shots: ScriptShot[], target: number): ScriptShot[] {
    if (!shots || shots.length >= target) return shots;
    const result = [...shots];
    const cameraAngles = ['Tight close-up', 'Cutaway wide shot', 'Over-the-shoulder reaction', 'Low-angle medium shot', 'Static establishing shot'];
    let angleIdx = 0;
    let insertAt = 0;
    while (result.length < target) {
      const src = result[insertAt % result.length];
      const bRoll: ScriptShot = {
        ...src,
        index: 0,
        shotNumber: src.shotNumber + 1,
        title: `${src.title} — Cutaway`,
        frameDescription: `${cameraAngles[angleIdx % cameraAngles.length]}: reaction shot after previous action in ${src.location}.`,
        cameraMovement: cameraAngles[angleIdx % cameraAngles.length],
        action: `Reaction to: ${src.action}`,
        dialogue: [],
        durationSeconds: 5,
        bgmMood: src.bgmMood,
        sfxCues: [],
        visualPrompt: src.visualPrompt,
        endFramePrompt: src.endFramePrompt,
        sceneContext: src.sceneContext,
        propDetails: src.propDetails,
        transitionEffect: src.transitionEffect || 'cut',
      };
      result.splice(insertAt + 1, 0, bRoll);
      insertAt += 2;
      angleIdx++;
    }
    result.forEach((s, i) => { s.index = i + 1; });
    return result;
  }

  public assembleMarkdownScreenplay(shots: ScriptShot[], title?: string): string {
    let currentHeading = '';
    let markdownScreenplay = title ? `# ${title.toUpperCase()}\n\n` : '';
    markdownScreenplay += shots.map((s) => {
      let prefix = '';
      if (s.heading !== currentHeading) {
        currentHeading = s.heading;
        prefix = `### ${s.heading.toUpperCase()}\n\n`;
      }
      let sText = prefix + s.action;
      if (s.dialogue && s.dialogue.length > 0) {
        const dlgText = s.dialogue.map((d: any) => {
          const tone = d.speechTone || d.emotion ? `_(${d.speechTone || d.emotion})_\n` : '';
          return `**${(d.character || 'CHARACTER').toUpperCase()}**\n${tone}${d.line}`;
        }).join('\n\n');
        sText += `\n\n${dlgText}`;
      }
      return sText;
    }).join('\n\n') + '\n\n##### FADE TO BLACK:';
    return markdownScreenplay;
  }

  // ── 6. PUBLIC WORKFLOW: EXECUTE (NEW SCRIPT GENERATION) ─────────────────

  async execute(input: ScriptAgentInput): Promise<ScriptItem | null> {
    const epNum = input.episodeNumber || 1;
    const epStr = `EP ${String(epNum).padStart(2, '0')}`;
    const epTitle = input.title || `${epStr}: The Turning Point`;
    const genre = input.genre || 'Suspense / Drama';
    const visualStyle = input.visualStyle || 'realistic';
    const visualStylePrompt = input.visualStylePrompt || getVisualStylePrompt(visualStyle);
    const country = input.country || 'US';
    const ratio = input.ratio || '9:16';
    const langInfo = getLanguageForCountry(country);

    const tiers = this.calculateDurationTiers(input.targetDurationSeconds);
    const { targetDuration, minShots, maxShots, minShotsPerScene, maxShotsPerScene, minScenes, maxScenes, useBatchGeneration } = tiers;

    const skillVars = {
      languageInstruction: langInfo.dialogueInstruction,
      targetDuration,
      minShots,
      maxShots,
      minShotsPerScene,
      maxShotsPerScene,
      minScenes,
      maxScenes,
    };

    Logger.info(
      `[ScriptAgent] Generating screenplay for "${epTitle}" (${epStr}, target ${targetDuration}s, ` +
      `~${minShots}-${maxShots} shots across ${minScenes}-${maxScenes} scenes, ` +
      `${useBatchGeneration ? 'BATCH' : 'SINGLE'} mode) in ${langInfo.name}...`
    );

    const charactersList = (input.characters || [])
      .map((c: any) => `- ${c.name} (${c.role || 'protagonist'}): ${c.identity || ''} | Physical: ${c.physicalCharacteristics || c.appearance || 'Authentic'} | Clothing: ${c.clothingAndAccessories || c.costumeStyle || 'Signature styling'}`)
      .join('\n');

    const prompt = PromptLoader.render('screenplay/script_scene_writer', {
      epStr,
      epNum,
      epTitle,
      genre,
      visualStyle,
      visualStylePrompt,
      country,
      languageName: langInfo.name,
      languageNativeName: langInfo.nativeName,
      languageCode: langInfo.code,
      languageInstruction: langInfo.dialogueInstruction,
      ratio,
      targetDuration,
      minShots,
      maxShots,
      minScenes,
      maxScenes,
      synopsis: input.synopsis || 'The protagonist encounters a critical dilemma.',
      sceneCore: input.sceneCore || 'A sudden escalation pushing stakes to breaking point',
      conflictEscalation: input.conflictEscalation || 'Direct confrontation between rivals',
      cliffhangerHook: input.cliffhangerHook || 'Shocking reveal ending on high tension',
      charactersList,
      coreAttraction: input.storyCore?.coreAttraction || input.synopsis || 'High-stakes micro-drama conflict',
      goldFingerRule: input.storyCore?.goldFingerRule || 'Hidden family empire and corporate authority',
    });

    const buildSystemInstruction = (retryWarning?: string): string =>
      renderSkill('screenplay_system', { ...skillVars, retryWarning });

    const buildSceneShotInstruction = (sceneOutline: any, sceneIdx: number, totalScenes: number, assetContext: string): string =>
      renderSkill('scene_shot_system', {
        ...skillVars,
        sceneIndex: sceneIdx + 1,
        totalScenes,
        sceneHeading: sceneOutline.heading || `INT. SCENE ${sceneIdx + 1} - NIGHT`,
        sceneLocation: sceneOutline.location || 'Scene Location',
        sceneTimeOfDay: sceneOutline.timeOfDay || 'NIGHT',
        sceneLightingMood: sceneOutline.lightingMood || 'Atmospheric cinematic',
        sceneBgmMood: sceneOutline.bgmMood || 'Atmospheric suspense',
        sceneSummary: sceneOutline.summary || sceneOutline.action || '',
        assetContext,
      });

    try {
      let parsed: any = null;
      let parsedCharacters: CharacterAssetDef[] = [];
      let parsedLocations: LocationAssetDef[] = [];
      let parsedProps: PropAssetDef[] = [];
      let flattenedShots: ScriptShot[] = [];

      if (useBatchGeneration) {
        // PASS 1: Generate scene outlines & asset definitions
        Logger.info(`[ScriptAgent] BATCH PASS 1: Generating scene outlines for target ${targetDuration}s...`);
        const outlineSystem = renderSkill('screenplay_outline_system', skillVars);
        const rawOutline = await geminiClient.generateText({
          prompt,
          systemInstruction: outlineSystem,
          jsonMode: true,
        });

        parsed = JSON.parse(rawOutline);
        const assets = this.extractCanonicalAssets(parsed);
        parsedCharacters = assets.characters;
        parsedLocations = assets.locations;
        parsedProps = assets.props;

        const assetContext = [
          'Characters:\n' + this.formatCharactersContext(parsedCharacters),
          'Locations:\n' + this.formatLocationsContext(parsedLocations),
          'Props:\n' + this.formatPropsContext(parsedProps),
        ].join('\n\n');

        const sceneOutlines: any[] = Array.isArray(parsed.scenes) ? parsed.scenes : [];
        Logger.info(`[ScriptAgent] BATCH PASS 1 complete: ${sceneOutlines.length} scene outlines generated.`);

        // PASS 2: Generate shots per scene sequentially
        let globalShotIdx = 1;
        for (let si = 0; si < sceneOutlines.length; si++) {
          const sc = sceneOutlines[si];
          const sceneShotSystem = buildSceneShotInstruction(sc, si, sceneOutlines.length, assetContext);
          const scenePrompt =
            `Generate ${minShotsPerScene} to ${maxShotsPerScene} cinematic shots for Scene ${si + 1}/${sceneOutlines.length}: ` +
            `"${sc.heading || sc.location}". Context: ${sc.summary || sc.action || 'Key drama moment'}.`;

          try {
            const rawSceneShots = await geminiClient.generateText({
              prompt: scenePrompt,
              systemInstruction: sceneShotSystem,
              jsonMode: true,
            });
            const parsedScene = JSON.parse(rawSceneShots);
            const rawShots = Array.isArray(parsedScene.shots) ? parsedScene.shots : [];

            sc.shots = rawShots;
            rawShots.forEach((sh: any, shIdx: number) => {
              const dur = Math.min(Math.max(Number(sh.durationSeconds) || 6, 4), 8);
              const shotPropsArr = Array.isArray(sh.props) ? sh.props : [];
              const rawDialogue = Array.isArray(sh.dialogue) ? sh.dialogue : [];
              const rawCostumes = Array.isArray(sh.characterCostumes) ? sh.characterCostumes : [];
              const charNames = Array.from(new Set([
                ...rawCostumes.map((c: any) => c.character),
                ...rawDialogue.map((d: any) => d.character),
                ...(Array.isArray(sh.referenceAssets?.characters) ? sh.referenceAssets.characters : []),
              ])).filter(Boolean) as string[];
              const charCostumes = this.normalizeCharacterCostumes(rawCostumes, charNames, sc.sceneNumber || si + 1, parsedCharacters);
              const frameDesc = sh.frameDescription || sh.action || '';

              flattenedShots.push({
                index: globalShotIdx++,
                sceneNumber: sc.sceneNumber || si + 1,
                shotNumber: shIdx + 1,
                title: sh.title || `Shot ${shIdx + 1}`,
                heading: sc.heading || `INT. SCENE ${si + 1} - NIGHT`,
                location: sc.location || 'Scene Location',
                timeOfDay: sc.timeOfDay || 'NIGHT',
                lightingMood: sc.lightingMood || 'Atmospheric cinematic',
                sceneContext: sh.sceneContext || sc.sceneContext || '',
                propDetails: sh.propDetails || sc.propDetails || '',
                frameDescription: frameDesc,
                cameraMovement: sh.cameraMovement || 'Slow push-in',
                action: sh.action || '',
                characterCostumes: charCostumes,
                props: shotPropsArr,
                dialogue: rawDialogue,
                durationSeconds: dur,
                bgmMood: sh.bgmMood || sc.bgmMood || 'Atmospheric suspense',
                sfxCues: Array.isArray(sh.sfxCues) ? sh.sfxCues : [],
                referenceAssets: { characters: charNames, locations: [sc.location || ''], props: shotPropsArr },
                visualPrompt: sh.visualPrompt || frameDesc,
                endFramePrompt: sh.endFramePrompt || '',
                transitionEffect: sh.transitionEffect || 'cut',
              });
            });
          } catch (sceneErr: any) {
            Logger.warn(`[ScriptAgent] Scene ${si + 1} shot generation failed: ${sceneErr.message}`);
          }
        }
        parsed.scenes = sceneOutlines;
      } else {
        // SINGLE CALL MODE: short/medium episodes (≤240s)
        const rawText = await geminiClient.generateText({
          prompt,
          systemInstruction: buildSystemInstruction(),
          jsonMode: true,
        });

        parsed = JSON.parse(rawText);
        if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
          throw new Error('Single-call generation returned no scenes');
        }

        const assets = this.extractCanonicalAssets(parsed);
        parsedCharacters = assets.characters;
        parsedLocations = assets.locations;
        parsedProps = assets.props;

        flattenedShots = this.flattenAndEnrichShots(parsed.scenes, {
          characters: parsedCharacters,
          locations: parsedLocations,
          props: parsedProps,
        });

        // Retry if shots below threshold
        if (flattenedShots.length < minShots) {
          Logger.warn(`[ScriptAgent] Only ${flattenedShots.length} shots (need ≥ ${minShots}). Retrying with stricter constraint...`);
          try {
            const retryWarning =
              `⚠ CRITICAL RETRY: Previous attempt generated only ${flattenedShots.length} shots — UNACCEPTABLE. ` +
              `You MUST produce ${minShots} to ${maxShots} shots total. ` +
              `Give EVERY scene ${minShotsPerScene}-${maxShotsPerScene} shots in its nested "shots" array. Do NOT return flat scenes.`;
            const rawRetry = await geminiClient.generateText({
              prompt,
              systemInstruction: buildSystemInstruction(retryWarning),
              jsonMode: true,
            });
            const parsedRetry = JSON.parse(rawRetry);
            if (parsedRetry && Array.isArray(parsedRetry.scenes) && parsedRetry.scenes.length > 0) {
              const retryAssets = this.extractCanonicalAssets(parsedRetry);
              const retryShots = this.flattenAndEnrichShots(parsedRetry.scenes, retryAssets);
              if (retryShots.length > flattenedShots.length) {
                Logger.info(`[ScriptAgent] Retry produced ${retryShots.length} shots — using retry result.`);
                parsed = parsedRetry;
                parsedCharacters = retryAssets.characters.length > 0 ? retryAssets.characters : parsedCharacters;
                parsedLocations = retryAssets.locations.length > 0 ? retryAssets.locations : parsedLocations;
                parsedProps = retryAssets.props.length > 0 ? retryAssets.props : parsedProps;
                flattenedShots = retryShots;
              }
            }
          } catch (retryErr: any) {
            Logger.warn(`[ScriptAgent] Retry failed: ${retryErr.message}`);
          }
        }
      }

      // Programmatic expansion fallback
      if (flattenedShots.length < minShots) {
        Logger.warn(`[ScriptAgent] Expanding shots programmatically from ${flattenedShots.length} to ${minShots}.`);
        flattenedShots = this.expandShotsToMinimum(flattenedShots, minShots);
      }

      Logger.info(`[ScriptAgent] Final shot count: ${flattenedShots.length} (target ${minShots}-${maxShots})`);
      const totalDuration = flattenedShots.reduce((sum: number, s) => sum + s.durationSeconds, 0);
      const markdownScreenplay = this.assembleMarkdownScreenplay(flattenedShots, parsed.title || epTitle);

      return {
        episode: parsed.episode || epStr,
        episodeNumber: parsed.episodeNumber || epNum,
        title: parsed.title || epTitle,
        synopsis: parsed.synopsis || input.synopsis || '',
        screenplay: parsed.screenplay || markdownScreenplay,
        sceneCore: parsed.sceneCore || input.sceneCore,
        conflictEscalation: parsed.conflictEscalation || input.conflictEscalation,
        cliffhangerHook: parsed.cliffhangerHook || input.cliffhangerHook,
        totalDurationSeconds: totalDuration,
        scenes: flattenedShots,
        characters: parsedCharacters,
        locations: parsedLocations,
        props: parsedProps,
      };
    } catch (e: any) {
      Logger.warn(`[ScriptAgent] AI Screenplay generation failed (${e.message})`);
      throw new Error(`[ScriptAgent] AI Screenplay generation failed: ${e.message}`);
    }
  }

  // ── 7. SCREENPLAY EXTRACTION & DESCRIPTION API METHODS ──────────────────

  public async extractAssets(screenplay: string, countryOrLanguage?: string): Promise<{
    characters: string[];
    locations: string[];
    props: string[];
  }> {
    const langInfo = getLanguageForCountry(countryOrLanguage);
    const prompt = PromptLoader.render('screenplay/extract_assets', {
      screenplay,
      languageInstruction: langInfo.dialogueInstruction,
    });
    const skill = loadSkill('screenplay_asset_extraction');

    try {
      const response = await aiProviderRouter.generateJSON<{
        characters?: string[];
        locations?: string[];
        props?: string[];
      }>(prompt, { characters: [], locations: [], props: [] }, skill ? { systemInstruction: `${skill}\n${langInfo.dialogueInstruction}` } : { systemInstruction: langInfo.dialogueInstruction });

      return {
        characters: Array.isArray(response?.characters) ? response.characters : [],
        locations: Array.isArray(response?.locations) ? response.locations : [],
        props: Array.isArray(response?.props) ? response.props : [],
      };
    } catch (err: any) {
      Logger.error(`[ScriptAgent.extractAssets] Extraction failed: ${err.message}`);
      return { characters: [], locations: [], props: [] };
    }
  }

  public async describeCharacters(
    screenplay: string,
    characterNames: string[],
    countryOrLanguage?: string
  ): Promise<Record<string, { physicalCharacteristics: string; clothingAndAccessories: string; backstory: string; wardrobeVariants?: any[] }>> {
    const langInfo = getLanguageForCountry(countryOrLanguage);
    const result: Record<string, { physicalCharacteristics: string; clothingAndAccessories: string; backstory: string; wardrobeVariants?: any[] }> = {};

    await Promise.all(
      characterNames.map(async (name) => {
        const prompt = PromptLoader.render('screenplay/describe_character', {
          characterName: name,
          screenplay,
          languageInstruction: langInfo.dialogueInstruction,
        });
        const skill = loadSkill('screenplay_character_description');

        try {
          const res = await aiProviderRouter.generateJSON<{
            physicalCharacteristics?: string;
            clothingAndAccessories?: string;
            backstory?: string;
            wardrobeVariants?: any[];
          }>(
            prompt,
            { physicalCharacteristics: '', clothingAndAccessories: '', backstory: '', wardrobeVariants: [] },
            skill ? { systemInstruction: `${skill}\n${langInfo.dialogueInstruction}` } : { systemInstruction: langInfo.dialogueInstruction }
          );

          const rawVariants = Array.isArray(res?.wardrobeVariants) ? res.wardrobeVariants : [];
          const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
          const cleanVariants = rawVariants.map((v: any, vi: number) => ({
            variantId: v.variantId || `${slug}_variant_${vi + 1}`,
            name: v.name || `Outfit ${vi + 1}`,
            clothingAndAccessories: v.clothingAndAccessories || res?.clothingAndAccessories || '',
            associatedScenes: Array.isArray(v.associatedScenes) ? v.associatedScenes : [],
          }));

          result[name] = {
            physicalCharacteristics: res?.physicalCharacteristics || '',
            clothingAndAccessories: res?.clothingAndAccessories || '',
            backstory: res?.backstory || '',
            wardrobeVariants: cleanVariants,
          };
        } catch (err: any) {
          Logger.error(`[ScriptAgent.describeCharacters] Failed for ${name}: ${err.message}`);
          result[name] = { physicalCharacteristics: '', clothingAndAccessories: '', backstory: '', wardrobeVariants: [] };
        }
      })
    );

    return result;
  }

  public async describeLocations(
    screenplay: string,
    locationNames: string[],
    countryOrLanguage?: string
  ): Promise<Record<string, { physicalCharacteristics: string; timeOfDay: string }>> {
    const langInfo = getLanguageForCountry(countryOrLanguage);
    const result: Record<string, { physicalCharacteristics: string; timeOfDay: string }> = {};

    await Promise.all(
      locationNames.map(async (name) => {
        const prompt = PromptLoader.render('screenplay/describe_location', {
          locationName: name,
          screenplay,
          languageInstruction: langInfo.dialogueInstruction,
        });
        const skill = loadSkill('screenplay_location_description');

        try {
          const res = await aiProviderRouter.generateJSON<{
            physicalCharacteristics?: string;
            timeOfDay?: string;
          }>(
            prompt,
            { physicalCharacteristics: '', timeOfDay: 'DAY' },
            skill ? { systemInstruction: `${skill}\n${langInfo.dialogueInstruction}` } : { systemInstruction: langInfo.dialogueInstruction }
          );

          result[name] = {
            physicalCharacteristics: res?.physicalCharacteristics || '',
            timeOfDay: res?.timeOfDay || 'DAY',
          };
        } catch (err: any) {
          Logger.error(`[ScriptAgent.describeLocations] Failed for ${name}: ${err.message}`);
          result[name] = { physicalCharacteristics: '', timeOfDay: 'DAY' };
        }
      })
    );

    return result;
  }

  public async describeProps(
    screenplay: string,
    propNames: string[],
    countryOrLanguage?: string
  ): Promise<Record<string, { physicalCharacteristics: string }>> {
    const langInfo = getLanguageForCountry(countryOrLanguage);
    const result: Record<string, { physicalCharacteristics: string }> = {};

    await Promise.all(
      propNames.map(async (name) => {
        const prompt = PromptLoader.render('screenplay/describe_prop', {
          propName: name,
          screenplay,
          languageInstruction: langInfo.dialogueInstruction,
        });
        const skill = loadSkill('screenplay_prop_description');

        try {
          const res = await aiProviderRouter.generateJSON<{ physicalCharacteristics?: string }>(
            prompt,
            { physicalCharacteristics: '' },
            skill ? { systemInstruction: `${skill}\n${langInfo.dialogueInstruction}` } : { systemInstruction: langInfo.dialogueInstruction }
          );

          result[name] = {
            physicalCharacteristics: res?.physicalCharacteristics || '',
          };
        } catch (err: any) {
          Logger.error(`[ScriptAgent.describeProps] Failed for ${name}: ${err.message}`);
          result[name] = { physicalCharacteristics: '' };
        }
      })
    );

    return result;
  }

  public async breakdownSceneToShots(
    sceneTitle: string,
    sceneContent: string,
    availableAssets: Array<{ id: string; name: string; type: 'character' | 'location' | 'prop' }>,
    countryOrLanguage?: string
  ): Promise<ShotFrame[]> {
    const langInfo = getLanguageForCountry(countryOrLanguage);
    const assetsFormatted = availableAssets
      .map(a => `- ${a.name} (${a.type}) [id:${a.id}]`)
      .join('\n');

    const prompt = PromptLoader.render('storyboard/breakdown_shots', {
      sceneTitle,
      sceneContent,
      availableAssets: assetsFormatted,
      languageInstruction: langInfo.dialogueInstruction,
    });
    const skill = loadSkill('storyboard_breakdown');

    try {
      const response = await aiProviderRouter.generateJSON<{ frames: any[] }>(
        prompt,
        { frames: [] },
        skill ? { systemInstruction: `${skill}\n${langInfo.dialogueInstruction}` } : { systemInstruction: langInfo.dialogueInstruction }
      );

      const frames = response?.frames || [];
      return frames.map((f: any, idx: number) => ({
        id: `shot_${nanoid(8)}`,
        index: idx + 1,
        title: f.title || `Shot ${idx + 1}`,
        frameVisual: f.frameVisual || '',
        frameAudio: f.frameAudio || '',
        frameMotion: f.frameMotion || '',
        dialogue: f.dialogue?.speaker && f.dialogue?.text ? f.dialogue : undefined,
        durationSeconds: Math.min(Math.max(Number(f.durationSeconds) || 5, 3), 8),
        linkedAssetIds: Array.isArray(f.linkedAssetIds) ? f.linkedAssetIds : [],
        status: 'draft',
      }));
    } catch (err: any) {
      Logger.error(`[ScriptAgent.breakdownSceneToShots] Error: ${err.message}`);
      return [];
    }
  }

  // ── 8. PUBLIC WORKFLOW: ANALYZE AND BREAKDOWN EXISTING SCREENPLAY ─────────

  public async analyzeAndBreakdownScreenplay(params: {
    screenplay: string;
    country?: string;
    language?: string;
    targetDurationSeconds?: number;
    existingCharacters?: any[];
    existingLocations?: any[];
    existingProps?: any[];
  }): Promise<{
    screenplay: string;
    characters: CharacterAssetDef[];
    locations: LocationAssetDef[];
    props: PropAssetDef[];
    scenes: ScriptShot[];
    totalDurationSeconds: number;
  }> {
    const {
      screenplay,
      country,
      language,
      existingCharacters = [],
      existingLocations = [],
      existingProps = [],
    } = params;
    const langInfo = getLanguageForCountry(country || language);

    const tiers = this.calculateDurationTiers(params.targetDurationSeconds);
    const { targetDuration, minShots, maxShots } = tiers;

    Logger.info(`[ScriptAgent.analyzeAndBreakdownScreenplay] Analyzing screenplay (${screenplay.length} chars, target ${targetDuration}s, ~${minShots}-${maxShots} shots) in language ${langInfo.name}...`);

    // 1. Extract asset names
    const assetNames = await this.extractAssets(screenplay, langInfo.code);

    // 2. Generate descriptions in target language in parallel
    const [charDescriptions, locDescriptions, propDescriptions] = await Promise.all([
      assetNames.characters.length > 0 ? this.describeCharacters(screenplay, assetNames.characters, langInfo.code) : {},
      assetNames.locations.length > 0 ? this.describeLocations(screenplay, assetNames.locations, langInfo.code) : {},
      assetNames.props.length > 0 ? this.describeProps(screenplay, assetNames.props, langInfo.code) : {},
    ]);

    // 3. Normalize all assets preserving existing IDs and customizations
    const characters = this.normalizeCharacters(assetNames.characters, existingCharacters, charDescriptions);
    const locations = this.normalizeLocations(assetNames.locations, existingLocations, locDescriptions);
    const props = this.normalizeProps(assetNames.props, existingProps, propDescriptions);

    // 4. Detect scene headings from screenplay to enforce 100% full scene coverage
    const headingMatches = Array.from(
      screenplay.matchAll(/(?:^|\n)#{1,4}\s*([^\n]+)/gi)
    ).map(m => m[1].trim()).filter(h =>
      !h.toUpperCase().startsWith('EP') &&
      !h.toUpperCase().includes('FADE TO BLACK') &&
      (h.toUpperCase().includes('INT.') || h.toUpperCase().includes('EXT.') || h.toUpperCase().includes('SCENE') || h.toUpperCase().includes('CẢNH'))
    );

    const detectedScenesList = headingMatches.length > 0
      ? headingMatches.map((h, i) => `Scene ${i + 1}: ${h}`).join('\n')
      : '';

    // 5. Breakdown screenplay into sequential timed shots adhering to target duration & all scenes
    const breakdownPrompt = PromptLoader.render('screenplay/breakdown_screenplay', {
      screenplay,
      languageInstruction: langInfo.dialogueInstruction,
      targetDuration,
      minShots,
      maxShots,
      detectedScenesList,
      charactersList: this.formatCharactersContext(characters) || 'None specified',
      locationsList: this.formatLocationsContext(locations) || 'None specified',
      propsList: this.formatPropsContext(props) || 'None specified',
    });

    const breakdownSkill = loadSkill('storyboard_breakdown');

    let parsedShots: ScriptShot[] = [];
    try {
      const breakdownRes = await aiProviderRouter.generateJSON<{ scenes: any[] }>(
        breakdownPrompt,
        { scenes: [] },
        breakdownSkill
          ? { systemInstruction: `${breakdownSkill}\n${langInfo.dialogueInstruction}\nTarget Duration: ${targetDuration}s (Must generate ${minShots}-${maxShots} shots covering ALL scenes)` }
          : { systemInstruction: `${langInfo.dialogueInstruction}\nTarget Duration: ${targetDuration}s (Must cover ALL scenes)` }
      );

      const rawScenes = Array.isArray(breakdownRes?.scenes) ? breakdownRes.scenes : [];
      parsedShots = this.flattenAndEnrichShots(rawScenes, {
        characters,
        locations,
        props,
      });

      if (parsedShots.length < minShots) {
        parsedShots = this.expandShotsToMinimum(parsedShots, minShots);
      }

      // Balance shot durations to accurately hit targetDuration
      let currentTotal = parsedShots.reduce((sum: number, s: any) => sum + (s.durationSeconds || 6), 0);
      if (currentTotal < targetDuration && parsedShots.length > 0) {
        let deficit = targetDuration - currentTotal;
        for (let i = 0; i < parsedShots.length && deficit > 0; i++) {
          const s = parsedShots[i];
          const canAdd = Math.min(8 - (s.durationSeconds || 6), deficit);
          if (canAdd > 0) {
            s.durationSeconds = (s.durationSeconds || 6) + canAdd;
            deficit -= canAdd;
          }
        }
        if (deficit > 3) {
          const extraNeeded = Math.ceil(deficit / 6);
          parsedShots = this.expandShotsToMinimum(parsedShots, parsedShots.length + extraNeeded);
        }
      } else if (currentTotal > targetDuration + 8 && parsedShots.length > 0) {
        let excess = currentTotal - targetDuration;
        for (let i = parsedShots.length - 1; i >= 0 && excess > 0; i--) {
          const s = parsedShots[i];
          const canSub = Math.min((s.durationSeconds || 6) - 5, excess);
          if (canSub > 0) {
            s.durationSeconds = (s.durationSeconds || 6) - canSub;
            excess -= canSub;
          }
        }
      }
    } catch (e: any) {
      Logger.error(`[ScriptAgent.analyzeAndBreakdownScreenplay] Breakdown error: ${e.message}`);
    }

    const totalDuration = parsedShots.reduce((sum: number, s: any) => sum + (s.durationSeconds || 6), 0);

    return {
      screenplay,
      characters,
      locations,
      props,
      scenes: parsedShots,
      totalDurationSeconds: totalDuration,
    };
  }
}

export const scriptAgent = new ScriptAgent();
