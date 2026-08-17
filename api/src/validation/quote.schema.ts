import { z } from 'zod';
import { Currency, DepositType, LineItemType } from '../models/enums.js';

/** A single line item on create/update. Money in integer minor units (cents). */
export const lineItemSchema = z.object({
  label: z.string().min(1, 'Label is required').max(300),
  description: z.string().max(2000).nullish(),
  qty: z.number().int('Quantity must be a whole number').min(0, 'Quantity cannot be negative'),
  unitPrice: z.number().int('Price must be in minor units (cents)').min(0, 'Price cannot be negative'),
  taxRate: z
    .number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%')
    .default(0),
  type: z.enum(LineItemType).default('standard'),
  selected: z.boolean().default(true),
  tierGroup: z.string().max(100).nullish(),
});

const baseDeposit = {
  depositType: z.enum(DepositType),
  depositValue: z.number().min(0, 'Deposit value cannot be negative'),
};

export const createQuoteSchema = z
  .object({
    clientId: z.string().regex(/^[a-f\d]{24}$/i, 'A valid clientId is required'),
    title: z.string().min(1, 'Title is required').max(300),
    currency: z.enum(Currency).optional(),
    lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
    expiresAt: z.coerce.date().nullish(),
    ...baseDeposit,
    depositType: baseDeposit.depositType.optional(),
    depositValue: baseDeposit.depositValue.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.depositType === 'percent' && data.depositValue != null && data.depositValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['depositValue'],
        message: 'Percent deposit cannot exceed 100',
      });
    }
  });

export const updateQuoteSchema = z
  .object({
    clientId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    title: z.string().min(1).max(300).optional(),
    currency: z.enum(Currency).optional(),
    lineItems: z.array(lineItemSchema).min(1).optional(),
    depositType: z.enum(DepositType).optional(),
    depositValue: z.number().min(0).optional(),
    expiresAt: z.coerce.date().nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.depositType === 'percent' && data.depositValue != null && data.depositValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['depositValue'],
        message: 'Percent deposit cannot exceed 100',
      });
    }
  });

export const quoteIdParam = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid quote id'),
});

export type LineItemInput = z.infer<typeof lineItemSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
