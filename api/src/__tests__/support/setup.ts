import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from '../../config/db.js';
import { UserModel } from '../../models/index.js';

/**
 * Route/integration test helpers: in-memory MongoDB lifecycle plus a seeded
 * owner. Kept separate from `__tests__/helpers/`, which builds standalone
 * models for the business-logic tests.
 */
let mongod: MongoMemoryServer | null = null;

export async function startMemoryDb(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri());
}

export async function stopMemoryDb(): Promise<void> {
  await disconnectDb();
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}

export async function clearDb(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

/** Insert a demo owner and return it alongside the plaintext password. */
export async function createTestOwner(password = 'demo1234') {
  const passwordHash = await bcrypt.hash(password, 10);
  const owner = await UserModel.create({
    email: 'demo@pactlink.app',
    passwordHash,
    name: 'Demo Owner',
    role: 'demo',
    brand: { businessName: 'Northwind Studio', primaryColor: '#1B4965' },
    defaultCurrency: 'USD',
    defaultDepositType: 'percent',
    defaultDepositValue: 30,
  });
  return { owner, password };
}
