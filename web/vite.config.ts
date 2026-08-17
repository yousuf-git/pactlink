import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// PactLink web build config. Manual chunks keep the heavy
// approval-page deps (Stripe, signature_pad) and chart libs out of
// the initial owner-dashboard bundle.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        banner: "/*! PactLink | built by Muhammad Yousuf · https://github.com/yousuf-git · https://yousuf-dev.com */",
        manualChunks: {
          charts: ["recharts"],
          payments: ["@stripe/react-stripe-js", "@stripe/stripe-js"],
          motion: ["framer-motion", "gsap"],
          signature: ["signature_pad"],
        },
      },
    },
  },
});
