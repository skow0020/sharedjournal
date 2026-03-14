# Auth Coding Standards

This project uses **Clerk** for all authentication. Do not introduce any alternative authentication libraries or roll custom auth logic.

## Clerk Setup

- The root layout (`src/app/layout.tsx`) wraps the entire app in `<ClerkProvider>` from `@clerk/nextjs`.
- Clerk middleware is configured in `src/proxy.ts` using `clerkMiddleware` from `@clerk/nextjs/server`. All route protection and session handling flows through this middleware.
- Do **NOT** add custom session management, JWT handling, or alternative auth providers.

## Reading Auth State on the Server

- Use `auth()` from `@clerk/nextjs/server` to read the current session (e.g. `clerkUserId`) in Server Components and server actions.
- Use `currentUser()` from `@clerk/nextjs/server` when you need full Clerk user profile data (display name, avatar, email addresses) on the server.
- Do **NOT** call `auth()` or `currentUser()` directly in pages or data helpers that need a database user — use `getCurrentAppUser` instead (see below).

## The `getCurrentAppUser` Pattern

- For any authenticated Server Component or server action that needs a database user record, call `getCurrentAppUser` from `src/lib/get-current-app-user.ts`.
- This is the **single entry point** for:
  - Reading auth state from Clerk via `auth()`
  - Creating the user in the database on first login
  - Syncing profile fields (display name, avatar URL) on every request
- Do **NOT** duplicate the `auth()` + `currentUser()` + user upsert pattern anywhere else in the codebase.
- If `getCurrentAppUser` returns `null`, the user is unauthenticated — render an unauthenticated state or redirect; do **NOT** proceed with user-scoped queries.

## Reading the Current User's Email

- Use `getCurrentUserEmail` from `src/lib/get-current-user-email.ts` when only the user's email address is needed (e.g. for invitation matching).
- This helper uses `currentUser()` internally and resolves the primary email address.

## UI Auth Components

- Use Clerk's pre-built components from `@clerk/nextjs` for all auth-related UI:
  - `<SignInButton>` and `<SignUpButton>` for sign-in / sign-up triggers.
  - `<SignedIn>` and `<SignedOut>` for conditional rendering based on auth state.
  - `<UserButton>` for the account menu / avatar.
- Do **NOT** build custom sign-in or sign-up UI flows.
- Use `mode="modal"` on `<SignInButton>` and `<SignUpButton>` to keep the user on the current page.
- Use `forceRedirectUrl` to send users to the correct destination after sign-in or sign-up.

## Clerk User ID vs App User ID

- Clerk manages identity externally and provides a `clerkUserId` string.
- The database stores users in the `users` table with an internal `id` (UUID) and a `clerkUserId` foreign reference.
- Always resolve the app-level `id` via `getCurrentAppUser` before passing to `/data` helper functions — never pass raw `clerkUserId` into data queries.

## Enforcement

- All pull requests should be reviewed against this document.
- Any direct calls to `auth()` / `currentUser()` outside of `src/lib/get-current-app-user.ts` and `src/lib/get-current-user-email.ts` should be replaced with the appropriate helper before merge.
- Custom auth logic or alternative auth libraries must not be introduced.
