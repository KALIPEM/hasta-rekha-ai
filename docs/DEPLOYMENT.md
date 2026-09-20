# Low-cost deployment

Render Free runs the existing Express API and Vite build as one service. It sleeps after idle periods; first access may be slow. Vercel Hobby does not allow commercial use. Google Cloud Run is an alternative with billing and usage-based costs. Live site: https://hasta-rekha-ai.onrender.com (Render Free). Service srv-damn9sbm8hqs739cgr4g deploys the codex/render-launch branch from KALIPEM/hasta-rekha-ai. The initial deploy passed its health check.

Use the repository's render.yaml Blueprint. The service builds with npm ci --include=dev and npm run build, then runs npm start with NODE_ENV=production and HOST=0.0.0.0. No local database or persistent disk is used.

Only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY belong in the browser build. This must be the public publishable/anon key, with Supabase row-level security enabled. Azure keys, Supabase service-role keys, and Razorpay secrets belong exclusively in the hosting environment's secret settings. Never upload .env.local or user test artifacts. npm run build scans browser output for configured server secrets and rejects unapproved VITE_ variables.

Before enabling public paid readings:

1. Hosting is connected through the public repository. Push reviewed changes to codex/render-launch and trigger a manual deploy in Render; do not assume automatic deploys are configured.
2. Configure public and server environment variables securely. Keep AI_ENABLED=false and BILLING_ENABLED=false during setup.
3. Apply all Supabase migrations, including 202609180001_reading_prices.sql for separate couple credits (applied successfully on 2026-09-20).
4. Configure the actual HTTPS app origin in APP_URL and Supabase's authentication URL settings.
5. Connect Razorpay Live keys and a payment.captured webhook at /api/payment-webhook. Current local Razorpay credentials are missing. Account activation and a genuine captured-payment end-to-end check remain outstanding.
6. Enable billing and AI after validating account configuration and payment handling. Production rejects AI generation when billing is disabled. Existing global Azure budget guard remains in place; it does not cap hosting charges.

The public site and pricing are live; AI generation and checkout are disabled. Render contains public Supabase configuration and the manually entered Razorpay key fields. Azure and Supabase service-role secrets are still missing; Razorpay credentials have not been validated with a captured payment.

Custom domain configured on 2026-09-19: https://hasta.sadhanaboard.com. GoDaddy's `hasta` CNAME points to `hasta-rekha-ai.onrender.com` with a one-hour TTL (previous target: `ghs.googlehosted.com`). Render reports Verified and Certificate Issued, and the site was opened successfully over HTTPS. APP_URL and Supabase's Site URL and exact redirect URL are set to https://hasta.sadhanaboard.com. Render deployment dep-danc9euk1f9s7388fp9g is live. The existing onrender.com URL remains enabled.

2026-09-20 verification: user imported server credentials; Render deployment dep-danmmhqjnfac73951nf0 is Live. Public /api/config returns aiConfigured=true and billingConfigured=true. This confirms configuration presence and enabled flags, not successful AI generation or captured payment. Payment webhook configuration and a full paid reading remain unverified.
