import {assistInput, sections, validateAssistResult} from './assist-model.mjs?v=competition-round-1';
import {analyze} from './engine.mjs';
import {challengeQuestions} from './preparation.mjs';
import {slideReadability} from './deck-design.mjs?v=competition-round-1';
import {externalIntegrationsEnabled, INTEGRATION_PENDING_MESSAGE} from './integration-policy.mjs';
import {createProjectSnapshot} from './project-history.mjs';
import {refineIdea} from './launch.mjs?v=pitch-flow-2';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const labels = {draft: 'Improve my pitch', review: 'Check my story', rules: 'Explain competition requirements'};
let api;
let output;
let pending = false;
let message = '';
let progress = '';
let direction = '';
let localOutput;
let localUndo;

// This is a conservative text transformation, not generated story content.
// Every suggestion is derived only from the team's existing section.
export function localWordingSuggestions(project) {
  return sections.flatMap(section => {
    const before = String(project?.[section] || '');
    const after = refineIdea(before);
    return before.trim() && before !== after ? [{
      section, before, after,
      reason: 'Remove repeated sentences, simplify stock phrases and normalize spacing. Review the wording before applying it.'
    }] : [];
  });
}

export function applyWordingSuggestion(project, suggestion) {
  if(!project || !suggestion || !sections.includes(suggestion.section) ||
    project[suggestion.section]!==suggestion.before || typeof suggestion.after!=='string')return false;
  project.history=[...(project.history||[]),createProjectSnapshot(project)].slice(-5);
  project[suggestion.section]=suggestion.after;
  project.checklist={...project.checklist,facts:false,files:false};
  if(project.slideReviews)delete project.slideReviews[suggestion.section];
  return true;
}

function localOutputMarkup(project) {
  if (localOutput?.id !== project.id) return '';
  const suggestions = localOutput.suggestions;
  const undo = localUndo?.id === project.id && project[localUndo.section] === localUndo.after;
  return `<section class="panel"><span class="eyebrow">LOCAL WORDING CHECK · NO AI REQUEST</span><h3>Small edits, your original facts.</h3>
    <p>These suggestions use simple wording rules. They do not add facts, research sources or infer a missing story.</p>
    ${suggestions.length ? suggestions.map((item, index) => {
      const current = project[item.section] === item.before;
      const applied = project[item.section] === item.after;
      return `<article class="requirement-card"><span class="eyebrow">${escape(item.section)}</span>
        <h4>Current wording</h4><p style="white-space:pre-wrap">${escape(item.before)}</p>
        <h4>Suggested wording</h4><p style="white-space:pre-wrap">${escape(item.after)}</p>
        <p>${escape(item.reason)}</p>
        ${current ? `<button class="btn" data-assist-local-apply="${index}">Apply to this section</button>` : `<p>${applied?'Suggestion applied.':'This section changed. Run the local check again.'}</p>`}</article>`;
    }).join('') : '<p>No wording changes suggested. Use the local content checks and rehearsal questions to decide what to improve next.</p>'}
    ${undo ? '<button class="btn" data-assist-local-undo>Undo last wording change</button>' : ''}
  </section>`;
}

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
  const connected = externalIntegrationsEnabled();
  return `<section class="prep-section-title"><span>WORKSPACE / WRITING ASSISTANT</span><h3>Draft, check, rehearse.</h3><p>Make the user benefit clear, explain how the product works, and strengthen the facts behind your story.</p></section>
    ${connected?'':`<div class="notice neutral"><strong>Live AI suggestions are pending.</strong><p>${escape(INTEGRATION_PENDING_MESSAGE)}</p></div>`}
    <div class="prep-split"><section class="panel">
      <h3>What would make this pitch stronger?</h3>
      <p>${connected?'Ask for a clearer product story, a sharper opening or a check against the requirements.':'Check your wording locally. Compare each proposed edit with the original and apply only the changes you want.'} Review suggestions before applying them.</p>
      <button class="btn primary" type="button" data-assist-local>Check wording locally</button>
      <p class="hint">Removes repeated sentences and simplifies common phrases. Your text stays in this browser. Each accepted edit can be undone.</p>
      <details${connected?' open':''}><summary>${connected?'AI writing options':'AI writing options · pending setup'}</summary>
      <div class="pitch-quick-prompts" aria-label="Suggested improvements">${['Make the user problem clear','Explain the product workflow','Strengthen the evidence'].map(label=>'<button type="button" class="btn small" data-assist-direction="'+escape(label)+'">'+label+'</button>').join('')}</div>
      <form id="assist-form" method="post">
        <div class="field"><label for="assist-mode">What do you want to work on?</label><select id="assist-mode" name="mode">${Object.entries(labels).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select></div>
        <div class="field"><label for="assist-direction">What would you like to improve? <small>(optional)</small></label><textarea id="assist-direction" maxlength="1000" rows="2" placeholder="Make it simpler, explain the prototype, or strengthen the opening.">${escape(direction)}</textarea></div>
        <details><summary>${connected?'See the text sent in an AI request':'Preview content for a future AI request'}</summary><pre id="assist-preview" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:20rem;overflow:auto">${escape(JSON.stringify(assistInput({...project,direction}, "draft"), null, 2))}</pre></details>
        <p class="disabled-note">${connected?'Requests send the displayed story and context to Google Gemini through our service. Google may use free-tier submissions to improve its products. Use material you can share.':'No AI request is sent in this release. Provider setup is deferred; your local check does not need an account or key.'}</p>
        <button class="btn primary" type="submit" ${pending || !connected ? 'disabled' : ''}>${!connected?'AI suggestions pending':pending ? 'Waiting for Gemini…' : 'Get suggestions ↗'}</button>
        <div class="assist-progress" aria-live="polite"><strong id="assist-status">${escape(message)}</strong><p id="assist-progress">${escape(progress)}</p></div>
      </form></details></section>
      <aside class="panel"><h3>Local review</h3><p>These checks run in your browser. Use them to improve your draft while you gather sources.</p>
        ${local.issues.length ? `<ul>${local.issues.map(issue => `<li><strong>${escape(issue.title)}</strong><p>${escape(issue.detail)}</p></li>`).join('')}</ul>` : '<p>The basic content checks pass. Review facts and organizer rules before submitting.</p>'}
        <h4>Practise these questions</h4><ul>${challengeQuestions(project).slice(0, 6).map(item => `<li>${escape(item.question)}</li>`).join('')}</ul>
      </aside></div>${localOutputMarkup(project)}${connected?visibleOutput(project):''}`;
}

