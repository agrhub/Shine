//import './services/compositor/polyfills.js';
import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import './config/env.js';
import authRoutes from './routes/auth.js';
import seriesRoutes, { episodesRouter } from './routes/series';
import flowAccountsRoutes from './routes/flow-accounts';
import contactRoutes from './routes/contact';
import { aiRouter } from './routes/ai';
import { characterRouter } from './routes/characters';
import { exportRouter } from './routes/export';
import voicesRoutes from './routes/voices';
import captionsRoutes from './routes/captions';
import audioRoutes from './routes/audio';
import cliffhangerRoutes from './routes/cliffhanger';
import { aiAssistantRouter } from './routes/ai-assistant';
import { copilotRouter } from './routes/copilot';
import { costGuardrailsRouter } from './routes/cost-guardrails';
import { publishRouter } from './routes/publish';
import { billingRouter } from './routes/billing';
import { marketplaceRouter } from './routes/marketplace';
import { novelConverterRouter } from './routes/novel-converter';
import { liveDramaRouter } from './routes/live-drama';
import { culturalAdaptRouter } from './routes/cultural-adapt';
import { analyticsPaywallRouter } from './routes/analytics';
import { copyrightRouter } from './routes/copyright';
import { adminRouter } from './routes/admin';
import { viralCoverRouter } from './routes/viral-cover';
import socialAuthRouter from './routes/social-auth';
import engagementRouter from './routes/engagement';
import { visualStylesRouter } from './routes/visualStyles';
import { assetsRouter } from './routes/assets';
import { PatchSyncService } from './realtime/PatchSyncService';
import { flowSyncService } from './integrations/ai/flow/FlowSyncService';
import { aiProviderRouter } from './integrations/ai/router/AIProviderRouter';
import { telemetryService } from './config/telemetry';
import { getDatabaseProvider } from './database/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize active DB Provider (SQLite or MongoDB with automatic fallback)
getDatabaseProvider().catch((err) => console.warn('[Database] Provider initialization warning:', err));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/episodes', episodesRouter);
app.use('/api/visual-styles', visualStylesRouter);
app.use('/api/admin/flow-accounts', flowAccountsRoutes);
app.use('/api/contact', contactRoutes);   // FR-008: Contact & Support
app.use('/api/ai', aiRouter);              // FR-009 to FR-015, FR-074: AI Script & Trends
app.use('/api/characters', characterRouter); // FR-081: Persona Studio & Anchors
app.use('/api/export', exportRouter);       // FR-016 to FR-021: Export & Compositor
app.use('/api/voices', voicesRoutes);
app.use('/api/captions', captionsRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/ai/cliffhanger', cliffhangerRoutes);

// Sprint 5 Routes
app.use('/api/ai/assistant', aiAssistantRouter);
app.use('/api/ai/copilot', copilotRouter);
app.use('/api/admin/cost-guardrails', costGuardrailsRouter);

// Sprint 6 Routes
app.use('/api/publish', publishRouter);
app.use('/api/projects', publishRouter);
app.use('/api/social', socialAuthRouter);
app.use('/api/engagement', engagementRouter);
app.use('/api/billing', billingRouter);
app.use('/api/admin', adminRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/ai', novelConverterRouter);
app.use('/api/live', liveDramaRouter);
app.use('/api/ai', culturalAdaptRouter);
app.use('/api/analytics', analyticsPaywallRouter);
app.use('/api/audio', copyrightRouter);
app.use('/api/ai', viralCoverRouter);
app.use('/api/assets', assetsRouter);
app.use('/api', publishRouter);


// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Shine API Server',
    version: '0.1.0-alpha',
    db_provider: process.env.DB_PROVIDER || 'sqlite',
    timestamp: new Date().toISOString(),
  });
});

// ─── Start Services & WebSocket HTTP Server ──────────────────────────────────
flowSyncService.start();
telemetryService.initialize();

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
const patchSyncService = new PatchSyncService(io);

httpServer.listen(PORT, () => {
  console.log(`[Shine Server] Express & Socket.io server running on http://localhost:${PORT}`);
});

