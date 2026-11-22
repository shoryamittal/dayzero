
export function launchPage({deck, draft, icons, hasProjects}) {
  const steps = [
    ['01','event','Set the context','Find your event and keep the organizer’s requirements beside your draft.','Explore events','events'],
    ['02','deck','Shape the story','Turn a rough idea into six sections. Attach source notes to the claims you’ll make.','Start a draft','try'],
    ['03','mic','Prepare to present','Rehearse with a timer, then download an editable PowerPoint and your submission checklist.','Start a draft','try']
  ];
  const questions = [
    ['What do I get?','An editable PowerPoint with six sections and speaker notes, plus a PDF preview where the text is supported. The export kit also includes your report and a project backup.'],
    ['Where is my draft saved?','In this browser. Drafts expire 24 hours after the last edit, checked when you reopen PitchViva. Export a project backup to keep it or move it to another device.'],
    ['Can I use my organizer’s template?','Yes, if it is a supported PPTX. Use Official template to map your text into the organizer’s slides. Check the rules and review the exported layout before submitting.'],
    ['Do I need an account or an API key?','You can build and export a pitch without an account or key. The optional Gemini tools require your own API key and ask before sending project text.']
  ];
  return `<section class="launch-hero">
    <div class="launch-hero-inner launch-width">
      <div class="launch-copy">
        <p class="launch-kicker"><span></span> THE HACKATHON PITCH STUDIO</p>
        <h1>Build a pitch<br> worth <em>presenting.</em></h1>
        <p class="launch-lede">Turn your project into an editable PowerPoint. Shape each slide around what your judges are looking for.</p>
        <div class="launch-actions"><a class="launch-primary" href="#try">Build my pitch ${icons.arrow}</a></div>
        <p class="launch-meta">${icons.shield} Free to start. Your draft stays in this browser.</p>
      </div>
    </div>
    <div class="launch-strip launch-width" aria-label="What the studio makes">
      <span><b>01</b> Editable PowerPoint</span><span><b>02</b> Evidence &amp; event rules</span><span><b>03</b> Rehearsal &amp; export kit</span>
    </div>
  </section>
  <section id="deck-review" class="launch-lab launch-width" aria-labelledby="deck-review-title"><div class="launch-section-heading"><div><p class="launch-kicker"><span></span> REVIEW YOUR DECK</p><h2 id="deck-review-title">Review your <em>hackathon deck.</em></h2></div><p>Upload your PowerPoint to check your slides against the judging criteria and see what to fix first.</p></div><form id="intake" class="launch-form home-review-form"><label for="file">Your PowerPoint</label><input type="file" id="file" accept=".pptx" required><small>1–40 slides · up to 8 MB · processed in your browser</small><label for="event">Competition name <small>(optional)</small></label><input id="event" maxlength="160" placeholder="Your hackathon or track"><label for="round">Which round are you preparing for?</label><select id="round"><option value="screening">Idea screening · judges read the deck</option><option value="demo">Live demo · team presents to judges</option></select><label for="rules">Judging criteria and submission rules</label><textarea id="rules" maxlength="6000" rows="4" placeholder="One requirement per line, for example:&#10;Maximum 8 slides&#10;Minimum font size 18 pt&#10;Show evidence of user testing"></textarea><small>Leave blank for a general review. Use English for wording and rule matching.</small><button id="submit" class="launch-primary">Analyze my deck →</button><p role="status" id="status"></p></form><section id="report" tabindex="-1" hidden></section></section>
  <section class="launch-lab launch-width" id="try" aria-labelledby="try-title">
    <div class="launch-section-heading"><div><p class="launch-kicker"><span></span> START YOUR PITCH</p><h2 id="try-title">What are you <em>building?</em></h2></div><p>Start with the idea you’d explain to a teammate. Your slide preview takes shape as you write.</p></div>
    <div class="launch-lab-grid">
      <form id="launch-draft" class="launch-form">
        <div class="field"><label for="launch-idea">Your idea</label><textarea id="launch-idea" name="solution" placeholder="We’re building a way for…" rows="3" required maxlength="600" aria-describedby="launch-count"></textarea><small id="launch-count">0 / 600</small></div>
        <div class="field"><label for="launch-problem">Who has the problem, and how do they handle it today?</label><textarea id="launch-problem" name="problem" rows="2" maxlength="700" required placeholder="Name the people affected, the current workaround and where it falls short."></textarea></div>
        <div class="field"><label for="launch-name">Project title</label><input id="launch-name" name="name" placeholder="e.g. Campus food recovery" required maxlength="80"></div>
        <details><summary>Competition and judging rules (optional)</summary>
        <div class="field"><label for="launch-event">Competition or event (optional)</label><input id="launch-event" name="event" maxlength="160" autocomplete="off" placeholder="Search by name, or enter your own event"><div class="event-intake-matches" aria-live="polite"></div></div>
        <div class="field"><label for="launch-deadline">Submission date (optional)</label><input type="date" id="launch-deadline" name="deadline"></div><div class="field"><label for="launch-round">Round or track (optional)</label><input id="launch-round" name="eventRound" maxlength="160" placeholder="For example, qualifying round, finals, or social impact track"></div>
        <div class="field"><label for="launch-rules">Official rubric and submission rules (optional)</label><textarea id="launch-rules" name="rules" rows="3" maxlength="10000" placeholder="Paste the track, judging criteria and weights, required sections, slide limit, format, and template link if available."></textarea></div>
        </details>
        <details><summary>Prototype, evidence and next steps (optional)</summary>
        <div class="field"><label for="launch-approach">How does it work, and what can your team build? (optional)</label><textarea id="launch-approach" name="approach" rows="3" maxlength="1200" placeholder="Walk through two or three steps. Add what works today, what still needs building, and how you would deliver it."></textarea></div>
        <div class="field"><label for="launch-proof">What have you tested or learned? (optional)</label><textarea id="launch-proof" name="proof" rows="2" maxlength="800" placeholder="Add an observation, interview or test result. Include how many people or trials it covers, if known."></textarea></div>
        <div class="field"><label for="launch-source">Evidence source link (optional)</label><input id="launch-source" name="evidenceSource" type="url" maxlength="400" placeholder="https://…"></div>
        <div class="field"><label for="launch-impact">What result would show it works? (optional)</label><textarea id="launch-impact" name="impact" rows="2" maxlength="800" placeholder="Name what you would measure, what you would compare it with, and your target if you have one."></textarea></div>
        <div class="field"><label for="launch-ask">What decision or support do you need next? (optional)</label><textarea id="launch-ask" name="ask" rows="2" maxlength="600" placeholder="For example, permission to run a pilot, a partner, or funding for a specific next step."></textarea></div>
        </details>
        <button type="submit" class="launch-primary">Create editable deck ${icons.arrow}</button>
      </form>
      <div class="launch-output">
        <div class="launch-output-label"><span><i></i> LIVE DRAFT BOARD</span><span>WORKING DRAFT</span></div>
        <div id="launch-draft-preview">${draft}</div>
        <p>Your answers shape the story, the evidence you can show, and the next step you ask for. Add the current rubric so the draft can address what judges look for.</p>
      </div>
    </div>
  </section>
  <section class="launch-how launch-width" id="workflow" aria-labelledby="workflow-title">
    <div class="launch-section-heading"><div><p class="launch-kicker"><span></span> FROM IDEA TO SUBMISSION</p><h2 id="workflow-title">Everything in <em>one workspace.</em></h2></div><p>Your story, source notes, event requirements, and rehearsal stay with the same project.</p></div>
    <div class="launch-steps">${steps.map(([number,icon,title,detail,action,target])=>`<article><div class="launch-step-top"><span>${number}</span>${icons[icon]}</div><h3>${title}</h3><p>${detail}</p>${target==='events'? `<button class="launch-text-action" data-route="events">${action} ${icons.arrow}</button>` : `<a class="launch-text-action" href="#${target}">${action} ${icons.arrow}</a>`}</article>`).join('')}</div>
  </section>
  <section class="launch-faq launch-width" aria-labelledby="faq-title">
    <div><p class="launch-kicker"><span></span> BEFORE YOU START</p><h2 id="faq-title">Know what<br>you’re <em>getting.</em></h2></div>
    <div class="launch-answers">${questions.map(([question,answer])=>`<details><summary>${question}<span aria-hidden="true">+</span></summary><p>${answer}</p></details>`).join('')}</div>
  </section>
  <section class="launch-end launch-width"><div><h2>Bring the idea.<br><em>Build the pitch.</em></h2><p>Start with the problem and what your solution changes.</p></div><a class="launch-primary" href="#try">Build my pitch ${icons.arrow}</a>${hasProjects?'<button class="launch-secondary" data-route="projects">Open my projects</button>':''}</section>`;
}
