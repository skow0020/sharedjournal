# SharedJournal Native Mobile App Implementation Plan

## Purpose
This document is a build-ready plan for adding a native mobile app while keeping the current web app and database architecture stable.

Use this as:
- A roadmap for engineering execution
- A handoff spec for an AI coding model
- A scope guard to prevent overbuilding early

## Current System Context
- Web app: Next.js App Router + TypeScript
- Auth: Clerk
- Database: Neon Postgres with Drizzle ORM
- Existing pattern: server components + data helpers in src/data
- Security model: journal access is membership and role based

## Goals
- Deliver iOS and Android mobile clients for core journaling workflows
- Reuse existing business logic and data model where possible
- Preserve strict access control and data ownership rules
- Support mobile-relevant reliability needs (offline tolerance, upload retries)

## Non-Goals (MVP)
- Full feature parity with every future web feature
- Complex real-time collaboration in first release
- Full offline sync for every edge case in initial phase

## Recommended Target Architecture

### 1) Multi-App + Shared Packages
Adopt a monorepo layout:
- apps/web: existing Next.js app
- apps/mobile: React Native app (Expo)
- packages/contracts: shared DTOs, schemas, enums, validation
- packages/api-client: typed HTTP client for mobile

### 2) Backend for Frontend (BFF) for Mobile
Expose authenticated API endpoints from server-side code. Mobile must not call Postgres directly.

Responsibilities:
- Validate Clerk token on every request
- Resolve app user from Clerk user
- Enforce authorization at endpoint level (membership and role checks)
- Use existing src/data patterns to avoid duplicate logic

### 3) Auth Flow
- Mobile sign-in via Clerk native SDK
- Mobile sends session token to API
- API validates token and maps to internal app user
- Device stores tokens in secure storage

### 4) Media Upload Flow
- API returns signed upload URL
- Mobile uploads file directly to storage
- API stores attachment metadata in DB
- Include retry and resumable strategy for weak networks

## Data and Security Constraints
- Never expose DATABASE_URL or server secrets in mobile app
- Always perform authorization in backend, not just UI
- Every user-scoped query filters by authenticated app user
- Role-sensitive actions require explicit role checks (owner/editor/viewer)

## API Surface (MVP)

### Journals
- GET /api/mobile/me/journals
- POST /api/mobile/journals
- GET /api/mobile/journals/:journalId

### Entries
- GET /api/mobile/journals/:journalId/entries?date=YYYY-MM-DD
- POST /api/mobile/journals/:journalId/entries
- PATCH /api/mobile/entries/:entryId

### Invitations
- POST /api/mobile/journals/:journalId/invitations
- POST /api/mobile/invitations/:token/accept

### Photos
- POST /api/mobile/uploads/presign
- POST /api/mobile/entries/:entryId/photos

## Recommended Shared Contracts Package
Put in packages/contracts:
- Domain enums: journal roles, invitation status
- Request/response DTOs for every mobile endpoint
- Validation schemas for request payloads
- Unified error shape

Benefits:
- One source of truth between API and mobile app
- Safer refactors
- Better AI-assisted implementation consistency

## Mobile UX Scope (MVP)
- Authentication and session persistence
- Journal list
- Journal details
- Entry list filtered by date
- Create entry
- Basic photo attach flow
- Invitation acceptance from deep link

## Offline and Sync Strategy (Progressive)
Phase 1:
- Read cache only
- No offline writes

Phase 2:
- Queue writes when offline
- Retry on reconnect

Phase 3:
- Conflict policy for shared edits
- User-visible conflict resolution for edge cases

## CI/CD and Environments

### Environment Variables
Define separate mobile-compatible runtime variables and backend secrets.

Backend in CI:
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- DATABASE_URL
- E2E_CLERK_EMAIL
- E2E_CLERK_PASSWORD

Mobile app:
- Only safe public config values
- Never include secret keys or direct DB credentials

