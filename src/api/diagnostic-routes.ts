import { Router, Request, Response } from 'express';
import { CustomerDatabaseAdapter } from '../integration/interfaces/adapter';
import { CustomerSystemConfig } from '../integration/interfaces/config';
import { loadMapping } from '../integration/config/customer-db-mapping';

export function createDiagnosticRouter(
  adapter: CustomerDatabaseAdapter,
  config: CustomerSystemConfig
): Router {
  const router = Router();

  router.get('/status', async (_req: Request, res: Response) => {
    try {
      const testResult = await adapter.testConnection();
      const mapping = loadMapping();

      res.json({
        dbType: config.mockMode ? 'mock' : config.dbType,
        connectionStatus: testResult.success ? 'Connected' : 'Disconnected',
        lastTestTime: new Date().toISOString(),
        responseTimeMs: testResult.responseTimeMs,
        message: testResult.message,
        mockMode: config.mockMode,
        mapping,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.json({
        dbType: config.mockMode ? 'mock' : config.dbType,
        connectionStatus: 'Disconnected',
        lastTestTime: new Date().toISOString(),
        responseTimeMs: 0,
        message: `Error: ${message}`,
        mockMode: config.mockMode,
        mapping: loadMapping(),
      });
    }
  });

  router.get('/test-connection', async (_req: Request, res: Response) => {
    try {
      const result = await adapter.testConnection();
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.json({
        success: false,
        message: `Error: ${message}`,
        responseTimeMs: 0,
      });
    }
  });

  router.get('/mapping', (_req: Request, res: Response) => {
    res.json(loadMapping());
  });

  return router;
}
