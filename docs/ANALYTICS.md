# Hasta Rekha analytics setup

## 1. Create the GA4 web stream

In Google Analytics, create or select the Hasta Rekha property, then go to **Admin → Data collection and modification → Data streams → Web**. Add `https://hasta.sadhanaboard.com` and copy the stream's **Measurement ID**, which starts with `G-`. Google documents this flow and the Measurement ID location [here](https://support.google.com/analytics/answer/14183469).

## 2. Add the public ID to Render

In the Render service environment variables, add:

```text
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

This ID is intended for browser code. Do not put Supabase service keys, Azure keys, or Razorpay secrets in `VITE_` variables.

## 3. Use tagged campaign links

Examples:

```text
https://hasta.sadhanaboard.com/?utm_source=temple_poster&utm_medium=offline&utm_campaign=reading_20
https://hasta.sadhanaboard.com/?utm_source=instagram&utm_medium=paid_social&utm_campaign=reading_20
https://hasta.sadhanaboard.com/?utm_source=temple_poster&utm_medium=offline&utm_campaign=hanamkonda_temple
```

Hasta stores the first tagged campaign locally for the visitor and GA4 receives the UTM values automatically. Keep the campaign names stable so locations can be compared later.

## 4. Verify the purchase event

After a Razorpay payment is successfully verified, Hasta sends GA4's standard `purchase` event with the Razorpay order ID, INR value, and plan item. It also sends `begin_checkout` when checkout starts. In GA4, use **Reports → Acquisition → Traffic acquisition** and add **Session source / medium** or **Session campaign**. Use **Admin → Data display → Events** to confirm `purchase`; mark it as a key event if you want it surfaced as a business conversion. Google explains key events [here](https://support.google.com/analytics/answer/13965727).

GA4 may take a few minutes to show normal reports. Use **Reports → Realtime** or **DebugView** while testing.
