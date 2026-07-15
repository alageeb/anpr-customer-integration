import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Timing-safe secret comparison
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Auth middleware for ANPR endpoints
export function requireAnprSecret(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!secret) {
      res.status(500).json({ error: 'ANPR secret not configured' });
      return;
    }
    const provided = req.headers['x-anpr-secret'] as string;
    if (!provided || !safeCompare(provided, secret)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  };
}

// Auth middleware for Display endpoints (token-based)
const validDisplayTokens = new Set<string>();

export function registerDisplayToken(token: string) {
  validDisplayTokens.add(token);
}

export function requireDisplayAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.query.token as string || req.headers['x-display-token'] as string;
  if (!token || !validDisplayTokens.has(token)) {
    // Allow dashboard (internal use) with special token
    if (token === 'dashboard-internal') {
      next();
      return;
    }
    res.status(401).json({ error: 'Unauthorized: Invalid display token' });
    return;
  }
  next();
}

// Auth middleware for Queue Dashboard (PIN-based)
const dashboardPin = process.env.QUEUE_DASHBOARD_PIN || '1234';

export function requireDashboardAuth(req: Request, res: Response, next: NextFunction): void {
  const pin = req.headers['x-dashboard-pin'] as string;
  if (!pin || !safeCompare(pin, dashboardPin)) {
    res.status(401).json({ error: 'Unauthorized: Invalid dashboard PIN' });
    return;
  }
  next();
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

// Validate plate number format
export function isValidPlate(plate: string): boolean {
  // Kuwait format: 1-3 digit prefix + dash/space + 5 digit serial, or just digits
  return /^\d{1,3}[- ]?\d{5}$/.test(plate) || /^\d{6,8}$/.test(plate);
}

// Rate limit configurations
export const apiLimiter = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests' }
};

export const strictLimiter = {
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Rate limit exceeded' }
};
