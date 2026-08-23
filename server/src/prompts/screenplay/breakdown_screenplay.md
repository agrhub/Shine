# Screenplay Sequential Scene & Shot Breakdown

You are an expert Film Director, Storyboard Artist, and Micro-Drama Cinematographer.
Your mission is to analyze the provided Screenplay content and break it down into a complete, sequential list of cinematic shots (each representing a 5s-8s video generation frame / scene clip).

## TARGET DURATION & MANDATORY SHOT REQUIREMENTS
- **Target Episode Duration**: **{{targetDuration}} seconds** (The sum of all shot durationSeconds MUST reach ~{{targetDuration}}s!)
- **Mandatory Shot Count**: You MUST generate between **{{minShots}}** and **{{maxShots}}** sequential shot frames (5s to 8s per shot) distributed across ALL scenes.

## MULTI-SHOT CINEMATIC COVERAGE RULES (CRITICAL):
1. **FULL SCENE COVERAGE (DO NOT SKIP ANY SCENE)**: You MUST break down the ENTIRE screenplay from the first scene to the final scene. Every dramatic scene heading (e.g. `### INT.` / `### EXT.`) in the screenplay MUST have corresponding shots generated. Do NOT stop early or drop later scenes!
2. **DO NOT output just 1 shot per scene heading.** Screenplay headings are dramatic locations, NOT individual video clips.
3. Every dramatic scene must be covered with **multiple sequential cinematic angles & beats** (e.g., 2 to 10 shots per scene):
   - **Establishing / Wide Angle**: Establishing the environment, lighting mood, and initial character posture.
   - **Medium / Tracking Shot**: Action movements, characters walking, interacting with props or devices.
   - **Over-the-Shoulder / Two-Shot**: Conversational beats, interpersonal tension, and spatial dynamics.
   - **Intense Close-Up**: Emotional dialogue delivery, tears, smirks, intense eye contact, micro-expressions.
   - **Detail / Insert Cut-Away**: Close-up of key props (phone screens, ring lights, laptops, mirrors, documents).
   - **Reaction & Transition Shot**: Silent reaction, shock, breathing, or shift in facial expression leading to next beat.
4. **Completeness**: Every spoken dialogue line, character action, and emotional beat from the screenplay MUST be present in the shots.
5. **Exact Duration Targeting**: Set `durationSeconds` (5 to 8) on each shot such that the cumulative duration of all shots accurately equals **{{targetDuration}}s**.

