# Integrations pending

Status: intentionally inactive for the 26 November 2026 local release.

## Current behavior

Creating or editing a pitch, standard PowerPoint review, local competition search, wording checks, references, rehearsal and browser downloads do not call live provider APIs. Browser-facing features use `dist/integration-policy.mjs`, whose switch is off. Node provider endpoints independently check `api/service-policy.mjs`; credentials alone cannot opt in. Local backend launchers keep `PPT_ENABLE_EXTERNAL_APIS=0`.

The UI reports pending services without infinite loading, failed-generation claims or provider-key forms. Source links can still be opened by the visitor. Loading public app files, the bundled JSON catalog and fonts is separate from live provider research.

## Later implementation checklist

| Area | Prepared now | Remaining before activation |
| --- | --- | --- |
| AI drafting and deep review | Bounded server handlers, exact-passage grounding, claim safeguards, cancellation, failure handling, test fixtures and a local fallback. | Configure owner-side Gemini credentials and model; enable the server deliberately; evaluate representative decks, errors, cost and quota behavior; enable the browser release only after verification. |
| Live competition research | Source URL checks, bounded excerpts, edition/reference handling, local directory fallback. | Verify real organizer access and retrieval quality, current edition/round matching, rate limits, timeouts and source provenance. |
| Stock media, connected templates and font metadata | Optional Python provider adapters and local design alternatives. | Configure required keys/OAuth and permissions; test licensing/attribution, provider failures and final rendering. |
| Accounts and cloud synchronization | Local project schema, full backups and owner-service tenant tests. | Implement end-user login, server-derived workspace authorization, storage ownership, durable cloud persistence, retention, migrations and recovery. |
| Payments and orders | Paid flows remain closed; proposed pricing is documented separately. | Choose provider and commercial terms; implement sandbox checkout, signed webhooks, idempotency, order state, delivery entitlements, receipts, refunds and secure order retrieval. |
| Hosted cohort | Personal calendar and clearly labelled proposed offering. | Confirm hosts/reviewers, capacity, dates, contact venue, service scope and terms before enrollment. |

Do not expose the Python service token to a public browser. Keep the existing local frontend independent from the owner-only job service until authentication and server-side tenant mapping exist.

## Future enablement sequence

1. Finish the relevant integration's implementation and tests above. Keep credentials out of the repository and browser.
2. Add provider credentials to the server's secret configuration. Keep both enablement flags off during setup.
3. Exercise provider-specific sandbox or controlled checks, quotas and failure paths with approved inputs.
4. For the Node services, deliberately set `PITCHVIVA_ENABLE_EXTERNAL_APIS=1` on the intended environment. This does not change the browser release switch.
5. Enable and release the browser integration policy only when the live workflow is ready. Update content-processing copy and the feature-status document to match actual behavior.
6. Verify the deployed environment and record observed results. Disable the service gate again if it fails; local editing/review/export must remain available.

No credentials have been created, requested from the user, connected or activated as part of this completion pass. Accounts, payment handling and commercial delivery are substantive pending work, not a one-variable setup step.
