# Completion verification

Recorded on 26 November 2026 for the local release described in [README.md](../README.md). Results below distinguish automated checks, inspected export files, browser walkthroughs and work that remains pending. They describe the checked working tree, not a deployed production release.

## Automated results

| Check | Observed result | Scope |
| --- | --- | --- |
| Final full JavaScript/build run | **189 passed; 0 failures, skips or cancellations** | `npm run build` completed after all source changes. Application/API/server syntax checks passed, the offline asset manifest and worker fingerprint were regenerated, and the complete JavaScript behavior suite passed. |
| Focused final review regressions | **19 passed** | `node --test tests/review-interpretation.test.mjs tests/review.test.mjs`; includes eight new tests for rule splitting, provenance and slide-title selection. |
| Python backend suite | **33 passed** | `python -m unittest -q` from `backend/`, with the local rendering prerequisites installed. Real LibreOffice/Poppler rendering was exercised, alongside job lifecycle, overflow rejection, retries, workspace isolation and fresh-catalog initialization. |

Provider tests use controlled fixtures. Their success verifies request policy and application behavior; it does not establish live provider availability or output quality.

## Browser walkthrough

The browser checks used the running local application and a QueueWise project. Actual downloaded files were inspected rather than relying only on successful button clicks.

| Workflow | Observed outcome |
| --- | --- |
| Create a pitch | QueueWise opened as an editable six-section local project. Labelled supplied notes were distributed into the corresponding sections without a provider request. |
| Notes and practice answers | Manually entered speaker notes and rehearsal answers were retained exactly in the downloaded pitch kit. The actual ZIP and PPTX package contents were checked. |
| Existing-deck review | The generated QueueWise PPTX uploaded and produced a local report. Slide-map navigation retained the homepage report after the studio/reviewer selector collision was repaired. |
| Local wording assistant | A wording suggestion could be applied and undone. |
| Reference material | A saved reference could be removed and restored with undo. |
| Review state | Review-state invalidation was exercised during editing. |
| Library recovery | A whole-library backup was restored as a fresh project copy. The application then showed two projects, preserving the original. Multi-project round trips and all-or-nothing validation are also covered by the behavior suite. |
| Two-tab editing | After the first tab saved a new headline, a stale edit in the second tab showed a persistent conflict notice and kept its unsaved wording. Reloading the first tab retained the saved headline. The synthetic test title was then restored. |
| Immediate navigation | A headline was edited and New pitch was clicked immediately. The creation view opened, and reopening then reloading the original project retained the edit. The synthetic title was then restored and its saved status observed. |
| Narrow viewport | In a 390 px iframe with a measured 375 px client width, the exercised page had no horizontal page overflow. This was a browser viewport check, not physical-device testing. |
| Application cache | Installation and an upgrade from an already installed release were observed. The new navigation behavior executed after the update. Automated checks cover stable repeat builds, changed asset/worker fingerprints, cache-first loading and exclusion of API traffic. These checks do not certify every disconnected workflow or browser. |

## Final review corrections

The final engine corrections were checked against the actual generated `queuewise.pptx` fixture as well as the focused regression suite.

- For the six-slide deck, `5 slides maximum. Include evidence and a clear next step.` now produces **two requirement checks and one measured breach**. The first statement is `Over limit`; the qualitative evidence/next-step statement remains a manual check.
- Independent sentences and semicolon clauses can be separated without splitting decimal values, URL tokens or recognized abbreviations. Exclusions and conditional qualifications remain attached to the limit, including adjacent-line qualifications, and receive manual review rather than a misleading measured pass.
- The full original supplied brief remains verbatim in the Markdown/print report alongside the derived checks. Each derived check also retains its original rule context.
- QueueWise's extracted titles are **Make lunch queues predictable, Solution, Approach, Evidence, Impact, Ask**. The decorative `05` at 132 pt no longer replaces the `Impact` heading at 75 pt. Title placeholders and explicitly named headings take priority; decorative text is still retained in the extracted slide text.

The fixture check exercises actual PPTX XML through the review extraction logic. The dedicated browser walkthrough above and this final extraction check are separate observations.

## Export and rendering checks

Twelve Latin-text slides and a Hindi PPTX were rendered for visual inspection. The native six-page PDF was checked with MuPDF and completed cleanly. These checks cover the exercised fixtures, not every theme, text length, font installation or PowerPoint-compatible editor.

The built-in PDF path intentionally does not support Devanagari. The application retains Unicode in editable PPTX and directs unsupported PDF content through a suitable PowerPoint/PDF workflow; ZIP export can include the explicit PDF fallback note. Do not describe the browser PDF renderer as supporting arbitrary Unicode scripts.

## Python backend bootstrap and owner service

Fresh-checkout initialization was tested with only the shipped `catalog.sqlite.gz`, without an expanded `catalog.sqlite`. It created a nested runtime database, passed SQLite integrity checking, loaded **30 deck recipes and 2,103 font-discovery records**, and completed repeated initialization without modifying the compressed seed or leaving an expanded database beside it.

The gallery build was run from the compressed catalog in a temporary output directory. It produced **300 editable PPTX files and 300 WebP previews**. This was local catalog generation, not a call to a design or media provider.

The optional owner workspace also started without a prebuilt gallery. Observed responses were:

- Workspace `/`: HTTP 200.
- `/health`: ready, with external APIs reported as disabled.
- `/catalog/` when the gallery was absent: HTTP 503 with actionable local-generation instructions; the missing gallery did not prevent application startup.
- Protected backend access without authorization: HTTP 401.

These checks validate the local owner service and its service-token boundary. They do not implement public customer login or authorize exposing that token to visitors. Installation and reproduction details are in [backend/BACKEND.md](../backend/BACKEND.md).

## Deliberately unverified or pending

No live AI/research provider, Canva/stock-media/font-service integration, public cloud authentication, cloud draft synchronization, payment processing or hosted cohort delivery was activated or tested. No deployment was performed. API switches remain off; [integrations-pending.md](integrations-pending.md) records the later implementation and activation work.

**Publication record:** verification was completed locally. The initial handoff could not be pushed because GitHub authentication was unavailable at that time. The repository branch and pull request record subsequent publication; a successful remote push does not establish a production deployment.

To reproduce the principal automated checks:

```sh
npm run build
cd backend
python -m unittest -q
```

Review the exported files with the team's actual content and current organizer requirements before submission. The application checks text and available metadata; it does not verify facts, certify organizer compliance or predict selection.
