import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import {
  ActivityEventModel,
  ClientModel,
  InvoiceModel,
  NotificationModel,
  PaymentModel,
  QuoteModel,
  SignatureModel,
  UserModel,
  WebhookEventModel,
  type LineItem,
} from '../models/index.js';
import type { DepositType, QuoteStatus } from '../models/enums.js';
import { recomputeTotals } from '../utils/money.js';
import { generatePublicToken, generateIdempotencyKey } from '../utils/token.js';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysAgo = (d: number): Date => new Date(now - d * DAY);
const hoursAfter = (base: Date, h: number): Date => new Date(base.getTime() + h * 60 * 60 * 1000);

type SeedLine = Partial<LineItem> & Pick<LineItem, 'label' | 'qty' | 'unitPrice'>;

function line(partial: SeedLine): LineItem {
  return {
    label: partial.label,
    description: partial.description ?? null,
    qty: partial.qty,
    unitPrice: partial.unitPrice,
    taxRate: partial.taxRate ?? 0,
    type: partial.type ?? 'standard',
    selected: partial.selected ?? true,
    tierGroup: partial.tierGroup ?? null,
  } as LineItem;
}

/** A reusable line-item set with optional + tiered items so the toggle demo works. */
function sampleLineItems(): LineItem[] {
  return [
    line({ label: 'Design & discovery', qty: 1, unitPrice: 250000, taxRate: 8.25 }),
    line({ label: 'Core build', qty: 40, unitPrice: 12000, taxRate: 8.25 }),
    line({
      label: 'Rush delivery (optional)',
      qty: 1,
      unitPrice: 80000,
      taxRate: 8.25,
      type: 'optional',
      selected: false,
    }),
    line({
      label: 'Support — Basic',
      qty: 1,
      unitPrice: 30000,
      taxRate: 8.25,
      type: 'tiered',
      tierGroup: 'support',
      selected: true,
    }),
    line({
      label: 'Support — Premium',
      qty: 1,
      unitPrice: 90000,
      taxRate: 8.25,
      type: 'tiered',
      tierGroup: 'support',
      selected: false,
    }),
  ];
}

let invoiceCounter = 1;
function nextInvoiceNumber(): string {
  const n = String(invoiceCounter++).padStart(4, '0');
  return `INV-2026-${n}`;
}

async function wipe(): Promise<void> {
  await Promise.all([
    UserModel.deleteMany({}),
    ClientModel.deleteMany({}),
    QuoteModel.deleteMany({}),
    SignatureModel.deleteMany({}),
    PaymentModel.deleteMany({}),
    InvoiceModel.deleteMany({}),
    WebhookEventModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    ActivityEventModel.deleteMany({}),
  ]);
}

interface QuoteSpec {
  title: string;
  clientIdx: number;
  status: QuoteStatus;
  depositType: DepositType;
  depositValue: number;
  /** Days ago the quote was sent (null = never sent / draft). */
  sentDaysAgo: number | null;
  /** Hours after sent that it was viewed. */
  viewedAfterH?: number;
  /** Hours after sent that it was approved (signed). */
  approvedAfterH?: number;
  /** Hours after approval that the deposit was paid. */
  depositPaidAfterH?: number;
  /** Force a failed payment record (exercise failure path). */
  failedPayment?: boolean;
  drawnSignature?: boolean;
}

const QUOTE_SPECS: QuoteSpec[] = [
  // 1 draft
  { title: 'Brand Refresh — Draft', clientIdx: 0, status: 'draft', depositType: 'percent', depositValue: 30, sentDaysAgo: null },

  // 3 sent
  { title: 'Patio Construction', clientIdx: 1, status: 'sent', depositType: 'percent', depositValue: 30, sentDaysAgo: 2 },
  { title: 'Wedding Photography Package', clientIdx: 2, status: 'sent', depositType: 'fixed', depositValue: 50000, sentDaysAgo: 4 },
  { title: 'Quarterly Retainer', clientIdx: 3, status: 'sent', depositType: 'percent', depositValue: 25, sentDaysAgo: 1 },

  // 3 viewed
  { title: 'Kitchen Remodel', clientIdx: 4, status: 'viewed', depositType: 'percent', depositValue: 30, sentDaysAgo: 6, viewedAfterH: 5 },
  { title: 'Conference AV Setup', clientIdx: 5, status: 'viewed', depositType: 'fixed', depositValue: 120000, sentDaysAgo: 5, viewedAfterH: 20 },
  { title: 'Landing Page Build', clientIdx: 0, status: 'viewed', depositType: 'percent', depositValue: 40, sentDaysAgo: 3, viewedAfterH: 2 },

  // 2 approved
  { title: 'Corporate Headshots', clientIdx: 2, status: 'approved', depositType: 'percent', depositValue: 30, sentDaysAgo: 9, viewedAfterH: 4, approvedAfterH: 30, drawnSignature: true },
  { title: 'Backyard Deck', clientIdx: 1, status: 'approved', depositType: 'fixed', depositValue: 75000, sentDaysAgo: 7, viewedAfterH: 6, approvedAfterH: 48 },

  // 3 deposit_paid (one with a prior failed payment)
  { title: 'Full Home Renovation', clientIdx: 4, status: 'deposit_paid', depositType: 'percent', depositValue: 30, sentDaysAgo: 14, viewedAfterH: 3, approvedAfterH: 26, depositPaidAfterH: 2 },
  { title: 'Annual Marketing Program', clientIdx: 3, status: 'deposit_paid', depositType: 'percent', depositValue: 20, sentDaysAgo: 12, viewedAfterH: 8, approvedAfterH: 40, depositPaidAfterH: 5, failedPayment: true },
  { title: 'Event Lighting & Stage', clientIdx: 5, status: 'deposit_paid', depositType: 'fixed', depositValue: 150000, sentDaysAgo: 10, viewedAfterH: 12, approvedAfterH: 18, depositPaidAfterH: 1, drawnSignature: true },
];

