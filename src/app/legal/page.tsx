import type { Metadata } from 'next'
import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageFlairShell } from '@/components/page-flair-shell'
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from '@/lib/support-contact'

export const metadata: Metadata = {
  title: 'Legal | SharedJournal',
  description: 'Legal policies and terms for SharedJournal users.',
}

export default function LegalPage() {
  return (
    <PageFlairShell contentClassName="max-w-3xl space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Legal</h1>
        <p className="text-muted-foreground text-sm">
          Legal policies for SharedJournal users in the United States.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
            <CardDescription>
              Learn what data SharedJournal collects and how it is used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/privacy" className="text-sm underline underline-offset-4 hover:no-underline">
              Read Privacy Policy
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
            <CardDescription>
              Review the terms that apply when using SharedJournal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/terms" className="text-sm underline underline-offset-4 hover:no-underline">
              Read Terms of Service
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Support payments</CardTitle>
          <CardDescription>
            Optional one-time support payments are processed by Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            See Privacy Policy and Terms of Service for payment processor details, non-tax-deductible
            wording, and case-by-case refund handling.
          </p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Questions: <a href={SUPPORT_EMAIL_HREF} className="underline underline-offset-4 hover:no-underline">{SUPPORT_EMAIL}</a>
      </p>
    </PageFlairShell>
  )
}