import { Signature } from '../../models/index.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

/**
 * E-signature service (F-04).
 *
 * The `internal` provider persists the typed/drawn signature plus legal evidence
 * (timestamp + IP + userAgent) directly to the `signatures` collection and works
 * fully offline. A `docuseal` adapter stub is included (gated by env) for the
 * hosted-signing path — it is a no-op placeholder until DocuSeal is wired up.
 *
 * NOTE: enums are `as const` string arrays — values are written as literals.
 */

export interface RecordSignatureInput {
  quoteId: unknown;
  signerName: string;
  method: 'typed' | 'drawn';
  signatureData: string;
  ip: string;
  userAgent?: string | null;
}

export interface RecordedSignature {
  _id: unknown;
  signedAt: Date;
  provider: string;
}

function docusealEnabled(): boolean {
  return Boolean(env.DOCUSEAL_URL && env.DOCUSEAL_TOKEN);
}

/**
 * Persist a signature record. Always captures the canvas/typed payload + audit
 * fields at our boundary (per TRD). If DocuSeal is configured we additionally
 * kick off an envelope and store its id for webhook correlation.
 */
export async function recordSignature(input: RecordSignatureInput): Promise<RecordedSignature> {
  const signedAt = new Date();

  let provider: 'internal' | 'docuseal' = 'internal';
  let providerEnvelopeId: string | null = null;

  if (docusealEnabled()) {
    try {
      const envelope = await createDocusealEnvelope({
        quoteId: input.quoteId,
        signerName: input.signerName,
      });
      provider = 'docuseal';
      providerEnvelopeId = envelope.id;
    } catch (err) {
      // Never block the agreement on a provider hiccup — fall back to internal.
      logger.warn('DocuSeal envelope creation failed — persisting internal signature', {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const signature = (await Signature.create({
    quoteId: input.quoteId,
    signerName: input.signerName,
    method: input.method,
    signatureData: input.signatureData,
    provider,
    providerEnvelopeId,
    ipAddress: input.ip,
    userAgent: input.userAgent ?? null,
    signedAt,
  })) as unknown as RecordedSignature;

  logger.info('Recorded signature', {
    quoteId: String(input.quoteId),
    signatureId: String(signature._id),
    provider,
  });
  return signature;
}

/**
 * DocuSeal adapter stub (gated by env). Returns a synthetic envelope id when the
 * real API call is not implemented. Replace the body with a real DocuSeal
 * submission POST when self-hosting is available.
 */
async function createDocusealEnvelope(args: {
  quoteId: unknown;
  signerName: string;
}): Promise<{ id: string }> {
  // A real implementation would POST to `${DOCUSEAL_URL}/submissions` with
  // DOCUSEAL_TOKEN and return the submission id.
  logger.debug('DocuSeal adapter stub invoked', { quoteId: String(args.quoteId) });
  return { id: `docuseal_stub_${String(args.quoteId)}_${Date.now()}` };
}
