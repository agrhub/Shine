export interface TTSRequest {
  text: string;
  voiceId: string;
  language?: string;
  speed?: number;
}

export class TTSService {
  async generateVoice(req: TTSRequest) {
    return {
      audioUrl: `https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg`,
      durationSeconds: Math.max(2, Math.ceil(req.text.length / 15)),
      voiceId: req.voiceId,
      status: 'READY',
    };
  }
}

export const ttsService = new TTSService();
