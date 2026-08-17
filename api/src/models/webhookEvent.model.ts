import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { WebhookProvider } from './enums.js';

/**
 * Append-only log of every inbound webhook (Stripe, DocuSeal/Documenso).
 * Source of truth for idempotent processing (F-11): `eventId` is UNIQUE so a
 * duplicate insert fails fast → the event has already been processed.
 */
const webhookEventSchema = new Schema(
  {
    provider: { type: String, enum: WebhookProvider, required: true },
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    processed: { type: Boolean, default: false, index: true },
    processedAt: { type: Date, default: null },
    error: { type: String, default: null },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Indexes (DBD).
webhookEventSchema.index({ eventId: 1 }, { unique: true }); // idempotency guard (F-11)
webhookEventSchema.index({ type: 1 });
webhookEventSchema.index({ processed: 1 });
webhookEventSchema.index({ provider: 1, type: 1, createdAt: -1 }); // event-log table

export type WebhookEvent = InferSchemaType<typeof webhookEventSchema>;
export type WebhookEventDoc = HydratedDocument<WebhookEvent>;

export const WebhookEventModel = model('WebhookEvent', webhookEventSchema);
export default WebhookEventModel;
