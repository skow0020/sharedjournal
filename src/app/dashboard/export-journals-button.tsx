'use client'

import { format } from 'date-fns'
import { DownloadIcon } from 'lucide-react'
import { useState, useTransition } from 'react'

import {
  type GenerateOwnerExportInput,
  type GenerateOwnerExportState,
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

type ExportJournalsButtonProps = {
  action: (input: GenerateOwnerExportInput) => Promise<GenerateOwnerExportState>
}

export function ExportJournalsButton({ action }: ExportJournalsButtonProps) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<GenerateOwnerExportState>({
    error: null,
    downloadUrl: null,
    expiresAt: null,
  })
  const [pending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      const nextState = await action({})
      setState(nextState)
    })
  }

  const expiresAt = state.expiresAt ? new Date(state.expiresAt) : null

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)

        if (!nextOpen) {
          setState({
            error: null,
            downloadUrl: null,
            expiresAt: null,
          })
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <DownloadIcon className="size-4" aria-hidden />
          Export journals
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export your journals</DialogTitle>
          <DialogDescription>
            Generate a ZIP export of all journals you own, including entries, reflections, collaborators, and photo files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          {state.downloadUrl ? (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm">Your export is ready to download.</p>
              {expiresAt ? (
                <p className="text-muted-foreground text-xs">
                  Link expires {format(expiresAt, 'MMM d, yyyy h:mm a')}
                </p>
              ) : null}
              <a
                href={state.downloadUrl}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Download export ZIP
              </a>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button type="button" onClick={handleGenerate} disabled={pending}>
            {pending ? 'Generating export...' : 'Generate export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
