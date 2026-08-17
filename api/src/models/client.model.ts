import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const clientSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    company: { type: String, default: null },
    phone: { type: String, default: null },
  },
  { timestamps: true },
);

// Owner-scoped list + dedupe/lookup by email within an owner.
clientSchema.index({ ownerId: 1, email: 1 });

export type Client = InferSchemaType<typeof clientSchema>;
export type ClientDoc = HydratedDocument<Client>;

export const ClientModel = model('Client', clientSchema);
export default ClientModel;
