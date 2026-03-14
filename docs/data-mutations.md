# Data Mutations

**CRITICAL:** All data mutations must be executed through Server Actions and must flow through typed helper functions in `src/data`. Do not mutate data in Client Components, route handlers, or directly inside page components.

## Server Actions Only

- **ALL** data mutations must be initiated from Server Actions.
- Do **NOT** perform inserts, updates, or deletes in Client Components.
- Do **NOT** use route handlers for application data mutations.
- Do **NOT** define mutation logic inline inside page files.

## Colocated `actions.ts` Files

- Every feature that performs data mutations must define its Server Actions in a colocated `actions.ts` file.
- Keep `actions.ts` next to the page, layout, or component tree that uses it.
- Import Server Actions into UI files rather than defining `'use server'` functions inline.
- The purpose of `actions.ts` is to keep mutation entry points discoverable, reusable, and easy to review.

## Typed Action Parameters

- All Server Action parameters must be explicitly typed.
- Server Actions must **NOT** accept `FormData` as their parameter type.
- Read form fields in the client layer or adapter layer and pass a typed object into the Server Action.
- Prefer small input types that describe exactly the values the mutation needs.

## Validate All Action Inputs With Zod

- **EVERY** Server Action must validate its arguments with `zod` before running any mutation logic.
- Validation must happen at the action boundary, before calling any helper in `src/data`.
- Use a `z.object(...)` schema that matches the typed input for the action.
- If validation fails, return a typed error state or throw a controlled error appropriate for the calling flow.
- Do **NOT** rely on UI validation alone.

## Mutation Logic Lives In `src/data`

- All database writes must be implemented in helper functions inside `src/data`.
- Server Actions orchestrate auth, validation, and redirects or returned state.
- `src/data` helpers own the actual database mutation logic.
- Do **NOT** call `db.insert`, `db.update`, `db.delete`, or other raw database operations directly from Server Actions, pages, or components.

## Drizzle ORM Only

- Database mutations must use **Drizzle ORM** through the shared `db` instance.
- Do **NOT** use raw SQL for application mutations.
- Keep mutation helpers consistent with the existing query and schema patterns in `src/data` and `src/db`.

## Auth And Access Control

- Resolve the authenticated app user in the Server Action before calling user-scoped mutation helpers.
- For authenticated mutations, use `getCurrentAppUser` from `src/lib/get-current-app-user.ts`.
- Pass the resolved app user ID into `src/data` helpers rather than reading Clerk state inside those helpers.
- Mutation helpers must enforce ownership, membership, and role checks for the resource being changed.

## Recommended Responsibility Split

- `actions.ts`: auth checks, Zod validation, invoking typed `src/data` helpers, and returning UI state or redirecting.
- `src/data/*`: Drizzle-based inserts, updates, deletes, and permission-aware mutation rules.
- UI files: rendering forms and invoking typed actions, but not parsing mutation payloads into database calls.

## Rationale

- Keeping mutations in Server Actions preserves a clear server boundary in the App Router.
- Typed inputs plus Zod validation make mutation contracts explicit and safe.
- Centralizing writes in `src/data` keeps database access consistent and testable.
- Preventing `FormData`-typed actions avoids weakly typed mutation interfaces and duplicated parsing logic.

## Enforcement

- All pull requests should be reviewed against this document.
- Inline Server Actions in page files should be moved into colocated `actions.ts` files before merge.
- Any Server Action that accepts `FormData` must be refactored to accept a typed object instead.
- Any Server Action missing Zod validation must be updated before merge.
- Any mutation that bypasses `src/data` helpers or Drizzle ORM must be updated before merge.