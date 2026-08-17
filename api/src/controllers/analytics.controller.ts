import type { Request, Response } from 'express';
import { getFunnel, getWebhookEvents } from '../services/analytics/index.js';

/**
 * Owner analytics controller (UC-O05 / UC-O06 / F-10 / F-11).
 * Mounted under `auth`; owner id resolved from the JWT.
 */

function ownerIdOf(req: Request): string | undefined {
  return (req as Request & { user?: { sub?: string } }).user?.sub;
}

function err(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { message, code } });
}

export async function funnel(req: Request, res: Response): Promise<void> {
  const ownerId = ownerIdOf(req);
  if (!ownerId) {
    err(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }
  const result = await getFunnel(ownerId);
  res.status(200).json({ data: result });
}

export async function webhookEvents(req: Request, res: Response): Promise<void> {
  const ownerId = ownerIdOf(req);
  if (!ownerId) {
    err(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 100;
  const events = await getWebhookEvents(ownerId, {
    limit: Number.isFinite(limit) ? Math.min(limit, 500) : 100,
  });
  res.status(200).json({ data: events });
}
