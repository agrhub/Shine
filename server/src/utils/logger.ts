export const Logger = {
  info: (msg: string, ctx?: string) => {
    console.log(`[${new Date().toISOString()}] [INFO]${ctx ? `[${ctx}]` : ''} ${msg}`);
  },
  warn: (msg: string, ctx?: string) => {
    console.warn(`[${new Date().toISOString()}] [WARN]${ctx ? `[${ctx}]` : ''} ${msg}`);
  },
  error: (msg: string, ctx?: string) => {
    console.error(`[${new Date().toISOString()}] [ERROR]${ctx ? `[${ctx}]` : ''} ${msg}`);
  },
  debug: (msg: string, ctx?: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${new Date().toISOString()}] [DEBUG]${ctx ? `[${ctx}]` : ''} ${msg}`);
    }
  },
};
