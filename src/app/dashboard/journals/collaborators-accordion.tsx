import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import type { JournalCollaborator } from '@/data/journals'

type CollaboratorsAccordionProps = {
  collaborators: JournalCollaborator[]
  maxVisible?: number
}

export function CollaboratorsAccordion({
  collaborators,
  maxVisible,
}: CollaboratorsAccordionProps) {
  const visibleCollaborators =
    typeof maxVisible === 'number'
      ? collaborators.slice(0, maxVisible)
      : collaborators
  const hiddenCount = collaborators.length - visibleCollaborators.length

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="collaborators" className="border-none">
        <AccordionTrigger className="text-muted-foreground py-1 text-sm font-medium hover:no-underline !inline-flex !w-auto !flex-none !justify-start !gap-1 pr-0">
          Collaborators ({collaborators.length})
        </AccordionTrigger>
        <AccordionContent>
          {visibleCollaborators.length > 0 ? (
            <ul className="text-muted-foreground space-y-1 text-sm">
              {visibleCollaborators.map((collaborator) => (
                <li key={collaborator.id}>{collaborator.displayName || 'Unnamed user'}</li>
              ))}
              {hiddenCount > 0 ? <li>+{hiddenCount} more</li> : null}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Not shared with anyone yet.</p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}