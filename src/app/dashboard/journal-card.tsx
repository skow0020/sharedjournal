import Link from 'next/link'

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

export function JournalCard({ journal, collaborators, deleteAction }: JournalCardProps) {
  return (
    <Card className="relative gap-3 transition-colors hover:bg-muted/40">
      <Link
        href={`/dashboard/journals/${journal.id}`}
        aria-label={`Open ${journal.title}`}
        className="focus-visible:ring-ring absolute inset-0 rounded-xl focus-visible:ring-2"
      />
      <CardHeader className="relative z-10 pointer-events-none">
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
      <CardContent className="relative z-20 pt-0 pointer-events-none">
        <div className="pointer-events-auto">
          <CollaboratorsAccordion collaborators={collaborators} maxVisible={5} />
        </div>
      </CardContent>
      {journal.isOwner ? (
        <CardContent className="relative z-20 pt-0 pointer-events-none">
          <div className="ml-auto w-fit pointer-events-auto">
            <DeleteJournalButton journalId={journal.id} action={deleteAction} />
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}