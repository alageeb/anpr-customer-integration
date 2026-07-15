import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { loadConfig } from './integration/interfaces/config';
import { createAdapter } from './integration/adapters';
import { CustomerLookupService } from './integration/services/customer-lookup-service';
import { createAnprRouter } from './api/anpr-routes';
import { createDiagnosticRouter } from './api/diagnostic-routes';
import { createDisplayRealtimeRouter, setupWebSocketServer } from './api/display-realtime-routes';
import { createQueueDashboardRouter } from './api/queue-dashboard-routes';
import { createHistoryRouter } from './api/history-routes';
import { createDocsRouter } from './api/docs-routes';
import { createDemoRouter } from './demo/routes';
import { initializeLogsTable } from './integration/logs/lookup-logs';
import { initializeQueueTable } from './integration/logs/queue-db';

async function main() {
  const config = loadConfig();

  if (!config.mockMode && !config.dbHost) {
    console.error('CUSTOMER_DB_HOST is required when not in mock mode');
    process.exit(1);
  }

  if (!config.anprSecret) {
    console.warn('WARNING: ANPR_INTEGRATION_SECRET is not set. ANPR endpoint will be inaccessible.');
  }

  const adapter = createAdapter(config);

  console.log('Testing customer database connection...');
  const testResult = await adapter.testConnection();
  if (testResult.success) {
    console.log(`Customer DB connected (${testResult.responseTimeMs}ms)`);
  } else {
    console.warn(`Customer DB connection failed: ${testResult.message}`);
    if (!config.mockMode) {
      console.warn('Continuing in degraded mode...');
    }
  }

  await initializeLogsTable();
  console.log('Lookup logs table initialized');

  await initializeQueueTable();
  console.log('Queue table initialized');

  const lookupService = new CustomerLookupService(adapter, config);
  const app = express();

  // Security middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-ANPR-Secret', 'X-Display-Token', 'X-Dashboard-PIN']
  }));

  // Global rate limiter
  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' }
  }));

  // Body parser with size limit
  app.use(express.json({ limit: '1mb' }));

  // Mount routes (order matters - more specific first)
  app.use('/api/anpr', createAnprRouter(lookupService, config.anprSecret));
  app.use('/api/diagnostic', createDiagnosticRouter(adapter, config));
  app.use('/api/display', createDisplayRealtimeRouter(lookupService));
  app.use('/api/queue', createQueueDashboardRouter());
  app.use('/api/history', createHistoryRouter());
  app.use('/api/docs', createDocsRouter());
  app.use('/demo/anpr', createDemoRouter(lookupService));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Dashboard redirect
  app.get('/dashboard', (_req, res) => {
    res.redirect(301, '/api/queue');
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  const server = http.createServer(app);

  // Setup WebSocket server
  setupWebSocketServer(server);

  server.listen(port, () => {
    console.log(`ANPR Integration server running on port ${port}`);
    console.log(`Mode: ${config.mockMode ? 'MOCK' : 'LIVE'}`);
    console.log(`Database type: ${config.dbType}`);
    console.log(`Demo: http://localhost:${port}/demo/anpr`);
    console.log(`Dashboard: http://localhost:${port}/api/queue`);
    console.log(`History: http://localhost:${port}/api/history`);
    console.log(`Display Test: http://localhost:${port}/api/display/test`);
    console.log(`WebSocket: ws://localhost:${port}/ws/display`);
  });

  const shutdown = async () => {
    console.log('Shutting down...');
    await lookupService.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
