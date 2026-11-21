# Build the premium PitchViva presentation studio

Act as the product designer and engineer for PitchViva. Implement the upgrade in the existing application. A student with a competition brief, scattered notes and five minutes on stage should be able to see one of their own slides for free, shape the argument, then buy a personalized editable deck for ₹499. The customer should be able to point to a design choice and explain how their audience, evidence or event rules caused it. Deliver working code, the flagship PowerPoint and observed test results. [Repository](https://github.com/shoryamittal/dayzero) · [Current website](https://dayzero-pitch-studio.onrender.com/)

## Start with the existing product

Run the app, open a saved project and export the six-slide Before Close sample. Inspect the actual file. Trace the landing page, brief, evidence, sample, presentation model, renderer and exporter. Start with `dist/launch.mjs`, `dist/app.js`, `dist/sample-deck.mjs` and `dist/deck-design.mjs`. Follow working patterns for organizer PPTX mapping, AI assistance and speaker notes. Preserve older projects, the free workspace and existing links. The current ₹499 community pilot and the proposed ₹499 deck are distinct purchases. Give the deck its own offer and entitlement.

## The first screen is a working demonstration

Use the headline “Walk in with a pitch built for your judges.” Put **Build my presentation** first and **Explore a sample deck** second. Show the proposed one-time price and the deliverables beside the decision. Make the sample legible before the visitor reads a feature list. A returning customer should also see **Resume my draft** or **Retrieve my order** when applicable.

Give PitchViva an editorial identity. Use pale lavender surfaces, deep plum ink, a violet accent and one expressive serif for display type. Pair it with a quiet sans serif for forms and navigation. Let the presentation supply the strongest color. Use a clear type hierarchy, visible focus states, generous margins, solid surfaces and fine rules. Reserve decoration for the slide itself. Keep success claims, countdowns and scarcity messages grounded in real product state.

Build one signature interaction. On the same slide of the fictional **Before Close** project, switch between **Technical jury** and **Business jury**. For a technical jury, “One code connects booking to pickup” should bring forward the illustrative reservation code BC–024 and how staff verify it. For a business jury, “Will more meals reach students before close?” should bring forward a proposed one-canteen, two-week pilot and what staff would measure. Change the composition and speaker note as well as the headline. Keep the slide number, source material and focus position stable. Let visitors inspect the underlying facts. Label concept imagery and illustrative records. The project has yet to measure field outcomes.

## From rough material to one personal slide

Offer **Start with my idea** and **Improve my existing deck**. Start with the pitch, audience and desired decision. Accept rough notes, supported slides, the organizer’s brief or template, evidence and brand assets. State supported formats at the point of upload. Show what was extracted, let the customer correct it and keep usable material if another file fails. For an existing deck, carry forward its terminology, figures and voice.

Read supplied material before asking a question. Ask only for information that changes the deck. Prioritize the judging rubric, speaking time, slide limit, mandatory sections, maturity and strongest evidence. Put optional language, tone, depth and visual controls behind an explicit action. When two constraints conflict, quote both, explain the consequence and let the customer resolve it. An organizer’s six-slide limit must survive a request for ten slides unless the user explicitly chooses a different deliverable.

Before checkout, show a short editable outline and one real, editable slide made from that customer’s material. Beside it, explain one specific decision, such as why the prototype appears before the market slide. Link that explanation to the relevant line in the brief. Let the customer correct a fact, adjust the audience or edit the headline. Show the effect immediately. Carry the approved slide, layout and wording into the order. Tell customers exactly where drafts are saved and how long recovery works on their host.

## A workspace built around the slide

On desktop use a filmstrip, a large slide canvas and one contextual panel for editing, evidence or review. Put speaker notes beside their slide. On a phone, give the canvas the full content width, replace the rail with a slide picker, and open editing controls on demand. Provide a readable text view and a way to inspect the complete slide. Support keyboard navigation, visible focus, reduced motion, touch targets around 44 px, and error messages that keep the customer’s input intact.

Drive progress from completed work. Show a slide as soon as its content and layout exist. Keep completed slides open for inspection while other work continues. If the provider returns a batch, display the batch immediately. Record slide-level errors and retry only the failed work. Preserve customer edits across regenerations, reloads and late responses. Reveal which slides a deck-wide change will touch before applying it. Include undo for consequential edits.

## Make every exported slide earn its place

Build the story around the audience, rubric and timing. Respect an organizer’s master, order, slide count and required sections. Give each slide one point and a headline the presenter could say aloud. Use a diagram to explain a mechanism, a chart for a supported comparison, or an annotated screenshot to establish what works. Move supporting detail into timed speaker notes. Distinguish observations, estimates, targets and assumptions. Retain units, baselines, dates and source references. Qualify a claim or ask for evidence when that evidence is missing.

Use the same versioned slide content and layout decisions for the browser and the PowerPoint. Keep text, shapes and meaningful chart elements editable wherever the format permits. Render the exported file and inspect the actual slides for clipping, wrapping, missing images, font substitution, labels and template fidelity. Check the notes as well. For unsupported PDF text, explain the limit and keep the editable PPTX available.

## Put the jury’s feedback on the slide it affects

After the first complete deck, run a clearly labeled **Simulated AI Jury**. The competition judge checks the event rules. The technical reviewer checks the mechanism and evidence. The narrative editor checks argument and ask. The presentation reviewer checks readability and delivery time. Reuse shared facts, avoid duplicate findings, and give meaningful issues priority over routine passes. A rule-based check should identify itself accurately when AI review is unavailable.

Each finding should quote the wording or point to the visual, name the slide, explain the consequence, and offer a concrete edit or request for evidence. Show **Current wording** and **Suggested wording** together. Let customers apply, dismiss, add evidence or undo. For example, a draft prediction of 40% less waste needs a baseline. One defensible replacement is “Compare leftovers on the same weekdays before and during the pilot.” Apply an accepted change to the deck and affected notes, recheck it and regenerate the export. Bind approvals to a deck version. At handoff, distinguish completed automated checks from items needing customer confirmation.

## Let the sample and checkout set accurate expectations

Improve Before Close slide by slide. Fix its weakest headline, busiest visual, least defensible claim and weakest transition or ending. Make one before-and-after edit inspectable from the homepage. Let visitors download the exact six-slide sample they preview. Use the same review and export path as a customer. Deliver the customer’s editable PPTX, supported PDF, speaker notes, requirement checklist and likely jury questions grounded in their deck.

Before payment, state the total price, included revisions, available formats, retrieval window and failure recovery supported by the service. Keep the legacy community pilot clearly identified. Use a server-backed paid generation path so the paying customer can proceed without supplying an AI key. Make clear what project material leaves the device. Verify payment with the provider on the server and tie it to one recoverable order. Handle pending and duplicate events, closed tabs, interrupted work and a return on another device. Protect access to each customer’s deck. Exercise payments in sandbox mode and enable live sales only when the paid service, credentials and terms are ready.

## Demonstrate completion

1. Run `npm run build` and the repository’s relevant checks. Walk the full customer path with keyboard and touch at 360, 768 and 1440 px. Check text zoom, focus after dialogs close and long project titles.
2. Show both jury versions of the same sample slide with its notes and evidence. Compare one customer’s preview before and after an audience change. Open both the homepage sample download and a customer export.
3. Run a strict six-slide organizer brief, a partially unreadable upload and a project with an unsupported claim. Show how the customer resolves each issue and what appears in the file.
4. Accept and undo a jury fix. Reopen the PPTX and verify the approved wording and notes. Retry a failed slide while another slide contains a manual edit. Refresh during a sandbox order and retrieve the same order without a second charge.
5. Deliver the code changes, upgraded sample, representative desktop and mobile captures, exported files inspected, checks actually run, and exact dependencies still needed for live sales. Use creative judgment wherever it improves the customer’s ability to understand, edit or defend their pitch.
