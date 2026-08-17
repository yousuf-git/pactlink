import mongoose, { Schema } from 'mongoose';

/**
 * Self-contained test models mirroring the DBD schema.
 *
 * These local models let the business-logic tests run against
 * mongodb-memory-server without depending on the production `../models`
 * module graph. Production code is wired to `../models` via `vi.mock`
 * factories in each test file that imports from here.
 */

const QuoteStatus = {
  draft: 'draft',
  sent: 'sent',
  viewed: 'viewed',
  approved: 'approved',
  deposit_paid: 'deposit_paid',
} as const;

const PaymentStatus = { pending: 'pending', succeeded: 'succeeded', failed: 'failed' } as const;
const PaymentKind = { deposit: 'deposit', balance: 'balance' } as const;
const InvoiceStatus = { draft: 'draft', sent: 'sent', paid: 'paid' } as const;
const ActivityType = {
  created: 'created',
  sent: 'sent',
  viewed: 'viewed',
  selection_changed: 'selection_changed',
  signed: 'signed',
  approved: 'approved',
  deposit_paid: 'deposit_paid',
  payment_failed: 'payment_failed',
} as const;
const NotificationTemplate = {
  quote_sent: 'quote_sent',
  quote_viewed: 'quote_viewed',
  quote_approved: 'quote_approved',
  deposit_paid: 'deposit_paid',
  balance_invoice: 'balance_invoice',
  payment_failed: 'payment_failed',
} as const;
const NotificationStatus = { queued: 'queued', sent: 'sent', failed: 'failed' } as const;
const RecipientType = { owner: 'owner', client: 'client' } as const;
const SignatureMethod = { typed: 'typed', drawn: 'drawn' } as const;
const SignatureProvider = { internal: 'internal', docuseal: 'docuseal', documenso: 'documenso' } as const;
const WebhookProvider = { stripe: 'stripe', docuseal: 'docuseal', documenso: 'documenso' } as const;

export const enums = {
  QuoteStatus,
  PaymentStatus,
  PaymentKind,
  InvoiceStatus,
  ActivityType,
  NotificationTemplate,
  NotificationStatus,
  RecipientType,
  SignatureMethod,
  SignatureProvider,
  WebhookProvider,
};

function model<T>(name: string, schema: Schema): mongoose.Model<T> {
  return (mongoose.models[name] as mongoose.Model<T>) ?? mongoose.model<T>(name, schema);
}

const lineItemSchema = new Schema(
  {
    label: { type: String, required: true },
    description: String,
    qty: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    type: { type: String, enum: ['standard', 'optional', 'tiered'], default: 'standard' },
    selected: { type: Boolean, default: true },
    tierGroup: { type: String, default: null },
  },
  { _id: true },
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true },
    name: String,
    role: { type: String, default: 'owner' },
    brand: {
      businessName: String,
      logoUrl: { type: String, default: null },
      primaryColor: { type: String, default: '#1B4965' },
    },
  },
  { timestamps: true },
);

const clientSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true },
    name: String,
    email: String,
    company: { type: String, default: null },
  },
  { timestamps: true },
);

const quoteSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, required: true },
    clientId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    status: { type: String, default: 'draft' },
    currency: { type: String, required: true },
    lineItems: [lineItemSchema],
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    depositType: { type: String, default: 'percent' },
    depositValue: { type: Number, default: 0 },
    depositAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    publicToken: { type: String, unique: true, sparse: true },
    expiresAt: Date,
    pdfUrl: { type: String, default: null },
    sentAt: { type: Date, default: null },
    viewedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    depositPaidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const signatureSchema = new Schema(
  {
    quoteId: { type: Schema.Types.ObjectId, required: true, index: true },
    signerName: { type: String, required: true },
    method: { type: String, required: true },
    signatureData: { type: String, required: true },
    provider: { type: String, default: 'internal' },
    providerEnvelopeId: { type: String, default: null },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, default: null },
    signedAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const paymentSchema = new Schema(
  {
    quoteId: { type: Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, required: true },
    stripePaymentIntentId: { type: String, default: null, index: true },
    stripeChargeId: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, default: 'pending' },
    idempotencyKey: { type: String, required: true, unique: true },
    failureReason: { type: String, default: null },
  },
  { timestamps: true },
);

const invoiceSchema = new Schema(
  {
    quoteId: { type: Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, default: 'balance' },
    number: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, default: 'draft' },
    stripeInvoiceId: { type: String, default: null },
    issuedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const webhookEventSchema = new Schema(
  {
    provider: { type: String, required: true },
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    processed: { type: Boolean, default: false },
    processedAt: { type: Date, default: null },
    error: { type: String, default: null },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const notificationSchema = new Schema(
  {
    quoteId: { type: Schema.Types.ObjectId, required: true, index: true },
    channel: { type: String, default: 'email' },
    recipientType: { type: String, required: true },
    template: { type: String, required: true },
    to: { type: String, required: true },
    status: { type: String, default: 'queued' },
    error: { type: String, default: null },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const activityEventSchema = new Schema(
  {
    quoteId: { type: Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, required: true },
    actor: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

export const User = model('User', userSchema);
export const Client = model('Client', clientSchema);
export const Quote = model('Quote', quoteSchema);
export const Signature = model('Signature', signatureSchema);
export const Payment = model('Payment', paymentSchema);
export const Invoice = model('Invoice', invoiceSchema);
export const WebhookEvent = model('WebhookEvent', webhookEventSchema);
export const Notification = model('Notification', notificationSchema);
export const ActivityEvent = model('ActivityEvent', activityEventSchema);

export const models = {
  User,
  Client,
  Quote,
  Signature,
  Payment,
  Invoice,
  WebhookEvent,
  Notification,
  ActivityEvent,
};
