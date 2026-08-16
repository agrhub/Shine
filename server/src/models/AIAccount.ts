import mongoose from 'mongoose';

export enum AIAccountStatus {
  READY = 'READY',
  UNAUTHORIZED = 'UNAUTHORIZED',
  ERROR = 'ERROR',
}

export enum AIAccountType {
  GOOGLE_FLOW = 'google-flow',
  GOOGLE_VERTEX = 'google-vertex',
  API_KEY = 'api-key',
  ANTIGRAVITY = 'antigravity',
  STANDARD = 'standard',
  OPENAI = 'openai',
  CUSTOM = 'custom',
  GOOGLE_CLOUD = 'google-cloud',
}

export interface IAIAccount extends mongoose.Document {
  email: string;
  name?: string;
  avatarUrl?: string;
  accountType: string;
  status: AIAccountStatus;
  
  flowST?: string;
  flowAT?: string;
  flowATExpiresAt?: Date;
  projectId?: string;
  credits?: number;
  errorMessage?: string;
  
  lastFingerprint?: Map<string, string>;
  serviceKeys?: Map<string, string>;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AIAccountSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  avatarUrl: { type: String },
  accountType: { type: String, enum: Object.values(AIAccountType), required: true },
  status: { type: String, enum: Object.values(AIAccountStatus), default: AIAccountStatus.READY },
  
  flowST: { type: String },
  flowAT: { type: String },
  flowATExpiresAt: { type: Date },
  projectId: { type: String },
  credits: { type: Number, default: 0 },
  errorMessage: { type: String },
  
  lastFingerprint: { type: Map, of: String },
  serviceKeys: { type: Map, of: String },
  
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

export const AIAccount = mongoose.models.AIAccount || mongoose.model<IAIAccount>('AIAccount', AIAccountSchema);
