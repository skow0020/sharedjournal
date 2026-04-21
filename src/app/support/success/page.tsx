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
import { getSupportPaymentForUserByCheckoutSession } from '@/data/support-payments'
import { getCurrentAppUser } from '@/lib/get-current-app-user'

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
    redirect('/sign-in')
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const sessionId = resolvedSearchParams?.session_id

  if (!sessionId) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Checkout session not found</CardTitle>
            <CardDescription>
              We could not find your support checkout session. Please try again from the support page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/support" className="text-sm underline underline-offset-4 hover:no-underline">
              Return to support page
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  const payment = await getSupportPaymentForUserByCheckoutSession({
    userId: appUser.id,
    stripeCheckoutSessionId: sessionId,
  })

  if (!payment) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Support record not found</CardTitle>
            <CardDescription>
              Your payment may still be processing. Please check back in a moment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/support" className="text-sm underline underline-offset-4 hover:no-underline">
              Return to support page
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  const statusText = payment.status === 'completed' ? 'Completed' : 'Processing'

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Thank you for supporting SharedJournal</CardTitle>
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
    </main>
  )
}
