# Reading tradition and voice

Reviewed September 17, 2026. The app uses a small, curated contemporary Indian palmistry guide, injected into each report request from `server/palm-tradition.ts`. This is reference grounding, not fine-tuning, a scholarly translation, or a guarantee of expertise. Human review by a qualified practitioner of the desired school remains necessary before claiming authoritative coverage.

## Source scope

- [Ishvaram's practitioner guide](https://ishvaram.com/palmistry/) supplies the contemporary line locations and symbolic themes, and planetary mount names/locations behind HR1–HR6. These are traditional claims, not scientific evidence of character or future events. The app deliberately excludes health diagnosis and deterministic predictions.
- [Palmistry Path's historical overview](https://palmistrypath.com/blog/beginner/indian-palmistry-hasta-samudrika-shastra/) distinguishes contemporary line terminology from classical bodily-marks literature, notes school differences and cautions against treating familiar modern terms as scriptural quotations. This is a secondary overview, not a verified critical edition.
- [Brihat Parashara Hora Shastra, chapter 3](https://parashara.net/index.php?page=chapter3) discusses planets, signs and the birth ascendant. We do not derive a birth chart, dashas or doshas from hand photographs, or attribute the app's palm rules to this text.
- [OpenAI GPT-4.1 guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-4.1) informs explicit instructions, reference context and examples. Instructions improve consistency but do not guarantee compliance or expertise.

## How readings are grounded

The image-only stage records visibility, shape and continuity of four major lines separately for each photo, at temperature 0. It receives no personality, humor or symbolic interpretation task. The server assigns head → inner world/HR2, fate → work/HR4, heart → relationships/HR1 and life → everyday balance/HR3. Uncertain or invisible lines get no interpretation rule. Mounts are excluded from this first structured observation version because ordinary photos cannot reliably establish elevation.

The writing stage receives this observation record, not photos. The server owns displayed evidence, reference IDs and aspect ordering; generated text cannot replace them. Normal prose uses temperature 0.65 and roast rewriting 0.85 to allow varied language. These are stylistic settings, not accuracy scores. Metaphors, callbacks, sentence rhythm and symbolic possibilities remain free-form; fabricated physical features and deterministic claims are not authorized. One short framing sentence replaces repetitive disclaimers.

These changes reduce avoidable drift and mismatched rules. They cannot prove correct vision, prevent every unsupported statement in prose, or guarantee identical independent observations of the same photo. Expert review and repeatability evaluation remain outstanding. Deterministic photo-quality checks remain enabled. No report is sold as verified personal truth.

## Voices

Normal: warm, fluent, direct consultation; plain explanations of Indian terms; specific encouragement and tactful discussion of tensions. Avoid generic flattery.

Roast generation first produces the normal interpretation, then rewrites its voice without sending the photos again. The server preserves the original evidence and photo-quality assessment. The paired photo test reuses one normal report for both outputs. This avoids letting roast instructions change the visual observations; prose still needs human review for unsupported elaboration.

Roast: opt-in, high-intensity Gen Z comedy; vivid punchlines, blunt hypothetical habit callouts and callbacks. Keep visual evidence literal. Do not turn a joke into a factual accusation or attack human worth, protected traits, illness, trauma or appearance. Both modes use the same reference rules and uncertainty requirements.

The source guide is static application code, not a local database. Accounts, reports and the unchanged $190 AI budget ledger remain in Supabase. Existing saved readings are not rewritten.
