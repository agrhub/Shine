# Production Storyboard & Shot Composition Skill

## Overview
This skill generates structured storyboard shot descriptions, visual framing instructions, character positioning, dynamic camera movements, and prompt payloads for AI video synthesis models (Google Veo-3, Luma Dream Machine, Kling, Runaway Gen-3).

## Composition Rules
1. **Aspect Ratio**: 9:16 Vertical Video (1080x1920) optimized for TikTok, Reels, Shorts, and mobile micro-dramas.
2. **Framing Types**:
   - **Extreme Close-Up (ECU)**: Emotional intensity, eye reactions, dramatic reveals.
   - **Close-Up (CU)**: Character dialogue, facial micro-expressions, key reactions.
   - **Medium Shot (MS)**: Waist-up interaction, two-shots during confrontations.
   - **Over-The-Shoulder (OTS)**: Tension-building conversational exchanges.
   - **Full Shot (FS)**: Physical stunts, luxury environment reveals, dynamic entrances.
3. **Camera Movement Directions**:
   - `Static`: High-tension stillness.
   - `Pan Left/Right`: Revealing hidden characters or environmental context.
   - `Push-In / Dolly In`: Escalating drama or emotional climax.
   - `Pull-Back`: Dramatic reveal or isolation of character.
   - `Orbit / Arc`: 360-degree dramatic intensity around key subjects.
   - `Tracking Shot`: Fast-paced action or dramatic walking confrontations.

## JSON Schema Output
```json
{
  "scene_number": 1,
  "shots": [
    {
      "shot_number": 1,
      "framing": "CU",
      "camera_motion": "Push-In",
      "duration_seconds": 4.0,
      "characters": ["character_1"],
      "action_description": "The CEO turns abruptly as the boardroom doors swing open.",
      "visual_prompt": "Cinematic vertical 9:16 shot, medium close-up, handsome billionaire CEO in bespoke black tailored suit, intense sharp gaze, modern glass skyscraper boardroom in background, cinematic rim lighting, 8k resolution, photorealistic, Unreal Engine 5 render style",
      "negative_prompt": "low quality, distorted face, extra limbs, blurry, pixelated, 2d cartoon, watermark",
      "transition": "cut"
    }
  ]
}
```

## Prompt Engineering Directives
- Always specify consistent character anchor descriptors (hair color, attire, lighting).
- Maintain continuous ambient lighting consistency across shots within the same scene.
- Ensure audio sync cue points match speech timing in milliseconds.
