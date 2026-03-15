'use client'

import { PencilIcon, SaveIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import type { UpdateJournalTitleInput, UpdateJournalTitleState } from '@/app/dashboard/journals/[journalId]/actions'
import { JOURNAL_TITLE_MAX_LENGTH } from '@/lib/journal-constants'

type JournalTitleEditorProps = {
  journalId: string
  title: string
  canEdit: boolean
  action: (input: UpdateJournalTitleInput) => Promise<UpdateJournalTitleState>
}

export function JournalTitleEditor({ journalId, title, canEdit, action }: JournalTitleEditorProps) {
  const [draftTitle, setDraftTitle] = useState(title)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  function handleEdit() {
    if (!canEdit) {
      return
    }

    setError(null)
    setDraftTitle(title)
    setIsEditing(true)
  }

  function handleSave() {
    const nextTitle = draftTitle.trim()

    if (!nextTitle) {
      setError('Title is required.')
      return
    }

    setError(null)

    startTransition(async () => {
      const result = await action({ journalId, title: nextTitle })

      if (result.error) {
        setError(result.error)
        return
      }

      setDraftTitle(nextTitle)
      setIsEditing(false)
      router.refresh()
    })
  }

  if (!canEdit) {
    return <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <label htmlFor={inputId} className="sr-only">
              Journal title
            </label>
            <Input
              id={inputId}
              ref={inputRef}
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              maxLength={JOURNAL_TITLE_MAX_LENGTH}
              className="h-10 text-3xl font-semibold tracking-tight"
              disabled={isPending}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={handleSave}
              disabled={isPending}
              aria-label="Save journal title"
            >
              <SaveIcon className="size-4" aria-hidden="true" />
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={handleEdit}
              aria-label="Edit journal title"
            >
              <PencilIcon className="size-4" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  )
}
