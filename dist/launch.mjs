import './competition-picker.mjs';

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
        <div class="launch-actions"><a class="launch-primary" href="#try">Build my pitch ${icons.arrow}</a><a class="hero-review-link" href="#deck-review">Review my deck</a></div>
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
        <idea-editor class="field"></idea-editor>
        <div class="field"><label for="launch-problem">Who has the problem, and how do they handle it today?</label><textarea id="launch-problem" name="problem" rows="2" maxlength="700" required placeholder="Name the people affected, the current workaround and where it falls short."></textarea></div>
        <div class="field"><label for="launch-name">Project title</label><input id="launch-name" name="name" placeholder="e.g. Campus food recovery" required maxlength="80"></div>
        <details name="pitch-details"><summary>Competition &amp; judging</summary><competition-picker></competition-picker></details>
        <details name="pitch-details"><summary>Prototype &amp; evidence</summary>
        <div class="field"><label for="launch-approach">How does it work, and what can your team build? (optional)</label><textarea id="launch-approach" name="approach" rows="3" maxlength="1200" placeholder="Walk through two or three steps. Add what works today, what still needs building, and how you would deliver it."></textarea></div>
        <div class="field"><label for="launch-proof">What have you tested or learned? (optional)</label><textarea id="launch-proof" name="proof" rows="2" maxlength="800" placeholder="Add an observation, interview or test result. Include how many people or trials it covers, if known."></textarea></div>
        <div class="field"><label for="launch-source">Evidence source link (optional)</label><input id="launch-source" name="evidenceSource" type="url" maxlength="400" placeholder="https://…"></div>
        </details>
        <details name="pitch-details"><summary>Impact &amp; next steps</summary>
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

const formats = ['txt', 'md', 'docx', 'pptx', 'odt'];

async function readPart(entry, budget) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = entry.internalStream('uint8array');
    stream.on('data', chunk => {
      budget.left -= chunk.length;
      if (budget.left < 0) {
        stream.pause();
        reject(new Error('This document contains too much text. Upload a shorter brief.'));
      } else chunks.push(chunk);
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(new Blob(chunks).text()));
    stream.resume();
  });
}

