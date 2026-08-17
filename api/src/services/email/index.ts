import { Notification } from '../../models/index.js';
import { getMailer, mailFrom, isLogOnlyMailer } from '../../config/mailer.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

/**
 * Email dispatcher (F-08).
 *
 * Drains `notifications` with status `queued`, renders a template, sends via the
 * Nodemailer transport (or logs in dev when SMTP is unset), and marks each
 * record `sent` / `failed`. Best-effort: callers enqueue then trigger a drain;
 * delivery failures never roll back the business transition that enqueued them.
 *
 * NOTE: enums are `as const` string arrays — values are written as literals.
 */

interface NotificationDoc {
  _id: unknown;
  quoteId: unknown;
  recipientType: string;
  template: string;
  to: string;
  status: string;
  save: () => Promise<unknown>;
  error?: string | null;
  sentAt?: Date | null;
}

interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

function publicLink(quoteId: unknown, token?: string): string {
  const base = (env.PUBLIC_APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  return token ? `${base}/public/quotes/${token}` : `${base}/quotes/${String(quoteId)}`;
}

/**
 * Render an email body for a given template. Kept deliberately simple (no
 * external templating dep). `meta` carries optional values like the public
 * token, amounts, or failure reason.
 */
export function renderTemplate(
  template: string,
  meta: Record<string, unknown> = {},
): RenderedEmail {
  const link = publicLink(meta.quoteId, meta.token as string | undefined);
  const wrap = (title: string, body: string): RenderedEmail => ({
    subject: title,
    text: `${title}\n\n${body.replace(/<[^>]+>/g, '')}`,
    html: `<div style="font-family:Inter,Arial,sans-serif;color:#0F2330">
      <h2 style="color:#1B4965">${title}</h2><p>${body}</p></div>`,
  });

  switch (template) {
    case 'quote_sent':
      return wrap('Your quote is ready', `Review and approve your quote: <a href="${link}">${link}</a>`);
    case 'quote_viewed':
      return wrap('Your quote was viewed', `Your client just opened the quote.`);
    case 'quote_approved':
      return wrap('Quote approved & signed', `Your client signed the quote. Awaiting deposit.`);
    case 'deposit_paid':
      return wrap('Deposit paid', `The deposit has been paid. Quote is now in progress.`);
    case 'balance_invoice':
      return wrap('Balance invoice', `Your balance invoice is ready: <a href="${link}">${link}</a>`);
    case 'payment_failed':
      return wrap(
        'Payment failed',
        `A deposit payment failed${meta.reason ? `: ${String(meta.reason)}` : '.'}. The client may retry.`,
      );
    default:
      return wrap('PactLink notification', `You have a new update on your quote.`);
  }
}

/**
 * Send a single notification. Returns true on success.
 */
export async function sendNotification(
  notif: NotificationDoc,
  meta: Record<string, unknown> = {},
): Promise<boolean> {
  try {
    const rendered = renderTemplate(notif.template, { quoteId: notif.quoteId, ...meta });
    const mailer = getMailer();
    await mailer.sendMail({
      from: mailFrom(),
      to: notif.to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });

    notif.status = 'sent';
    notif.sentAt = new Date();
    notif.error = null;
    await notif.save();

    if (isLogOnlyMailer()) {
      logger.info('[mail:log] notification "sent" via log transport', {
        notificationId: String(notif._id),
        to: notif.to,
        template: notif.template,
      });
    }
    return true;
  } catch (err) {
    notif.status = 'failed';
    notif.error = err instanceof Error ? err.message : String(err);
    await notif.save();
    logger.warn('Notification send failed', {
      err: notif.error,
      notificationId: String(notif._id),
    });
    return false;
  }
}

/**
 * Drain all queued notifications. Best-effort, bounded by `limit`.
 * Safe to call repeatedly (e.g. on an interval or after each enqueue).
 */
export async function dispatchQueuedNotifications(
  opts: { limit?: number } = {},
): Promise<{ sent: number; failed: number; total: number }> {
  const limit = opts.limit ?? 50;
  const queued = (await Notification.find({ status: 'queued' })
    .limit(limit)
    .exec()) as unknown as NotificationDoc[];

  let sent = 0;
  let failed = 0;
  for (const notif of queued) {
    const ok = await sendNotification(notif);
    if (ok) sent += 1;
    else failed += 1;
  }

  if (queued.length > 0) {
    logger.info('Dispatched queued notifications', { sent, failed, total: queued.length });
  }
  return { sent, failed, total: queued.length };
}

export type { NotificationDoc };