async function seed(): Promise<void> {
  await connectDb();
  await wipe();

  // ── Demo owner (F-12) ──
  const passwordHash = await bcrypt.hash(env.SEED_DEMO_PASSWORD, 10);
  const owner = await UserModel.create({
    email: 'demo@pactlink.app',
    passwordHash,
    name: 'Avery Stone',
    role: 'demo',
    brand: { businessName: 'Northwind Studio', logoUrl: null, primaryColor: '#1B4965' },
    defaultCurrency: 'USD',
    defaultDepositType: 'percent',
    defaultDepositValue: 30,
  });

  // ── ~6 clients (mixed company set/null) ──
  const clientDefs = [
    { name: 'Jordan Avery', email: 'jordan@brightway.co', company: 'Brightway Co.', phone: '+1-202-555-0148' },
    { name: 'Sam Rivera', email: 'sam.rivera@gmail.com', company: null, phone: '+1-415-555-0192' },
    { name: 'Taylor Quinn', email: 'taylor@lumephoto.com', company: 'Lume Photography', phone: null },
    { name: 'Morgan Lee', email: 'morgan@apexagency.io', company: 'Apex Agency', phone: '+1-312-555-0110' },
    { name: 'Casey Drew', email: 'casey.drew@outlook.com', company: null, phone: null },
    { name: 'Riley Park', email: 'riley@summit-events.com', company: 'Summit Events', phone: '+1-646-555-0177' },
  ];
  const clients = await ClientModel.insertMany(
    clientDefs.map((c) => ({ ...c, ownerId: owner._id })),
  );

  let createdQuotes = 0;
  let signatureCount = 0;
  let paymentCount = 0;
  let invoiceCount = 0;
  let webhookCount = 0;
  let notificationCount = 0;
  let activityCount = 0;

  for (const spec of QUOTE_SPECS) {
    const client = clients[spec.clientIdx]!;
    const lineItems = sampleLineItems();
    const totals = recomputeTotals({
      lineItems,
      depositType: spec.depositType,
      depositValue: spec.depositValue,
    });

    const sentAt = spec.sentDaysAgo != null ? daysAgo(spec.sentDaysAgo) : null;
    const viewedAt = sentAt && spec.viewedAfterH != null ? hoursAfter(sentAt, spec.viewedAfterH) : null;
    const approvedAt = sentAt && spec.approvedAfterH != null ? hoursAfter(sentAt, spec.approvedAfterH) : null;
    const depositPaidAt =
      approvedAt && spec.depositPaidAfterH != null ? hoursAfter(approvedAt, spec.depositPaidAfterH) : null;

    const createdAt = sentAt ? new Date(sentAt.getTime() - DAY) : daysAgo(1);

    const quote = await QuoteModel.create({
      ownerId: owner._id,
      clientId: client._id,
      title: spec.title,
      status: spec.status,
      currency: 'USD',
      lineItems,
      ...totals,
      depositType: spec.depositType,
      depositValue: spec.depositValue,
      publicToken: generatePublicToken(),
      expiresAt: null,
      sentAt,
      viewedAt,
      approvedAt,
      depositPaidAt,
      createdAt,
    });
    createdQuotes++;

    // ── activity timeline ──
    const activity: Array<{ type: string; actor: string; createdAt: Date; meta?: unknown }> = [
      { type: 'created', actor: 'owner', createdAt },
    ];
    if (sentAt) activity.push({ type: 'sent', actor: 'owner', createdAt: sentAt });
    if (viewedAt) activity.push({ type: 'viewed', actor: 'client', createdAt: viewedAt, meta: { ip: '203.0.113.42' } });

    // ── signature (approved + paid quotes) ──
    if (approvedAt) {
      await SignatureModel.create({
        quoteId: quote._id,
        signerName: client.name,
        method: spec.drawnSignature ? 'drawn' : 'typed',
        signatureData: spec.drawnSignature ? 'data:image/png;base64,iVBORw0KGgo=' : client.name,
        provider: 'internal',
        ipAddress: '203.0.113.42',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        signedAt: approvedAt,
        createdAt: approvedAt,
      });
      signatureCount++;
      activity.push({ type: 'signed', actor: 'client', createdAt: approvedAt });
      activity.push({ type: 'approved', actor: 'client', createdAt: approvedAt });
    }

    // ── failed payment (exercises failure path) ──
    if (spec.failedPayment && approvedAt) {
      const failAt = hoursAfter(approvedAt, 1);
      await PaymentModel.create({
        quoteId: quote._id,
        type: 'deposit',
        stripePaymentIntentId: `pi_failed_${quote._id.toString().slice(-8)}`,
        amount: quote.depositAmount,
        currency: 'USD',
        status: 'failed',
        idempotencyKey: generateIdempotencyKey('dep'),
        failureReason: 'Your card was declined.',
        createdAt: failAt,
      });
      paymentCount++;
      activity.push({ type: 'payment_failed', actor: 'system', createdAt: failAt });

      await WebhookEventModel.create({
        provider: 'stripe',
        eventId: `evt_${generateIdempotencyKey('fail')}`,
        type: 'payment_intent.payment_failed',
        payload: { id: `pi_failed_${quote._id.toString().slice(-8)}`, object: 'payment_intent' },
        processed: true,
        processedAt: failAt,
        receivedAt: failAt,
        createdAt: failAt,
      });
      webhookCount++;

      await NotificationModel.create({
        quoteId: quote._id,
        recipientType: 'owner',
        template: 'payment_failed',
        to: owner.email,
        status: 'sent',
        sentAt: failAt,
      });
      notificationCount++;
    }

    // ── succeeded deposit + invoice + webhook (deposit_paid quotes) ──
    if (depositPaidAt) {
      const piId = `pi_${quote._id.toString().slice(-10)}`;
      await PaymentModel.create({
        quoteId: quote._id,
        type: 'deposit',
        stripePaymentIntentId: piId,
        stripeChargeId: `ch_${quote._id.toString().slice(-10)}`,
        amount: quote.depositAmount,
        currency: 'USD',
        status: 'succeeded',
        idempotencyKey: generateIdempotencyKey('dep'),
        createdAt: depositPaidAt,
      });
      paymentCount++;

      await WebhookEventModel.create({
        provider: 'stripe',
        eventId: `evt_${generateIdempotencyKey('ok')}`,
        type: 'payment_intent.succeeded',
        payload: { id: piId, object: 'payment_intent', amount_received: quote.depositAmount },
        processed: true,
        processedAt: depositPaidAt,
        receivedAt: depositPaidAt,
        createdAt: depositPaidAt,
      });
      webhookCount++;

      if (quote.balanceAmount > 0) {
        await InvoiceModel.create({
          quoteId: quote._id,
          type: 'balance',
          number: nextInvoiceNumber(),
          amount: quote.balanceAmount,
          currency: 'USD',
          status: 'sent',
          issuedAt: depositPaidAt,
          dueAt: new Date(depositPaidAt.getTime() + 14 * DAY),
          createdAt: depositPaidAt,
        });
        invoiceCount++;
      }

      activity.push({ type: 'deposit_paid', actor: 'system', createdAt: depositPaidAt });

      await NotificationModel.insertMany([
        { quoteId: quote._id, recipientType: 'owner', template: 'deposit_paid', to: owner.email, status: 'sent', sentAt: depositPaidAt },
        { quoteId: quote._id, recipientType: 'client', template: 'deposit_paid', to: client.email, status: 'sent', sentAt: depositPaidAt },
        { quoteId: quote._id, recipientType: 'client', template: 'balance_invoice', to: client.email, status: 'sent', sentAt: depositPaidAt },
      ]);
      notificationCount += 3;
    }

    // ── send + view notifications (sent in the past) ──
    if (sentAt) {
      await NotificationModel.create({
        quoteId: quote._id,
        recipientType: 'client',
        template: 'quote_sent',
        to: client.email,
        status: 'sent',
        sentAt,
      });
      notificationCount++;
    }
    if (viewedAt) {
      await NotificationModel.create({
        quoteId: quote._id,
        recipientType: 'owner',
        template: 'quote_viewed',
        to: owner.email,
        status: 'sent',
        sentAt: viewedAt,
      });
      notificationCount++;
    }

    // persist activity events
    await ActivityEventModel.insertMany(
      activity.map((a) => ({
        quoteId: quote._id,
        type: a.type,
        actor: a.actor,
        meta: a.meta ?? null,
        createdAt: a.createdAt,
      })),
    );
    activityCount += activity.length;
  }

  logger.info('Seed complete', {
    owner: owner.email,
    password: env.SEED_DEMO_PASSWORD,
    clients: clients.length,
    quotes: createdQuotes,
    signatures: signatureCount,
    payments: paymentCount,
    invoices: invoiceCount,
    webhookEvents: webhookCount,
    notifications: notificationCount,
    activityEvents: activityCount,
  });
}

seed()
  .then(async () => {
    await disconnectDb();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error('Seed failed', { err: (err as Error)?.message, stack: (err as Error)?.stack });
    await disconnectDb();
    process.exit(1);
  });
