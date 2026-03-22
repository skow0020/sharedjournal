'use client'

import { MoreHorizontalIcon } from 'lucide-react'

import {
  type DeleteJournalInput,
  type DeleteJournalState,
} from '@/app/dashboard/actions'
import { DeleteJournalButton } from '@/app/dashboard/delete-journal-button'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type MobileOwnerActionsMenuProps = {
  journalId: string
  action: (input: DeleteJournalInput) => Promise<DeleteJournalState>
}

export function MobileOwnerActionsMenu({ journalId, action }: MobileOwnerActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 sm:hidden"
          aria-label="Open journal actions"
        >
          <MoreHorizontalIcon className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 sm:hidden">
        <DeleteJournalButton
          journalId={journalId}
          action={action}
          successRedirectTo="/dashboard"
          trigger={(
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              Delete journal
            </DropdownMenuItem>
          )}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}