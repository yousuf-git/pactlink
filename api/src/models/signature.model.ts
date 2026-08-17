import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { SignatureMethod, SignatureProvider } from './enums.js';

/**
 * Captured e-signature with legal evidence (F-04).
 * Append-only — never updated after creation.
 */
const signatureSchema = new Schema(
  {
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote', required: true, index: true },
    signerName: { type: String, required: true },
    method: { type: String, enum: SignatureMethod, required: true },
    signatureData: { type: String, required: true },
    provider: { type: String, enum: SignatureProvider, default: 'internal' },
    providerEnvelopeId: { type: String, default: null },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, default: null },
    signedAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

signatureSchema.index({ quoteId: 1 });
signatureSchema.index({ providerEnvelopeId: 1 }, { sparse: true });

export type Signature = InferSchemaType<typeof signatureSchema>;
export type SignatureDoc = HydratedDocument<Signature>;

export const SignatureModel = model('Signature', signatureSchema);
export default SignatureModel;
