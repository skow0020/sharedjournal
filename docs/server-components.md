# Server Components Coding Standards

**CRITICAL:** In this codebase, App Router Server Components treat route `params` as asynchronous and await them before use.

## Params Handling Standard

- For dynamic routes, type `params` as a `Promise<...>` in the page or layout props.
- Await `params` at the top of the Server Component before reading any fields.
- Do **NOT** read `params.foo` before `await params`.
- Do **NOT** destructure `params` fields directly in the function parameter list.

## Preferred Pattern

```tsx
type PageProps = {
  params: Promise<{ journalId: string }>
}

export default async function Page({ params }: PageProps) {
  const { journalId } = await params

  // Use journalId for data fetching and rendering.
}
```

## Avoid These Patterns

```tsx
// ❌ Do not destructure params fields in the argument list.
export default async function Page({
  params: { journalId },
}: {
  params: Promise<{ journalId: string }>
}) {
  // ...
}

// ❌ Do not access params values before awaiting.
export default async function Page({ params }: { params: Promise<{ journalId: string }> }) {
  const journalId = params.journalId
  // ...
}
```

## Data Fetching Reminder

- Keep data fetching in Server Components.
- Use helpers in `src/data` for database access.
- For authenticated pages, use `getCurrentAppUser` before user-scoped queries.

## Rationale

- Typing `params` as `Promise<...>` and awaiting once at the top is a repository convention for consistency and type-safety.
- A single top-level await keeps the component predictable and easy to review.
- Consistent typing prevents accidental misuse and runtime errors.

## Enforcement

- All pull requests should be reviewed for correct `params` typing and awaiting.
- Any dynamic Server Component that reads route params without awaiting must be updated before merge.
