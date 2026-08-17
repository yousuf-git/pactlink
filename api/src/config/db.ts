import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

mongoose.set('strictQuery', true);

let connected = false;

/** Connect to MongoDB. Idempotent — safe to call once at boot. */
export async function connectDb(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (connected) return mongoose;
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    autoIndex: !env.isProd, // build indexes automatically outside prod
  });
  connected = true;
  logger.info('MongoDB connected', { host: mongoose.connection.host });
  return mongoose;
}

/** Gracefully close the connection (used on shutdown / in tests). */
export async function disconnectDb(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
  logger.info('MongoDB disconnected');
}

/** Liveness ping for the /ready health check. */
export async function pingDb(): Promise<void> {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('MongoDB not connected');
  }
  await mongoose.connection.db.admin().ping();
}
