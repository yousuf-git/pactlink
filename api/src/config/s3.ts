import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Object storage abstraction.
 *
 * Keeps the dependency surface minimal: if S3/R2 credentials are present we
 * lazily load the AWS SDK (optional dep — never required at boot). Otherwise we
 * fall back to writing into a local `./storage` directory and serving the file
 * back via a `file://`-style local path / PUBLIC_APP_URL-relative URL.
 *
 * The rest of the app only depends on `putObject` returning a usable URL — it
 * never cares which backend handled it. This keeps PDF generation (F-02) working
 * fully offline in dev/test.
 */

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'storage');

function s3Configured(): boolean {
  return Boolean(env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);
}

// Lazily-imported, loosely-typed S3 client so the AWS SDK stays an optional dep.
let s3Client: unknown = null;
let s3Warned = false;

async function getS3Client(): Promise<unknown | null> {
  if (s3Client) return s3Client;
  if (!s3Configured()) return null;
  try {
    // Dynamic import keeps @aws-sdk/client-s3 optional — only loaded when used.
    const mod = (await import('@aws-sdk/client-s3' as string).catch(() => null)) as
      | { S3Client: new (cfg: unknown) => unknown }
      | null;
    if (!mod) {
      if (!s3Warned) {
        logger.warn('S3 credentials set but @aws-sdk/client-s3 not installed — falling back to local storage');
        s3Warned = true;
      }
      return null;
    }
    const accessKeyId = env.S3_ACCESS_KEY_ID as string;
    const secretAccessKey = env.S3_SECRET_ACCESS_KEY as string;
    s3Client = new mod.S3Client({
      region: env.S3_REGION ?? 'us-east-1',
      endpoint: env.S3_ENDPOINT || undefined,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: Boolean(env.S3_ENDPOINT), // R2 / MinIO style
    });
    return s3Client;
  } catch (err) {
    logger.warn('Failed to initialise S3 client — falling back to local storage', {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export interface PutObjectResult {
  key: string;
  url: string;
  backend: 's3' | 'local';
}

/**
 * Persist a buffer under `key` and return a retrievable URL.
 */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<PutObjectResult> {
  const client = await getS3Client();

  if (client && s3Configured()) {
    try {
      const mod = (await import('@aws-sdk/client-s3' as string)) as {
        PutObjectCommand: new (cfg: unknown) => unknown;
      };
      // @ts-expect-error loosely-typed dynamic client
      await client.send(
        new mod.PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      const base = env.S3_ENDPOINT
        ? `${env.S3_ENDPOINT.replace(/\/$/, '')}/${env.S3_BUCKET}`
        : `https://${env.S3_BUCKET}.s3.${env.S3_REGION ?? 'us-east-1'}.amazonaws.com`;
      return { key, url: `${base}/${key}`, backend: 's3' };
    } catch (err) {
      logger.warn('S3 putObject failed — falling back to local storage', {
        err: err instanceof Error ? err.message : String(err),
        key,
      });
    }
  }

  // Local fallback.
  const dest = path.join(LOCAL_STORAGE_DIR, key);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, body);
  logger.info('Stored object to local storage (S3 not configured)', { key, dest });
  // A relative URL the API/web can serve from a static mount, plus an absolute file path.
  return { key, url: `/storage/${key}`, backend: 'local' };
}

export function isS3Configured(): boolean {
  return s3Configured();
}
