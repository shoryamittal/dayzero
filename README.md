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

Event search provides official references and Wikipedia background. It cannot discover every campus event or verify current deadlines. AI Studio is optional and uses your Gemini API key. Projects stay local unless you export them or send selected text to Gemini. A paid launch must accurately describe these limits. PPTX filling requires manual layout review in PowerPoint. Generated decks have six sections. If the built-in PDF cannot render your text, the pitch kit still includes the editable PowerPoint and other files.

Third-party licenses are retained under dist/vendor/.

## Community-led direction

The homepage and Community pilot page describe a proposed four-week preparation cohort. The free workspace remains available. Enrollment and payments are closed until hosts, schedule, delivery capacity and commercial terms are confirmed. `dist/community-model.md` records the final model and owner decisions. `dist/community.mjs` includes the personal four-week calendar generator; calendar files do not reserve a seat or hosted meeting.

## AI Studio

Open a project and choose AI Studio. Use a Gemini key from a free-tier Google AI Studio project. Review the outbound text before sending. A key is used for one request and is never included in project storage or exports. Google may use free-tier submissions to improve its products.

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
