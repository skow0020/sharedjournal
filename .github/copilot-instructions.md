# Copilot Instructions

## Documentation First
- Always review relevant files in `/docs` before implementing features or making architectural decisions.
- Treat `/docs` as the source of truth for project-specific patterns and conventions.

## Project Stack
- Next.js App Router with TypeScript.
- Drizzle ORM with Neon Postgres.
- Clerk for authentication.
- Tailwind CSS with shadcn/ui.

## Project Overview
- SharedJournal uses Next.js 16 App Router architecture.
- React 19 and Tailwind CSS v4 are used across the app.

## Scope and Change Size
- Keep changes minimal and directly scoped to the user request.
- Do not modify unrelated files.
- Preserve existing architecture and naming conventions.

## UI Standards
- Use only shadcn/ui components for UI implementation.
- Do not create custom UI components.
- Do not introduce alternative UI component libraries.
- Build interfaces by composing existing shadcn/ui primitives and patterns.

## Date Handling
- Use date-fns for all date formatting and parsing in UI code.
- Avoid manual date string formatting for user-facing display.

## Data and Auth Patterns
- Use existing database schema and query conventions in src/db.
- Use Clerk auth patterns already established in the project.
- Prefer server components unless client interactivity is required.

## Architecture Conventions
- App Router files live in `src/app` (not Pages Router).
- Keep global styling aligned with `src/app/globals.css` and Tailwind CSS v4 patterns.
- Use the `@/*` path alias for imports from `src/*` where appropriate.

## Development Commands
- `npm run dev` to start the development server.
- `npm run build` to create a production build.
- `npm start` to run the production server.
- `npm run lint` for ESLint checks.
- `npx tsc --noEmit` for TypeScript type-checking.

## Quality Checks
- Run `npm run lint` after implementing changes.
- Resolve errors introduced by the change before finishing.
- Run `npx tsc --noEmit` when changes may impact types.