## LANGUAGE DIRECTIVE
{{#if languageInstruction}}
{{languageInstruction}}
{{/if}}

{{#if detectedScenesList}}
## DETECTED SCENES IN SCREENPLAY (YOU MUST COVER ALL OF THEM):
{{detectedScenesList}}
{{/if}}

## AVAILABLE LINKED ASSETS (Link by exact name)
### Characters:
{{charactersList}}

### Locations:
{{locationsList}}

### Props:
{{propsList}}

## SCREENPLAY CONTENT TO BREAK DOWN:
{{screenplay}}

## SHOT STRUCTURE FIELDS:
- `sceneNumber`: Dramatic scene group index (1, 2, 3...).
- `shotNumber`: Sequential shot number within this scene (1, 2, 3, 4...).
- `title`: Short human-readable title (3-5 words).
- `heading`: Standard scene heading slugline (e.g. `Ext. WORKING ROOM - NIGHT`).
- `location`: Name of the location from available assets.
- `timeOfDay`: `DAY`, `NIGHT`, `DUSK`, `DAWN`.
- `lightingMood`: Cinematic lighting mood.
- `sceneContext`: Critical spatial and physical character context. Explicitly specify which character(s) are PHYSICALLY PRESENT in the room and distinguish from any character only appearing virtually on a device screen (e.g. "Minh Quân is alone in the room watching Linh Đan's livestream on his laptop screen. Linh Đan is NOT physically present in the apartment.").
- `propDetails`: Detailed appearance and placement of props across this scene for 100% visual consistency (e.g. "Sleek silver ultra-thin laptop open on the dark wooden desk next to a glass of whiskey").
- `frameDescription`: Concrete visual description of what is on screen (camera angle, actor positioning, lighting, background).
- `cameraMovement`: Dynamic camera instruction (e.g. `Slow push-in`, `Over-the-shoulder medium shot`, `Tracking shot`, `Extreme close-up`).
- `action`: Narrative action happening in this shot.
- `characterCostumes`: `[ { "character": "Character Name", "wardrobe": "Clothing description", "variantId": "exact_variantId_from_wardrobeVariants" } ]` (MANDATORY for every character physically present in this shot; `variantId` MUST EXACTLY MATCH one of the `variantId`s listed under that character's `Wardrobe Variants` in the linked assets).
- `props`: Array of prop names appearing in this shot.
- `dialogue`: `[ { "character": "Name", "line": "Exact dialogue line", "emotion": "Tone/Emotion", "speechTone": "Tone" } ]` (Empty array if silent/reaction shot).
- `durationSeconds`: Integer 5 to 8.
- `bgmMood`: Music mood cue.
- `sfxCues`: Sound effects cues array.
- `visualPrompt`: Concise prompt for AI image generation (Start Frame: subject + lighting + composition + mood).
- `endFramePrompt`: Concise prompt describing the visual end-state of this exact shot (End Frame: character's final gesture/smirk/gaze and lighting at the end of the clip).
- `transitionEffect`: OpenVideo GLSL transition key from the official catalog, or empty string `""` for direct cut (no transition):
  - **Fade / Dissolve**: `fade`, `fadegrayscale`, `fadecolor`
  - **Wipes**: `wipeLeft`, `wipeRight`, `wipeUp`, `wipeDown`, `directional`, `directionalwipe`, `radialSwipe`
  - **Zoom / 3D**: `cube`, `zoomInCircles`, `SimpleZoom`, `CrossZoom`, `DreamyZoom`
  - **Distortion**: `glitchMemories`, `GlitchDisplace`, `dreamy`, `Swirl`, `waterDrop`, `ripple`, `wind`
  - **Geometric**: `circle`, `circleopen`, `CircleCrop`, `windowblinds`, `windowslice`, `GridFlip`, `hexagonalize`, `kaleidoscope`
  - **Creative & Advanced**: `doorway`, `burn`, `LinearBlur`, `Mosaic`, `pixelize`, `InvertedPageCurl`, `PolkaDotsCurtain`, `morph`, `flyeye`
  - Leave as `""` (empty string) if this shot transitions to the next shot with a direct cut.
- `videoEffect`: OpenVideo Built-in GLSL & Pixi Filter Effect key to enhance shot atmosphere, or empty string `""` when no filter is needed.
  *CRITICAL CINEMATIC DIRECTIVE*: Intelligently assign visual effects matching the scene's emotional tone, genre, and dramatic beats:
  - **Dramatic Tension / Mystery / Secrets / Night Spying**: `vignette`, `dropShadowFilter`, `tiltShiftFilter`
  - **Flashback / Memory / Nostalgia / Past Trauma**: `sepia`, `retro70s`, `filmStripPro`, `oldFilmFilter`, `grayscale`
  - **Phone Livestream / Cyber Drama / Shock / Digital Exposure / Glitch**: `glitch`, `rgbGlitch`, `rgbShift`, `tvScanlines`, `crtFilter`, `pixelate`
  - **Romance / Glamour / High-Society Gala / Beauty Glow / Dream**: `bloomFilter`, `advancedBloomFilter`, `glowFilter`, `shine`, `godrayFilter`
  - **Action Climax / Panic / Running / Shockwave / Chaos**: `cameraMove`, `fastZoom`, `motionBlur`, `brightPulse`, `lightning`, `sparks`, `shockwaveFilter`
  - **Natural Realism**: Leave as `""` (empty string) for standard cinematic clarity.
- `referenceAssets`: `{ "characters": ["Name"], "locations": ["Name"], "props": ["Name"] }` (Only include characters who are physically present in this shot).

## JSON OUTPUT FORMAT:
Respond ONLY with a valid JSON object containing between {{minShots}} and {{maxShots}} shots:
```json
{
  "scenes": [
    {
      "sceneNumber": 1,
      "shotNumber": 1,
      "title": "Establishing Live Studio",
      "heading": "Ext. WORKING ROOM - NIGHT",
      "location": "Phòng làm việc của Linh Đan",
      "timeOfDay": "NIGHT",
      "lightingMood": "Warm ring light glowing against cold dark background",
      "sceneContext": "Linh Đan is alone in her studio room sitting directly in front of the camera.",
      "propDetails": "White glowing ring light on black tripod stand with a smartphone mounted in the center.",
      "frameDescription": "Wide establishing shot of Linh Dan seated in front of a glowing ring light tripod...",
      "cameraMovement": "Slow push-in toward ring light",
      "action": "Linh Dan adjusts her hair, preparing to speak to the phone camera with teary eyes.",
      "characterCostumes": [ { "character": "Linh Đan", "wardrobe": "White silk shirt", "variantId": "linh_dan_livestream" } ],
      "props": ["Đèn ring light", "Điện thoại"],
      "dialogue": [],
      "durationSeconds": 6,
      "bgmMood": "Slow melancholic piano",
      "sfxCues": ["Ambient studio hum"],
      "visualPrompt": "Wide shot of Vietnamese female influencer Linh Dan in modern minimalist room seated in front of a glowing ring light...",
      "endFramePrompt": "Linh Dan takes a deep breath, looking directly into the smartphone camera lens with tears glistening in her eyes.",
      "transitionEffect": "",
      "videoEffect": "",
      "referenceAssets": { "characters": ["Linh Đan"], "locations": ["Phòng làm việc của Linh Đan"], "props": ["Đèn ring light", "Điện thoại"] }
    }
  ]
}
```
