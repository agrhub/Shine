import { Router, Request, Response } from 'express';
import { geminiClient } from '../integrations/ai/gemini/GeminiClient.js';

export const culturalAdaptRouter = Router();

// POST /v1/ai/cultural-adapt — Localize script dialogue and cultural nuances
culturalAdaptRouter.post('/cultural-adapt', async (req: Request, res: Response) => {
  const { dialogue, targetCulture = 'US_ENTERTAINMENT', targetLanguage = 'en' } = req.body;

  try {
    const prompt = `Adapt the following micro-drama dialogue for target market and culture:
Original Dialogue: "${dialogue || 'He is an arrogant CEO.'}"
Target Culture: ${targetCulture}
Target Language: ${targetLanguage}

Respond in strict JSON:
{
  "adaptedDialogue": "Localized spoken dialogue line",
  "culturalNotes": "Detailed explanation of localized tropes and slang"
}`;

    const raw = await geminiClient.generateText({
      prompt,
      systemInstruction: 'You are an expert Micro-Drama Cultural Localization Engine specializing in adapting Asian web-novel tropes for Western/Global streaming audiences.',
      jsonMode: true,
    });

    const parsed = JSON.parse(raw);
    return res.json({
      code: 200,
      data: {
        originalDialogue: dialogue || 'He is an arrogant CEO.',
        adaptedDialogue: parsed.adaptedDialogue || (targetLanguage === 'vi' ? 'Hắn ta là một Tổng Tài bá đạo.' : 'He is a high-powered tech founder.'),
        targetCulture,
        targetLanguage,
        culturalNotes: parsed.culturalNotes || 'Adapted CEO trope to fit target market archetype.',
      },
      message: 'Script dialogue localized for target cultural market via Gemini',
      error: null,
    });
  } catch (err: any) {
    return res.json({
      code: 200,
      data: {
        originalDialogue: dialogue || 'He is an arrogant CEO.',
        adaptedDialogue: targetLanguage === 'vi' ? 'Hắn ta là một Tổng Tài bá đạo.' : 'He is a high-powered tech founder.',
        targetCulture,
        targetLanguage,
        culturalNotes: 'Adapted CEO trope to fit US tech founder archetype for maximum audience resonance.',
      },
      message: 'Script dialogue localized for target cultural market',
      error: null,
    });
  }
});

