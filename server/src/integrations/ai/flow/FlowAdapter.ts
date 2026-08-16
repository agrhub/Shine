import axios from 'axios';
import { IAIAccount, AIAccount } from '@/models/AIAccount.js';
import { captchaService } from './CaptchaService.js';
import { StorageFactory } from '@/services/storage/StorageFactory.js';
import { AIModelType } from '@/models/AdminSettings.js';
import { flowSyncService } from './FlowSyncService.js';
import { Logger } from '@/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class FlowAdapter {
    private apiBaseUrl = 'https://aisandbox-pa.googleapis.com/v1';

    constructor() {}

    private mapAspectRatio(type: 'image' | 'video', ratio: string): string {
        const cleanRatio = ratio.trim().toLowerCase();

        if (type === 'image') {
            const imageMap: Record<string, string> = {
                '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
                '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
                '1:1': 'IMAGE_ASPECT_RATIO_SQUARE',
                '4:3': 'IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE',
                '3:4': 'IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR',
                'landscape': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
                'portrait': 'IMAGE_ASPECT_RATIO_PORTRAIT',
                'square': 'IMAGE_ASPECT_RATIO_SQUARE'
            };
            return imageMap[cleanRatio] || ratio;
        } else {
            const videoMap: Record<string, string> = {
                '16:9': 'VIDEO_ASPECT_RATIO_LANDSCAPE',
                '9:16': 'VIDEO_ASPECT_RATIO_PORTRAIT',
                'landscape': 'VIDEO_ASPECT_RATIO_LANDSCAPE',
                'portrait': 'VIDEO_ASPECT_RATIO_PORTRAIT'
            };
            return videoMap[cleanRatio] || ratio;
        }
    }

    public async uploadMedia(account: IAIAccount, buffer: Buffer, mimeType: string, projectId: string): Promise<string> {
        const url = `${this.apiBaseUrl}/flow/uploadImage`;
        const userAgent = account.lastFingerprint?.get('user_agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';
        
        const headers = {
            'authorization': `Bearer ${account.flowAT}`,
            'Content-Type': 'application/json',
            'User-Agent': userAgent,
            'x-browser-channel': 'stable',
            'Referer': 'https://labs.google/fx/tools/flow',
            'Origin': 'https://labs.google',
        };

        const sessionId = Math.random().toString().slice(2, 17);
        const ext = mimeType.split('/')[1] || 'png';
        const fileName = `upload_${Date.now()}.${ext}`;

        const payload = {
            clientContext: {
                projectId: projectId,
                sessionId: sessionId,
                tool: 'PINHOLE'
            },
            fileName: fileName,
            imageBytes: buffer.toString('base64'),
            isHidden: false,
            isUserUploaded: true,
            mimeType: mimeType || 'image/png'
        };

        try {
            Logger.info(`[FlowAdapter] Uploading media to Flow... (${buffer.length} bytes, mime: ${mimeType})`);
            const response = await axios.post(url, payload, { headers });
            
            const mediaName = response.data.media?.name || response.data.name || response.data.mediaId;
            if (!mediaName) {
                throw new Error('No mediaId returned from upload');
            }
            
            const cleanMediaId = mediaName.includes('/media/') ? mediaName.split('/media/')[1] : mediaName;
            Logger.info(`[FlowAdapter] Media uploaded successfully. MediaId: ${cleanMediaId}`);
            return cleanMediaId;
        } catch (error: any) {
            const msg = error.response?.data?.error?.message || error.message;
            Logger.error(`[FlowAdapter] uploadMedia failed: ${msg}`);
            throw new Error(`Flow Upload Failed: ${msg}`);
        }
    }

    private async resolveMediaInput(account: IAIAccount, input: any, projectId: string): Promise<string> {
        const resolveToVeoMedia = async (input: any) => {
            if (!input) return undefined;
            if (typeof input !== 'string') return input;

            try {
                let buffer: Buffer;
                let mimeType = 'image/png';

                if (input.startsWith('https://') || input.startsWith('http://')) {
                    const response = await axios.get(input, { responseType: 'arraybuffer' });
                    buffer = Buffer.from(response.data);
                    mimeType = String(response.headers['content-type'] || 'image/png');
                } else {
                    const stream = await StorageFactory.getFileStream(input);
                    const chunks: any[] = [];
                    buffer = await new Promise<Buffer>((resolve, reject) => {
                        stream.on('data', (chunk: any) => chunks.push(chunk));
                        stream.on('error', reject);
                        stream.on('end', () => resolve(Buffer.concat(chunks)));
                    });
                    
                    if (input.endsWith('.jpg') || input.endsWith('.jpeg')) mimeType = 'image/jpeg';
                    else if (input.endsWith('.webp')) mimeType = 'image/webp';
                    else if (input.endsWith('.mp4')) mimeType = 'video/mp4';
                }

                return {
                    mediaBytes: buffer.toString('base64'),
                    mimeType
                };
            } catch (err: any) {
                Logger.warn(`[FlowAdapter] Failed to resolve reference media ${input}: ${err.message}`);
                return undefined;
            }
        };

        if (typeof input === 'string' && input.startsWith('projects/') && input.includes('/media/')) {
            return input.split('/media/')[1];
        }

        const data = await resolveToVeoMedia(input);
        if (data) {
            const buffer = Buffer.from(data.mediaBytes, 'base64');
            return await this.uploadMedia(account, buffer, data.mimeType, projectId);
        }

        return input;
    }

    private resolveModelSettings(type: AIModelType.IMAGE | AIModelType.VIDEO, modelId: string, config: any = {}) {
        const rawRatio = config.aspectRatio || (type === AIModelType.IMAGE ? 'IMAGE_ASPECT_RATIO_LANDSCAPE' : 'VIDEO_ASPECT_RATIO_LANDSCAPE');
        const ratio = this.mapAspectRatio(type, rawRatio);
        
        const isPortrait = ratio.includes('PORTRAIT') || 
                          rawRatio === '9:16' || 
                          rawRatio === '3:4' || 
                          modelId.includes('portrait');
        
        if (type === AIModelType.IMAGE) {
            let imageModelName = 'IMAGEN_3_5';
            if (modelId.includes('gemini-2.5-flash')) imageModelName = "NARWHAL";
            else if (modelId.includes('gemini-3.0-pro') || modelId.includes('gemini-3-pro')) imageModelName = 'GEM_PIX_2';
            else if (modelId.includes('imagen-4.0')) imageModelName = 'IMAGEN_3_5';
            else if (modelId.includes('gemini-3.1-flash') || modelId.includes('narwhal')) imageModelName = 'NARWHAL';

            let upsample: string | null = null;
            if (modelId.includes('-2k')) upsample = 'UPSAMPLE_IMAGE_RESOLUTION_2K';
            else if (modelId.includes('-4k')) upsample = 'UPSAMPLE_IMAGE_RESOLUTION_4K';

            return { imageModelName, aspectRatio: ratio, upsample } as any;
        } else {
            let videoType: 't2v' | 'i2v' | 'r2v' | 'extend' | 'upsample' = 't2v';
            const images = config.imageInputs || config.referenceImages || [];
            const hasStartEnd = !!(config.imageStart || config.imageEnd || config.image);
            const hasCharacters = !!(config.characterImages && config.characterImages.length > 0);

            let prefix = 'veo_3_1';
            if(modelId.includes('veo-3.0')) prefix = "veo_3_0";
            else if(modelId.includes('veo-3.1')) prefix = "veo_3_1";

            if (config.mode === 'extend' || config.videoType === 'extend') {
                videoType = 'extend';
            } else if (config.mode === 'upsample' || config.videoType === 'upsample') {
                videoType = 'upsample';
            } else if (hasCharacters || (images.length > 0)) {
                videoType = 'r2v';
            } else if (hasStartEnd || images.length >= 1) {
                videoType = (config.mode === 'r2v') ? 'r2v' : 'i2v';
            }

            let videoModelKey = `${prefix}_t2v_fast_landscape`;
            if (videoType === 'extend') {
                videoModelKey = isPortrait ? `${prefix}_extend_portrait` : `${prefix}_extend`;
            } else if (videoType === 'upsample') {
                const resolution = config.resolution || 'VIDEO_RESOLUTION_4K';
                videoModelKey = resolution === 'VIDEO_RESOLUTION_1080P' ? `${prefix}_upsampler_1080p` : `${prefix}_upsampler_4k`;
            } else {
                if (videoType === 't2v') {
                    videoModelKey = isPortrait ? `${prefix}_t2v_fast_portrait` : `${prefix}_t2v_fast`;
                } else if (videoType === 'i2v') {
                    videoModelKey = isPortrait ? `${prefix}_i2v_s_fast_portrait_fl` : `${prefix}_i2v_s_fast_fl`;
                } else if (videoType === 'r2v') {
                    videoModelKey = isPortrait ? `${prefix}_r2v_fast_portrait` : `${prefix}_r2v_fast_landscape`;
                }
            }

            return { videoModelKey, aspectRatio: ratio, videoType, resolution: config.resolution || 'VIDEO_RESOLUTION_1080P' };
        }
    }

    private getSessionId(){
        return ';' + new Date().getTime();
    }

    public async generateImage(account: IAIAccount, prompt: string, modelName: string, config: any = {}) {
        try {
            const freshAccount = await AIAccount.findById((account as any)._id);
            if (freshAccount && freshAccount.flowAT) {
                account = freshAccount;
            }
        } catch (refreshErr: any) {}
        
        if (!account.flowAT) {
            await flowSyncService.refreshAccountTokens(account);
        }

        let projectId = account.projectId || config.projectId;
        if (!projectId) {
            projectId = await flowSyncService.ensureProject(account);
        }

        const imageInputs: any[] = [];
        if (config.imageInputs && config.imageInputs.length > 0) {
            for (const img of config.imageInputs) {
                const mediaId = await this.resolveMediaInput(account, img, projectId);
                imageInputs.push({
                    name: mediaId,
                    imageInputType: 'IMAGE_INPUT_TYPE_REFERENCE'
                });
            }
        }

        const settings = this.resolveModelSettings(AIModelType.IMAGE, modelName, { ...config, imageInputs });

        let retry = 5;
        while(retry > 0){
            try{
                const recaptchaToken = await captchaService.solve({
                    projectId: projectId,
                    action: 'IMAGE_GENERATION',
                    tokenId: (account as any)._id
                });

                if (!recaptchaToken) throw new Error('Failed to obtain reCAPTCHA token');

                const sessionId = this.getSessionId();
                const url = `${this.apiBaseUrl}/projects/${projectId}/flowMedia:batchGenerateImages`;
                const clientContext = {
                    recaptchaContext: {
                        token: recaptchaToken,
                        applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB"
                    },
                    sessionId: sessionId,
                    projectId: projectId,
                    tool: 'PINHOLE'
                };

                const requestData: any = {
                    clientContext: clientContext,
                    seed: Math.floor(Math.random() * 99999) + 1,
                    imageModelName: settings.imageModelName,
                    imageAspectRatio: settings.aspectRatio,
                    structuredPrompt: {
                        parts: [{ text: prompt }]
                    },
                };

                if (imageInputs.length > 0) requestData.imageInputs = imageInputs;

                const payload: any = {
                    clientContext: clientContext,
                    mediaGenerationContext: { batchId: uuidv4() },
                    useNewMedia: true,
                    requests: [requestData]
                };

                if (settings.upsample) payload.requests[0].upsampleImageResolution = settings.upsample;

                const userAgent = account.lastFingerprint?.get('user_agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';
                const headers: any = {
                    'authorization': `Bearer ${account.flowAT}`,
                    'Content-Type': 'application/json',
                    'User-Agent': userAgent,
                    'x-browser-channel': 'stable',
                    'Referer': 'https://labs.google/fx/tools/flow',
                    'Origin': 'https://labs.google',
                };

                const response = await axios.post(url, payload, { headers });
            
                let imageBytes = null;
                let fifeUrl = null;

                if (response.data.media?.[0]?.image?.imageBytes) {
                    imageBytes = response.data.media[0].image.imageBytes;
                } else if (response.data.results?.[0]?.image?.imageBytes) {
                    imageBytes = response.data.results[0].image.imageBytes;
                } else if (response.data.media?.[0]?.image?.generatedImage?.fifeUrl) {
                    fifeUrl = response.data.media[0].image.generatedImage.fifeUrl;
                }

                retry = 0;

                if (imageBytes) {
                    return { buffer: Buffer.from(imageBytes, 'base64'), mimeType: 'image/png' };
                }

                if (fifeUrl) {
                    return { url: fifeUrl, mimeType: 'image/jpeg' };
                }

                const mediaName = response.data.media?.[0]?.name || response.data.name;
                if (mediaName && mediaName.includes('operations/')) {
                    return await this.pollMedia(account, projectId, mediaName, AIModelType.IMAGE);
                }

                throw new Error('Flow API Error: No image returned from generation');
            }catch(error: any){
                const msg = error.response?.data?.error?.message || error.message;
                if(msg != "reCAPTCHA evaluation failed"){
                    throw new Error(`Flow Image Generation Failed: ${msg}`);
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
                retry--;
            }
        }
        return null;
    }

    public async generateVideo(account: IAIAccount, prompt: string, modelName: string, config: any = {}) {
        try {
            const freshAccount = await AIAccount.findById((account as any)._id);
            if (freshAccount && freshAccount.flowAT) account = freshAccount;
        } catch (refreshErr: any) {}
        
        if (!account.flowAT) await flowSyncService.refreshAccountTokens(account);

        let projectId = account.projectId || config.projectId;
        if (!projectId) projectId = await flowSyncService.ensureProject(account);

        const rawImages = [
            ...(config.imageInputs || []),
            ...(config.referenceImages || []),
            ...(config.characterImages || []),
            ...(config.characterReferences || []),
            config.imageStart,
            config.imageEnd,
            config.image
        ].filter(img => !!img);

        const uniqueImages = [...new Set(rawImages)];
        const resolvedMediaIds: string[] = [];
        for (const img of uniqueImages.slice(0, 3)) {
            resolvedMediaIds.push(await this.resolveMediaInput(account, img, projectId));
        }

        const rawVideos = [config.videoInput, config.referenceVideo, config.video].filter(v => !!v);
        const uniqueVideos = [...new Set(rawVideos)];
        const resolvedVideoIds: string[] = [];
        for (const vid of uniqueVideos) {
            resolvedVideoIds.push(await this.resolveMediaInput(account, vid, projectId));
        }

        const settings = this.resolveModelSettings(AIModelType.VIDEO, modelName, { ...config, imageInputs: resolvedMediaIds });

        let retry = 5;
        while(retry > 0){
            try{
                const recaptchaToken = await captchaService.solve({
                    projectId: projectId,
                    action: 'VIDEO_GENERATION',
                    tokenId: (account as any)._id
                });

                if (!recaptchaToken) throw new Error('Failed to obtain reCAPTCHA token for Flow generation');

                const sessionId = this.getSessionId();
                const sceneId = uuidv4();
                
                let url = `${this.apiBaseUrl}/video:batchAsyncGenerateVideoText`;
                if (settings.videoType === 'i2v') {
                    if (resolvedMediaIds.length === 1) url = `${this.apiBaseUrl}/video:batchAsyncGenerateVideoStartImage`;
                    else url = `${this.apiBaseUrl}/video:batchAsyncGenerateVideoStartAndEndImage`;
                } else if (settings.videoType === 'r2v') {
                    url = `${this.apiBaseUrl}/video:batchAsyncGenerateVideoReferenceImages`;
                } else if (settings.videoType === 'extend') {
                    url = `${this.apiBaseUrl}/video:batchAsyncGenerateVideoExtendVideo`;
                } else if (settings.videoType === 'upsample') {
                    url = `${this.apiBaseUrl}/video:batchAsyncGenerateVideoUpsampleVideo`;
                }

                const clientContext = {
                    recaptchaContext: {
                        token: recaptchaToken,
                        applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB"
                    },
                    sessionId: sessionId,
                    projectId: projectId,
                    tool: 'PINHOLE',
                    userPaygateTier: config.userPaygateTier || "PAYGATE_TIER_ZERO"
                };

                const requests: any = {
                    aspectRatio: settings.aspectRatio,
                    seed: Math.floor(Math.random() * 99999) + 1,
                    videoModelKey: settings.videoModelKey,
                    metadata: { sceneId: sceneId }
                };

                if (settings.videoType !== 'upsample') {
                    requests.textInput = {
                        structuredPrompt: { parts: [{ text: prompt }] }
                    };
                }

                if (settings.videoType === 'i2v') {
                    requests.startImage = resolvedMediaIds[0] ? { mediaId: resolvedMediaIds[0] } : undefined;
                    requests.endImage = resolvedMediaIds[1] ? { mediaId: resolvedMediaIds[1] } : undefined;
                } else if (settings.videoType === 'r2v') {
                    if(resolvedMediaIds.length > 0){
                        requests.referenceImages = resolvedMediaIds.map(id => ({
                            mediaId: id,
                            imageUsageType: 'IMAGE_USAGE_TYPE_ASSET'
                        }));
                    }
                } else if (settings.videoType === 'extend') {
                    const videoMediaId = resolvedVideoIds[0];
                    if (!videoMediaId) throw new Error('Extend mode requires a source video reference');
                    requests.videoInput = { mediaId: videoMediaId };
                } else if (settings.videoType === 'upsample') {
                    const videoMediaId = resolvedVideoIds[0];
                    if (!videoMediaId) throw new Error('Upsample mode requires a source video reference');
                    requests.videoInput = { mediaId: videoMediaId };
                    requests.resolution = settings.resolution;
                }

                const payload: any = {
                    clientContext: clientContext,
                    requests: [requests],
                    useV2ModelConfig: true,
                    mediaGenerationContext: { batchId: uuidv4() }
                };

                const userAgent = account.lastFingerprint?.get('user_agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';
                const headers: any = {
                    'authorization': `Bearer ${account.flowAT}`,
                    'Content-Type': 'application/json',
                    'User-Agent': userAgent,
                    'x-browser-channel': 'stable',
                    'Referer': 'https://labs.google/fx/tools/flow',
                    'Origin': 'https://labs.google',
                };

                const response = await axios.post(url, payload, { headers });
                
                const mediaName = response.data.name || 
                                response.data.operation?.name || 
                                response.data.results?.[0]?.name ||
                                response.data.media?.[0]?.name;

                if (!mediaName) throw new Error('Flow API Error: No operation name returned');

                if (config.async === true) return { jobId: mediaName, status: 'pending' };

                retry = 0;

                return await this.pollMedia(account, projectId, mediaName, AIModelType.VIDEO);
            }catch(error: any){
                const msg = error.response?.data?.error?.message || error.message;
                if(msg.includes("Resource has been exhausted")) await flowSyncService.refreshAccountTokens(account);
                if(msg != "reCAPTCHA evaluation failed") throw new Error(`Flow Video Generation Failed: ${msg}`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                retry--;
            }
        }
        return null;
    }

    private async pollMedia(account: IAIAccount, projectId: string, mediaName: string, type: AIModelType.IMAGE | AIModelType.VIDEO): Promise<any> {
        const url = type === AIModelType.VIDEO 
            ? `${this.apiBaseUrl}/video:batchCheckAsyncVideoGenerationStatus`
            : `${this.apiBaseUrl}/projects/${projectId}/${mediaName}`;

        const headers = {
            'Authorization': `Bearer ${account.flowAT}`,
            'User-Agent': account.lastFingerprint?.get('user_agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'Origin': 'https://labs.google',
            'Referer': 'https://labs.google/fx/tools/flow',
        };

        const maxPolls = 18;
        let pollCount = 0;
        let results: any = null;

        while (pollCount < maxPolls) {
            try {
                if (type === AIModelType.VIDEO) {
                    const payload = { operations: [{ operation: { name: mediaName } }] };
                    const response = await axios.post(url, payload, { headers });
                    const opResult = response.data.operations?.[0]?.operation || {};
                    const status = response.data.operations?.[0]?.status || "";

                    if(status === 'MEDIA_GENERATION_STATUS_FAILED'){
                        throw new Error(opResult.error?.message || 'Video generation failed');
                    }
                    else if(status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL'){
                        const videoUri = opResult.metadata?.video?.fifeUrl;
                        if (videoUri) {
                            results = { url: videoUri, mimeType: 'video/mp4' };
                        }
                        break;
                    }
                } else {
                    const response = await axios.get(url, { headers });
                    const data = response.data;

                    if (data.done || data.state === 'SUCCEEDED') {
                        const result = data.media?.[0] || data.results?.[0] || data.response?.results?.[0];
                        if (result?.image?.imageBytes) {
                            results = { buffer: Buffer.from(result.image.imageBytes, 'base64'), mimeType: 'image/png' };
                        }
                        if (result?.image?.generatedImage?.fifeUrl) {
                            results = { url: result.image.generatedImage.fifeUrl, mimeType: 'image/jpeg' };
                        }
                        break;
                    }
                    if (data.error || (data.state === 'FAILED')) throw new Error(data.error?.message || 'Generation failed');
                }
            } catch (err: any) {
                break;
            }

            pollCount++;
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        if(results) return results;
        throw new Error(`${type} generation failed.`);
    }
}

export const flowAdapter = new FlowAdapter();
