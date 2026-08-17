import type { Server } from 'node:http';
import { createApp } from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

async function bootstrap(): Promise<void> {
  await connectDb();
  const app = await createApp();

  const server: Server = app.listen(env.PORT, () => {
    logger.info(`PactLink API listening on :${env.PORT}`, { env: env.NODE_ENV });
  });

  async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    // Force-exit safety net if connections don't drain in time.
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
    process.exit(1);
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { err: (err as Error)?.message });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error('Fatal boot error', { err: (err as Error)?.message });
  process.exit(1);
});
