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
    // Run serially to avoid seed/teardown races across test files.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      include: ['src/data/**/*.{ts,tsx}'],
      exclude: [
        'src/data**/*.test.{ts,tsx}',
      ],
      reporter: ['text', 'html'],
    },
  },
})
