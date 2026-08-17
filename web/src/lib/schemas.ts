import { z } from "zod";
import { emailIssue, messageIssue } from "./validation";

// Reusable business-email rule: valid + not disposable + not a placeholder.
const businessEmail = z.string().superRefine((val, ctx) => {
  const issue = emailIssue(val);
  if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
});

// Zod schemas mirroring DBD field constraints. Shared client/server intent:
// the same shapes the backend validates with, so client validation matches
// server validation (TRD). Money is integer minor units (cents).

export const lineItemSchema = z
  .object({
    _id: z.string(),
    label: z.string().min(1, "Label is required"),
    description: z.string().nullable().default(null),
    qty: z.number().min(0, "Quantity cannot be negative").default(1),
    unitPrice: z.number().min(0, "Price cannot be negative"),
    taxRate: z
      .number()
      .min(0, "Tax cannot be negative")
      .max(100, "Tax cannot exceed 100%")
      .default(0),
    type: z.enum(["standard", "optional", "tiered"]).default("standard"),
    selected: z.boolean().default(true),
    tierGroup: z.string().nullable().default(null),
  })
  .refine((li) => li.type !== "tiered" || !!li.tierGroup, {
    message: "Tiered items must belong to a tier group",
    path: ["tierGroup"],
  });

export const depositConfigSchema = z
  .object({
    depositType: z.enum(["fixed", "percent"]),
    depositValue: z.number().min(0, "Deposit cannot be negative"),
  })
  .refine(
    (d) => d.depositType !== "percent" || d.depositValue <= 100,
    { message: "Percent deposit cannot exceed 100%", path: ["depositValue"] }
  );

// Quote builder draft form (F-01).
export const quoteBuilderSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  clientId: z.string().min(1, "Select a client"),
  currency: z.string().length(3, "Use a 3-letter ISO currency code"),
  depositType: z.enum(["fixed", "percent"]),
  depositValue: z.number().min(0),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one line item"),
});
export type QuoteBuilderInput = z.infer<typeof quoteBuilderSchema>;

// Owner login (UC-O01).
export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Sandbox launch.
export const sandboxSchema = z.object({
  name: z.string().min(2, "Tell us your name (2+ characters)"),
  email: z.string().email("Enter a valid email"),
  role: z.string().default("Admin"),
});
export type SandboxInput = z.infer<typeof sandboxSchema>;

// Client CRUD.
export const clientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  company: z.string().nullable().optional().default(null),
  phone: z.string().nullable().optional().default(null),
});
export type ClientInput = z.infer<typeof clientSchema>;

// Public e-signature (UC-C03 / F-04).
export const signatureSchema = z.object({
  signerName: z.string().min(2, "Type your full name to sign"),
  method: z.enum(["typed", "drawn"]),
  signatureData: z.string().min(1, "A signature is required"),
});
export type SignatureInput = z.infer<typeof signatureSchema>;

// Early-access request (pricing gate — no self-serve tiers, PRD out-of-scope).
export const earlyAccessSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: businessEmail,
  company: z.string().min(2, "Company is required"),
  businessType: z.string().min(1, "Pick what you do"),
  monthlyQuotes: z.string().min(1, "Pick a range"),
  message: z.string().optional().default(""),
});
export type EarlyAccessInput = z.infer<typeof earlyAccessSchema>;

// Contact form. Subject comes from a select (or "Other" → free text); message
// must be substantive (not numbers/whitespace/one-or-two words).
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: businessEmail,
  subject: z.string().trim().min(2, "Pick or enter a subject"),
  message: z.string().superRefine((val, ctx) => {
    const issue = messageIssue(val);
    if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
  }),
});
export type ContactInput = z.infer<typeof contactSchema>;

// Settings / brand.
export const brandSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  primaryColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "Use a 6-digit hex color"),
  logoUrl: z.string().url("Enter a valid URL").nullable().or(z.literal("")),
});
export type BrandInput = z.infer<typeof brandSchema>;
