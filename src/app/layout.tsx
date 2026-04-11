import type { Metadata } from 'next'
import {
  ClerkProvider,
  GoogleOneTap,
} from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthHeader } from '@/components/auth-header'

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
  return (
    <ClerkProvider afterSignOutUrl="/auth/sign-out">
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <AuthHeader />
          <GoogleOneTap
            signInForceRedirectUrl="/auth/transition"
            signUpForceRedirectUrl="/auth/transition"
          />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}