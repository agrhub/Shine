import { FunctionTool } from '@google/adk';
import { Type } from '@google/genai';
import { getActiveChatContext, type ToolContextParams } from './context.js';

export function createTimelineEditorTools(context?: ToolContextParams): FunctionTool[] {
  const dispatchAction = (payload: any) => {
    const onItemUpdated = context?.onItemUpdated || getActiveChatContext()?.onItemUpdated;
    onItemUpdated?.({ type: 'timeline_action', data: payload });
  };

  return [
    new FunctionTool({
      name: 'add_text',
      description: 'Add a text or subtitle layer to the video timeline',
      parameters: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: 'The text content to display' },
          targetId: { type: Type.STRING, description: 'The unique ID for this new text asset' },
          from: { type: Type.NUMBER, description: 'Start time in seconds' },
          to: { type: Type.NUMBER, description: 'End time in seconds' },
          fontSize: { type: Type.NUMBER, description: 'Font size in pixels' },
          fontFamily: { type: Type.STRING, description: 'Font family' },
          fill: { type: Type.STRING, description: 'Text color in hex format (e.g., #FFFFFF)' },
        },
        required: ['text'],
      },
      execute: async (args: any) => {
        const payload = { action: 'add_text', ...args };
        dispatchAction(payload);
        return { success: true, message: `Added text "${args.text}" to timeline`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'add_image',
      description: 'Add an image to the video timeline based on a prompt or URL',
      parameters: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING, description: 'Detailed description of the image' },
          url: { type: Type.STRING, description: 'URL of the image if available' },
          targetId: { type: Type.STRING, description: 'The unique ID for this new asset' },
          from: { type: Type.NUMBER, description: 'Start time in seconds (default 0)' },
          to: { type: Type.NUMBER, description: 'End time in seconds (default 0)' },
        },
        required: ['prompt'],
      },
      execute: async (args: any) => {
        const payload = { action: 'add_image', ...args };
        dispatchAction(payload);
        return { success: true, message: `Added image to timeline`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'add_video',
      description: 'Add a video clip to the timeline based on a prompt or URL',
      parameters: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING, description: 'Detailed description of the video' },
          url: { type: Type.STRING, description: 'URL of the video if available' },
          targetId: { type: Type.STRING, description: 'The unique ID for this new asset' },
          from: { type: Type.NUMBER, description: 'Start time in seconds' },
          to: { type: Type.NUMBER, description: 'End time in seconds' },
        },
        required: ['prompt'],
      },
      execute: async (args: any) => {
        const payload = { action: 'add_video', ...args };
        dispatchAction(payload);
        return { success: true, message: `Added video clip to timeline`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'add_audio',
      description: 'Add audio or music to the video timeline',
      parameters: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING, description: 'Description of the audio or music' },
          url: { type: Type.STRING, description: 'URL of the audio if available' },
          targetId: { type: Type.STRING, description: 'The unique ID for this new asset' },
          from: { type: Type.NUMBER, description: 'Start time in seconds' },
          to: { type: Type.NUMBER, description: 'End time in seconds' },
        },
        required: ['prompt'],
      },
      execute: async (args: any) => {
        const payload = { action: 'add_audio', ...args };
        dispatchAction(payload);
        return { success: true, message: `Added audio to timeline`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'update_clip',
      description: 'Update properties of an existing timeline clip',
      parameters: {
        type: Type.OBJECT,
        properties: {
          targetId: { type: Type.STRING, description: 'The ID of the clip to update' },
          left: { type: Type.NUMBER },
          top: { type: Type.NUMBER },
          width: { type: Type.NUMBER },
          height: { type: Type.NUMBER },
          start: { type: Type.NUMBER, description: 'Start time in seconds' },
          fontSize: { type: Type.NUMBER, description: 'Font size for text clips' },
          fontFamily: { type: Type.STRING, description: 'Font family for text clips' },
          fill: { type: Type.STRING, description: 'Text color in hex format' },
          opacity: { type: Type.NUMBER, description: 'Opacity from 0 to 1' },
          volume: { type: Type.NUMBER, description: 'Volume from 0 to 1' },
          playbackRate: { type: Type.NUMBER, description: 'Playback rate' },
        },
        required: ['targetId'],
      },
      execute: async (args: any) => {
        const payload = { action: 'update_clip', ...args };
        dispatchAction(payload);
        return { success: true, message: `Updated clip ${args.targetId}`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'remove_clip',
      description: 'Remove a clip from the timeline',
      parameters: {
        type: Type.OBJECT,
        properties: {
          targetId: { type: Type.STRING, description: 'The ID of the clip to remove' },
        },
        required: ['targetId'],
      },
      execute: async (args: any) => {
        const payload = { action: 'remove_clip', ...args };
        dispatchAction(payload);
        return { success: true, message: `Removed clip ${args.targetId}`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'split_clip',
      description: 'Split a clip at a specific time',
      parameters: {
        type: Type.OBJECT,
        properties: {
          targetId: { type: Type.STRING, description: 'The ID of the clip to split' },
          time: { type: Type.NUMBER, description: 'The time in seconds to split at' },
        },
        required: ['targetId'],
      },
      execute: async (args: any) => {
        const payload = { action: 'split_clip', ...args };
        dispatchAction(payload);
        return { success: true, message: `Split clip ${args.targetId} at ${args.time}s`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'add_transition',
      description: 'Add a transition between two clips',
      parameters: {
        type: Type.OBJECT,
        properties: {
          fromId: { type: Type.STRING, description: 'Source clip ID' },
          toId: { type: Type.STRING, description: 'Target clip ID' },
          type: { type: Type.STRING, description: 'Transition type: fade, wipe, dissolve, glitch' },
          duration: { type: Type.NUMBER, description: 'Duration in seconds (default 0.5)' },
        },
        required: ['fromId', 'toId', 'type'],
      },
      execute: async (args: any) => {
        const payload = { action: 'add_transition', ...args };
        dispatchAction(payload);
        return { success: true, message: `Added transition between ${args.fromId} and ${args.toId}`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'add_effect',
      description: 'Add a visual effect to a clip',
      parameters: {
        type: Type.OBJECT,
        properties: {
          effectName: { type: Type.STRING, description: 'Name of the effect (e.g., glitch, sepia)' },
          from: { type: Type.NUMBER, description: 'Start time in seconds' },
          to: { type: Type.NUMBER, description: 'End time in seconds' },
        },
        required: ['effectName'],
      },
      execute: async (args: any) => {
        const payload = { action: 'add_effect', ...args };
        dispatchAction(payload);
        return { success: true, message: `Added effect "${args.effectName}"`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'duplicate_clip',
      description: 'Duplicate a specific clip or the selected ones',
      parameters: {
        type: Type.OBJECT,
        properties: {
          targetId: { type: Type.STRING, description: 'The ID of the clip to duplicate' },
        },
      },
      execute: async (args: any) => {
        const payload = { action: 'duplicate_clip', ...args };
        dispatchAction(payload);
        return { success: true, message: `Duplicated clip ${args.targetId}`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'trim_clip',
      description: 'Trim a clip to a specific range',
      parameters: {
        type: Type.OBJECT,
        properties: {
          targetId: { type: Type.STRING, description: 'The ID of the clip to trim' },
          trimFrom: { type: Type.NUMBER, description: "The new start time in seconds relative to the clip's source" },
        },
        required: ['trimFrom'],
      },
      execute: async (args: any) => {
        const payload = { action: 'trim_clip', ...args };
        dispatchAction(payload);
        return { success: true, message: `Trimmed clip ${args.targetId}`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'seek_to_time',
      description: 'Move the playhead to a specific time',
      parameters: {
        type: Type.OBJECT,
        properties: {
          time: { type: Type.NUMBER, description: 'Time in seconds to seek to' },
        },
        required: ['time'],
      },
      execute: async (args: any) => {
        const payload = { action: 'seek_to_time', ...args };
        dispatchAction(payload);
        return { success: true, message: `Seeked to ${args.time}s`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'play_pause',
      description: 'Play or pause the timeline playback',
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, description: "'play', 'pause', or 'toggle'" },
        },
        required: ['action'],
      },
      execute: async (args: any) => {
        const payload = { action: 'play_pause', ...args };
        dispatchAction(payload);
        return { success: true, message: `Executed playback action: ${args.action}`, data: payload };
      },
    }),
  ];
}