export async function requestPitchAssist(project, mode) {
  if (!externalIntegrationsEnabled()) {
    message = 'AI suggestions pending';
    progress = INTEGRATION_PENDING_MESSAGE;
    return {status:'pending',message:INTEGRATION_PENDING_MESSAGE};
  }
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
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({mode, input}),
      signal: AbortSignal.timeout(32000)
    });
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw Error('The writing assistant is temporarily unavailable. Continue editing or try again later.');
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
    form.querySelector('#assist-preview').textContent=JSON.stringify(assistInput({...api.project(),direction},form.elements.mode.value),null,2);
  });
  document.addEventListener('change', event => {
    if (event.target.id !== 'assist-mode') return;
    const form = event.target.form;
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
    const mode = fields.get('mode');
    direction = form.querySelector('#assist-direction').value.trim();
    await requestPitchAssist(project, mode);
  });

  document.addEventListener('click', async event => {
    if(event.target.closest('[data-assist-local]')){
      const project = api.project();
      if(!project)return;
      localOutput={id:project.id,suggestions:localWordingSuggestions(project)};
      api.render();
      return;
    }
    const localApply=event.target.closest('[data-assist-local-apply]');
    if(localApply){
      const project=api.project(),item=localOutput?.suggestions[Number(localApply.dataset.assistLocalApply)];
      if(!project||localOutput.id!==project.id||!item||project[item.section]!==item.before)return;
      if(!applyWordingSuggestion(project,item))return;
      localUndo={id:project.id,...item};
      await api.save();api.render();return;
    }
    if(event.target.closest('[data-assist-local-undo]')){
      const project=api.project();
      if(!project||localUndo?.id!==project.id||project[localUndo.section]!==localUndo.after)return;
      if(!applyWordingSuggestion(project,{section:localUndo.section,before:localUndo.after,after:localUndo.before}))return;
      localUndo=undefined;
      await api.save();api.render();return;
    }
    const preset=event.target.closest('[data-assist-direction]');
    if(preset){const field=document.querySelector('#assist-direction');if(field){field.value=preset.dataset.assistDirection;field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();}return;}
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
    project.history = [...project.history, createProjectSnapshot(project)].slice(-5);
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

