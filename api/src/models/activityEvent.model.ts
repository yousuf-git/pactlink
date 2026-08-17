import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ActivityType, ActorType } from './enums.js';

/**
 * Append-only timeline of every meaningful quote event (F-07 / F-10).
 * No updates / deletes — drives pipeline and funnel/time-to-approval analytics.
 */
const activityEventSchema = new Schema(
  {
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote', required: true, index: true },
    type: { type: String, enum: ActivityType, required: true, index: true },
    actor: { type: String, enum: ActorType, required: true },
    meta: { type: Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }, // explicit createdAt only (append-only, no updatedAt)
);

// Indexes (DBD).
activityEventSchema.index({ quoteId: 1, createdAt: 1 }); // chronological timeline
activityEventSchema.index({ type: 1, createdAt: 1 }); // funnel + time-to-approval (F-10)
activityEventSchema.index({ quoteId: 1 });

export type ActivityEvent = InferSchemaType<typeof activityEventSchema>;
export type ActivityEventDoc = HydratedDocument<ActivityEvent>;

export const ActivityEventModel = model('ActivityEvent', activityEventSchema);
export default ActivityEventModel;
