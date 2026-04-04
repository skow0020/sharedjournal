'use client'

import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import { Trash2 } from 'lucide-react'

import { type DeleteJournalInput, type DeleteJournalState } from '@/app/dashboard/actions'
import { DeleteJournalButton } from '@/app/dashboard/delete-journal-button'
import { CollaboratorsAccordion } from '@/app/dashboard/journals/collaborators-accordion'
import { Button } from '@/components/ui/button'
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
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <span>{journal.title}</span>
              {!journal.isOwner ? (
                <span className="rounded-full border border-[#d4e6ff] bg-[#f5f9ff] px-2 py-0.5 text-xs font-medium text-[#1f4b7a]">
                  Shared with you
                </span>
              ) : null}
            </CardTitle>
            <CardDescription>{journal.description || 'No description'}</CardDescription>
          </div>
          {journal.isOwner ? (
            <div className="shrink-0">
              <InteractiveSection>
                <DeleteJournalButton
                  journalId={journal.id}
                  action={deleteAction}
                  trigger={
                    <Button type="button" size="sm" variant="outline" className="text-destructive hover:text-destructive">
                      <Trash2 className="size-4" aria-hidden />
                      <span className="sr-only sm:not-sr-only">Delete journal</span>
                    </Button>
                  }
                />
              </InteractiveSection>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="relative z-20 pt-0">
        <InteractiveSection>
          <CollaboratorsAccordion collaborators={collaborators} maxVisible={5} />
        </InteractiveSection>
      </CardContent>

    </Card>
  )
}