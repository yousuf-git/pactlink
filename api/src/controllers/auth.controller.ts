import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/index.js';
import { signToken, type JwtUser } from '../middleware/auth.js';
import { asyncHandler, UnauthorizedError } from '../middleware/error.js';
import type { LoginInput } from '../validation/auth.schema.js';

const DEMO_EMAIL = 'demo@pactlink.app';

function userToJwt(user: { _id: unknown; email: string; role: 'owner' | 'demo' }): JwtUser {
  return { sub: String(user._id), email: user.email, role: user.role };
}

function publicUser(user: {
  _id: unknown;
  email: string;
  name: string;
  role: string;
  brand: unknown;
  defaultCurrency: string;
  defaultDepositType: string;
  defaultDepositValue: number;
}) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    brand: user.brand,
    defaultCurrency: user.defaultCurrency,
    defaultDepositType: user.defaultDepositType,
    defaultDepositValue: user.defaultDepositValue,
  };
}

/**
 * POST /api/v1/auth/login — owner login (F-12, UC-O01).
 * No public signup. Bad credentials return a generic 401 (no user enumeration).
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  // passwordHash is select:false → request it explicitly.
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const token = signToken(userToJwt(user));
  res.json({ data: { token, user: publicUser(user) } });
});

/**
 * POST /api/v1/auth/demo — one-click sandbox/demo login (F-12, UC-O01 alt).
 * Logs into the pre-seeded demo account without exposing its password.
 */
export const demoLogin = asyncHandler(async (_req: Request, res: Response) => {
  const user = await UserModel.findOne({ email: DEMO_EMAIL });
  if (!user) {
    throw new UnauthorizedError('Demo account is not available. Run the seed script.');
  }
  const token = signToken(userToJwt(user));
  res.json({ data: { token, user: publicUser(user) } });
});

/** GET /api/v1/auth/me — return the authenticated owner profile. */
export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.user!.sub);
  if (!user) throw new UnauthorizedError('Account no longer exists.');
  res.json({ data: { user: publicUser(user) } });
});
