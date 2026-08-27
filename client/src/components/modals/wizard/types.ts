export interface WizardFormData {
  mode: 'viral' | 'manual';
  country: string;
  countryCode: string;
  language: string;
  selectedTrend: any;
  title: string;
  genre: string;
  visualStyle: string;
  visualStylePrompt?: string;
  synopsis: string;
  targetEpisodes: number;
  episodeDurationSeconds: number;
  episodeDurationMinutes: number;
  ratio: string;
  referenceFiles: File[];
  aiWatermark: boolean;
  commercialRights: boolean;
}

export interface PlanChatMessage {
  role: 'user' | 'assistant' | 'error';
  text: string;
  thinking?: string | null;
  failedPrompt?: string;
}

export interface ComplianceResult {
  overallScore?: number;
  isCompliant?: boolean;
  categories?: Record<string, { label: string; status: string; score: number; safe: boolean; notes?: string }>;
  copyrightChecks?: Array<{ label: string; status: string; safe: boolean }>;
  recommendations?: string[];
}
