import { Router, Request, Response } from 'express';
import { CustomerLookupService } from '../integration/services/customer-lookup-service';
import { ANPRRequest } from '../integration/interfaces/types';
import { requireAnprSecret } from '../integration/middleware/security';

export function createAnprRouter(
  lookupService: CustomerLookupService,
  anprSecret: string
): Router {
  const router = Router();

  router.post(
    '/customer-lookup',
    requireAnprSecret(anprSecret),
    async (req: Request, res: Response) => {
      try {
        const { plateNumber, cameraId, eventTime } = req.body as ANPRRequest;

        if (!plateNumber || typeof plateNumber !== 'string') {
          res.status(400).json({ error: 'plateNumber is required and must be a string' });
          return;
        }

        if (!cameraId || typeof cameraId !== 'string') {
          res.status(400).json({ error: 'cameraId is required and must be a string' });
          return;
        }

        if (!eventTime || typeof eventTime !== 'string') {
          res.status(400).json({ error: 'eventTime is required and must be a string' });
          return;
        }

        // Input length validation
        if (plateNumber.length > 20) {
          res.status(400).json({ error: 'plateNumber too long' });
          return;
        }
        if (cameraId.length > 50) {
          res.status(400).json({ error: 'cameraId too long' });
          return;
        }

        const result = await lookupService.lookup(
          plateNumber.trim(),
          cameraId.trim(),
          eventTime.trim()
        );

        res.json(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({
          found: false,
          plateNumber: '',
          platePrefix: '',
          plateSerial: '',
          normalizedPlate: '',
          customer: null,
          vehicle: null,
          accessDecision: {
            allowed: false,
            reason: 'Internal server error',
          },
          error: process.env.NODE_ENV === 'development' ? message : undefined,
        });
      }
    }
  );

  return router;
}
