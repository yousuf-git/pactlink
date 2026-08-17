/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_API: string;
  readonly VITE_API_BASE: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
