// In-memory mutable clone of the seed data. The mock service layer reads and
// writes this so the dashboard CRUD and the public approval flow are fully
// clickable offline (USE_API=false). A fresh clone is produced on demand so
// the sandbox can get its own isolated copy (quick-web sandbox architecture).

import {
  seedUser,
  seedClients,
  seedQuotes,
  seedSignatures,
  seedPayments,
  seedInvoices,
  seedWebhookEvents,
  seedNotifications,
  seedActivityEvents,
} from "@/data/seedData";
import type {
  User,
  Client,
  Quote,
  Signature,
  Payment,
  Invoice,
  WebhookEvent,
  Notification,
  ActivityEvent,
} from "@/lib/types";

export interface DataSet {
  user: User;
  clients: Client[];
  quotes: Quote[];
  signatures: Signature[];
  payments: Payment[];
  invoices: Invoice[];
  webhookEvents: WebhookEvent[];
  notifications: Notification[];
  activityEvents: ActivityEvent[];
}

// Structured clone keeps the original seed arrays untouched.
export function freshDataSet(): DataSet {
  const clone = <T>(v: T): T =>
    typeof structuredClone === "function"
      ? structuredClone(v)
      : JSON.parse(JSON.stringify(v));
  return {
    user: clone(seedUser),
    clients: clone(seedClients),
    quotes: clone(seedQuotes),
    signatures: clone(seedSignatures),
    payments: clone(seedPayments),
    invoices: clone(seedInvoices),
    webhookEvents: clone(seedWebhookEvents),
    notifications: clone(seedNotifications),
    activityEvents: clone(seedActivityEvents),
  };
}

// The module-level default dataset used in non-sandbox mock mode.
export const db: DataSet = freshDataSet();
