import { env } from './env.js';

/**
 * Minimal structured logger (no extra deps).
 *
 * Emits single-line JSON in production for log aggregation, and a compact
 * human-readable line in development. Sensitive keys are redacted.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const REDACT_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'authorization',
  'jwt',
  'secret',
  'clientSecret',
  'client_secret',
]);

const minLevel: Level = env.isTest ? 'warn' : env.isProd ? 'info' : 'debug';

function redact(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = REDACT_KEYS.has(k) ? '[REDACTED]' : v;
  }
  return out;
}

function emit(level: Level, msg: string, meta?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
  const safeMeta = meta ? redact(meta) : undefined;

  if (env.isProd) {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](
      JSON.stringify({ level, time: new Date().toISOString(), msg, ...safeMeta }),
    );
    return;
  }

  const tag = `[${level.toUpperCase()}]`;
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](
    safeMeta ? `${tag} ${msg}` : `${tag} ${msg}`,
    safeMeta ?? '',
  );
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
};

export type Logger = typeof logger;
