# Data Fetching

**CRITICAL:** Data should **NOT** be fetched via route handlers, client components, or any other way. **ONLY** fetch data via Server Components. This is incredibly important.

## Server Components

- **ALL** data fetching must occur in Server Components.
- Server Components run on the server and have direct access to databases and APIs.
- Data is passed to Client Components as props (never fetched in client components).
- Do **NOT** use route handlers for data fetching.

## Client Components

- Client Components should **never** fetch data directly.
- Client Components are for interactivity (event handlers, state, browser APIs).
- If a Client Component needs data, it should be passed down from a parent Server Component.

## Database Queries

- Database queries must **ALWAYS** be done via helper functions within the `/data` directory.
- Use **Drizzle ORM** for all database queries.
- **DO NOT USE RAW SQL.**

## Data Security

- A logged in user can **ONLY** access their own data and journals/entries shared with them.
- Users should **NOT** be able to access any other data.
- All database helper functions must include proper user-based filtering/access control.

## Rationale

- Server Components eliminate the client-server waterfalls that occur when fetching on the client.
- Server Components keep sensitive data (API keys, database credentials) on the server.
- Server Components reduce JavaScript bundle size sent to the client.
- This is the default and recommended pattern in Next.js App Router.

## Enforcement

- All pull requests should be reviewed against this document.
- Data fetching in Client Components or route handlers should be moved to Server Components before merge.
- Raw SQL queries should be replaced with Drizzle ORM queries before merge.
- Missing access control checks must be added before merge.