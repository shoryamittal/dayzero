## V4.1 website workflow, 24 November 2026

The website navigation opens `/deck-workspace.html`. An existing project's export screen can hand its brief to that workspace on the same origin. Importing a brief stays in the browser; creating or saving a draft sends it to the backend. The access token is never saved in session storage or a draft backup.

The workspace shows queued, rendering, failure and ready states, resumes monitoring after reload, and retries interrupted requests against the saved job. Creation uses an idempotency key. A timed-out generation response is recovered by fetching the same job before submitting another render. Retry saves pending local edits before generating a review-state draft. JSON draft backups support recovery after Render's ephemeral server storage resets.

`GET /competitions/catalog` returns six reviewed edition/round/track records with source URLs, field-level verification, checked dates and registration status. This is a curated dated catalog; external discovery remains disabled. Manual identity changes clear source verification. `POST /competitions/resolve` and deck creation accept `track`; unsupported tracks do not inherit another track's seed rules or winner references. A sourced identity does not establish complete submission compliance.

This remains a token-protected owner preview. Public user accounts, per-user authenticated storage and durable cloud drafts are separate release work. Render free service restarts can remove server drafts; preserve browser drafts and download backups/files.

Verification: `npm run build` covers the website and recovery tests; `cd backend && python -m unittest -q` covers API, worker, rendered export, track isolation and source provenance. Recovery fixtures explicitly simulate a committed request whose response is lost and a save failure before generation.

## V4 offline backend

Start with [BACKEND.md](BACKEND.md) for the generation job, worker, review, rendered QA and downloads. Run `python local_server.py` after installing the prerequisites. The API integrations below are deferred.

## Local gallery

Run `python make_gallery.py`, then open `gallery/index.html` to browse the bundled editable templates. The compressed catalog is loaded automatically. This step uses no provider API. The cost estimator is a planning utility; provider integrations remain pending.

# PPTGenerator competition and design API

A user selects a competition. This service finds the edition and round, researches its requirements and past winners, and returns up to three compatible design bundles. The site can render each bundle with the existing PPT generator. The bundle contains a slide sequence, named layout slots, palette colors and typography. This package is the lookup and selection backend.

## Run locally

Python 3.12 was used for verification. From this folder, create a virtual environment, activate it, and run:

```sh
python -m pip install -r requirements.txt
python manage.py init
export PPT_BACKEND_TOKEN="$(python -c 'import secrets;print(secrets.token_urlsafe(32))')"
python -m uvicorn app:app --host 127.0.0.1 --port 8080
```

Set the same service token in your website backend. Only that backend sends it to this service. It derives X-Workspace from the signed-in user's session. Use a private network between services when deployed. A single service instance with persistent SQLite storage is the intended first deployment. PPT_DB overrides the runtime database path. Run init before starting workers. Configure account-level request quotas at the website backend before enabling paid research for customers. Multiple replicas need shared storage, distributed locking and job execution.

Set OPENAI_API_KEY in the server environment for on-demand research. PPT_RESEARCH_MODEL overrides the default gpt-6.1-terra and must be a Responses model that supports web_search. Each name search can trigger an identification call followed by a research call. A picker that already has organizer, year and round can skip identification. Both calls wait for the provider, so the UI should show progress; configure sufficient upstream timeouts or run them as queued jobs in the host app. Set GOOGLE_FONTS_API_KEY to sync the font catalog. Canva uses each connected user's OAuth token. No credentials are included. Catalog and matching work locally with the bundled examples.

## Connect the competition picker

Send Authorization: Bearer <service token> on every request. Send X-Workspace on recommendation, preference and template-mapping requests. The website should impose its own per-user authorization and restrict the mapping operation to workspace curators.

| Endpoint | Body or behavior |
|---|---|
| POST /competitions/select | {"name":"Case Buster 2.0","year":2026}. Year is optional. A unique sourced match returns a profile. Multiple matches return organizer, edition and round choices. Offline mode can offer dated examples. |
| POST /competitions/resolve | {"name":"Case Buster 2.0","organizer":"IETE SPIT","year":2026,"round":"Round 1"}. Returns the edition ID, rules, source links, and any past or current winner references. |
| POST /recommendations | {"edition_id":"<id>","audience":"case judges","topic":"FMCG marketing strategy","palette_preference":"dark"}. Optionally pass font_preference, available_fonts, required_script and canva_template_ids. |
| POST /preferences | {"impression_id":"<shown set>","option_id":"<chosen option>"}. Only submit when the user explicitly chooses a design and agrees to preference learning. |
| GET /catalog | Layouts, positions, sequences, palettes, type styles and provenance for the renderer. Body zones correspond to inputs_json in order. |
| GET /integrations/canva/brand-templates | Pass X-Canva-Access-Token from the connected user's OAuth session. Use the returned continuation token to fetch another page. |
| POST /integrations/canva/map-template | The curator reviews a Canva design and maps its exact sequence and fixed styles: {"template_id":"…","recipe_id":"strategy","palette_id":"Conifer","style_id":"Briefing"}. Requires the user's token and workspace. |

