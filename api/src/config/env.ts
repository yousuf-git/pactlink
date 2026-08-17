import 'dotenv/config';
import { z } from 'zod';

/**
 * Typed, validated environment loader.
 *
 * Required vars crash the process at boot (fail fast). Optional integration
 * secrets (Stripe, S3, mail, e-sign) are left absent so the corresponding
 * feature can degrade gracefully instead of crashing the whole API.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),

  // CORS / URLs
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  PUBLIC_APP_URL: z.string().url().default('http://localhost:5173'),

  // Stripe (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // E-sign (optional)
  DOCUSEAL_URL: z.string().optional(),
  DOCUSEAL_TOKEN: z.string().optional(),
  DOCUSEAL_WEBHOOK_SECRET: z.string().optional(),

  // Object storage (optional)
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('PactLink <no-reply@pactlink.app>'),

  // Seed
  SEED_DEMO_PASSWORD: z.string().default('demo1234'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    '❌ Invalid environment configuration:\n',
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  throw new Error('Environment validation failed — see errors above.');
}

const raw = parsed.data;

export const env = {
  ...raw,
  /** Parsed comma-separated allowed CORS origins. */
  allowedOrigins: raw.ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  isDev: raw.NODE_ENV === 'development',
} as const;

export type Env = typeof env;
