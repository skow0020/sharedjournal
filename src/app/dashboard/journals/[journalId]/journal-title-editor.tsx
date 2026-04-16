'use client'

type JournalTitleEditorProps = {
  title: string
}

export function JournalTitleEditor({ title }: JournalTitleEditorProps) {
  return (
    <h1
      className="line-clamp-2 text-2xl font-semibold tracking-tight break-words sm:text-3xl sm:line-clamp-none"
      title={title}
    >
      {title}
    </h1>
  )
}
