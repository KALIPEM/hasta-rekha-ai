# Low-cost deployment

Render Free runs the existing Express API and Vite build as one service. It sleeps after idle periods; first access may be slow. Vercel Hobby does not allow commercial use. Google Cloud Run is an alternative with billing and usage-based costs. No hosting account has been connected or deployment created yet.

Use the repository's render.yaml Blueprint. The service builds with npm ci --include=dev and npm run build, then runs npm start with NODE_ENV=production and HOST=0.0.0.0. No local database or persistent disk is used.

Only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY belong in the browser build. This must be the public publishable/anon key, with Supabase row-level security enabled. Azure keys, Supabase service-role keys, and Razorpay secrets belong exclusively in the hosting environment's secret settings. Never upload .env.local or user test artifacts. npm run build scans browser output for configured server secrets and rejects unapproved VITE_ variables.

Before enabling public paid readings:

1. Connect a hosting account and deploy the current reviewed source; the existing GitHub version is not necessarily the current working copy.
2. Configure public and server environment variables securely. Keep AI_ENABLED=false and BILLING_ENABLED=false during setup.
3. Apply all Supabase migrations, including 202609180001_reading_prices.sql for separate couple credits (not yet applied).
4. Configure the actual HTTPS app origin in APP_URL and Supabase's authentication URL settings.
5. Connect Razorpay Live keys and a payment.captured webhook at /api/payment-webhook. Current local Razorpay credentials are missing. Account activation and a genuine captured-payment end-to-end check remain outstanding.
6. Enable billing and AI after validating account configuration and payment handling. Production rejects AI generation when billing is disabled. Existing global Azure budget guard remains in place; it does not cap hosting charges.

The public sample can work while readings are paused. This is not a claim that the app has been published or that checkout is live.
