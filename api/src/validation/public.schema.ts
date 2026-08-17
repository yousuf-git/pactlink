import { z } from 'zod';

/**
 * Public selection payload (UC-C02). The client may only toggle which line
 * items are selected — never prices/qty/tax (server is authoritative, A4).
 * Each entry references a line item by its subdocument `_id`.
 */
export const selectionSchema = z.object({
  selections: z
    .array(
      z.object({
        lineItemId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid line item id'),
        selected: z.boolean(),
      }),
    )
    .min(1, 'At least one selection is required'),
});

export const tokenParam = z.object({
  token: z.string().min(8, 'Invalid token'),
});

export type SelectionInput = z.infer<typeof selectionSchema>;
