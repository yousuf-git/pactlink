import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { Currency, PaymentKind, PaymentStatus } from './enums.js';

/**
 * Stripe payment record for deposit/balance (F-05).
 * Status is server-authoritative — mutated only by verified Stripe webhooks (F-09).
 */
const paymentSchema = new Schema(
  {
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote', required: true, index: true },
    type: { type: String, enum: PaymentKind, required: true },
    stripePaymentIntentId: { type: String, default: null, index: true },
    stripeChargeId: { type: String, default: null },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: Currency, required: true },
    status: { type: String, enum: PaymentStatus, default: 'pending', index: true },
    idempotencyKey: { type: String, required: true, unique: true },
    failureReason: { type: String, default: null },
  },
  { timestamps: true },
);

// Indexes (DBD).
paymentSchema.index({ idempotencyKey: 1 }, { unique: true }); // guards double-charge (F-11)
paymentSchema.index({ stripePaymentIntentId: 1 }, { sparse: true });
paymentSchema.index({ quoteId: 1, type: 1 }); // deposit vs balance lookup

export type Payment = InferSchemaType<typeof paymentSchema>;
export type PaymentDoc = HydratedDocument<Payment>;

export const PaymentModel = model('Payment', paymentSchema);
export default PaymentModel;
