import {assistInput, sections, validateAssistResult} from './assist-model.mjs?v=competition-round-1';
import {analyze} from './engine.mjs';
import {challengeQuestions} from './preparation.mjs';
import {slideReadability} from './deck-design.mjs?v=competition-round-1';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const labels = {draft: 'Draft a competition pitch', review: 'Review against the rubric', rules: 'Extract rule requirements'};
let api;
let output;
let pending = false;
let message = '';
let progress = '';
let direction = '';

export function initAssist(options) {
  api = options;
}

function visibleOutput(project) {
  if (!output || output.id !== project.id) return '';
  const {mode, result, input, model} = output;
  const current = JSON.stringify(assistInput({...project,direction}, mode)) === input;
  const draft = mode === 'draft' ? sections.map(key => `<article class="requirement-card"><span class="eyebrow">${key}</span><h4>${escape(result.headlines[key])}</h4><p style="white-space:pre-wrap">${escape(result.story[key])}</p></article>`).join('') : '';
  const fitIssues = mode === 'draft' ? slideReadability({...project, ...result.story, slideHeadlines: result.headlines}) : [];
  const findings = (result.findings || []).map(item => `<article class="requirement-card"><span class="eyebrow">${escape(item.section)}</span><blockquote>${escape(item.quote)}</blockquote><p>${escape(item.advice)}</p></article>`).join('');
  return `<section class="panel"><span class="eyebrow">GEMINI · ${escape(model)}</span><h3>${labels[mode]}</h3>
    <p>Review the wording and the source before using it. ${current ? '' : 'The project changed after this request.'}</p>
    ${draft}${findings || (mode !== 'draft' ? '<p>No findings with matching source quotes were returned.</p>' : '')}
    ${fitIssues.length ? `<h4>Readability checks</h4><ul>${fitIssues.map(item => `<li><strong>${item.section}</strong> ${item.detail}</li>`).join('')}</ul>` : ''}
    ${result.gaps.length ? `<h4>Information to check</h4><ul>${result.gaps.map(gap => `<li>${escape(gap)}</li>`).join('')}</ul>` : ''}
    <div class="toolbar">${mode === 'draft' && current ? '<button class="btn primary" data-assist-apply>Apply this draft and keep a version of my original</button>' : ''}
    <button class="btn" data-assist-download>Download result ↓</button></div></section>`;
}

export function assistStudio(project) {
  const local = analyze(project);
  return `<section class="prep-section-title"><span>WORKSPACE / AI STUDIO</span><h3>Draft, check, rehearse.</h3><p>Start with your own evidence. Use Gemini for a draft, practice feedback or a pass through pasted rules.</p></section>
    <div class="prep-split"><section class="panel">
      <h3>Run Gemini with your API key</h3>
      <p>AI Studio is hosted on <a href="https://dayzero-ivory.vercel.app/">Vercel</a>. Use a free-tier project in <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>. Your key is used for this request and is cleared when you submit.</p>
      <form id="assist-form" method="post">
        <div class="field"><label for="assist-mode">What do you want to work on?</label><select id="assist-mode" name="mode">${Object.entries(labels).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select></div>
        <div class="field"><label for="assist-direction">What would you like to improve? <small>(optional)</small></label><textarea id="assist-direction" maxlength="1000" rows="2" placeholder="Make it simpler, explain the prototype, or strengthen the opening.">${escape(direction)}</textarea></div>
        <div class="field"><label for="assist-key">Gemini API key</label><input id="assist-key" type="password" autocomplete="off" maxlength="200" required></div>
        <details><summary>See the text sent in an AI request</summary><pre id="assist-preview" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:20rem;overflow:auto">${escape(JSON.stringify(assistInput({...project,direction}, "draft"), null, 2))}</pre></details>
        <label class="check-label"><input type="checkbox" required name="consent"> Send the displayed text to Google Gemini. Google may use free-tier submissions to improve its products. Use material you can share.</label>
        <button class="btn primary" type="submit" ${pending ? 'disabled' : ''}>${pending ? 'Waiting for Gemini…' : 'Send to Gemini ↗'}</button>
        <div class="assist-progress" aria-live="polite"><strong id="assist-status">${escape(message)}</strong><p id="assist-progress">${escape(progress)}</p></div>
      </form></section>
      <aside class="panel"><h3>Local review</h3><p>These checks run in your browser. Use them to improve your draft while you gather sources.</p>
        ${local.issues.length ? `<ul>${local.issues.map(issue => `<li><strong>${escape(issue.title)}</strong><p>${escape(issue.detail)}</p></li>`).join('')}</ul>` : '<p>The basic content checks pass. Review facts and organizer rules before submitting.</p>'}
        <h4>Practise these questions</h4><ul>${challengeQuestions(project).slice(0, 6).map(item => `<li>${escape(item.question)}</li>`).join('')}</ul>
      </aside></div>${visibleOutput(project)}`;
}

