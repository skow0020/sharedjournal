# Component Testing

This document defines how to write component tests in SharedJournal using Vitest and React Testing Library.

## Tooling

- Test runner and assertions: Vitest
- DOM testing utilities: React Testing Library
- Interaction simulation: `@testing-library/user-event`
- Test environment: `jsdom`

Use the existing project test setup and config:

- `vitest.config.ts`
- `src/test/setup.ts`

## Core Principles

- Test behavior, not implementation details.
- Prefer user-observable outcomes (visible text, accessible roles, enabled/disabled states).
- Keep tests deterministic and isolated.
- Keep each test focused on one behavior.

## Query Best Practices

Use queries in this priority order:

1. `getByRole` (with `name` when possible)
2. `getByLabelText`
3. `getByText`
4. `getByTestId` only when no accessible query is practical

Examples:

- Prefer `screen.getByRole('button', { name: 'Create entry' })`
- Prefer `screen.getByLabelText('Email')`

## Interaction Best Practices

Tests must use `userEvent` for user interactions.

- Required: `userEvent.click`, `userEvent.type`, `userEvent.clear`, etc.
- Do not use `fireEvent` for normal UI interactions.

Why:

- `userEvent` better models real browser/user behavior.
- It triggers related events in a realistic order.
- It improves confidence in form and interaction flows.

Example pattern:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('submits form values', async () => {
  const user = userEvent.setup()

  render(<MyComponent />)

  await user.type(screen.getByLabelText('Title'), 'My title')
  await user.click(screen.getByRole('button', { name: 'Save' }))

  expect(screen.getByText('Saved')).toBeInTheDocument()
})
```

## Async and State Updates

- Use async/await with `userEvent` methods.
- Use `findBy...` for elements that appear asynchronously.
- Use `waitFor` when asserting async side effects or mock calls.

Example:

```tsx
await user.click(screen.getByRole('button', { name: 'Send invite' }))

await waitFor(() => {
  expect(action).toHaveBeenCalled()
})
```

## Mocks and Boundaries

- Mock external boundaries (network, auth wrappers, data helpers) when needed.
- Keep mocks local to the test file unless shared setup is necessary.
- Reset or clear mocks between tests (`vi.clearAllMocks()` or config-driven clearing).
- For hoisted module mocks in Vitest, use `vi.hoisted(...)` when needed.

## What to Test

Component tests should typically cover:

- Initial render state
- Primary interaction path
- Validation/error states
- Conditional rendering branches
- Success state rendering

For page-level server components, test branch rendering by mocking data/auth dependencies and asserting rendered output.

## File and Naming Conventions

- Keep test files adjacent to source files when practical: `*.test.tsx`
- Use descriptive test names that describe behavior:
  - `renders empty state when no invitations exist`
  - `shows mismatch warning when signed in with a different email`

## Anti-Patterns

- Do not test private implementation details.
- Do not rely on brittle selectors (class names, DOM shape) unless unavoidable.
- Do not use arbitrary timers when waiting for async updates.
- Do not use `fireEvent` for standard interaction flows.

---

## Integration Tests (Data Layer)

Functions in `src/data/` execute real Drizzle queries. Component-level mocking works for pages and UI, but the data layer itself is best verified against a real database.

### Setup

Integration tests use a separate Vitest config:

- Config: `vitest.integration.config.ts`
- Environment: `node` (no jsdom)
- Setup file: `src/test/setup.integration.ts` (loads `.env.test` via dotenv)
- Pattern: `src/**/*.integration.test.ts`
- Script: `npm run test:integration`

Create a `.env.test` file (see `.env.test.example`) pointing to a dedicated **Neon test branch** so integration runs never touch production or development data:

```bash
npx neonctl branches create --name integration-tests
```

### Conventions

- Seed required rows in `beforeEach` using direct Drizzle inserts.
- Track inserted IDs and delete them in `afterEach` to keep the database clean.
- Use `crypto.randomUUID()` for unique `clerkUserId` values to prevent collisions between runs.
- Journal cascades (`ON DELETE CASCADE`) clean up related `journalMembers` and `entries` rows automatically when deleting a journal.
- Test **access control branches** explicitly (non-member returning empty/null) alongside happy paths.

### Example pattern

```ts
// src/data/my-helper.integration.test.ts
import { db } from '@/db'
import { users, journals, journalMembers } from '@/db/schema'
import { myDataFunction } from '@/data/my-helper'

let userId: string
let journalId: string

beforeEach(async () => {
  const [user] = await db.insert(users).values({ clerkUserId: `test_${crypto.randomUUID()}` }).returning({ id: users.id })
  const [journal] = await db.insert(journals).values({ ownerUserId: user.id, title: 'Test' }).returning({ id: journals.id })
  await db.insert(journalMembers).values({ journalId: journal.id, userId: user.id, role: 'owner' })
  userId = user.id
  journalId = journal.id
})

afterEach(async () => {
  await db.delete(journals).where(eq(journals.id, journalId))
  await db.delete(users).where(eq(users.id, userId))
})

it('returns data only for members', async () => {
  const result = await myDataFunction(userId, journalId)
  expect(result).toHaveLength(1)
})
```
