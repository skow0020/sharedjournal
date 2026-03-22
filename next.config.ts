import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow Playwright e2e tests to access Next.js dev resources from 127.0.0.1.
  allowedDevOrigins: ['127.0.0.1'],
}

export default nextConfig
