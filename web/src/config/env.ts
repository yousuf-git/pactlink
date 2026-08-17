// Single source of truth for the data-layer toggle.
// USE_API=false (default) → service layer returns local seed data with
// simulated latency. USE_API=true → service layer calls the real backend.
export const USE_API = import.meta.env.VITE_USE_API === "true";

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? "http://localhost:4000/api/v1";

export const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "";

// Platform-admin credentials (frontend-hardcoded for now via env, with safe
// defaults so it works out of the box). Migrate to a real /auth/login role
// claim later — the admin user is recognised here in mock mode.
export const ADMIN_CREDENTIALS = {
  email: import.meta.env.VITE_ADMIN_EMAIL ?? "admin@pactlink.app",
  password: import.meta.env.VITE_ADMIN_PASSWORD ?? "PactLink-Admin-2026",
};

// Sandbox sessions live for 2 hours (quick-web sandbox architecture).
export const SANDBOX_TTL_MS = 2 * 60 * 60 * 1000;
export const SANDBOX_WARN_MS = 15 * 60 * 1000; // warn 15m before expiry

// Simulated network latency window for the mock service layer.
export const MOCK_LATENCY = { min: 300, max: 700 };
