# Stripe Integration Guide

This document is the project-specific reference for Stripe support payments in SharedJournal.

## Scope

SharedJournal currently supports optional one-time "buy me a coffee" style payments via Stripe Checkout.

Current implementation includes:

- Support page: `/support`
- Checkout creation action: `src/app/support/actions.ts`
- Stripe webhook route: `src/app/api/webhooks/stripe/route.ts`
- Payment persistence: `support_payments` table and `src/data/support-payments.ts`
- Success page: `/support/success`

## Environment Variables

Required environment variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Notes:

- `STRIPE_SECRET_KEY` must match the environment mode (test vs live).
- `STRIPE_WEBHOOK_SECRET` is endpoint-specific and is not the same value as `STRIPE_SECRET_KEY`.
- Local CLI webhook secrets differ from production dashboard webhook secrets.

## Required Stripe Events

Webhook endpoint must subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

## Data Model

Table: `support_payments`

Status lifecycle:

- `pending` when checkout session is created
- `completed` when Stripe confirms successful payment
- `failed` when async payment fails
- `cancelled` when session expires

Important fields:

- `stripe_checkout_session_id` (unique)
- `stripe_payment_intent_id`
- `amount_cents`
- `currency`
- `customer_email`
- `failure_message`

## Local Development Workflow

1. Start app:

```bash
npm run dev
```

2. Start Stripe listener:

```bash
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired --forward-to http://localhost:3000/api/webhooks/stripe
```

3. Copy printed `whsec_...` into local env as `STRIPE_WEBHOOK_SECRET`.

4. Confirm migration has been applied:

```bash
npm run db:migrate
```

5. Test checkout with Stripe test cards (for test mode).

## Production / Preview Workflow

1. Create Stripe webhook endpoint for each deployed URL:
   - `https://<domain>/api/webhooks/stripe`
2. Subscribe required events.
3. Set each endpoint's signing secret in corresponding environment.
4. Keep keys isolated by environment and mode.

## Testing Strategy

Use layered testing:

1. Unit/component tests for support UI and action behavior.
2. Route tests for webhook event handling.
3. Optional manual Stripe sandbox smoke tests.

Do not rely on Stripe CLI listener in CI for PR gating.

## Troubleshooting

### "Unable to start checkout right now"

Common causes:

- `STRIPE_SECRET_KEY` missing/invalid for runtime
- `support_payments` migration not applied
- dev server not restarted after env changes

### Webhook signature errors

Common causes:

- wrong `STRIPE_WEBHOOK_SECRET` for endpoint
- local CLI secret used in production (or vice versa)

## Future Stripe Work Checklist

When expanding Stripe features (recurring billing, invoices, etc.), do all of the following:

1. Extend this doc with architecture and event contract changes.
2. Add/adjust database schema and migration docs.
3. Update legal pages (privacy/terms/legal) for payment behavior changes.
4. Add tests for new webhook events and failure paths.
5. Document required env vars and operational runbook updates.

## Security Notes

- Never commit Stripe secrets to source control.
- Rotate exposed keys immediately if leaked.
- Treat `.env` and `.env.prod` values as sensitive credentials.
