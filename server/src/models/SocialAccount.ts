import mongoose from 'mongoose';

export enum SocialPlatform {
  YOUTUBE = 'youtube',
  FACEBOOK = 'facebook',
  TIKTOK = 'tiktok',
}

export interface ISocialAccount extends mongoose.Document {
  userId: string;
  platform: SocialPlatform;
  channelId: string;
  channelName: string;
  channelAvatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scopes: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SocialAccountSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  platform: { type: String, enum: Object.values(SocialPlatform), required: true },
  channelId: { type: String, required: true },
  channelName: { type: String, required: true },
  channelAvatarUrl: { type: String },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
  tokenExpiresAt: { type: Date },
  scopes: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

// Ensure a user can only connect a specific platform channel once
SocialAccountSchema.index({ userId: 1, platform: 1, channelId: 1 }, { unique: true });

export const SocialAccount = mongoose.models.SocialAccount || mongoose.model<ISocialAccount>('SocialAccount', SocialAccountSchema);
