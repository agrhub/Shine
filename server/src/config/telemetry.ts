import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Logger } from '../utils/logger.js';

export class TelemetryService {
  private sdk: NodeSDK | null = null;
  private isInitialized = false;

  public initialize() {
    if (this.isInitialized) return;

    const traceExporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    });

    this.sdk = new NodeSDK({
      traceExporter,
      instrumentations: [getNodeAutoInstrumentations()],
    });

    try {
      this.sdk.start();
      this.isInitialized = true;
      Logger.info('[Telemetry] OpenTelemetry SDK initialized successfully');
    } catch (error: any) {
      Logger.error(`[Telemetry] Error initializing OpenTelemetry SDK: ${error.message}`);
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
      this.sdk?.shutdown()
        .then(() => Logger.info('[Telemetry] OpenTelemetry SDK shut down successfully'))
        .catch((error) => Logger.error(`[Telemetry] Error shutting down OpenTelemetry SDK: ${error.message}`))
        .finally(() => process.exit(0));
    });
  }
}

export const telemetryService = new TelemetryService();
