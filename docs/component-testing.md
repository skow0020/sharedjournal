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