For a mapped private Canva template, pass the template IDs and the same user's current Canva token on /recommendations. The service checks workspace membership of the mapping, the user's current provider access, and the reviewed design revision. An edited template needs a new mapping. Returned Canva options include a create_url usable in Canva. The native design specs can go to your existing slide renderer. Canva OAuth login and Canva autofill belong to the host integration. Native PowerPoint export is available in this package. Register a Canva integration and obtain the user's brandtemplate:meta:read scope in the host app. Serve previews and handle exports there.

## Interpreting the response

* Display each rule with its URL. Curated records are dated snapshots. Organizer-sourced live claims have a consulted source on a known organizer domain. Other live claims remain candidates. A cited URL establishes provenance; the extraction can still be wrong. For a new event, verify the identity and organizer brief before treating the draft as submission-ready.
* Winner references distinguish historical editions from the requested year, and slides from recordings and results-only evidence. When no deck is found, show “Winning presentation unavailable” and keep the result link if available. Rules use only the requested edition and round. Incomplete input can resolve to several rounds. Keep the choice visible.
* User-facing labels can distinguish “Organizer template required”, “Rules unavailable”, “Review AI-use conditions”, “Check required sections”, and “No compatible catalog design”. For mandatory templates point the user to the rule source and let them supply the official file to the renderer. Unknown rules permit a clearly marked draft.
* Discovery reads the public competition identity. Audience, project text, private Canva credentials and feedback are not sent to the web research provider. Lookup errors preserve the last usable snapshot; successful empty responses have a shorter cache lifetime. The website can poll after a refresh_in_progress response. Successful live facts are versioned in evidence_history; the newest lookup drives the current response.
* Show organizer source links beside claims. Preserve the URLs presented as evidence. Fetch and redistribute files only with the appropriate rights.
* Pass the renderer's actual font availability in available_fonts. For a Hindi deck also pass required_script="devanagari" after syncing Google Fonts. This verifies declared subset coverage for both chosen families. Packaging or embedding fonts and shaping/render checks belong to the export pipeline.

## Grow the catalog

1. User requests grow the public competition records. Every researched claim stores the event identity, year, round and source. Search freshness is one day for positive results and thirty minutes for empty results.
2. Run python manage.py sync-fonts to refresh Google Fonts family, script, version and variant metadata. Fonts enter ranking when available on the renderer. Font binaries are not bundled.
3. Run python manage.py sync-theme-leads to discover versioned directories from the official Slidev GitHub repository. The upstream lists MIT for code and CC BY-NC-SA 4.0 for images and assets. The service saves metadata only. Adapt suitable code, replace or clear assets, then import a reviewed layout or pack.
4. Designers can supply original or commercially cleared layouts, palettes, font pairings and deck sequences. Operator commands are import-layout, import-palette, import-typography and import-pack, each followed by a JSON file. Field definitions are in manage.py, and sample files are in examples/. Rectangles are fractions of a 16:9 canvas. A pack references existing layout, palette and type IDs. Imports are transactional. The source or internal permission record must identify the material used. The contrast check applies to each foreground on the specified background. No blanket approval is implied for photos, fonts or third-party slide masters.
5. Grow private brand catalogs by consent within individual workspaces. Mapping stores IDs, catalog choices and revision dates. Private designs never enter the public theme discovery table.

## How matching and learning work

Hard constraints are applied first. Mandatory templates, restricted AI use, conflicting slide counts and unhandled format-specific design requirements return explicit statuses. Known slide limits filter the eligible sequences. The service currently leaves free-text sections, font requirements and layout mandates to the organizer-template or review path. Other rules such as anonymity, duration and submission format are returned to the renderer for export checks.

The initial model fits a TF-IDF representation to the context and design descriptions, then scores compatible recipe, palette and font combinations using similarity and named features. Explicit palette or font requests are preferences. Script, installed fonts and allowed slide counts act as constraints. Default recipe/palette/font combinations are designer priors. Results are specifications for editable slides. The initial catalog has 30 sequences, 24 layout definitions, 28 palettes, four typography presets and 22 historical deck references. Winner links provide evidence for a user or downstream slide planner. The selector does not derive color or font quality labels from competition placements.

The preference model uses pairwise logistic regression over the displayed alternatives. Run python manage.py train after collecting real choices. The command fits a learned adjustment to the baseline and evaluates predictions with competition-organizer-year groups held out. It promotes a challenger only if its top-choice accuracy among displayed alternatives exceeds the baseline. Twenty choices across four editions are an engineering floor for exercising training. Larger, representative held-out samples and prospective experiments are needed to establish product improvement. The model estimates preference among eligible options. Ranking a bundle does not estimate its probability of winning. A stage or new domain without evidence still needs user review.

Before a public launch, track round identification accuracy, correct rules with citations, false winner-deck matches, mandatory-template violations, time and cost per uncached lookup, font substitutions, and user acceptance by event category. The release includes no feedback from actual customers and no validated uplift. Template edits and competition outcomes may be added as separate, consented signals.

