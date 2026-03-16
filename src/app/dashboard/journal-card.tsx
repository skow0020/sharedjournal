'use client'

import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import { type DeleteJournalInput, type DeleteJournalState } from '@/app/dashboard/actions'
import { DeleteJournalButton } from '@/app/dashboard/delete-journal-button'
import { CollaboratorsAccordion } from '@/app/dashboard/journals/collaborators-accordion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { JournalCollaborator, UserJournal } from '@/data/journals'

type JournalCardProps = {
  journal: UserJournal
  collaborators: JournalCollaborator[]
  deleteAction: (input: DeleteJournalInput) => Promise<DeleteJournalState>
}

function stopPropagation(event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) {
  event.stopPropagation()
}

function InteractiveSection({ children }: { children: ReactNode }) {
  return (
    <div
      className="pointer-events-auto"
      onClick={stopPropagation}
      onKeyDown={stopPropagation}
    >
      {children}
    </div>
  )
}

export function JournalCard({ journal, collaborators, deleteAction }: JournalCardProps) {
  const router = useRouter()

  function handleNavigate() {
    router.push(`/dashboard/journals/${journal.id}`)
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    handleNavigate()
  }

  return (
    <Card
      role="link"
      tabIndex={0}
      aria-label={`Open ${journal.title}`}
      onClick={handleNavigate}
      onKeyDown={handleCardKeyDown}
      className="relative gap-3 cursor-pointer transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:outline-none"
    >
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2">
          <span>{journal.title}</span>
          {!journal.isOwner ? (
            <span className="rounded-full border border-[#d4e6ff] bg-[#f5f9ff] px-2 py-0.5 text-xs font-medium text-[#1f4b7a]">
              Shared with you
            </span>
          ) : null}
        </CardTitle>
        <CardDescription>{journal.description || 'No description'}</CardDescription>
      </CardHeader>
      <CardContent className="relative z-20 pt-0">
        <InteractiveSection>
          <CollaboratorsAccordion collaborators={collaborators} maxVisible={5} />
        </InteractiveSection>
      </CardContent>
      {journal.isOwner ? (
        <CardContent className="relative z-20 pt-0">
          <div className="ml-auto w-fit">
            <InteractiveSection>
              <DeleteJournalButton journalId={journal.id} action={deleteAction} />
            </InteractiveSection>
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}