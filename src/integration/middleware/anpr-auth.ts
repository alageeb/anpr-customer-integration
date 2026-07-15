import { Request, Response, NextFunction } from 'express';

export function requireAnprSecret(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!secret) {
      res.status(500).json({ error: 'ANPR integration secret not configured' });
      return;
    }

    const providedSecret = req.headers['x-anpr-secret'] as string;

    if (!providedSecret || providedSecret !== secret) {
      res.status(401).json({ error: 'Unauthorized: Invalid or missing ANPR secret' });
      return;
    }

    next();
  };
}
