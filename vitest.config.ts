import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['src/**/*.integration.test.{ts,tsx}'],
    clearMocks: true,
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/components/ui/**',
        'src/app/layout.tsx',
        'src/app/globals.css',
        'src/proxy.ts',
        'src/db/seed.ts',
        'src/db/schema.ts',
        'src/data/**'
      ],
      reporter: ['text', 'html'],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 80,
        lines: 90,
      },
    },
  },
})
