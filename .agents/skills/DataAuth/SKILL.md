
---
name: "Data + Auth"
description: "Drizzle, Neon, Clerk patterns"
applyTo:
  - data
  - auth
  - backend
version: "1.0"
---

# Data + Auth Skill: Drizzle, Neon, Clerk patterns

Purpose
- Document authoritative patterns for data access, migrations, and authentication used across the repository.

Key Rules
- Use Drizzle ORM patterns and queries from `src/db` and existing code; follow established query shapes.
- For authenticated server pages that need a DB user, use `getCurrentAppUser` from `src/lib/get-current-app-user.ts`.
- Keep database migrations in the `drizzle/` folder and follow the existing naming and snapshot conventions.
- Avoid embedding credentials in code; use environment variables and `process.env` references.

Auth Patterns
- Use Clerk for authentication flows as implemented in the codebase. Reuse existing wrappers and hooks.
- For server-side operations requiring user context, prefer server components with `getCurrentAppUser`.

Database Patterns
- Follow transaction patterns consistent with `src/db` usage. Use typed queries from Drizzle.
- When adding indexes or schema changes, prefer zero-downtime migration patterns (add nullable columns first, use `NOT VALID` for constraints, `CONCURRENTLY` for indexes when applicable).

Checklist for PRs
- Uses `getCurrentAppUser` when server page needs DB user (yes/no)
- Migration added to `drizzle/` if schema changed (yes/no)
- Environment variables used for secrets (yes/no)
