export function launchPage({deck, draft, icons, hasProjects}) {
  const steps = [
    ['01','event','Set the context','Find your event and keep the organizer’s requirements beside your draft.','Explore events','events'],
    ['02','deck','Shape the story','Turn a rough idea into six sections. Attach source notes to the claims you’ll make.','Start a draft','try'],
    ['03','mic','Prepare to present','Rehearse with a timer, then download an editable PowerPoint and your submission checklist.','Open the sample','sample']
  ];
  const questions = [
    ['What do I get?','An editable PowerPoint with six sections and speaker notes, plus a PDF preview where the text is supported. The export kit also includes your report and a project backup.'],
    ['Where is my draft saved?','In this browser. Drafts expire 24 hours after the last edit, checked when you reopen Day-Zero. Export a project backup to keep it or move it to another device.'],
    ['Can I use my organizer’s template?','Yes, if it is a supported PPTX. Use Official template to map your text into the organizer’s slides. Check the rules and review the exported layout before submitting.'],
    ['Do I need an account or an API key?','You can build and export a pitch without an account or key. The optional Gemini tools require your own API key and ask before sending project text.']
  ];
  return `<section class="launch-hero">
    <div class="launch-hero-inner launch-width">
      <div class="launch-copy">
        <p class="launch-kicker"><span></span> THE PITCH STUDIO</p>
        <h1>Build a pitch<br>worth <em>presenting.</em></h1>
        <p class="launch-lede">Take a rough idea to an editable PowerPoint. Shape the story, back it with evidence, and rehearse before you walk into the room.</p>
        <div class="launch-actions"><a class="launch-primary" href="#try">Build my pitch ${icons.arrow}</a><a class="launch-secondary" href="#sample">See the sample</a></div>
        <p class="launch-meta">${icons.shield} Free to start. Your draft stays in this browser.</p>
      </div>
      ${deck}
    </div>
    <div class="launch-strip launch-width" aria-label="What the studio makes">
      <span><b>01</b> Editable PowerPoint</span><span><b>02</b> Evidence &amp; event rules</span><span><b>03</b> Rehearsal &amp; export kit</span>
    </div>
  </section>
  <section class="launch-lab launch-width" id="try" aria-labelledby="try-title">
    <div class="launch-section-heading"><div><p class="launch-kicker"><span></span> BUILD YOUR FIRST SLIDE</p><h2 id="try-title">Give your idea <em>a first draft.</em></h2></div><p>Enter a title and one sentence. The slide updates as you type, and you can carry it straight into the studio.</p></div>
    <div class="launch-lab-grid">
      <form id="launch-draft" class="launch-form">
        <div class="field"><label for="launch-name">Project title</label><input id="launch-name" name="name" placeholder="e.g. Campus food recovery" required maxlength="80"></div>
        <div class="field"><label for="launch-idea">What does your idea do?</label><textarea id="launch-idea" name="solution" placeholder="We help campus canteens offer unsold meals for pickup." rows="3" maxlength="260" aria-describedby="launch-count"></textarea><small id="launch-count">0 / 260</small></div>
        <fieldset class="launch-styles"><legend>Choose a look</legend>
          <label><input type="radio" name="template" value="electric" checked><span><i class="swatch-electric"></i> Electric</span></label>
          <label><input type="radio" name="template" value="noir"><span><i class="swatch-noir"></i> Noir</span></label>
          <label><input type="radio" name="template" value="signal"><span><i class="swatch-signal"></i> Signal</span></label>
        </fieldset>
        <button type="submit" class="launch-primary">Open my draft ${icons.arrow}</button>
        <button type="button" class="launch-text-action" data-action="new">Use the guided setup instead</button>
      </form>
      <div class="launch-output">
        <div class="launch-output-label"><span><i></i> LIVE SLIDE PREVIEW</span><span>02 / SOLUTION</span></div>
        <div id="launch-draft-preview">${draft}</div>
        <p>Keep editing in the studio. Export when the story is ready.</p>
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
  <section class="launch-end launch-width"><div><h2>Bring the idea.<br><em>Build the pitch.</em></h2><p>Your first draft can be one sentence.</p></div><a class="launch-primary" href="#try">Build my pitch ${icons.arrow}</a>${hasProjects?'<button class="launch-secondary" data-route="projects">Open my projects</button>':''}</section>`;
}
