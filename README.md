# PitchViva

Event preparation and pitch studio. Browser-local projects, evidence, editable decks, requirement mapping, speaking plans, organizer PPTX text filling, and handoff workbooks.

## Structure

- dist/: deployable app and licensed export libraries
- tests/: behavior tests
- scripts/: validation tooling
- vercel.json: Vercel deployment configuration

## Run

Use Node 22 or later. The local workspace runs without package dependencies or API keys.

    npm run build
    npm run dev

Render: Static Site, branch main, build npm run build, publish dist.
Vercel: import this repository; settings are included.

## Review Studio

Open `/review.html` for the dedicated deck review workspace, or use the shared review section on the homepage. A browser-local PPTX review provides an overview, slide text outlines with highlighted findings, supplied-rule checks and a revision checklist. The overview groups repeated findings and links to individual slides. Compare revised PPTX reruns the same brief in this tab and includes previous and current counts in the downloadable report. The fictional example uses the same checks as uploaded slide data. Review marks last for the current session; download the Markdown report or use the print action to retain them. Marking an item addressed is a user acknowledgement, not automatic verification of an edited deck.

The reader supports 1–40 slides and files up to 8 MB. Text outlines do not reproduce original visual layouts. Checks use editable text and stored metadata; inherited styles, image/chart content, factual accuracy and final organiser compliance require manual inspection. No model API, quality score or selection prediction is used by this feature.

## Storage and service boundaries

Export a library backup before switching hosts, then unzip it and import each project JSON on the new host. Browser storage is isolated by origin. Drafts expire 24 hours after last edit, checked on opening. Export backups for durable storage.

Event search provides official references and Wikipedia background. It cannot discover every campus event or verify current deadlines. The writing assistant uses server-configured Gemini access. Building a pitch can send your idea for automatic drafting as disclosed on the form; ordinary editing stays local. A paid launch must accurately describe these limits. PPTX filling requires manual layout review in PowerPoint. Generated decks have six sections. If the built-in PDF cannot render your text, the pitch kit still includes the editable PowerPoint and other files.

Third-party licenses are retained under dist/vendor/.

## Community-led direction

The homepage and Community pilot page describe a proposed four-week preparation cohort. The free workspace remains available. Enrollment and payments are closed until hosts, schedule, delivery capacity and commercial terms are confirmed. `dist/community-model.md` records the final model and owner decisions. `dist/community.mjs` includes the personal four-week calendar generator; calendar files do not reserve a seat or hosted meeting.

## AI Studio

Open a project and choose Writing assistant. The server uses GEMINI_API_KEY when configured. Provider credentials are never included in project storage or exports. The form lets users inspect outbound story and context. Google may use free-tier submissions to improve its products.

The Vercel deployment runs /api/assist. For local development, run npm run dev and open http://127.0.0.1:4176/. Render continues serving the static workspace. AI Studio there links to Vercel.

## Archived sampler - Before Close

Before Close is the fictional six-slide campus food-recovery pitch previously featured on the homepage. Students reserve an unsold meal and staff verify pickup at the counter.

[Download the editable six-slide sample](archive/Before_Close_Sample.pptx).

| Slide | Purpose |
| --- | --- |
| Opening | Introduce the reservation and verified pickup. |
| Reservation | Show how one code connects the booking to the portion. |
| Workflow | Follow a portion from listing through pickup or expiry. |
| Handoff | Separate the clickable walkthrough from the on-shift test. |
| Pilot | Compare leftovers on matching weekdays. |
| Decision | Request one canteen for a two-week pilot. |

