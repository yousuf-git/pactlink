import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * In-memory MongoDB lifecycle for tests.
 * Ensures unique indexes (eventId, idempotencyKey, invoice number) are built so
 * idempotency tests are real.
 */
let mongod: MongoMemoryServer | null = null;

export async function connectMemoryDb(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function ensureIndexes(): Promise<void> {
  await Promise.all(Object.values(mongoose.models).map((m) => m.createIndexes()));
}

export async function clearDb(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

export async function disconnectMemoryDb(): Promise<void> {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  mongod = null;
}
