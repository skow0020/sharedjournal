
---
name: "Testing"
description: "vitest, Playwright, and coverage expectations"
applyTo:
  - test
  - e2e
  - ci
version: "1.0"
---

# Testing Skill: vitest, Playwright, and coverage expectations

Purpose
- Provide guidance for writing tests and for CI behavior when Copilot suggests or modifies tests.

Key Rules
- Unit tests: use `vitest` and project test utilities in `test/`.
- Integration/e2e: use Playwright tests under `e2e/` and Playwright Page Objects under `e2e/components` and `e2e/pages`.
- New functionality must include unit tests; changes to runtime behavior should include integration/e2e coverage where applicable.

Checklist for PRs
- Unit tests added/updated (yes/no)
- Integration tests added/updated (yes/no)
- Local `npm run test:coverage` passes (yes/no)
