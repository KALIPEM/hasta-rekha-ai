# Remake analysis

## Original implementation

The original repository mixed Firebase authentication/Firestore with a Supabase reading endpoint. It exposed AI configuration through frontend build settings, allowed the browser to drive credit updates, contained invalid JavaScript syntax in its offline worker, and used artificial report delays. Report persistence and authentication did not form a consistent backend.

## Remade experience

The app now has a cream, sage and terracotta design, a responsive landing page, an original SVG palm illustration, email account forms, guided photo capture/upload, perspective selection, structured reports, report downloads, a cloud reading library and a clearly labeled sample. Report sections render immediately when a result arrives. Modals support focus trapping and Escape.

## Data and service boundaries

Supabase owns accounts and all persistent reports, balances and orders. There is no offline reading mode, browser report database, Firebase integration or local database fallback. The old service worker exists only to unregister itself and remove its legacy cache for returning browsers.

The Express API verifies Supabase access tokens before analysis. Azure OpenAI credentials remain on the server. The Azure adapter uses strict JSON Schema, a 3,000-token report cap, a 90-second timeout, and no automatic retries. Sharp checks photo decoding, dimensions and contrast before billing. A separate image-inspection prompt precedes report generation; AI recognition remains imperfect and real-user palm quality still needs evaluation. The prompt treats palmistry as traditional entertainment and reflection. Photos are not persisted with reports.

Azure GPT-4.1 mini version 2025-04-14 is deployed as `hasta-rekha-vision`. Supabase enforces a cumulative $190 buffered usage allowance through atomic request reservations; unknown usage retains its reservation and unknown model versions pause generation. The ledger is server-only, persists across restarts, and expires before the startup credits. Azure also has a resource-group monitoring budget with a 90% notification. It is not a subscription-wide billing hard stop. See README for accounting and scope.

Validation: 14 automated tests and TypeScript checks pass. Live Supabase checks verified cap enforcement, idempotent settlement and rejection of browser-client reservations. Azure responded successfully through the budget guard. A blank-image hallucination during live testing led to the deterministic preflight checks; blank-image rejection is now tested before inference. No real-user palm accuracy or live payments are claimed as verified.

Payment pricing, signatures, captured status and user ownership are checked on the server. Service-role-only SQL functions provide idempotent payment fulfillment and atomic paid-report saving/credit deduction. The browser has no permission to update balances. Billing remains disabled without credentials.

## Verification

The live Supabase migration was applied. Transactional tests passed for own-report access, cross-user denial, anonymous denial, client credit protection, duplicate payment callbacks and duplicate paid-report saves. All fixture changes were rolled back. Automated API tests cover validation, signature checks, missing authentication, disabled checkout, malformed bodies and same-origin enforcement. Real AI and live payment processing remain unverified without service credentials.
