import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    // Populate required env vars before any module (config/env.ts) loads.
    setupFiles: ['src/__tests__/support/env.setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: 'forks',
    // Each test file spins its own in-memory mongod; running them in parallel
    // races on the shared mongod binary/locks. Run files sequentially for determinism.
    fileParallelism: false,
  },
});
