# PitchViva feature status

Reviewed and updated on 26 November 2026.

## Release scope

This release completes the existing browser-local pitch workflow and repairs the gaps found in its creation, review, recovery and delivery paths. Live provider calls are deliberately disabled. A missing provider connection must not stop local editing, standard deck checks, notes, reference comparison, rehearsal or export.

The current public workflow is the compact pitch start and presentation review described in the recent repository changes and `docs/product-suggestions.md`. The purple visual identity, separate build/review entrances, progressive optional fields and editable six-section story remain in place. `archive/PitchViva_UI_UX_Prompt.md` is a historical, broader paid-service proposal. Its checkout, cross-device order retrieval and simulated model jury are not advertised as working features.

## Feature map

| Area | Available without live APIs | Boundary or pending work |
| --- | --- | --- |
| Start a pitch | Idea entry, local notes import, wording refinement, optional event, source link, round/track, project/team names and organizer rules; editor opens immediately. | Local preparation uses the supplied words and honest gaps. Generative writing is pending. |
| Competition selection | Search bundled references and dated briefs; select a source; keep the requested edition; use sourced round/track suggestions only for a compatible edition; enter a custom round or track. | Current deadlines, comprehensive discovery and live rule verification are pending. A dated reference is not a current availability check. |
| Rules and preparation | Store and confirm supplied rules, map requirements to sections, flag supported slide-count conflicts, assign tasks/speakers, record a demo fallback, feedback and submission details. | Free-text organizer instructions still require team review. Confirming a checklist records a human action; it does not certify compliance. |
| Story and slide editor | Six editable sections, headlines, design themes, images and alternative text, speaker notes, team review marks and version history. | The browser renderer makes six slides. Use the official-template bridge for supported organizer decks; review exports manually. |
| Writing assistant | Deterministic content checks, rehearsal questions and local before/after wording suggestions. Apply a suggestion to one unchanged section, keep a snapshot and undo it. | AI drafting and Gemini suggestions display a pending state and make no request in this release. Local wording rules do not invent missing content. |
| Reference material | Paste or import PPTX, DOCX, ODT, Markdown or TXT text; retain an optional source URL; compare text signals; replace/remove a reference with undo. | Reference text is limited to 16,000 characters. Winner status, achievements and visual quality are not verified. Reference achievements are never copied into project evidence. |
| Evidence | Maintain source notes tied to sections; distinguish measured statements from goals; flag numerical claims without a matching note. | A matching source note establishes attribution, not truth. Real measurements and source quality remain the team's responsibility. |
| Existing-deck review | Read supported modern PowerPoint files locally, run actionable text/typography/bounds and supplied-rule checks, group findings, mark addressed items, compare a revised deck and export a report. | AI strategy, live competition research and visual model review are pending. Text outlines are not a rendered reproduction of the original deck. |
| Rehearsal | Timed practice, speaker allocation, custom notes, section-based questions, user-written answers and recorded elapsed time. | No recording, automatic speech assessment or performance score is claimed. |
| Pitch kit | Editable PPTX, supported-text PDF, slide rationale, timed speaker script, jury practice, source notes, preparation workbook and project backup. | Exports remain drafts. Open the final files before submission. Unsupported PDF scripts receive an explicit fallback to the editable PowerPoint. |
| Official PowerPoint template | Read supported PPTX text boxes, protect known title/footer placeholders, map selected project fields and download a filled copy while retaining original assets and masters. | Macros/embedded objects and unsafe files are rejected. Text replacement does not certify layout or all organizer rules. Re-upload the original template after reopening the app. |
| Project library | Multiple browser-local projects, search, duplication, removal, individual backup, whole-library JSON backup and restore; older library ZIP backups can also be restored. Atomic saves preserve other tabs' projects and flag stale edits to the same project. | Browser data is isolated by origin. A conflicting tab retains its unsaved text for backup before reloading; edits are not merged automatically. Draft retention and storage limits are shown in the app. Accounts and cloud synchronization are pending. |
| Offline use | Current application modules, local references and export libraries are included in the application cache; local editing does not require provider access. | A first successful load is needed to install the offline application. Browser storage can be cleared or evicted. |
| Event library | Offline references, filters, custom source-linked briefs, local attachment, verification checklist and brief export. | Wikipedia/background requests are disabled while integrations are pending. External source links open only when the visitor chooses them. |
| Personal preparation plan | Four weekly personal calendar blocks with the documented India-time schedule. | Calendar files do not reserve hosted sessions or a community seat. |
| Community pilot | Free preparation workspace and a clearly labelled proposed four-week pilot. | Host, reviewers, dates, capacity, contact venue, commercial terms and enrollment remain owner decisions. No paid booking is active. |
| Python generation service | Optional owner-only local job service, catalog, persistent job revisions, retries, editable presentation generation and local rendered QA. | Separate from the public browser workspace. Customer authentication, tenant-safe cloud access and production storage are not completed public integrations. System rendering dependencies are required. |

