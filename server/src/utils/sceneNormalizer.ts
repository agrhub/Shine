import { nanoid } from 'nanoid';
import type { SceneEntity, LocationAsset, PropAsset, CharacterEpisodeEntity } from '../types.js';

export function normalizeSceneEntity(s: any, idx?: number): SceneEntity {
  if (!s || typeof s !== 'object') {
    return {
      id: `scene_${nanoid(8)}`,
      index: idx || 1,
      scene_number: idx || 1,
      shot_number: idx || 1,
      title: `Shot ${idx || 1}`,
      heading: `INT. SCENE ${idx || 1} - NIGHT`,
      location: 'Scene Location',
      time_of_day: 'NIGHT',
      action: '',
      character_costumes: [],
      props: [],
      dialogue: [],
      duration_seconds: 6,
      reference_assets: { characters: [], locations: [], props: [] },
      status: 'draft',
    };
  }

  const sceneIdx = s.index ?? idx ?? 1;
  const sceneNum = s.scene_number || s.sceneNumber || sceneIdx;
  const shotNum = s.shot_number || s.shotNumber || sceneIdx;
  const heading = s.heading || `INT. SCENE ${sceneNum} - NIGHT`;
  const location = s.location || s.location_name || s.locationName || 'Scene Location';
  const timeOfDay = s.time_of_day || s.timeOfDay || 'NIGHT';
  const lightingMood = s.lighting_mood || s.lightingMood || 'Atmospheric cinematic';
  const frameDescription = s.frame_description || s.frameDescription || s.action || '';
  const cameraMovement = s.camera_movement || s.cameraMovement || 'Slow push-in';
  const action = s.action || '';
  const durationSeconds = Number(s.duration_seconds || s.durationSeconds) || 6;
  const bgmMood = s.bgm_mood || s.bgmMood || 'Atmospheric suspense';
  const sfxCues = Array.isArray(s.sfx_cues || s.sfxCues) ? (s.sfx_cues || s.sfxCues) : [];
  const visualPrompt = s.visual_prompt || s.visualPrompt || '';
  const endFramePrompt = s.end_frame_prompt || s.endFramePrompt || '';
  const sceneContext = s.scene_context || s.sceneContext || '';
  const propDetails = s.prop_details || s.propDetails || '';
  const transitionEffect = s.transition_effect || s.transitionEffect || 'cut';
  const videoEffect = s.video_effect || s.videoEffect || '';
  const storyboardFrameUrl = s.storyboard_frame_url || s.storyboardFrameUrl || s.image_url || s.imageUrl;
  const storyboardEndFrameUrl = s.storyboard_end_frame_url || s.storyboardEndFrameUrl;
  const videoUrl = s.video_url || s.videoUrl;
  const voiceoverUrl = s.voiceover_url || s.voiceoverUrl;
  const bgmUrl = s.bgm_url || s.bgmUrl;
  const voiceStartUs = s.voice_start_us ?? s.voiceStartUs ?? 0;
  const voiceDurationUs = s.voice_duration_us ?? s.voiceDurationUs ?? 0;

  const rawCaptions = Array.isArray(s.captions_data || s.captionsData) ? (s.captions_data || s.captionsData) : [];
  const captionsData = rawCaptions.map((cue: any, cIdx: number) => {
    const rawWords = Array.isArray(cue.words) ? cue.words : [];
    const cueStartMs = cue.start_ms ?? cue.startMs ?? (cue.from_us ? Math.round(cue.from_us / 1000) : (cue.fromUs ? Math.round(cue.fromUs / 1000) : 0));
    const cueEndMs = cue.end_ms ?? cue.endMs ?? (cue.to_us ? Math.round(cue.to_us / 1000) : (cue.toUs ? Math.round(cue.toUs / 1000) : cueStartMs + 2000));
    const fromUs = cue.from_us ?? cue.fromUs ?? (cueStartMs * 1000);
    const toUs = cue.to_us ?? cue.toUs ?? (cueEndMs * 1000);
    const durUs = cue.duration_us ?? cue.durationUs ?? (toUs - fromUs);
    const durMs = cue.duration_ms ?? cue.durationMs ?? (cueEndMs - cueStartMs);

    return {
      id: cue.id || `cue_${cIdx + 1}`,
      text: cue.text || '',
      start_ms: cueStartMs,
      end_ms: cueEndMs,
      from_us: fromUs,
      to_us: toUs,
      duration_us: durUs,
      duration_ms: durMs,
      words: rawWords.map((w: any) => ({
        text: w.text || w.word || '',
        from: w.from ?? 0,
        to: w.to ?? 0,
        is_key_word: w.is_key_word ?? w.isKeyWord ?? false,
      })),
    };
  });

  const rawWords = Array.isArray(s.words) ? s.words : [];
  const words = rawWords.map((w: any) => ({
    word: w.word || '',
    punctuated_word: w.punctuated_word || w.punctuatedWord || w.word || '',
    start: w.start ?? 0,
    end: w.end ?? 0,
    confidence: w.confidence ?? 0.99,
  }));

  const rawCostumes = Array.isArray(s.character_costumes || s.characterCostumes) ? (s.character_costumes || s.characterCostumes) : [];
  const characterCostumes = rawCostumes.map((c: any) => ({
    character: c.character || '',
    wardrobe: c.wardrobe || '',
    variant_id: c.variant_id || c.variantId || '',
  }));

  const rawRef = s.reference_assets || s.referenceAssets || {};
  const referenceAssets = {
    characters: Array.isArray(rawRef.characters) ? rawRef.characters : [],
    locations: Array.isArray(rawRef.locations) ? rawRef.locations : (location ? [location] : []),
    props: Array.isArray(rawRef.props) ? rawRef.props : (Array.isArray(s.props) ? s.props : []),
  };

  return {
    id: s.id || `scene_${nanoid(8)}`,
    index: sceneIdx,
    scene_number: sceneNum,
    shot_number: shotNum,
    title: s.title || `Shot ${shotNum}`,
    heading,
    location,
    time_of_day: timeOfDay,
    lighting_mood: lightingMood,
    frame_description: frameDescription,
    camera_movement: cameraMovement,
    action,
    character_costumes: characterCostumes,
    props: Array.isArray(s.props) ? s.props : referenceAssets.props,
    dialogue: s.dialogue || [],
    duration_seconds: durationSeconds,
    bgm_mood: bgmMood,
    sfx_cues: sfxCues,
    reference_assets: referenceAssets,
    visual_prompt: visualPrompt,
    end_frame_prompt: endFramePrompt,
    scene_context: sceneContext,
    prop_details: propDetails,
    transition_effect: transitionEffect,
    video_effect: videoEffect,
    image_url: storyboardFrameUrl,
    storyboard_frame_url: storyboardFrameUrl,
    storyboard_end_frame_url: storyboardEndFrameUrl,
    video_url: videoUrl,
    voiceover_url: voiceoverUrl,
    bgm_url: bgmUrl,
    voice_start_us: voiceStartUs,
    voice_duration_us: voiceDurationUs,
    captions_data: captionsData,
    words,
    status: s.status || (videoUrl ? 'video_ready' : (storyboardFrameUrl ? 'image_ready' : 'draft')),
  };
}

