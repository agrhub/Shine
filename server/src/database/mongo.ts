import mongoose from 'mongoose';
import '../config/env.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shine_db';

export async function connectMongoDB() {
  try {
    if (mongoose.connection.readyState >= 1) {
      return mongoose.connection;
    }
    
    // Connect to MongoDB Cloud / Local instance
    console.log('[MongoDB] Connecting to MongoDB instance...');
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[MongoDB] Connected successfully to:', MONGODB_URI);
    return conn;
  } catch (err: any) {
    console.warn('[MongoDB] Connection warning (falling back to SQLite local storage):', err.message);
    return null;
  }
}

// Global Series Mongo Schema
const SeriesSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  genre: { type: String, required: true },
  tone: String,
  visualStyle: String,
  targetAudience: String,
  episodeCount: { type: Number, default: 20 },
  status: { type: String, default: 'DRAFT' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const MongoSeries = mongoose.models.Series || mongoose.model('Series', SeriesSchema);
