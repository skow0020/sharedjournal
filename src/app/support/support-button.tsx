'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'

type SupportCheckoutInput = {
  amountCents: number
}

type SupportCheckoutState = {
  error: string | null
  checkoutUrl: string | null
}

type SupportButtonProps = {
  amountCents: number
  action: (input: SupportCheckoutInput) => Promise<SupportCheckoutState>
  redirectToCheckout?: (checkoutUrl: string) => void
}

export function SupportButton({ amountCents, action, redirectToCheckout }: SupportButtonProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onClick() {
    setPending(true)
    setError(null)

    try {
      const result = await action({ amountCents })

      if (result.error || !result.checkoutUrl) {
        setError(result.error ?? 'Unable to start checkout.')
        return
      }

      if (redirectToCheckout) {
        redirectToCheckout(result.checkoutUrl)
        return
      }

      window.location.assign(result.checkoutUrl)
    } catch {
      setError('Unable to start checkout right now. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" className="w-full" onClick={onClick} disabled={pending}>
        {pending ? 'Opening checkout...' : `Support $${(amountCents / 100).toFixed(2)}`}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
