// Shared, stricter validation used by public forms (contact, early-access,
// newsletter inputs). Rejects malformed, disposable, and obvious placeholder
// addresses so the lists we collect are real and reachable.

// Common disposable / throwaway inbox providers.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "sharklasers.com",
  "grr.la",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "throwawaymail.com",
  "trashmail.com",
  "getnada.com",
  "nada.email",
  "maildrop.cc",
  "dispostable.com",
  "mailnesia.com",
  "fakeinbox.com",
  "mintemail.com",
  "spamgourmet.com",
  "mohmal.com",
  "moakt.com",
  "discard.email",
  "tempmailo.com",
  "emailondeck.com",
  "mailcatch.com",
]);

// Obvious placeholder / non-personal local parts (e.g. test@gmail.com).
const PLACEHOLDER_LOCALS = new Set([
  "test",
  "tests",
  "testing",
  "test123",
  "example",
  "sample",
  "demo",
  "dummy",
  "fake",
  "asdf",
  "asdfasdf",
  "qwerty",
  "abc",
  "abcd",
  "xyz",
  "aaa",
  "foo",
  "bar",
  "foobar",
  "noreply",
  "no-reply",
  "donotreply",
  "nobody",
  "null",
  "none",
]);

const PLACEHOLDER_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "email.com",
  "domain.com",
  "yourcompany.com",
  "company.com",
]);

/** Returns a human message describing why the email is invalid, or null if it's fine. */
export function emailIssue(raw: string): string | null {
  const email = (raw ?? "").trim().toLowerCase();
  if (!email) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Enter a valid email address";

  const [local, domain] = email.split("@");
  if (DISPOSABLE_DOMAINS.has(domain)) return "Use a permanent inbox — disposable addresses aren't accepted";
  if (PLACEHOLDER_DOMAINS.has(domain) || domain.endsWith(".example")) return "Use a real email address";
  if (PLACEHOLDER_LOCALS.has(local)) return "That looks like a placeholder — use your real email";
  return null;
}

export function isBusinessEmail(raw: string): boolean {
  return emailIssue(raw) === null;
}

/** Returns a human message describing why a free-text message is too weak, or null if it's fine. */
export function messageIssue(raw: string): string | null {
  const msg = (raw ?? "").trim();
  if (!msg) return "Tell us a bit about what you need";
  if (msg.length < 15) return "A little more detail, please (15+ characters)";
  if (/^[\d\s.,-]+$/.test(msg)) return "Numbers alone don't tell us much — add some context";
  const words = msg.split(/\s+/).filter((w) => w.length > 1);
  if (words.length < 4) return "Use at least a few words so we can actually help";
  return null;
}