## Changes made during this completion pass

- Added a browser integration policy and independent server-side gates. Default requests cannot activate a provider by supplying a key from the browser.
- Kept local pitch preparation useful while surfacing missing facts instead of reporting AI-generated work.
- Connected saved competition references to the actual compact creation input. Edition selection no longer silently inherits another year's round guidance.
- Added visible local reference import/paste/comparison instead of leaving the reference handlers unreachable.
- Made the writing assistant useful locally with reviewable wording changes, stale-edit protection, snapshots and undo.
- Corrected draft readiness, speaker-note delivery and saved-answer behavior so the team sees the same state in the workspace and exported kit.
- Repaired local asset serving and offline application coverage.
- Made offline release updates discoverable and protected immediate navigation while edits are saving.
- Improved whole-library recovery, including compatibility with earlier ZIP backups.
- Protected saved libraries from stale tabs, made restore batches atomic, and retained conflicting text with clear backup guidance.
- Repaired backend startup/catalog gaps and made local service boundaries explicit.

## Integrations intentionally pending

| Integration | What must happen before activation |
| --- | --- |
| Gemini drafting and deep review | Owner-side credentials, server enablement, explicit browser release enablement and representative model-quality checks. |
| Live competition discovery and source research | Configure the owner-side providers, keep provenance and edition safeguards, test errors/quotas and review the returned evidence. |
| Canva, stock photographs and font metadata services | Complete provider configuration/OAuth and permissions, then test access, attribution and rendering. |
| Public accounts and cloud drafts | Implement end-user authentication and server-derived tenant authorization, durable storage, retention and recovery. |
| Payments and orders | Select the payment provider and terms; implement verified webhooks, idempotent order handling, entitlement, receipts, refunds and secure retrieval; exercise the entire flow in sandbox before live sales. |
| Hosted cohort delivery | Confirm hosts/reviewers, schedules, venue, capacity and service terms before enrollment opens. |

Adding a key alone does not complete payments, accounts, cloud ownership or commercial delivery. No checkout, guaranteed outcome, verified winner status or automatic organizer approval is implied by this release.

## Verification record

The repository's behavior suites cover the local and deferred-provider paths with controlled fixtures. The new `tests/local-product.test.mjs` specifically checks:

- Saved competition aliases, requested editions and source URLs; incompatible years cannot inherit a different year's guidance.
- Rejection of executable source links.
- No background search or writing-assistant request while integrations are pending.
- Local wording edits preserve the team's facts, apply only to the expected original section, retain a snapshot and support undo.
- Reference bounds, source persistence and separation from project claims.

For the combined release validation, run `npm run build` from the repository root and the Python suite from `backend/` after installing its prerequisites. Browser walkthroughs and export inspection should be reported with the actual observed results; automated test success alone does not certify all visual layouts, model quality or cross-editor compatibility.
