# GitHub Copilot Usage Policy

Purpose
- Provide clear rules and guardrails for using GitHub Copilot and other AI-assisted code generation tools in this repository.

Scope
- Applies to all contributors and CI workflows that accept, review, or merge code in this repository.

Rules
- Allowed: using Copilot to draft code, tests, docs, and examples that follow repository conventions.
- Forbidden: inserting secrets, private keys, credentials, proprietary customer code, or third-party code that violates licensing.
- Attribution: any PR where Copilot (or other AI) substantially authored changes must include `AI-assisted: true` in the PR body and a short note describing which files or areas were generated.
- Review: AI-assisted PRs require at least one human reviewer with domain ownership (see CODEOWNERS) and must pass CI gates before merging.

Checklist for AI-assisted changes (add to PR body)
- What Copilot produced (files/areas):
- Human edits applied (yes/no + brief):
- Tests added or updated (yes/no):
- Security/privacy concerns considered (yes/no):

Security & Licensing
- Never commit secrets. If Copilot suggests secrets, replace them with environment references (e.g. `process.env.*`) and rotate any leaked secrets immediately.
- Validate license compatibility for non-trivial code snippets introduced by AI. Prefer standard OSS-safe constructs and avoid verbatim large snippets from external sources.

CI & Automation
- Add label `ai-assisted` automatically (see workflows/). PRs with this label should run an enhanced CI suite: `npm run lint`, `npx tsc --noEmit`, `npm run test:coverage`, and secret-scan.
- Failing CI prevents merge until addressed by author and reviewer.

Enforcement
- Project maintainers may revert or request changes to AI-generated code that doesn't meet project standards.

Questions
- For unclear cases, open an issue tagged `ai-policy` and request guidance from maintainers.
