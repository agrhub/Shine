import { FunctionTool } from '@google/adk';
import { type ToolContextParams } from './context.js';
import { createMasterPlanTools, MasterPlanToolExecutors } from './masterPlan.tools.js';
import { createCharacterTools, CharacterToolExecutors } from './character.tools.js';
import { createAssetTools, AssetToolExecutors } from './asset.tools.js';
import { createVideoTools, VideoToolExecutors } from './video.tools.js';
import { createAudioTools, AudioToolExecutors } from './audio.tools.js';
import { createProductionPipelineTools, PipelineToolExecutors } from './pipeline.tools.js';
import { createRenderTools, RenderToolExecutors } from './render.tools.js';
import { createTimelineEditorTools } from './timeline.tools.js';
import { createScreenplayTools, ScreenplayToolExecutors } from './screenplay.tools.js';
import { createJobTools, JobToolExecutors } from './job.tools.js';
import { createPublishTools, PublishToolExecutors } from './publish.tools.js';

export * from './context.js';
export * from './masterPlan.tools.js';
export * from './character.tools.js';
export * from './asset.tools.js';
export * from './video.tools.js';
export * from './audio.tools.js';
export * from './pipeline.tools.js';
export * from './render.tools.js';
export * from './timeline.tools.js';
export * from './screenplay.tools.js';
export * from './job.tools.js';
export * from './publish.tools.js';

/**
 * Creates the complete aggregate array of ADK FunctionTools for Chatbot Copilot
 */
export function createChatbotTools(params?: ToolContextParams): FunctionTool[] {
  return [
    ...createMasterPlanTools(params),
    ...createCharacterTools(params),
    ...createAssetTools(params),
    ...createVideoTools(params),
    ...createAudioTools(params),
    ...createProductionPipelineTools(params),
    ...createRenderTools(params),
    ...createTimelineEditorTools(params),
    ...createScreenplayTools(params),
    ...createJobTools(params),
    ...createPublishTools(params),
  ];
}

