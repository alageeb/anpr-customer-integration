import { Request, Response } from 'express';
import { requireAnprSecret } from '../../src/integration/middleware/anpr-auth';

describe('ANPR Auth Middleware', () => {
  const secret = 'test-secret-123';

  function createMockReqRes(headers: Record<string, string> = {}) {
    const req = {
      headers,
    } as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const next = jest.fn();

    return { req, res, next };
  }

  it('should call next for valid secret', () => {
    const { req, res, next } = createMockReqRes({ 'x-anpr-secret': secret });
    const middleware = requireAnprSecret(secret);

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject request without secret', () => {
    const { req, res, next } = createMockReqRes({});
    const middleware = requireAnprSecret(secret);

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Unauthorized') })
    );
  });

  it('should reject request with wrong secret', () => {
    const { req, res, next } = createMockReqRes({ 'x-anpr-secret': 'wrong-secret' });
    const middleware = requireAnprSecret(secret);

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 500 if secret not configured', () => {
    const { req, res, next } = createMockReqRes({ 'x-anpr-secret': 'anything' });
    const middleware = requireAnprSecret('');

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
