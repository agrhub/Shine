import { aiClient } from './AiClient';
import fs from 'fs';
import path from 'path';

export interface ScriptAgentRequest {
  title: string;
  genre: string;
  tone: string;
  synopsis: string;
  episodeNumber?: number;
  totalEpisodes?: number;
}

export class ScriptAgentService {
  private loadSkillPrompt(skillName: string): string {
    try {
      const filePath = path.join(process.cwd(), 'src', 'skills', `${skillName}.md`);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch {
      // fallback
    }
    return '';
  }

  // 1. Decision AI Layer
  async runDecisionAI(req: ScriptAgentRequest) {
    const decisionSkill = this.loadSkillPrompt('script_agent_decision');
    const prompt = `Analyze micro-drama project: Title: "${req.title}", Genre: "${req.genre}", Tone: "${req.tone}". Synopsis: ${req.synopsis}. Determine hook strategy, viral tropes, and golden climax.`;
    
    const fallback = {
      viralHooks: ['Identity Reveal', 'Betrayal at Public Banquet', 'Revenge Takeover'],
      targetAudience: 'Gen-Z & Young Professionals',
      pacingScore: 92,
      cliffhangerRequired: true,
    };

    return await aiClient.generateJSON(prompt, fallback);
  }

  // 2. Execution AI Layer: Skeleton & Scenes
  async runExecutionAI(req: ScriptAgentRequest, decision: any) {
    const skeletonSkill = this.loadSkillPrompt('script_execution_skeleton');
    const scriptSkill = this.loadSkillPrompt('script_execution_script');

    const prompt = `Generate 60-90 second vertical micro-drama script for Episode ${req.episodeNumber || 1}. Premise: ${req.synopsis}. Decision strategy: ${JSON.stringify(decision)}`;

    const fallbackScript = {
      outline: {
        logline: `${req.title}: A gripping micro-drama of ${req.genre.toLowerCase()} and high-stakes confrontation.`,
        characters: ['Mara (Protagonist)', 'Julian (Antagonist)', 'Vance (Ally)'],
        acts: [
          { act: 1, focus: 'Inciting Incident', episodes: 'Ep 1-3' },
          { act: 2, focus: 'Escalation & Betrayal', episodes: 'Ep 4-8' },
          { act: 3, focus: 'Reversal & Victory', episodes: 'Ep 9-12' },
        ],
      },
      scriptItem: {
        id: `scr-${Date.now()}`,
        episodeTitle: `Episode ${req.episodeNumber || 1}: Shadows of Retribution`,
        scenes: [
          {
            sceneIndex: 1,
            prompt: `Cinematic 9:16 vertical shot of Mara stepping out of a dark limousine, wearing an emerald velvet blazer, neon rain reflecting on pavement.`,
            dialogue: `MARA: (coldly) Tell the board I'm here to collect what's mine.`,
            cameraCue: 'Low Angle Push-In',
            durationSeconds: 5,
          },
          {
            sceneIndex: 2,
            prompt: `Grand luxury hotel ballroom, crowd gasping as Mara drops a sealed black ledger onto the banquet table.`,
            dialogue: `JULIAN: You... you were supposed to be locked away!`,
            cameraCue: 'Over The Shoulder Shock Shot',
            durationSeconds: 6,
          },
          {
            sceneIndex: 3,
            prompt: `Extreme close-up of Mara pulling off her gloves, eyes burning with quiet vengeance.`,
            dialogue: `MARA: The real game starts tonight.`,
            cameraCue: 'Extreme Close-Up Cliffhanger',
            durationSeconds: 4,
          },
        ],
      },
    };

    return await aiClient.generateJSON(prompt, fallbackScript);
  }

  // 3. Supervision AI Layer
  async runSupervisionAI(scriptItem: any) {
    const prompt = `Supervise dialogue pacing, emotional tension score, and cliffhanger retention quality for script: ${JSON.stringify(scriptItem)}`;
    
    const fallbackSupervision = {
      retentionScore: 88,
      pacingScore: 91,
      hookStrength: 'Strong',
      suggestions: [
        'Shorten Mara line in Scene 2 by 3 words for faster impact',
        'Add sound effect marker for ledger slap on table',
      ],
    };

    return await aiClient.generateJSON(prompt, fallbackSupervision);
  }

  // Orchestration Pipeline
  async executeFullPipeline(req: ScriptAgentRequest) {
    const decision = await this.runDecisionAI(req);
    const execution = await this.runExecutionAI(req, decision);
    const supervision = await this.runSupervisionAI(execution.scriptItem);

    return {
      outline: execution.outline,
      scriptItem: execution.scriptItem,
      supervision,
    };
  }
}

export const scriptAgentService = new ScriptAgentService();
