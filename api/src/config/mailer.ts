import nodemailer, { type Transporter } from 'nodemailer';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Nodemailer transport — lazily resolved.
 *
 * Email is OPTIONAL. When SMTP_HOST is unset we fall back to a "log transport"
 * that records what *would* have been sent (dev/test), so the notification
 * dispatcher can still mark records `sent` and exercise the full flow offline.
 */
let transporter: Transporter | null = null;
let isLogTransport = false;
let warned = false;

export function getMailer(): Transporter {
  if (transporter) return transporter;

  if (!env.SMTP_HOST) {
    if (!warned) {
      logger.warn('SMTP_HOST not set — using log-only mail transport (emails are logged, not delivered)');
      warned = true;
    }
    isLogTransport = true;
    // `jsonTransport` returns a result instead of delivering; perfect for dev/test.
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: (env.SMTP_PORT ?? 587) === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
  return transporter;
}

export function mailFrom(): string {
  return env.MAIL_FROM ?? 'PactLink <no-reply@pactlink.app>';
}

export function isLogOnlyMailer(): boolean {
  // Ensure the transport is initialised so the flag is accurate.
  getMailer();
  return isLogTransport;
}