## Verify

Run python -m unittest -v from this folder. Tests use isolated databases, synthetic preferences and mocked provider responses. They cover cache reuse, outage behavior, identity ambiguity, evidence filtering, mandatory templates, private Canva revisions, font compatibility, logged choices and model training. Data used in tests never enters the distributed database.

## Provider references

- OpenAI web search and consulted sources: https://developers.openai.com/api/docs/guides/tools-web-search
- Canva brand template list: https://www.canva.dev/docs/connect/api-reference/brand-templates/list-brand-templates/
- Google Fonts metadata: https://developers.google.com/fonts/docs/developer_api
- Slidev upstream licenses: https://github.com/slidevjs/themes
- Historical results: https://www.casecompetition.com/library/ and https://www.cfainstitute.org/insights/events/research-challenge/past-champions

## V3 catalog, export and costing

Extract the entire ZIP and open START_HERE.html for the operating plan and interactive INR calculator. gallery/index.html opens offline and links all 300 editable PowerPoints. Preview thumbnails use fallback fonts. Installed PowerPoint fonts affect the final result. The generator ships design specifications and real PPTX files without redistributing the 2,103 discovered typefaces. assets/ contains the Bootstrap icon font and upstream license notices. The icon paths and the font discovery index are in catalog.sqlite. Fontsource FONTLIST.json blob 8481159925ac7cde8be07ba5cb1709c4d4ec4d02 and Bootstrap codepoint map blob 9d8873b19e43aafdba4fb3ca3b6626bcce091407 identify the imported indexes.

Run python manage.py init against an existing v2 runtime to add the new schema and seed records once. Back up a live database before migration. python make_gallery.py rebuilds the offline decks and images from the distributed database. System previews need DejaVu Sans and Serif; the PowerPoint renderer writes the selected font names. The catalog uses editable text boxes and native drawing objects; the included decks are .pptx files, rather than .potx slide-master packages.

The new HTTP endpoints inherit the service-token dependency. Keep the service behind the authenticated website backend. Send the same X-Workspace and X-Job-ID for identify, resolve and draft requests belonging to one deck. The server generates a job ID when omitted and returns it as a header. Keep a retry in the same job to attribute extra spend. The event ledger deduplicates response IDs. Quotes and estimates are for standard short-context Terra text, optional search and operator-entered external costs. No customer charges are made by this service.

| Endpoint | Use |
|---|---|
| GET /assets/templates?q=ledger&limit=20&offset=0 | Page the expanded catalog. Supply the four returned identifiers to the export endpoint. |
| GET /assets/fonts?q=devanagari, GET /fonts/inter | Search local font IDs, then hydrate family metadata, variants and license from Fontsource with a 30-day cache. The latter returns the source entry offline. Google Fonts sync populates renderer matching metadata. |
| GET /assets/icons?q=alarm, GET /icons/alarm.svg | Local icon search and scalable vector art. |
| GET /photos/search?q=manufacturing | Return Pexels metadata using PEXELS_API_KEY. Show a Pexels link and a photographer link in the host app. A content block with pexels_id embeds the selected image and credits it. |
| POST /draft/slides | Supply recipe, topic, audience, and evidence (user notes and citations). Uses one model request. The output is an editable draft with one record per layout. |
| POST /export/pptx | Supply recipe, system, palette, typography, and optional slides. Empty content produces an editable template. Filled slides may contain text, icon IDs, tables, bar or line charts and Pexels IDs. |
| POST /export/article | Same identifiers plus filled slides. Returns a styled text alternative with readable tables. Photos are linked in this output. |
| POST /cost/estimate | Returns the USD and INR estimate. Include search content tokens once in input_tokens; web_search_calls counts tool invocations. Read the Quote schema for image fees, monthly overhead, service margin and exchange rate. |
| GET /cost/jobs/{job} | Returns recorded usage and estimated spend for the requesting workspace. Unrecognized models or missing token usage produce unpriced rows. Compare estimates and unsuccessful requests against the actual provider invoice. |

Use the design object returned for a native recommendation as the export identifiers. Keep the gate from /recommendations in the competition UI. The standalone gallery export endpoint supports general decks and does not validate event compliance. A private Canva result uses its Canva create_url. For catalog browsing that respects script requirements, pass actual renderer font availability and verify shaping at export. Native output checks required slot counts, while factual review and full visual QA are still part of the host application. For photos the HTML output links to Pexels, and PPTX contains a credited embedded image. Confirm the user's account rights for branded material.

Examples are in examples/pilot-content.json and examples/pilot-article.html. Import the JSON as the body of /export/pptx or /export/article. The included figures are fictional and labeled accordingly. Drafting and search use cloud credentials. PowerPoint rendering, article export, icons and catalog search can operate locally without paid calls. Host production controls, including quotas, invoice reconciliation, payment collection and Canva OAuth login, belong to the deploying app.