async function readBrief(file) {
  if (file.size > 8 * 1024 * 1024) throw new Error('Choose a file under 8 MB.');
  const ext = file.name.split('.').pop().toLowerCase();
  if (!formats.includes(ext)) throw new Error('Choose a Word, PowerPoint, OpenDocument text, Markdown or plain text file.');
  if (ext === 'txt' || ext === 'md') return file.text();
  if (!window.JSZip) await import('./vendor/jszip.min.js');
  const zip = await window.JSZip.loadAsync(file);
  const parts = ext === 'pptx'
    ? zip.file(/^ppt\/slides\/slide\d+\.xml$/).sort((a,b) => a.name.localeCompare(b.name, 'en', {numeric:true}))
    : [zip.file(ext === 'docx' ? 'word/document.xml' : 'content.xml')].filter(Boolean);
  if (!parts.length || parts.length > 100) throw new Error('Choose a readable document with up to 100 slides.');
  const budget = {left: 5 * 1024 * 1024};
  const lines = [];
  for (const part of parts) {
    const xml = new DOMParser().parseFromString(await readPart(part, budget), 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('The document text could not be read.');
    const paragraphs = Array.from(xml.getElementsByTagNameNS('*', 'p'));
    for (const p of paragraphs) {
      lines.push(ext === 'odt' ? p.textContent : Array.from(p.getElementsByTagNameNS('*', 't'), t => t.textContent).join(''));
    }
  }
  return lines.join('\n');
}

export function draftFromText(text) {
  const sentences = text.slice(0, 250000).split(/\r?\n|(?<=[.!?])\s+(?=[A-Z])/u)
    .map(s => s.replace(/^[#>*•\s-]+/, '').replace(/\s+/g,' ').trim())
    .filter(s => s.length >= 15 && !/^(?:https?:\/\/|table of contents|copyright\b)/i.test(s));
  const unique = Array.from(new Set(sentences));
  const signals = [
    /\b(solution|we (?:are building|built|propose|developed)|our (?:app|platform|project)|helps?|enables?)\b/i,
    /\b(problem|struggle|lack|cannot|difficulty|challenge|workaround)\b/i,
    /\b(prototype|tested|pilot|interviewed|measured|surveyed)\b/i
  ];
  const ranked = [...new Set([...signals.map(re => unique.find(s => re.test(s))).filter(Boolean), ...unique])];
  let draft = '';
  for (const sentence of ranked) {
    if (!draft && sentence.length > 600) return sentence.slice(0,599).replace(/\s+\S*$/, '') + '…';
    if ((draft + ' ' + sentence).trim().length <= 600) draft = (draft + ' ' + sentence).trim();
  }
  return draft;
}

export function refineIdea(value) {
  const seen = new Set();
  return value.trim().split(/\n+|(?<=[!?])\s+|(?<=\.)\s+(?=[A-Z])/u).map(line => {
    let s = line.trim().replace(/^[-*•]\s+/, '').replace(/\s+/g, ' ')
      .replace(/\bin order to\b/gi, 'to')
      .replace(/\bhas the ability to\b/gi, 'can')
      .replace(/\bdue to the fact that\b/gi, 'because')
      .replace(/\bat the present time\b/gi, 'now')
      .replace(/\bwe are planning to\b/gi, 'we plan to')
      .replace(/^our idea is (?:that )?we\b/i, 'We');
    return s.replace(/^[a-z]/, c => c.toUpperCase());
  }).filter(s => {
    const key = s.toLowerCase().replace(/[.!?]+$/, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join('\n');
}


if (typeof customElements !== 'undefined' && !customElements.get('idea-editor')) {
  customElements.define('idea-editor', class extends HTMLElement {
    connectedCallback() {
      if (this.childElementCount) return;
      this.innerHTML = `
        <div class="idea-heading">
          <label for="launch-idea">Your idea</label>
          <button type="button" data-import aria-describedby="idea-formats">Import notes</button>
          <input type="file" hidden accept=".docx,.pptx,.odt,.md,.txt">
        </div>
        <div class="idea-paper">
          <textarea id="launch-idea" name="solution" required maxlength="600" rows="3"
            placeholder="What are you building, and who will it help?" aria-describedby="launch-count"></textarea>
          <div class="idea-tools">
            <button type="button" data-refine disabled>Refine wording</button>
            <small id="launch-count">0 / 600</small>
          </div>
        </div>
        <small id="idea-formats">Import DOCX, PPTX, ODT, MD or TXT · 8 MB max · Private to this browser</small>
        <div class="idea-proposal" hidden>
          <strong></strong><p></p>
          <button type="button" data-use>Use suggestion</button>
          <button type="button" data-keep>Keep original</button>
        </div>
        <div class="idea-feedback"><span role="status"></span> <button hidden type="button" data-undo>Undo</button></div>`;
      const find = selector => this.querySelector(selector);
      const idea = find('textarea');
      const file = find('input');
      const proposal = find('.idea-proposal');
      const status = find('[role=status]');
      const undo = find('[data-undo]');
      const refine = find('[data-refine]');
      let revision = 0;
      let previous = '';
      let suggestion = '';
      let origin = refine;
      function reset() {
        revision++;
        proposal.hidden = true;
        undo.hidden = true;
        status.textContent = '';
        refine.disabled = !idea.value.trim();
      }
      function apply(value, message) {
        previous = idea.value;
        idea.value = value;
        idea.dispatchEvent(new Event('input', {bubbles:true}));
        status.textContent = message;
        undo.hidden = false;
        idea.focus();
      }
      function suggest(text, title, trigger) {
        suggestion = text;
        origin = trigger;
        proposal.querySelector('strong').textContent = title;
        proposal.querySelector('p').textContent = text;
        proposal.hidden = false;
        status.textContent = 'Suggestion ready to review.';
        find('[data-use]').focus();
      }
      idea.addEventListener('input',reset);
      refine.onclick = () => {
        reset();
        const text = refineIdea(idea.value);
        if (text && text !== idea.value) suggest(text, 'Suggested wording', refine);
        else status.textContent = 'Your wording is already concise. Could you add who will use it or what your team has tested?';
      };
      find('[data-import]').onclick = () => file.click();
      file.onchange = async () => {
        const chosen = file.files[0];
        if (!chosen) return;
        file.value = '';
        reset();
        const current = revision;
        status.textContent = 'Reading your notes…';
        try {
          const text = draftFromText(await readBrief(chosen));
          if (current !== revision || !this.isConnected) return;
          if (!text) throw new Error('No usable text found. Choose a file with selectable text.');
          if (!idea.value.trim()) apply(text, 'Notes added. You can edit them above.');
          else suggest(text, 'Idea from your notes', find('[data-import]'));
        } catch (error) {
          if (current === revision) status.textContent = /^(Choose|This document|No usable|The document)/.test(error.message) ? error.message : 'Could not read this file. Choose another file or paste your notes.';
        }
      };
      find('[data-use]').onclick = () => apply(suggestion, 'Suggestion applied.');
      find('[data-keep]').onclick = () => { reset(); origin.focus(); };
      undo.onclick = () => {
        idea.value = previous;
        idea.dispatchEvent(new Event('input', {bubbles:true}));
        status.textContent = 'Original text restored.';
        idea.focus();
      };
    }
  });
}
