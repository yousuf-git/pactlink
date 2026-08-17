import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { Currency, DepositType, LineItemType, QuoteStatus } from './enums.js';

/** Embedded line item subdocument (F-01). Money in integer minor units (cents). */
const lineItemSchema = new Schema(
  {
    label: { type: String, required: true },
    description: { type: String, default: null },
    qty: { type: Number, required: true, min: 0, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, min: 0, default: 0 },
    type: { type: String, enum: LineItemType, default: 'standard' },
    selected: { type: Boolean, default: true },
    tierGroup: { type: String, default: null },
  },
  { _id: true }, // subdocument _id is the stable client-side toggle key
);

const quoteSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    title: { type: String, required: true },
    status: { type: String, enum: QuoteStatus, default: 'draft', index: true },
    currency: { type: String, enum: Currency, required: true },

    lineItems: { type: [lineItemSchema], default: [] },

    subtotal: { type: Number, required: true, default: 0, min: 0 },
    taxTotal: { type: Number, required: true, default: 0, min: 0 },
    total: { type: Number, required: true, default: 0, min: 0 },

    depositType: { type: String, enum: DepositType, required: true },
    depositValue: { type: Number, required: true, min: 0 },
    depositAmount: { type: Number, required: true, default: 0, min: 0 },
    balanceAmount: { type: Number, required: true, default: 0, min: 0 },

    publicToken: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, default: null },
    pdfUrl: { type: String, default: null },

    // Stage timestamps → time-to-approval + funnel (F-10).
    sentAt: { type: Date, default: null },
    viewedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    depositPaidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Indexes (DBD).
quoteSchema.index({ publicToken: 1 }, { unique: true });
quoteSchema.index({ ownerId: 1, status: 1 }); // pipeline kanban + funnel
quoteSchema.index({ ownerId: 1, createdAt: -1 }); // recent quotes feed
quoteSchema.index({ expiresAt: 1 }, { sparse: true }); // expiry sweeps

export type LineItem = InferSchemaType<typeof lineItemSchema>;
export type Quote = InferSchemaType<typeof quoteSchema>;
export type QuoteDoc = HydratedDocument<Quote>;

export const QuoteModel = model('Quote', quoteSchema);
export default QuoteModel;
