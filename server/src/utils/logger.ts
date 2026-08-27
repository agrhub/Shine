import { EnvConfig } from '@/config/env.js';
import { GrafanaObservabilityService } from '@/services/observability/GrafanaObservabilityService.js';

export const Logger = {
  info: (msg: string, ctx?: string, metadata?: Record<string, any>) => {
    console.log(`[${new Date().toISOString()}] [INFO]${ctx ? `[${ctx}]` : ''} ${msg}`);
    try {
      GrafanaObservabilityService.getInstance().recordLog('INFO', msg, ctx, metadata);
    } catch {}
  },
  warn: (msg: string, ctx?: string, metadata?: Record<string, any>) => {
    console.warn(`[${new Date().toISOString()}] [WARN]${ctx ? `[${ctx}]` : ''} ${msg}`);
    try {
      GrafanaObservabilityService.getInstance().recordLog('WARN', msg, ctx, metadata);
    } catch {}
  },
  error: (msg: string, ctx?: string, metadata?: Record<string, any>) => {
    console.error(`[${new Date().toISOString()}] [ERROR]${ctx ? `[${ctx}]` : ''} ${msg}`);
    try {
      GrafanaObservabilityService.getInstance().recordLog('ERROR', msg, ctx, metadata);
    } catch {}
  },
  debug: (msg: string, ctx?: string, metadata?: Record<string, any>) => {
    if (!EnvConfig.isProduction) {
      console.debug(`[${new Date().toISOString()}] [DEBUG]${ctx ? `[${ctx}]` : ''} ${msg}`);
    }
    try {
      GrafanaObservabilityService.getInstance().recordLog('DEBUG', msg, ctx, metadata);
    } catch {}
  },
  trace: (traceName: string, durationMs: number, status: 'SUCCESS' | 'ERROR' | 'DEGRADED' = 'SUCCESS', metadata?: Record<string, any>) => {
    console.log(`[${new Date().toISOString()}] [TRACE][${traceName}] ${durationMs}ms (${status})`);
    try {
      GrafanaObservabilityService.getInstance().recordTrace(traceName, durationMs, status, metadata);
    } catch {}
  },
};

