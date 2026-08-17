/** Barrel re-export of all 9 Mongoose models + their types, plus enums. */

export { UserModel, default as User } from './user.model.js';
export type { User as UserType, UserDoc } from './user.model.js';

export { ClientModel, default as Client } from './client.model.js';
export type { Client as ClientType, ClientDoc } from './client.model.js';

export { QuoteModel, default as Quote } from './quote.model.js';
export type { Quote as QuoteType, QuoteDoc, LineItem } from './quote.model.js';

export { SignatureModel, default as Signature } from './signature.model.js';
export type { Signature as SignatureType, SignatureDoc } from './signature.model.js';

export { PaymentModel, default as Payment } from './payment.model.js';
export type { Payment as PaymentType, PaymentDoc } from './payment.model.js';

export { InvoiceModel, default as Invoice } from './invoice.model.js';
export type { Invoice as InvoiceType, InvoiceDoc } from './invoice.model.js';

export { WebhookEventModel, default as WebhookEvent } from './webhookEvent.model.js';
export type { WebhookEvent as WebhookEventType, WebhookEventDoc } from './webhookEvent.model.js';

export { NotificationModel, default as Notification } from './notification.model.js';
export type { Notification as NotificationType, NotificationDoc } from './notification.model.js';

export { ActivityEventModel, default as ActivityEvent } from './activityEvent.model.js';
export type { ActivityEvent as ActivityEventType, ActivityEventDoc } from './activityEvent.model.js';

export * from './enums.js';
