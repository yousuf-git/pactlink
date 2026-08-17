import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { Currency, InvoiceKind, InvoiceStatus } from './enums.js';

/** Auto-generated balance invoice after deposit is paid (F-06). */
const invoiceSchema = new Schema(
  {
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote', required: true, index: true },
    type: { type: String, enum: InvoiceKind, default: 'balance' },
    number: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: Currency, required: true },
    status: { type: String, enum: InvoiceStatus, default: 'draft', index: true },
    stripeInvoiceId: { type: String, default: null },
    issuedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

invoiceSchema.index({ number: 1 }, { unique: true });
invoiceSchema.index({ quoteId: 1 });
invoiceSchema.index({ stripeInvoiceId: 1 }, { sparse: true });
invoiceSchema.index({ status: 1 });

export type Invoice = InferSchemaType<typeof invoiceSchema>;
export type InvoiceDoc = HydratedDocument<Invoice>;

export const InvoiceModel = model('Invoice', invoiceSchema);
export default InvoiceModel;
