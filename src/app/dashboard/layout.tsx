import Link from 'next/link'

import { SUPPORT_EMAIL_HREF } from '@/lib/support-contact'
import { CoffeeIcon } from 'lucide-react'

type DashboardLayoutProps = Readonly<{
  children: React.ReactNode
}>

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const year = new Date().getFullYear()

  return (
    <div className="flex min-h-[100svh] flex-col">
      <div className="flex-1">{children}</div>

      <footer className="border-t bg-background/80">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            © {year} SharedJournal. Private, invitation-only journaling.
          </p>

          <nav aria-label="Dashboard footer links" className="flex items-center gap-4 text-xs">
            <a
              href={SUPPORT_EMAIL_HREF}
              className="text-muted-foreground underline-offset-4 hover:underline"
            >
              Support
            </a>
            <Link
              href="/buy-me-coffee"
              className="text-muted-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              <CoffeeIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Buy me coffee</span>
            </Link>
            <Link
              href="/legal"
              className="text-muted-foreground underline-offset-4 hover:underline"
            >
              Legal
            </Link>
            <Link
              href="/privacy"
              className="text-muted-foreground underline-offset-4 hover:underline"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground underline-offset-4 hover:underline"
            >
              Terms
            </Link>
            <Link href="/" className="text-muted-foreground underline-offset-4 hover:underline">
              Home
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
