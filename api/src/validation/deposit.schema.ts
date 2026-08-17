import { z } from 'zod';

/**
 * Deposit-intent request (UC-C04 / F-05).
 * Body for POST /api/v1/public/quotes/:token/deposit-intent.
 *
 * The amount is ALWAYS recomputed server-side from the quote — the client never
 * supplies the deposit amount. The body is essentially empty but we accept an
 * optional `returnUrl` for the Stripe redirect flow.
 */
export const depositIntentSchema = z.object({
  returnUrl: z.string().url().optional(),
});

export type DepositIntentInput = z.infer<typeof depositIntentSchema>;
