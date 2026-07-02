# Security Hardening Checklist

This checklist is scoped to SharedJournal as implemented today (Next.js App Router, Clerk auth, Drizzle + Neon, LaunchDarkly flags, Vercel Blob uploads).

## Scope and goals

- Reduce abuse and data exposure risk for shared journals, entries, reflections, invites, and uploads.
- Improve detection and response via auditability and operational controls.
- Keep implementation aligned with existing architecture and docs conventions.

## Threat model assumptions

- Attackers can register accounts and interact with public/authenticated app surfaces.
- Invite links may leak or be brute-force attempted.
- App-level authorization checks are the primary tenant boundary.
- Database snapshots and logs are sensitive and should minimize plaintext user content.

## High priority tickets

### H1. Add route-level rate limiting for invite creation and reflection posting

- Risk addressed: spam/harassment, operational cost amplification.
- Touchpoints:
  - `src/app/dashboard/journals/[journalId]/actions.ts`
  - `src/app/support/actions.ts`
- Implementation:
  - Add per-user and per-IP rate limits at action boundaries for:
    - `createInviteAction`
    - `addCommentAction`
    - Support checkout creation action
  - Return clear retry messaging without revealing internals.
- Acceptance criteria:
  - Excess attempts are blocked with deterministic user-facing errors.
  - Legitimate low-volume use remains unaffected.
  - Automated tests cover allowed and throttled paths.

### H2. Harden invite token acceptance and abuse defenses

- Risk addressed: token guessing/replay and invite endpoint probing.
- Touchpoints:
  - `src/data/invitations.ts`
  - `src/app/invitations/[token]/**`
- Implementation:
  - Ensure token lookup path is constant-shape and does not leak token validity details.
  - Add acceptance-attempt throttling and structured audit events.
  - Ensure one-time acceptance semantics are strictly enforced under concurrency.
- Acceptance criteria:
  - Replayed tokens cannot be accepted twice.
  - Brute-force attempts are throttled and logged.
  - Integration tests cover replay and concurrent acceptance attempts.

### H3. Add test-route hardening for non-production environments

- Risk addressed: misuse of test-only feature toggle endpoints in shared lower envs.
- Touchpoints:
  - `src/app/api/test/launchdarkly/entry-comments/route.ts`
- Implementation:
  - Keep production 404 behavior.
  - Require an internal test secret header in non-production.
  - Return 401/403 for missing or invalid secret.
- Acceptance criteria:
  - Endpoint cannot be used without the secret in dev/staging.
  - Playwright setup includes the secret for successful toggles.

### H4. Add content abuse guardrails for reflections and invitations

- Risk addressed: abuse content and repeated harassment.
- Touchpoints:
  - `src/app/dashboard/journals/[journalId]/actions.ts`
  - `src/data/comments.ts`
  - `src/data/invitations.ts`
- Implementation:
  - Add basic policy checks (length already exists; add repetition/flood heuristics).
  - Add per-user cooldown for repeated invite attempts to same target email.
- Acceptance criteria:
  - Repetitive abusive patterns are blocked.
  - Normal usage patterns pass.

### H5. Add security-focused authorization tests for IDOR prevention

- Risk addressed: cross-tenant data access/manipulation.
- Touchpoints:
  - `src/data/entries.ts`
  - `src/data/comments.ts`
  - `src/data/journals.ts`
  - `src/data/invitations.ts`
- Implementation:
  - Add integration tests that attempt access with non-member users for all read/write helpers.
  - Include owner/editor/viewer edge cases.
- Acceptance criteria:
  - Unauthorized access attempts fail consistently.
  - Tests cover every mutation helper and key read paths.

## Medium priority tickets

### M1. Add structured audit logging for security-sensitive actions

- Risk addressed: lack of incident traceability.
- Touchpoints:
  - `src/app/dashboard/journals/[journalId]/actions.ts`
  - `src/app/dashboard/actions.ts`
  - `src/app/invitations/[token]/**`
- Implementation:
  - Emit structured events for:
    - invite create/cancel/accept/decline
    - journal delete/update/share
    - entry delete
    - reflection create
  - Include actor ID, target IDs, timestamp, result.
- Acceptance criteria:
  - Security actions are queryable in logs without exposing plaintext secrets.

### M2. Add upload abuse controls and validation depth

- Risk addressed: storage/bandwidth abuse and malformed file processing.
- Touchpoints:
  - `src/app/api/entry-images/upload/route.ts`
  - `src/lib/entry-image-storage.ts`
  - `src/lib/entry-image-constants.ts`
- Implementation:
  - Add tighter server-side content validation and quotas per user/journal/day.
  - Add alerting thresholds for unusual upload rates.
- Acceptance criteria:
  - Oversized/bad-type files are consistently rejected server-side.
  - Burst upload abuse is throttled.

### M3. Add key rotation playbook for encrypted journal data

- Risk addressed: long-lived key exposure and brittle crypto ops.
- Touchpoints:
  - `src/lib/entry-content-crypto.ts`
  - `src/data/entries.ts`
  - `src/data/comments.ts`
- Implementation:
  - Document key versioning strategy (`enc:vN`) and rotation rollout.
  - Add operational runbook for rotate + verify + rollback.
- Acceptance criteria:
  - Rotation can be performed without downtime.
  - Existing encrypted data remains readable during transition.

## Low priority tickets

### L1. Improve abuse reporting UX and admin controls

- Risk addressed: delayed human response to harassment.
- Touchpoints:
  - Dashboard and journal detail UI flows.
- Implementation:
  - Add in-app report action for reflections/invites.
  - Add basic admin triage process documentation.
- Acceptance criteria:
  - Users can report abuse in-product.
  - Reports are reviewable with actionable context.

### L2. Add security regression checklist to PR template

- Risk addressed: drift in security posture over time.
- Touchpoints:
  - `.github/` pull request template docs.
- Implementation:
  - Add checklist items for authz, validation, and sensitive logging checks.
- Acceptance criteria:
  - Security checks are part of normal review workflow.

## Suggested execution order

1. H3 (test-route hardening) and H5 (authz tests)
2. H1 (rate limiting) and H2 (invite hardening)
3. H4 (abuse guardrails)
4. M1 (audit logs), M2 (upload abuse controls)
5. M3/L1/L2

## Definition of done for this plan

- All high priority tickets completed with tests.
- No production test-only control paths without explicit auth/secret checks.
- Security-sensitive actions have auditable logs.
- Abuse throttling is in place for reflections and invites.
