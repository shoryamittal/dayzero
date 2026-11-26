# PitchViva — Dayzero

A competition pitch workspace for student teams: prepare an editable story, keep evidence and organizer rules beside it, review an existing PowerPoint, rehearse, and download the complete handoff.

**This release runs locally with live integrations intentionally pending.** No API key, account, payment or provider request is required to use the browser workspace. Existing provider credentials cannot activate live calls on their own.

## Run the complete app

Use Node 22 or later. The browser app has no package-install step.

```sh
npm run build
npm start
```

Open **http://127.0.0.1:4176/**. `npm run dev` runs the same workspace. Set `PORT` or `DAYZERO_PORT`, or pass `--port` to `scripts/serve.mjs`, to choose another port.

- `/` — homepage and presentation review.
- `/pitch.html` — compact pitch intake and the complete editor.
- `/review.html` — dedicated presentation reviewer.
- `/health` — local server readiness.

The deployable browser app is `dist/`. The existing Vercel configuration builds with `npm run build`; a static host can publish `dist/` after the same command. The local workflow works on either deployment without serverless functions.

## What you can complete without APIs

| Workflow | Included behavior |
| --- | --- |
| Create a pitch | Type or import notes, refine wording locally, add an optional event/round and supplied rules, then open an editable six-section story immediately. Explicitly labelled notes can be arranged into their matching sections. Missing facts stay marked. |
| Select competition context | Search saved references and dated briefs, retain the requested edition, choose a source, and use compatible round/track suggestions. These records are background, not live deadline or compliance verification. |
| Edit the deck | Six visual styles, editable headlines and slide text, uploaded images and alt text, exact speaker notes, draft checks and team review marks. |
| Improve wording | Review deterministic findings and before/after wording suggestions, apply changes to individual unchanged sections, save a snapshot, and undo. No generated facts or AI quality score is implied. |
| Prepare evidence and rules | Attach source notes, map requirements, assign tasks and speakers, plan demo fallback, record feedback and keep submission details. |
| Learn from references | Paste or import a reference, save its source URL, compare text signals, and remove/undo. Reference achievements never become project facts. |
| Review a PowerPoint | Read supported presentation formats on-device, inspect text and available typography/bounds metadata, measure supported slide-count rules, prioritize findings, mark addressed work, compare revisions, and download or print the report. |
| Rehearse and deliver | Timer, practice questions and saved answers, presenter notes, editable PPTX, supported-text PDF, speaker script, rationale, preparation workbook and ZIP pitch kit. |
| Recover work | Individual JSON backups, whole-library JSON backup and restore, compatibility with previous library ZIP backups, project duplication and version history. |
| Plan preparation | Saved event library, custom event briefs, and a four-week personal calendar. The proposed hosted cohort remains closed. |

See [the full feature status and boundaries](docs/feature-status.md) for a feature-by-feature map based on the founder's current product notes and repository history.

## Local data and recovery

Projects are stored in this browser's IndexedDB. The library holds up to 12 projects. **Drafts expire 24 hours after the last edit**, checked when the workspace opens. Export backups for durable storage, especially before changing hosts or clearing browser data.

Saves merge only the projects changed in the current tab. If another tab edits or removes the same project, the stale save is stopped and its unsaved text remains available in that tab. Follow the visible notice: export a backup before reloading the saved copy. This protects against silent overwrites; it does not merge competing edits automatically.

Use **Storage & settings → Back up the whole library** to download one JSON file containing every project and the active selection. **Restore a backup** accepts that file, a single project JSON, or an older library ZIP. Restoration validates the entire set before importing, preserves existing projects, creates fresh IDs, and restarts the restored drafts' retention period. A project may be up to 3 MB; the backup file may be up to 40 MB.

New snapshots preserve story text, headlines, speaker notes, design and practice answers. Images, evidence notes and organizer rules remain part of the current project and full backups rather than being duplicated into every snapshot. Restoring a snapshot first saves the current draft so the change can be reversed.

Public application files, current module dependencies, bundled references and export libraries are cached after the first successful load. The build regenerates the offline asset manifest. Provider responses and project data are never placed in the public asset cache. Fonts may fall back to system fonts offline; Google Fonts receives normal font requests when connected, and the host may process access logs.

