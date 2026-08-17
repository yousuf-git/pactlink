import { z } from 'zod';

/**
 * Public sign payload (UC-C03 / F-04).
 * Body for POST /api/v1/public/quotes/:token/sign.
 *
 * `signatureData` is the typed name string OR a base64 canvas data-URL.
 * IP + userAgent are captured server-side (never trusted from the client body).
 */
export const signQuoteSchema = z.object({
  signerName: z.string().trim().min(1, 'Signer name is required').max(200),
  method: z.enum(['typed', 'drawn']),
  signatureData: z.string().trim().min(1, 'Signature is required'),
});

export type SignQuoteInput = z.infer<typeof signQuoteSchema>;