export async function requestPitchAssist(project, mode, key) {
  if (pending) return;
  const input = assistInput({...project,direction}, mode);
  const id = project.id;
  pending = true;
  output = undefined;
  message = '1 / 3 · Preparing your idea and competition context';
  progress = 'Your selected rules, story and evidence are included. Missing facts stay marked as gaps.';
  if (document.querySelector('#assist-form')) api.render();
  try {
    message = mode==='draft'?'2 / 3 · Gemini is drafting your six-slide story':mode==='review'?'2 / 3 · Gemini is checking your story against the supplied rubric':'2 / 3 · Gemini is extracting requirements';
    progress = 'Waiting for the provider. Your existing slides stay unchanged until you apply the result.';
    document.querySelector('#assist-status') && (document.querySelector('#assist-status').textContent=message);
    document.querySelector('#assist-progress') && (document.querySelector('#assist-progress').textContent=progress);
    const response = await fetch('/api/assist', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'x-gemini-key': key},
      body: JSON.stringify({mode, input}),
      signal: AbortSignal.timeout(32000)
    });
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw Error('Open the Vercel site or run the local AI server to use Gemini.');
    }
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'The request failed.');
    if (api.project()?.id === id) {
      output = {id, mode, input: JSON.stringify(input), result: validateAssistResult(mode, data.result, input), model: data.model};
      message = '3 / 3 · Result checked and ready to review';
      progress = 'Response structure and text limits checked. Read the gaps below, then apply the draft when ready.';
    }
  } catch (error) {
    progress = 'Your original draft is safe. You can retry or continue editing.';
    message = error.name === 'TimeoutError' ? 'The request timed out. Try again or use the local review.' : error.message;
  } finally {
    pending = false;
    if (document.querySelector('#assist-form')) api.render();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('input', event => {
    if(event.target.id!=='assist-direction')return;
    direction=event.target.value.slice(0,1000);
    const form=event.target.form;
    form.elements.consent.checked=false;
    form.querySelector('#assist-preview').textContent=JSON.stringify(assistInput({...api.project(),direction},form.elements.mode.value),null,2);
  });
  document.addEventListener('change', event => {
    if (event.target.id !== 'assist-mode') return;
    const form = event.target.form;
    form.elements.consent.checked = false;
    form.querySelector('#assist-preview').textContent = JSON.stringify(assistInput({...api.project(),direction}, event.target.value), null, 2);
  });
  document.addEventListener('submit', async event => {
    if (event.target.id !== 'assist-form') return;
    event.preventDefault();
    if (pending) return;
    const project = api.project();
    if (!project) return;
    const form = event.target;
    const fields = new FormData(form);
    if (!fields.has('consent')) return;
    const mode = fields.get('mode');
    direction = form.querySelector('#assist-direction').value.trim();
    const keyField = form.querySelector('#assist-key');
    const key = keyField.value.trim();
    keyField.value = '';
    await requestPitchAssist(project, mode, key);
  });

  document.addEventListener('click', async event => {
    const apply = event.target.closest('[data-assist-apply]');
    const download = event.target.closest('[data-assist-download]');
    if (!apply && !download) return;
    const project = api.project();
    if (!output || output.id !== project?.id) return;
    if (download) {
      api.download(JSON.stringify({provider: 'Gemini', model: output.model, mode: output.mode, ...output.result}, null, 2));
      return;
    }
    if (output.mode !== 'draft' || JSON.stringify(assistInput({...project,direction}, output.mode)) !== output.input) return;
    project.history = [...project.history, {
      at: Date.now(),
      data: Object.fromEntries(sections.map(key => [key, project[key]])),
      slideHeadlines: {...project.slideHeadlines}
    }].slice(-5);
    for (const key of sections) {
      project[key] = output.result.story[key];
      project.slideHeadlines[key] = output.result.headlines[key];
    }
    project.checklist.facts = false;
    project.checklist.files = false;
    output = undefined;
    await api.save();
    message = 'Draft applied. Restore the previous version from Story studio if needed.';
    api.render();
  });
}