Each release also changes the worker's manifest URL so an installed workspace can discover updated application code. Updates never reload an editing session automatically; reopen or reload after installation to run the new release. Internal navigation waits for pending edits to save and retains the page if storage fails.

## Presentation review and export boundaries

The reviewer accepts PPTX, PPTM, PPSX, PPSM, POTX and POTM files with 1–40 slides and a maximum file size of 8 MB. It reads supported text and stored metadata; it does not execute macros. Old PPT/PPS/POT files must be converted to PPTX. Review marks last for the current tab, so download the report to retain them.

Findings include their reason and a practical next step. Text outlines do not reproduce the original slide layout. Image/chart content, inherited styles, factual accuracy and final organizer compliance need human review. Revised-deck comparisons use the same frozen brief rather than changing requirements between runs. Marking a finding addressed records the team's acknowledgement; a fresh review is needed to measure an edited deck.

Browser exports contain six slides. A conflicting event slide limit is flagged; use a compatible format before submission. The official-template bridge can selectively replace supported PPTX text boxes while preserving the source package. Inspect every filled template in PowerPoint. It rejects macros and unsupported embedded objects.

The built-in PDF renderer supports its documented Latin-text range. Unsupported scripts produce a clear message; Unicode text remains in the editable PowerPoint, which can be exported to PDF with suitable fonts installed. The ZIP kit still includes the PPTX and a PDF fallback note. No cross-editor layout guarantee is made.

## API work deliberately pending

The browser policy is in `dist/integration-policy.mjs`; its live-service switch is off. Node provider routes independently require `PITCHVIVA_ENABLE_EXTERNAL_APIS=1` and owner-side credentials. Python local launchers force paid external access off. Never put provider keys in browser fields, project backups, tracked source or client-visible environment variables.

[API activation and remaining work](docs/integrations-pending.md) records the later tasks for AI, live research, media, cloud accounts, payment/order handling and cohort operations. These services are not presented as finished by this release. A key alone does not implement customer authentication, payment webhooks, order entitlements or production recovery.

## Optional local PowerPoint endpoint

The complete local server includes `POST /api/pptx`, a renderer for supplied project JSON that makes no model request. For a standalone export process:

```sh
npm run start:export
```

The standalone service listens on port 4177 or `PORT`; `GET /health` reports readiness. Send a project name and at least one story section, plus optional headlines, images, source notes and speaker notes. Missing sections remain editable placeholders. Requests are limited to 4 MiB with two concurrent exports per process. The website's normal export stays in the browser and does not need this endpoint.

## Optional Python generation backend

The separate owner-operated backend includes a design catalog, durable job revisions, a render queue, retries, editable PPTX generation, article output and local LibreOffice/Poppler checks. It reads the shipped compressed catalog on a fresh checkout; there is no manual unzip requirement.

See [backend/BACKEND.md](backend/BACKEND.md) for local installation, authorization, worker behavior and the real system dependencies. [backend/README.md](backend/README.md) documents its catalog and optional services. This owner-only backend is separate from the public browser app. Never expose its service credential or accept a visitor-chosen workspace header in a public integration.

## Verification

```sh
npm run build
cd backend
python -m unittest -q
```

The root build checks application/API/server syntax, regenerates the offline manifest and runs the JavaScript behavior suite. Provider tests use fixtures. The Python suite includes real local rendering when its prerequisites are installed. See [docs/verification.md](docs/verification.md) for this completion pass's observed results and limits.

## Repository guide

- `dist/` — browser application, generated offline manifest and licensed export libraries.
- `api/` — local rendering and gated future provider endpoints.
- `backend/` — optional owner-only Python catalog and render service.
- `scripts/` — local servers, validation and offline-manifest generation.
- `tests/` — JavaScript behavior regressions.
- `docs/product-suggestions.md` — recorded founder direction.
- `docs/feature-status.md` — current feature completion map.
- `archive/` — historical product prompt and fictional Before Close sample.

Third-party licenses are retained under `dist/vendor/` and `backend/assets/`. The historical `dist/audit-report.md` is a dated baseline, not the current release status.