The [original sample design](dist/sample-deck.mjs) and [project data](dist/engine.mjs) remain in the repository. The [historical homepage](https://github.com/shoryamittal/dayzero/tree/7c6a94bd2c49e04c4eb4852d082f124010aed410/dist) preserves the interactive implementation.



## PowerPoint generation backend

Run `npm start` with Node 22+ to start the export service on port 4177. Set `PORT` on a host. `npm run dev` also serves the export route alongside the local website. The existing website export stays on-device.

`GET /health` reports readiness. Send JSON to `POST /api/pptx` and save the binary response as a .pptx file. Supply a project name and one or more of problem, solution, approach, proof, impact and ask. Other workspace fields such as slideHeadlines, slideImages, evidence, template and notes follow the browser project format. Missing sections receive editable placeholders. This endpoint assembles supplied content using the existing six-slide renderer. It needs no model key, database or file storage.

    curl -X POST http://localhost:4177/api/pptx -H "Content-Type: application/json" --data-binary @project.json -o pitch.pptx

Example project.json:

    {"name":"Campus Food","problem":"Cafeterias discard surplus meals.","solution":"Students reserve surplus portions before closing."}

Requests are limited to 4 MiB, with two concurrent exports per process. Responses use no-store. The service processes project data in memory. Authentication, billing and model-based drafting are outside this endpoint.


## Deep presentation review

The homepage and /review.html support standard checks and an optional deep competition review.

- Standard: editable text, declared typography, stored bounds and supplied-rule checks through /api/deck-review.
- Deep: /api/review-ai reviews up to five selected slides per call, then runs a deck-wide strategy and criterion mapping pass. Each accepted text finding has an exact slide passage, a reason, a concrete fix and optional suggested wording. New numeric claims in rewrites are removed.
- Visual: attach a matching PDF under 2 MiB and confirm the same slide count/order. The PDF is sent to Gemini with the extracted text. Visual suggestions identify a page region; text-only runs cannot claim visual inspection.
- References: import reference PowerPoint text or read a public reference page. Reference lessons require an exact reference passage. Winner status is not verified, and reference achievements must not become project facts.
- Discovery: directory/encyclopedia discovery works without an AI key. A connected Gemini project enables grounded live web research for competition and past-winner sources. Google Search suggestions are displayed in a sandboxed frame. Users explicitly select a source, preview excerpts and attach the relevant brief. Restricted sites, scanned documents and unavailable rulebooks require a pasted brief or an alternate public source.

### Activate AI

Add GEMINI_API_KEY as a server-only Vercel environment variable and redeploy to enable the shared connection. No client-visible environment variable is needed. Customers are never asked to supply a provider key.

The readiness endpoint GET /api/review-ai exposes only availability/provider/model. AI analysis requires a server connection, same-origin JSON and bounded input. The public form discloses content processing; research preparation also works with readable known/provided sources when AI is unavailable. A failed or cancelled AI run leaves standard findings available and never appears as a completed deep review.

Progress reflects actual work: reading slides, measuring standard checks, analysing slide batches, then cross-slide strategy. Revised-deck comparison runs fresh standard checks and attempts fresh deep analysis through the same automatic workflow.

### Review validation

The automated suite exercises grounding, complete slide coverage, rule attribution, reference passages, PDF checks, cancellation, safe error handling, provider failures and export. Provider responses are mocked in tests. A real model-quality evaluation still requires a configured Gemini project and representative decks; no system guarantees selection or complete coverage of every competition.


## Simplified public review

The public reviewer asks for a PowerPoint, competition name, optional event link and optional additional organiser rules. Provider credentials belong in server configuration, never in the customer intake. PDF exports, reference uploads, required rulebook pasting, review-depth choices and setup confirmations are not part of the public form.

POST /api/review-ai with action prepare collects bounded source excerpts using the known organizer directory and, when the server AI connection is available, grounded competition/reference discovery. Only successfully fetched excerpts are used. Sources and limitations are shown in the report. Re-review uses the same workflow.

The standard review remains available when extended analysis cannot run. Missing AI/research/rendering capabilities are reported accurately rather than shifting setup to the visitor. Automatic original-deck rendering is not provided by the Vercel text-review service.


## Automatic pitch start

The dedicated pitch page accepts an idea, optional competition name/link, and optional known facts, rules and names. It opens the editor immediately, then attempts bounded competition/reference research and server-backed drafting. Provider keys are never requested in the public creation form or writing assistant. Configure GEMINI_API_KEY server-side for AI operations; without it, the editor retains the idea and shows honest missing-data prompts.

The automatic flow preserves extra rules, records source excerpts and research limits, validates complete six-section drafts, and checks for edits made during the provider request before applying any automatic result. Original wording is retained in version history. No winner status, fact verification or competition success is claimed. Exports currently remain six slides: constraints requiring another structure must be addressed before submission.
