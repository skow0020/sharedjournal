'use client'

import { format } from 'date-fns'
import { CheckCircle2, Copy, DownloadIcon } from 'lucide-react'
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
            Generate a ZIP export of all journals you own, including entries, reflections, collaborators, and photo files. A download link will appear here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          {state.downloadUrl ? (
            <div className="space-y-3 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" aria-hidden />
                <p className="font-medium text-green-900 dark:text-green-100">Export ready!</p>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Your ZIP export is ready to download. Download via the link below.
              </p>
              {expiresAt ? (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Link expires in 24 hours ({format(expiresAt, 'MMM d, h:mm a')})
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button asChild variant="default" size="sm">
                  <a href={state.downloadUrl}>
                    <DownloadIcon className="size-4" aria-hidden />
                    Download ZIP
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button type="button" onClick={handleGenerate} disabled={pending}>
            {pending ? 'Generating your export...' : 'Generate export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
