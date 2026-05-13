import type { Metadata } from 'next'
import {
  ClerkProvider,
  GoogleOneTap,
} from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthHeader } from '@/components/auth-header'
import { ThemeProvider } from '@/components/theme-provider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'SharedJournal',
  description: 'Private and shared journals in one place.',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const meticulousRecordingToken = process.env.NEXT_PUBLIC_METICULOUS_RECORDING_TOKEN

  return (
    <ClerkProvider afterSignOutUrl="/auth/sign-out">
      <html lang="en" suppressHydrationWarning>
        <head>
          {(process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview') && meticulousRecordingToken && (
            // eslint-disable-next-line @next/next/no-sync-scripts
            <script
              data-recording-token={meticulousRecordingToken}
              data-is-production-environment="false"
              src="https://snippet.meticulous.ai/v1/meticulous.js"
            />
          )}
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AuthHeader />
            <GoogleOneTap
              signInForceRedirectUrl="/auth/transition"
              signUpForceRedirectUrl="/auth/transition"
            />
            {children}
          </ThemeProvider>
          <SpeedInsights />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}