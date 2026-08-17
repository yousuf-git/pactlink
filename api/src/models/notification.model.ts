import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { NotificationChannel, NotificationStatus, NotificationTemplate, RecipientType } from './enums.js';

/** Outbound email notification record (F-08). Drained/dispatched by the email service. */
const notificationSchema = new Schema(
  {
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote', required: true, index: true },
    channel: { type: String, enum: NotificationChannel, default: 'email' },
    recipientType: { type: String, enum: RecipientType, required: true },
    template: { type: String, enum: NotificationTemplate, required: true },
    to: { type: String, required: true },
    status: { type: String, enum: NotificationStatus, default: 'queued', index: true },
    error: { type: String, default: null },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ quoteId: 1 });
notificationSchema.index({ status: 1 }); // find queued/failed for dispatch/retry

export type Notification = InferSchemaType<typeof notificationSchema>;
export type NotificationDoc = HydratedDocument<Notification>;

export const NotificationModel = model('Notification', notificationSchema);
export default NotificationModel;
