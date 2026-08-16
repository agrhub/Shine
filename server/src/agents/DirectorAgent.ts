import { storySkeletonAgent, type StorySkeletonInput, type StorySkeletonOutput } from './StorySkeletonAgent.js';
import { adaptationStrategyAgent } from './AdaptationStrategyAgent.js';
import { scriptAgent, type ScriptAgentInput, type ScriptItem } from './ScriptAgent.js';
import { supervisionAgent, type SupervisionResult } from './SupervisionAgent.js';

export interface FullScriptPipelineRequest {
  title: string;
  genre: string;
  tone: string;
  synopsis: string;
  episodeNumber?: number;
  totalEpisodes?: number;
}

export interface FullScriptPipelineResponse {
  outline: StorySkeletonOutput;
  adaptation: any;
  scriptItem: ScriptItem;
  supervision: SupervisionResult;
}

export class DirectorAgent {
  async runPipeline(request: FullScriptPipelineRequest): Promise<FullScriptPipelineResponse> {
    // 1. Generate story skeleton outline
    const outline = await storySkeletonAgent.execute({
      title: request.title,
      genre: request.genre,
      tone: request.tone,
      synopsis: request.synopsis,
      totalEpisodes: request.totalEpisodes || 20,
    });

    // 2. Determine adaptation strategy
    const adaptation = await adaptationStrategyAgent.execute({
      synopsis: request.synopsis,
      targetEpisodeCount: outline.totalEpisodes,
      pacingStyle: 'aggressive_hook',
    });

    // 3. Generate target episode script
    const targetEpisode = request.episodeNumber || 1;
    const scriptItem = await scriptAgent.execute({
      seriesId: outline.seriesId,
      episodeNumber: targetEpisode,
      genre: request.genre,
      tone: request.tone,
      synopsis: request.synopsis,
    });

    if (!scriptItem) {
      throw new Error(`Failed to generate script for episode ${targetEpisode}`);
    }

    // 4. Quality supervision check
    const supervision = await supervisionAgent.execute(scriptItem);

    return {
      outline,
      adaptation,
      scriptItem,
      supervision,
    };
  }
}

export const directorAgent = new DirectorAgent();