export function normalizeLocationAsset(l: any, idx?: number): LocationAsset {
  if (!l || typeof l !== 'object') {
    return {
      id: `loc_${nanoid(6)}`,
      name: `Location ${idx || 1}`,
      physical_characteristics: '',
      time_of_day: 'DAY',
      status: 'draft',
    };
  }
  return {
    id: l.id || `loc_${nanoid(6)}`,
    name: l.name || `Location ${idx || 1}`,
    physical_characteristics: l.physical_characteristics || l.physicalCharacteristics || l.description || '',
    time_of_day: l.time_of_day || l.timeOfDay || 'DAY',
    image_url: l.image_url || l.imageUrl || '',
    frame_description: l.frame_description || l.frameDescription || '',
    status: l.status || 'draft',
  };
}

export function normalizePropAsset(p: any, idx?: number): PropAsset {
  if (!p || typeof p !== 'object') {
    return {
      id: `prop_${nanoid(6)}`,
      name: `Prop ${idx || 1}`,
      physical_characteristics: '',
      status: 'draft',
    };
  }
  return {
    id: p.id || `prop_${nanoid(6)}`,
    name: p.name || `Prop ${idx || 1}`,
    physical_characteristics: p.physical_characteristics || p.physicalCharacteristics || p.description || '',
    image_url: p.image_url || p.imageUrl || '',
    frame_description: p.frame_description || p.frameDescription || '',
    owner: p.owner || '',
    status: p.status || 'draft',
  };
}

export function normalizeCharacterEpisodeEntity(c: any, idx?: number): CharacterEpisodeEntity {
  const rawVariants = Array.isArray(c?.wardrobe_variants || c?.wardrobeVariants) ? (c?.wardrobe_variants || c?.wardrobeVariants) : [];
  const wardrobeVariants = rawVariants.map((v: any, vi: number) => ({
    variant_id: v.variant_id || v.variantId || `wv_${vi + 1}`,
    name: v.name || `Wardrobe ${vi + 1}`,
    clothing_and_accessories: v.clothing_and_accessories || v.clothingAndAccessories || '',
    image_url: v.image_url || v.imageUrl,
    associated_scenes: Array.isArray(v.associated_scenes || v.associatedScenes) ? (v.associated_scenes || v.associatedScenes) : [],
  }));

  return {
    id: c?.id || `char_${nanoid(6)}`,
    name: c?.name || `Character ${idx || 1}`,
    clothing_and_accessories: c?.clothing_and_accessories || c?.clothingAndAccessories || '',
    frame_description: c?.frame_description || c?.frameDescription || '',
    wardrobe_variants: wardrobeVariants,
  };
}
