import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.integration.ts'],
    include: ['src/**/*.integration.test.ts'],
    clearMocks: true,
    // Integration tests hit a real database — allow generous per-test time.
    testTimeout: 30_000,
    pool: 'forks',
    coverage: {
      include: ['src/data/**/*.{ts,tsx}'],
      exclude: [
        'src/data**/*.test.{ts,tsx}',
      ],
      reporter: ['text', 'html'],
      thresholds: {
        statements: 75,
        branches: 75,
        functions: 85,
        lines: 75,
      },
    },
  },
})
