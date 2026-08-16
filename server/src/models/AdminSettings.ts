export enum AIModelType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  MUSIC = 'music',
  VOICE = 'voice',
}

export const getAdminSettings = async () => {
  return {
    apiConfigs: {
      captcha: {
        method: 'yescaptcha',
        yescaptcha: {
          apiKey: process.env.YESCAPTCHA_API_KEY || 'dummy_key',
          baseUrl: 'https://api.yescaptcha.com',
        },
      },
    },
    aiSettings: {
      providers: [],
    },
  };
};
