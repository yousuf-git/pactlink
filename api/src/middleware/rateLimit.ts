import rateLimit from 'express-rate-limit';

/**
 * Rate limiters. The error envelope matches the app-wide shape
 * `{ error: { message, code } }` so clients handle 429 like any other error.
 */

// Broad limiter for the whole API surface — blunts scraping / abuse.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, slow down', code: 'RATE_LIMITED' } },
});

// Strict limiter for credential endpoints — brute-force defense on /auth/login.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 login attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts count toward the limit
  message: {
    error: { message: 'Too many login attempts, try again later', code: 'RATE_LIMITED' },
  },
});
