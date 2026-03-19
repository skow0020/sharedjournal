import 'dotenv/config'
import { defineConfig, devices } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

const browser = process.env.CI ? 'Desktop Chrome' : 'Desktop Firefox'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices[browser] },
    },
    {
      name: 'public',
      testIgnore: [/.*\.setup\.ts/, /.*\.auth\.spec\.ts/],
      use: { ...devices[browser] },
    },
    {
      name: 'authenticated',
      testMatch: /.*\.auth\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices[browser],
        storageState: authFile,
      },
    },
  ],
})
