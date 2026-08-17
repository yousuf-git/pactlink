import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { Currency, DepositType, UserRole } from './enums.js';

/** Branding subdocument used on PDFs + approval page (F-02). */
const brandSchema = new Schema(
  {
    businessName: { type: String, required: true },
    logoUrl: { type: String, default: null },
    primaryColor: { type: String, default: '#1B4965' },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Never returned in API responses.
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true },
    role: { type: String, enum: UserRole, default: 'owner' },
    brand: { type: brandSchema, required: true },
    defaultCurrency: { type: String, enum: Currency, default: 'USD' },
    defaultDepositType: { type: String, enum: DepositType, default: 'percent' },
    defaultDepositValue: { type: Number, default: 30 },
    stripeAccountId: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

// Index: login lookup + dedupe. (declared via `unique` above; explicit for clarity)
userSchema.index({ email: 1 }, { unique: true });

export type User = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<User>;

export const UserModel = model('User', userSchema);
export default UserModel;
