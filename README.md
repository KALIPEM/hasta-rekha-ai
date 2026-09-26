# Hasta Rekha

A React / TypeScript palm-reflection app with Supabase email authentication and cloud report storage, an Express API, and server-side Azure OpenAI analysis.

## Run locally

Use Node 22 or later. Run `npm ci`, then `npm run dev`. Open http://localhost:3000.

The ignored `.env.local` is connected to the existing Supabase project `odjuwtlmsdlggktlcsvb`. Public connection values are sufficient for authentication and report storage. No local database, guest report storage, or offline mode is used. Only the Supabase authentication session is retained in browser session storage. Photos stay in memory during processing and are not saved with reports.

The ignored `.env.local` contains the server-only Azure endpoint/key and `hasta-rekha-vision` deployment (GPT-4.1 mini, version 2025-04-14). AI also requires `SUPABASE_SERVICE_ROLE_KEY`, the budget migration, and `AI_ENABLED=true`. Never prefix secret keys with `VITE_`. Missing configuration disables generation. See `.env.example`.

## AI spending protection

User testing budget: **$10 total**, not per run, authorized September 17, 2026. Live test scripts count existing cloud-ledger usage and unresolved reservations conservatively, then check their maximum additional $1-per-call allowance before starting. Run live test scripts serially; do not run tests concurrently or bypass the guarded fetch. Paired photo tests allow at most five calls (three for normal-only tests), voice tests two, and connectivity tests one. These are additional test-only limits; the app's production allowance remains $190. Do not increase the testing budget without explicit authorization.

The Supabase `ai_budget` ledger enforces a cumulative $190 app allowance with no monthly reset. Every Azure call first atomically reserves $1; concurrent requests cannot oversubscribe the allowance. Successful responses settle using reported tokens at $0.40/million input and $1.60/million output, plus a 25% buffer. Cached input is conservatively counted at full price. Unknown model versions pause AI. Network/provider failures retain their full reservation because their billing status may be uncertain. Consequently generation can stop before the actual bill reaches $190. The ledger also expires on December 14, 2026, before the startup credit expiry. Image inspection and report generation each go through this guard.

The Azure resource-group budget `hasta-rekha-190-usd` monitors 190 annually and alerts the owner at 90%. Azure budgets are notifications, not hard billing caps. The app ledger does not cover requests made in Azure playgrounds, other applications, taxes or other Azure services. Recheck model pricing before changing deployments or extending the expiry. Set `AI_ENABLED=false` and restart to disable generation immediately. Do not reset reservations without reconciling provider charges.

In the Supabase SQL editor, inspect usage with `select limit_microusd/1e6 as cap_usd, spent_microusd/1e6 as buffered_spend_usd, reserved_microusd/1e6 as pending_usd, enabled, expires_at from public.ai_budget;`. Keys and the ledger are inaccessible to browser clients. No local database is used.

## Supabase

The migrations in `supabase/migrations/` have already been applied to the connected project using its dashboard. Do not blindly rerun them there. For a new project, apply them once in date order and update the public URL/key settings. Email signups and email confirmation are enabled. Google sign-in is supported through Supabase OAuth; enable Google under Supabase Authentication > Providers and add the Google client ID/secret, then allow both the local and hosted app origins in Supabase redirect settings. The current auth Site URL is http://localhost:3000; update it and allowed redirect URLs when deploying.

`readings` contains reports, `profiles` holds balances, and `payment_orders` tracks payment fulfillment. Row-level security isolates reports by authenticated user. Clients can rename their own reports but cannot change credits or fulfill payments. Supabase is the sole persistent data store.

## Optional payments

Payments default to disabled. Enabling them requires `BILLING_ENABLED=true`, the Supabase service-role key, Razorpay key ID/secret and webhook secret, all server-only. Configure the signed `payment.captured` webhook at `/api/payment-webhook`. The API validates captured amounts and ownership. Database functions fulfill each order once and save paid reports with credit deduction in one transaction. Unfinished orders are recovered from Supabase. Live payment capture has not been tested with payment credentials.

## Checks and production

- `npm run lint`: TypeScript checking.
- `npm test`: API input validation, authentication boundaries, payment signature and report parsing checks.
- `npm run build`: production frontend bundle.
- `supabase/tests/privacy_and_billing.sql`: live transactional ownership and billing tests. Test fixtures are rolled back.
- `supabase/tests/ai_budget.sql`: transactional cutoff, settlement, pause and client-access checks. Test fixtures are rolled back.
- `node --import tsx scripts/verify-azure.ts`: verifies blank-image rejection locally and performs a tiny live Azure text request; consumes a small amount of the guarded allowance.

For production, build and run `npm start` with `NODE_ENV=production`; configure HTTPS, `APP_URL`, and `HOST=0.0.0.0` as needed. The frontend and API must share an origin. `npm run preview` only previews static assets and does not run the API.

Azure is provisioned and connected. Optional paid readings still require payment credentials. End-to-end email confirmation, real-user palm quality and live checkout are not claimed as verified.
