# Offline PowerPoint generation backend

This release connects the v3 catalog, ranking and export code into a durable deck-generation workflow. Run it on a machine with Python 3.12, LibreOffice Impress, Fontconfig and Poppler. The included example was generated using the packaged HTTP service and worker. A browser or website can use this API through its authenticated server.

## Included example

The tracked [pilot content](examples/pilot-content.json) includes a labeled fictional dataset and an editable chart. After starting the local service, run `python demo_job.py --out demo-output` to produce a PowerPoint, rendered PDF, reading copy and quality report from that input. Generated files are not included in the source checkout.

## Start the backend

On Linux, install your distribution’s LibreOffice Impress, Poppler utilities, Fontconfig, and fonts. Debian package names include libreoffice-impress, poppler-utils, fontconfig, fonts-liberation and fonts-noto-core. From the extracted project folder:

```sh
python -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
export PPT_BACKEND_TOKEN="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
python local_server.py
```

Open http://127.0.0.1:8080/docs to inspect the APIs. Send the token as an Authorization header in the form Bearer followed by a space and the token. If you leave PPT_BACKEND_TOKEN unset, the launcher prints an ephemeral token for local use. Keep the service token on the website server. The website’s existing login should determine X-Workspace. A browser must never choose its own tenant header or receive the service credential.

The bundled `catalog.sqlite.gz` is opened automatically when a runtime database is first initialized; no manual decompression is needed. The temporary catalog copy is removed after use, and runtime data remains separate from the bundled seed.

local_server.py starts the HTTP server and one render worker. It forces external API access off, even when external keys exist in the environment. Local installation may need internet access to obtain dependencies. Running the installed backend and the example requires no external network. If multiple local processes are needed, run python manage.py init once, then start uvicorn app:app and python deck_worker.py using the same PPT_DB path and credentials. Use local persistent storage for SQLite. The worker discovers queued jobs and reclaims interrupted renders after a five-minute lease. Render subprocesses have timeouts. Each job can recover up to three interrupted attempts before it reports a recoverable failure.

To reproduce the provided sample, run the following command in a second terminal with the same PPT_BACKEND_TOKEN and Python environment.

```sh
python demo_job.py --out demo-output
```

## Website integration

1. **Create** with POST /decks. Send X-Workspace from the signed-in session and an Idempotency-Key unique to the create action. Supply competition.name, competition.organizer, competition.year, competition.round, topic and audience. Optional notes are a list of evidence statements. Optional supplied_rules include kind, value and source. They belong to that job and are explicitly marked user_supplied. The response includes a job ID, frozen rule sources, historical winner references, revision and up to three design options.
2. **Choose and review** with PUT /decks/{id}/draft. Send the current revision and option_id. If slides are omitted, the local matcher arranges the user's notes into editable slots. It copies the user's words verbatim. Unfilled slots stay blank. Supply a complete slides array to save edits. Changing the theme preserves edits when the new option uses the same slide sequence.
3. **Generate** with POST /decks/{id}/generate and the reviewed revision. This action approves the saved content and queues the job. It checks required slots, allowed design, slide limit and current local rule snapshot. If a mandatory organizer template applies, the response at creation is blocked and includes its rule source. The native renderer cannot fill an arbitrary organizer master in this release. When no rule record is available, the job is labeled unknown and the export is a draft requiring organizer review.
4. **Poll** GET /decks/{id}. The normal progression is choose_design → review → queued → rendering → ready. A blocked response explains which competition condition needs attention. A failed render includes a reason and any recorded quality issues. Shorten the flagged text, update the draft using its current revision, then generate again. A worker or local tool failure can be retried with the same approved content.
5. **Download** from /decks/{id}/files/pptx, /pdf or /article (all under the same /files/ path). The returned downloads object contains the precise URLs. Serve these through your website backend with the same workspace credentials. Editing a completed deck invalidates the old downloads and increments its revision. Stale edits return HTTP 409. Repeated generate requests for the current revision reuse the existing work.

Example create payload:

```json
{
  "competition": {"name": "Case Buster 2.0", "organizer": "IETE SPIT", "year": 2026, "round": "Round 1"},
  "topic": "Reduce peak lunch queues",
  "audience": "Case competition jury",
  "notes": ["The longest observed queue was at 12:15.", "Trial a separate pickup line for preorders."]
}
```

For a newly named event, users may transcribe the organizer's rule using e.g. `{"kind":"max_slides","value":"8","source":"Organizer brief, page 2"}` in supplied_rules. Local rules are combined with captured organizer rules. An incompatible supplied rule cannot silently relax a stored rule. Other fields such as format and judging criteria are visible for review. The system enforces the implemented slide-count, organizer-template and AI-policy restrictions. It cannot certify compliance with every free-text instruction. If evidence or selected rules have changed, generate a fresh job and review it.

## Storage, quality and costs

SQLite holds the brief, candidate designs, selected design, rule snapshot, content, revision, queue lease, attempt count and quality report in deck_jobs. deck_files contains the three published artifacts. Final publication uses one transaction guarded by the render lease, so the API never exposes a partially committed file set. Back up the runtime database with SQLite’s backup API when the service is active.

The worker selects installed fonts using Fontconfig and records substitutions. It opens the PPTX, checks slide and shape bounds, converts it to PDF with LibreOffice, compares visible text in text boxes and table cells against their intended regions, and flags very small rendered text. The preview is generated from the actual PowerPoint. Rendering differs by operating system and installed fonts. These automated checks do not verify claims, screen-reader order, embedded chart-label readability, or the visual quality of every possible submission. The UI should surface font substitutions, uncertain rules and the preview before the user submits.

Local rendering uses zero paid external API requests. CPU, storage and hosting still have operating costs. The v3 estimator and ledger remain available for future integrations. The v4 /decks path always reads local or user-supplied evidence. Cloud research, connected Canva templates, stock-photo retrieval and LLM drafting are deferred. The public-facing competition UI should use /decks and the returned download URLs. The older /export endpoints remain server-side utilities for generic presentations and do not confer a competition review.

Run `python -m unittest -v` for the regression suite. Standalone v3 documentation and catalog access remain in [README.md](README.md). To verify a fresh installation, check `which soffice pdftotext fc-match` and run demo_job.py against the running local server.

## Offline owner workspace and gallery

The public browser studio and review work without this service. This backend remains an optional owner preview until end-user authentication is connected. To use its separate workspace locally, set `PPT_BACKEND_TOKEN`, optionally set `PORT=8080`, then run `python cloud_server.py`. It serves the workspace at `/` and the service at `/backend`; keep the token private. `python make_gallery.py` creates the bundled template gallery locally before starting the workspace. The Docker build runs this gallery step automatically. A missing gallery no longer prevents the service from starting.

Both launchers force external integrations off. Do not add provider keys for the current local release. The Node website services independently require `PITCHVIVA_ENABLE_EXTERNAL_APIS=1` and owner-side credentials before future provider activation; client-supplied keys cannot activate them.
