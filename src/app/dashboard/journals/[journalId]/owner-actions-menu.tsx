'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import { useState } from 'react'

import { type DeleteJournalInput, type DeleteJournalState } from '@/app/dashboard/actions'
import { DeleteJournalButton } from '@/app/dashboard/delete-journal-button'
import {
  type UpdateJournalDetailsInput,
  type UpdateJournalDetailsState,
} from '@/app/dashboard/journals/[journalId]/actions'
import { EditJournalModal } from '@/app/dashboard/journals/[journalId]/edit-journal-modal'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type OwnerActionsMenuProps = {
  journalId: string
  journalTitle: string
  journalDescription: string | null
  deleteAction: (input: DeleteJournalInput) => Promise<DeleteJournalState>
  updateAction: (input: UpdateJournalDetailsInput) => Promise<UpdateJournalDetailsState>
}

export function OwnerActionsMenu({
  journalId,
  journalTitle,
  journalDescription,
  deleteAction,
  updateAction,
}: OwnerActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  function handleEditSelect(event: Event) {
    event.preventDefault()
    setMenuOpen(false)
    setEditOpen(true)
  }

  function handleDeleteSelect(event: Event) {
    event.preventDefault()
    setMenuOpen(false)
    setDeleteOpen(true)
  }

  return (
    <>
      <EditJournalModal
        journalId={journalId}
        initialTitle={journalTitle}
        initialDescription={journalDescription}
        action={updateAction}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteJournalButton
        journalId={journalId}
        action={deleteAction}
        successRedirectTo="/dashboard"
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-9 p-0"
            aria-label="Open journal actions"
          >
            <MoreHorizontalIcon className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={handleEditSelect}>Edit journal</DropdownMenuItem>
          <div className="bg-border my-1 h-px" aria-hidden="true" />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={handleDeleteSelect}
          >
            Delete journal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
