import { redirect } from 'next/navigation'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createSupportCheckoutAction } from '@/app/support/actions'
import { SupportButton } from '@/app/support/support-button'
import { getCurrentAppUser } from '@/lib/get-current-app-user'

const SUPPORT_AMOUNTS = [500, 1000, 2500]

export default async function SupportPage() {
  const appUser = await getCurrentAppUser()

  if (!appUser) {
    redirect('/sign-in')
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Support SharedJournal</h1>
        <p className="text-muted-foreground text-sm">
          SharedJournal is free to use. If it has helped you, optional one-time support helps cover
          hosting, storage, and ongoing development.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Choose a one-time amount</CardTitle>
          <CardDescription>
            Support payments are optional and are not tax-deductible charitable donations.
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
    </main>
  )
}
