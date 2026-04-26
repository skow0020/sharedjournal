import { SignInButton } from '@clerk/nextjs'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageFlairShell } from '@/components/page-flair-shell'
import { Button } from '@/components/ui/button'
import { createSupportCheckoutAction } from '@/app/support/actions'
import { SupportButton } from '@/app/support/support-button'
import { getCurrentAppUser } from '@/lib/get-current-app-user'
import { SUPPORT_AMOUNTS } from '@/lib/support-amounts'

export default async function SupportPage() {
  const appUser = await getCurrentAppUser()

  return (
    <PageFlairShell contentClassName="max-w-3xl space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Buy me coffee</h1>
        <p className="text-muted-foreground text-sm">
          SharedJournal is free to use. If it has helped you, an optional one-time coffee contribution
          helps cover hosting, storage, and ongoing development.
        </p>
      </section>

      {!appUser ? (
        <Card>
          <CardHeader>
            <CardTitle>Sign in to continue</CardTitle>
            <CardDescription>
              You need an account to continue to secure checkout and to track your support payment status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignInButton mode="modal" forceRedirectUrl="/buy-me-coffee">
              <Button>Sign in to buy me coffee</Button>
            </SignInButton>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Choose a coffee amount</CardTitle>
            <CardDescription>
              Coffee contributions are optional and are not tax-deductible charitable donations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {SUPPORT_AMOUNTS.map((amountCents) => (
              <SupportButton
                key={amountCents}
                amountCents={amountCents}
                action={createSupportCheckoutAction}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </PageFlairShell>
  )
}
