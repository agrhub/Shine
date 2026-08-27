import axios from 'axios';
import { StorageFactory } from './storage/StorageFactory.js';
import { DspAudioService, DspSeparationResult } from './DspAudioService.js';
import { Logger } from '../utils/logger.js';

export interface StemSeparationResult {
  bgmUrl: string;
  vocalsUrl?: string;
  source: 'demucs-cloud-run' | 'dsp-fallback';
}

export class DemucsAudioService {
  /**
   * Separates Vocal and clean BGM using Google Cloud Run Demucs AI Worker.
   * Gracefully falls back to local DSP if service is not configured or temporarily unreachable.
   */
  public static async separateStem(
    sourceUrl: string,
    options: {
      model?: string;
      twoStems?: string;
    } = {}
  ): Promise<StemSeparationResult> {
    const serviceUrl = (process.env.DEMUCS_SERVICE_URL || process.env.DEMUCS_API_URL || '').trim().replace(/\/+$/, '');

    if (serviceUrl) {
      try {
        Logger.info(`[DemucsAudioService] Calling Demucs AI Stem Separator at ${serviceUrl} for: ${sourceUrl}`);

        // 1. Resolve absolute/public URL for the Cloud Run worker
        const resolvedPublicUrl = await StorageFactory.resolvePublicUrl(sourceUrl);

        // 2. Call Cloud Run /separate endpoint
        const response = await axios.post(
          `${serviceUrl}/separate`,
          {
            audioUrl: resolvedPublicUrl,
            twoStems: options.twoStems || 'vocals',
            model: options.model || 'htdemucs',
          },
          {
            timeout: 120_000, // 2 minutes timeout for serverless worker
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (response.data && response.data.success) {
          let cleanBgmUrl = response.data.bgmUrl || '';
          let cleanVocalsUrl = response.data.vocalsUrl || '';

          // 3. Upload separated BGM data to Cloud Storage
          if (cleanBgmUrl.startsWith('data:')) {
            const bgmUpload = await StorageFactory.uploadMedia(cleanBgmUrl, 'audio', 'wav', 'audio/wav');
            cleanBgmUrl = `/api/assets/file/${bgmUpload.key}`;
          }

          if (cleanVocalsUrl.startsWith('data:')) {
            const vocUpload = await StorageFactory.uploadMedia(cleanVocalsUrl, 'audio', 'wav', 'audio/wav');
            cleanVocalsUrl = `/api/assets/file/${vocUpload.key}`;
          }

          Logger.info(`[DemucsAudioService] Successfully separated clean BGM stem via Cloud Run Demucs: ${cleanBgmUrl}`);
          return {
            bgmUrl: cleanBgmUrl,
            vocalsUrl: cleanVocalsUrl,
            source: 'demucs-cloud-run',
          };
        }
      } catch (err: any) {
        Logger.warn(`[DemucsAudioService] Demucs Cloud Run service call failed (${err.message}), falling back to DSP...`);
      }
    } else {
      Logger.info(`[DemucsAudioService] DEMUCS_SERVICE_URL not set, using DSP audio separation fallback.`);
    }

    // Fallback to DSP audio separation
    try {
      const dspResult = await DspAudioService.separateVocalAndBgm(sourceUrl);
      return {
        bgmUrl: dspResult?.bgmUrl || '',
        source: 'dsp-fallback',
      };
    } catch (dspErr: any) {
      Logger.warn(`[DemucsAudioService] DSP separation fallback notice: ${dspErr.message}`);
      return {
        bgmUrl: '',
        source: 'dsp-fallback',
      };
    }
  }
}
