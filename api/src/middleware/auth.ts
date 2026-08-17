import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from './error.js';
import type { UserRole } from '../models/enums.js';
import type { QuoteDoc } from '../models/quote.model.js';

/** Shape of the JWT we issue for owners. */
export interface JwtUser {
  sub: string; // user _id
  email: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtUser;
      quote?: QuoteDoc; // attached by linkToken middleware on public routes
    }
  }
}

/** Sign a short-lived owner access token. */
export function signToken(payload: JwtUser): string {
  const opts: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, opts);
}

/** Verify a raw bearer token, returning the decoded user or throwing. */
export function verifyToken(token: string): JwtUser {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtUser;
    if (!decoded?.sub) throw new Error('missing sub');
    return decoded;
  } catch {
    throw new UnauthorizedError('Invalid or expired token.');
  }
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** Require a valid JWT bearer token. Attaches `req.user`. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = extractBearer(req);
  if (!token) {
    next(new UnauthorizedError('Access denied. No token provided.'));
    return;
  }
  req.user = verifyToken(token);
  next();
};

/** Attach `req.user` if a valid token is present; never rejects. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = extractBearer(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      /* ignore — anonymous request */
    }
  }
  next();
};
