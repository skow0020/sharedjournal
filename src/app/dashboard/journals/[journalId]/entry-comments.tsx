'use client'

import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  type AddCommentInput,
  type AddCommentState,
} from '@/app/dashboard/journals/[journalId]/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface EntryCommentsProps {
  entryId: string
  journalId: string
  action: (input: AddCommentInput) => Promise<AddCommentState>
  comments: Array<{
    id: string
    content: string
    createdAt: Date
    author: { displayName: string | null }
  }>
  canComment: boolean
}

function CommentForm({
  entryId,
  journalId,
  action,
}: {
  entryId: string
  journalId: string
  action: (input: AddCommentInput) => Promise<AddCommentState>
}) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [state, setState] = useState<AddCommentState>({
    error: null,
    success: false,
  })
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedContent = content.trim()
    if (pending || trimmedContent.length === 0) {
      return
    }

    startTransition(async () => {
      const nextState = await action({
        journalId,
        entryId,
        content: trimmedContent,
      })

      setState(nextState)

      if (nextState.success) {
        setContent('')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <Textarea
        name="content"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        required
        minLength={1}
        maxLength={2000}
        placeholder="Add a reflection..."
      />
      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? 'Reflecting...' : 'Reflect'}
      </Button>
    </form>
  )
}

export function EntryComments({ entryId, journalId, action, comments, canComment }: EntryCommentsProps) {
  return (
    <div className="mt-4">
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="rounded bg-muted px-3 py-2 text-sm">
            <div className="font-medium text-xs text-muted-foreground mb-1">
              {c.author.displayName || 'Anonymous'} · {format(c.createdAt, 'MMM d, yyyy h:mm a')}
            </div>
            <div>{c.content}</div>
          </div>
        ))}
      </div>
      {canComment ? (
        <CommentForm entryId={entryId} journalId={journalId} action={action} />
      ) : null}
    </div>
  )
}
