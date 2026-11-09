# Day-Zero

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

## Storage and service boundaries

Export a library backup before switching hosts, then unzip it and import each project JSON on the new host. Browser storage is isolated by origin. Drafts expire 24 hours after last edit, checked on opening. Export backups for durable storage.

Event search provides official references and Wikipedia background. It cannot discover every campus event or verify current deadlines. AI Studio is optional and uses your Gemini API key. Projects stay local unless you export them or send selected text to Gemini. A paid launch must accurately describe these limits. PPTX filling requires manual layout review in PowerPoint. Generated decks have six sections. If the built-in PDF cannot render your text, the pitch kit still includes the editable PowerPoint and other files.

Third-party licenses are retained under dist/vendor/.

## Community-led direction

The homepage and Community pilot page describe a proposed four-week preparation cohort. The free workspace remains available. Enrollment and payments are closed until hosts, schedule, delivery capacity and commercial terms are confirmed. `dist/community-model.md` records the final model and owner decisions. `dist/community.mjs` includes the personal four-week calendar generator; calendar files do not reserve a seat or hosted meeting.

## AI Studio

Open a project and choose AI Studio. Use a Gemini key from a free-tier Google AI Studio project. Review the outbound text before sending. A key is used for one request and is never included in project storage or exports. Google may use free-tier submissions to improve its products.

The Vercel deployment runs /api/assist. For local development, run npm run dev and open http://127.0.0.1:4176/. Render continues serving the static workspace. AI Studio there links to Vercel.
