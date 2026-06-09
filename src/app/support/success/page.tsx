import { format } from 'date-fns'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageFlairShell } from '@/components/page-flair-shell'
import { getSupportPaymentForUserByCheckoutSession } from '@/data/support-payments'
import { getCurrentAppUser } from '@/lib/get-current-app-user'
import { CoffeeIcon } from 'lucide-react'

type SupportSuccessPageProps = {
  searchParams?: Promise<{
    session_id?: string
  }>
}

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100)
}

export default async function SupportSuccessPage({ searchParams }: SupportSuccessPageProps) {
  const appUser = await getCurrentAppUser()

  if (!appUser) {
    redirect('/buy-me-coffee')
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const sessionId = resolvedSearchParams?.session_id

  if (!sessionId) {
    return (
      <PageFlairShell contentClassName="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Checkout session not found</CardTitle>
            <CardDescription>
              We could not find your checkout session. Please try again from the Buy me coffee page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/buy-me-coffee"
              className="text-muted-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              <CoffeeIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Buy me coffee</span>
            </Link>
          </CardContent>
        </Card>
      </PageFlairShell>
    )
  }

  const payment = await getSupportPaymentForUserByCheckoutSession({
    userId: appUser.id,
    stripeCheckoutSessionId: sessionId,
  })

  if (!payment) {
    return (
      <PageFlairShell contentClassName="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Contribution record not found</CardTitle>
            <CardDescription>
              Your payment may still be processing. Please check back in a moment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/buy-me-coffee" className="text-sm underline underline-offset-4 hover:no-underline">
              Return to Buy me coffee
            </Link>
            <Link
              href="/buy-me-coffee"
              className="text-muted-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              <CoffeeIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Buy me coffee</span>
            </Link>          </CardContent>
        </Card>
      </PageFlairShell>
    )
  }

  const statusText = payment.status === 'completed' ? 'Completed' : 'Processing'

  return (
    <PageFlairShell contentClassName="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Thanks for the coffee!</CardTitle>
          <CardDescription>Your contribution helps us keep building for shared stories.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Status: {statusText}</p>
          <p>Amount: {formatCurrency(payment.amountCents, payment.currency)}</p>
          <p>Created: {format(payment.createdAt, 'MMMM d, yyyy h:mm a')}</p>
          {payment.completedAt ? (
            <p>Completed: {format(payment.completedAt, 'MMMM d, yyyy h:mm a')}</p>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Need help? Email{' '}
        <a href="mailto:skow0020@gmail.com" className="underline underline-offset-4 hover:no-underline">
          skow0020@gmail.com
        </a>
        .
      </p>
      <p className="text-muted-foreground text-xs">
        Return to{' '}
        <Link href="/dashboard" className="underline underline-offset-4 hover:no-underline">
          dashboard
        </Link>
        .
      </p>
    </PageFlairShell>
  )
}
