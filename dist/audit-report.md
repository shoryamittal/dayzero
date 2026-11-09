# Day-Zero implementation audit — 5 November 2026

## Release status

A working browser-local preview, not the completed M0–M10 production product. No milestone is certified complete by this report. Deployment success does not establish product completeness.

## Source and deployments

Private source: https://github.com/shoryamittal/dayzero
Production: https://dayzero-ivory.vercel.app/ and https://dayzero-pitch-studio.onrender.com/

## Spec comparison

| Requirement | Status and evidence |
|---|---|
| Event check | Partial: four curated references, Wikipedia background lookup, edition-year matching, manual brief, source links and review checklist. No comprehensive event discovery or live official-rule extraction. |
| Intake | Partial: four-step form with multiple questions per screen; not the specified adaptive one-question flow. |
| Rules and dossier | Partial: user-supplied rules and sources; no automated gap-only questioning or field-level verified confidence. |
| Template choice | Six user-selected styles. Supported organizer PPTX text boxes can be selectively filled; no automatic recommendation or full visual compliance certification. |
| Outline approval and progress | Missing: no AI outline workflow or server job progress. |
| Jury and scored report | Missing: no AI jury or scores. Existing findings are deterministic text checks, explicitly labeled. |
| Handoff | Working: requirements, tasks, speaking plan, demo fallback, feedback, submission record, and downloadable workbook. |
| Exports | Working with limits: six-slide editable PPTX, PDF with Latin text, ZIP, JSON backup, and organizer-template text replacement. Manual final-layout review required. |
| Clear workspace | Available with confirmation and backup option. |
| Hindi/Hinglish | Not implemented. Non-Latin PDF is rejected rather than silently corrupting text; PPTX retains Unicode. |
| Payments | Not connected. Free preview; no orders or paid service promise. |

## Privacy and storage

Source review: project data stays in IndexedDB; no generation/application-server endpoint exists. Event lookup sends the search query to Wikipedia, fonts request Google Fonts, and hosts can record access logs. This is not a browser network-capture certification. Draft expiry is 24 hours after last edit, processed on opening. Browser eviction and private-mode failures remain possible; export backups. Static files and export libraries can be cached after first use; live lookup needs connectivity.

Imported rules are handled as text, not executable instructions. There is no LLM consuming them in this release. This does not certify future prompt-injection protection once model services are added.

## Verification already performed

- 53 automated behavior tests passed, including imported-data bounds, source URL restrictions, missing facts, rule confirmation, source-note matching, preparation persistence schema, stale review signatures, pacing totals, and edition-aware event matching.
- All application modules passed syntax checks.
- The 27-file uploaded repository archive matched the release byte for byte before this landing-page update.
- Both hosts returned HTTP 200; 38 deployed asset checks matched the source before this update.
- Browser checks confirmed live SIH 2026 matching and opening the workspace.
- Previous browser export check produced a PPTX with editable replacement text; independent parsing verified that only the mapped slide XML changed and original masters/themes stayed intact.

## Verification still required

Lighthouse/4G performance measurements; real JavaScript-disabled browser test; screen-reader testing; browser network capture during intake; explicit offline refresh/lost-connection testing; opening final outputs in PowerPoint and Google Slides; native Hindi/Hinglish review; real-student usability testing; a calibrated paid-service benchmark.

No invented success rate, jury quality score, human evaluation, cross-editor compatibility result, or Lighthouse score is claimed.

## Launch dependencies

Custom domain requires the owner's chosen domain and DNS access. Live AI/search and cloud storage require provider configuration, backend implementation and end-to-end verification. Checkout requires payment credentials, signed webhook handling, reconciliation and agreed commercial terms. These are outstanding product work, not completed integrations.

## Community model update — 6 November 2026

The final business direction is a community-led preparation service, with the software as its workspace. The homepage and former package page now explain a proposed four-week ₹499 pilot. Enrollment remains closed. A four-week personal calendar download is implemented and explicitly does not book hosted sessions. The automated suite now has 55 passing tests. See [the business model](community-model.md) for the pilot scope, operating requirements and validation metrics. Live community delivery, reviewed event shortlists, enrollment and payments remain outstanding.

## Search repair — 6 November 2026

Event search now uses token matching across event names, aliases, topics and locations; it accepts reordered words, punctuation, edition years and a single-character typo in longer names. The bundled library has seven source-linked records, including explicitly labeled past/uncertain editions. It is not a comprehensive or real-time event database. Wikipedia is an optional, separate background lookup. Empty category results offer a clear-filter action. A user can create a source-linked brief, attach it to a saved project and search for it again after a refresh. Those records share the project's local storage/retention policy.

Browser verification: Harvard hackathon matched HackHarvard; an incompatible category produced a clear empty state; clear-filter restored matches; a fictional QA event with a supplied source was attached to the sample project and found again after reload. The automated suite has 56 passing tests. Current official sources checked for the added records: https://www.hhuh.io/ , https://www.pennapps.com/ , https://solve.mit.edu/challenges . These checks do not establish application eligibility or a current open round.

## Gemini AI Studio update

The Vercel release adds a Gemini endpoint that uses the key provided for each request. AI Studio previews the exact project text, requires consent, and clears the key field when submitted. Drafts require explicit application and preserve the previous story. Review and rules findings are accepted only when their quotes match the supplied source text. The local checklist still runs independently. This does not verify organizer websites or predict judging outcomes.

The endpoint was tested with a mocked provider. A live generation check requires a valid Gemini API key and access to the configured model. The Render static release serves the local workspace and links to Vercel for Gemini.