### CI Jobs
- Keep web checks (lint, unit, e2e)
- Add mobile checks (typecheck, lint, unit)
- Add API contract tests for mobile endpoints

## Testing Strategy

### Backend/API
- Unit tests for endpoint auth and authorization
- Integration tests for data access and role restrictions
- Contract tests for DTO/schema compatibility

### Mobile
- Unit tests for core state and view models
- Integration tests for auth and API client behavior
- E2E device tests for login, journal view, entry create

### Security
- Test unauthorized access paths for all journal and entry endpoints
- Validate role restrictions for write operations

## 8-Week Execution Plan

### Week 1: Foundation
- Set monorepo package structure
- Create contracts package
- Create API skeleton for mobile routes
- Add baseline CI for mobile workspace

Exit criteria:
- Repo builds with web + mobile scaffolding
- Contracts package is consumed by API layer

### Week 2: Auth and Identity
- Integrate Clerk mobile auth
- Implement backend token validation
- Add app-user resolution endpoint helpers

Exit criteria:
- Authenticated mobile user can call protected API endpoint

### Week 3: Read Flows
- Implement journals and journal detail endpoints
- Build mobile list and details screens
- Add loading, error, and empty states

Exit criteria:
- User can browse journals and open details

### Week 4: Entry Creation
- Implement create and update entry endpoints
- Build entry create flow in app
- Add optimistic update for create

Exit criteria:
- User can create an entry from mobile

### Week 5: Photo Attachments
- Implement presigned upload + photo metadata endpoints
- Add image picker/camera support
- Add retry strategy for upload failure

Exit criteria:
- User can attach at least one photo to an entry

### Week 6: Sharing and Invitations
- Implement invitation endpoints
- Add deep-link invitation acceptance
- Harden role-gated UI and API checks

Exit criteria:
- Invitation acceptance works end to end

### Week 7: Offline Reliability
- Add local cache strategy
- Add queued writes and replay on reconnect
- Add telemetry for failure cases

Exit criteria:
- Core read flows work offline with cache
- Writes retry correctly after reconnect

### Week 8: Hardening and Release Prep
- Performance pass
- QA and bug fixes
- Beta release setup (TestFlight and Play Internal)

Exit criteria:
- MVP release candidate signed off

## Risks and Mitigations
- Risk: Authorization drift between web and mobile endpoints
  - Mitigation: Centralize auth checks and shared contracts
- Risk: Upload instability on poor mobile networks
  - Mitigation: Retry/resume and failure telemetry
- Risk: Scope growth from parity requests
  - Mitigation: Maintain strict MVP non-goals and phase gates
- Risk: Offline conflict complexity
  - Mitigation: Defer full conflict UX to post-MVP phase

## Definition of Done (MVP)
- Mobile app supports login, journal browsing, journal details, entry create, and basic photo attach
- All mobile endpoints enforce auth and role rules
- No server secrets shipped in mobile binary
- CI passes for web and mobile checks
- Beta build available for internal testing

## Prompt Template for Future AI Build Work
Use this prompt with an AI coding assistant when ready:

Build Phase [X] from docs/mobile-app-implementation-plan.md in this repository.
Constraints:
- Keep changes scoped only to the current phase.
- Reuse existing auth/data patterns and do not bypass backend authorization checks.
- Use shared contracts for request and response shapes.
- Do not expose server secrets in mobile code.
- Add tests for new API endpoints and mobile flows touched.
- Run lint and typecheck before finishing.
Deliver:
- Code changes
- Test updates
- Brief summary with file paths changed and any follow-up tasks

## Implementation Readiness Checklist
- [ ] Repo structure decision approved (single repo layout with mobile app)
- [ ] Mobile framework decision approved (Expo + React Native)
- [ ] API endpoint scope approved for MVP
- [ ] Contracts package conventions approved
- [ ] Auth and token validation approach approved
- [ ] Storage provider and upload strategy approved
- [ ] CI budget and build times acceptable
- [ ] Beta release target date defined
