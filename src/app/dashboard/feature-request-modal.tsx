'use client'

import { useState, useTransition } from 'react'

import {
  type DismissFeatureRequestSurveyInput,
  type DismissFeatureRequestSurveyState,
  type SubmitFeatureRequestSurveyInput,
  type SubmitFeatureRequestSurveyState,
} from '@/app/dashboard/actions'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

type FeatureRequestModalProps = {
  submitAction: (
    input: SubmitFeatureRequestSurveyInput,
  ) => Promise<SubmitFeatureRequestSurveyState>
  dismissAction: (
    input: DismissFeatureRequestSurveyInput,
  ) => Promise<DismissFeatureRequestSurveyState>
}

export function FeatureRequestModal({ submitAction, dismissAction }: FeatureRequestModalProps) {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [requestText, setRequestText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await submitAction({ requestText })

      if (result.error) {
        setError(result.error)
        return
      }

      setError(null)
      setOpen(false)
      setHidden(true)
    })
  }

  function handleDismiss() {
    startTransition(async () => {
      const result = await dismissAction({})

      if (result.error) {
        setError(result.error)
        return
      }

      setError(null)
      setOpen(false)
      setHidden(true)
    })
  }

  if (hidden) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Share feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Help shape SharedJournal</DialogTitle>
          <DialogDescription>
            Have a feature request? Share it here. This is optional.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="feature-request-text" className="text-sm font-medium">
              Feature request (optional)
            </label>
            <Textarea
              id="feature-request-text"
              name="requestText"
              value={requestText}
              onChange={(event) => setRequestText(event.target.value)}
              maxLength={2000}
              placeholder="Example: A weekly email summary of new entries in journals I follow."
            />
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleDismiss} disabled={pending}>
              No thanks
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving...' : 'Submit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
