'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CoffeeIcon } from 'lucide-react'

import { type DismissSupportModalInput } from '@/app/dashboard/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type SupportModalProps = {
  open: boolean
  onDismiss: (input: DismissSupportModalInput) => Promise<{ error: string | null; success: boolean }>
}

export function SupportModal({ open, onDismiss }: SupportModalProps) {
  const [isOpen, setIsOpen] = useState(open)
  const [isPending, setIsPending] = useState(false)

  async function handleDismiss(nextShowAfterDays?: number) {
    setIsPending(true)
    try {
      const result = await onDismiss({ nextShowAfterDays })
      if (result.success) {
        setIsOpen(false)
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(newOpen) => {
      if (!newOpen) {
        handleDismiss(7)
      } else {
        setIsOpen(newOpen)
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CoffeeIcon className="h-5 w-5 text-amber-600" aria-hidden="true" />
            <DialogTitle>Support SharedJournal</DialogTitle>
          </div>
          <DialogDescription>
            If you enjoy using SharedJournal, consider supporting its development.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Your support helps keep this app free and enables new features and improvements.
          </p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              🎉 Your support is greatly appreciated!
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDismiss(30)}
            disabled={isPending}
            className="flex-1 sm:flex-none"
          >
            Maybe later
          </Button>
          <Button
            asChild
            disabled={isPending}
            className="flex-1 gap-2 sm:flex-none"
            onClick={() => setIsOpen(false)}
          >
            <Link href="/buy-me-coffee">
              <CoffeeIcon className="h-4 w-4" aria-hidden="true" />
              Buy me a coffee
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
