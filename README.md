# Day-Zero

Event preparation and pitch studio. Browser-local projects, evidence, editable decks, requirement mapping, speaking plans, organizer PPTX text filling, and handoff workbooks.

## Structure

- dist/: deployable app and licensed export libraries
- tests/: behavior tests
- scripts/: validation tooling
- vercel.json: Vercel deployment configuration

## Run

Node 22+ and Python 3. No package dependencies or API keys required.

    npm run build
    npm run dev

Render: Static Site, branch main, build npm run build, publish dist.
Vercel: import this repository; settings are included.

## Storage and service boundaries

Export a library backup before switching hosts, then import it on the new host. Browser storage is isolated by origin. Drafts expire 24 hours after last edit, checked on opening. Export backups for durable storage.

Event search provides official references and Wikipedia background. It cannot discover every campus event or verify current deadlines. AI generation, cloud collaboration, and payments are not connected. A paid launch must accurately describe these limits. PPTX filling requires manual layout review in PowerPoint. Generated decks have six sections. PDF supports Latin text; use PPTX for other scripts.

Third-party licenses are retained under dist/vendor/.
