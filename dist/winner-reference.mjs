import {readBrief} from './launch.mjs?v=pitch-flow-2';
import {sections} from './assist-model.mjs';
import {validSource} from './event-engine.mjs';
import {externalIntegrationsEnabled} from './integration-policy.mjs';

let previousReference;

export function referenceFromText({name = '', text = '', source = ''} = {}) {
  const content = (typeof text==='string'?text:'').replace(/\0/g, '').trim().slice(0,16000);
  if (!content) throw Error('Paste reference text or choose a file with selectable text.');
  const href = typeof source==='string'?source.trim():'';
  if (href && !validSource(href)) throw Error('Use a full https:// reference URL, or leave the source blank.');
  return {name:(typeof name==='string'?name:'').replace(/\0/g,'').trim().slice(0,160)||'Team-supplied reference',text:content,source:validSource(href)};
}

export function compareReference(project, text) {
  const words=value=>String(value||'').trim().split(/\s+/).filter(Boolean).length;
  const draft=sections.map(key=>project[key]||'').join('\n');
  const signals={Problem:/\b(problem|challenge|struggle)\b/i,Solution:/\b(solution|helps|platform|app)\b/i,Evidence:/\b(tested|interview|pilot|results|measured)\b/i,Impact:/\b(impact|reduce|improve|benefit)\b/i};
  return {referenceWords:words(text),draftWords:words(draft),rows:Object.entries(signals).map(([label,pattern])=>({label,reference:pattern.test(text),draft:pattern.test(draft)}))};
}

export function initWinnerReference({project,save,toast,render}) {
  let revision=0;
  document.addEventListener('input',event=>{if(event.target.closest('#winner-reference-form'))revision++;});
  document.addEventListener('submit',async event=>{
    if(event.target.id!=='winner-reference-form')return;
    event.preventDefault();
    const active=project();if(!active)return;
    const status=event.target.querySelector('[role=status]');
    try{
      const fields=new FormData(event.target);
      const next=referenceFromText({name:fields.get('referenceName'),text:fields.get('referenceText'),source:fields.get('referenceSource')});
      previousReference={id:active.id,value:active.winnerReference?structuredClone(active.winnerReference):null};
      active.winnerReference=next;const started=++revision;
      if(await save()===false){if(status.isConnected)status.textContent='Reference kept in this tab only. Export a project backup before reloading.';return;}
      if(project()===active&&started===revision&&status.isConnected){
        render();toast('Reference saved locally. It is a structure example, not evidence for your project.');
      }
    }catch(error){if(status.isConnected)status.textContent=error.message;}
  });
  document.addEventListener('change',async event=>{
    if(event.target.id!=='winner-deck-file')return;
    const file=event.target.files?.[0],active=project();
    if(!file||!active)return;
    event.target.value='';
    const status=document.querySelector('#winner-deck-status');
    status.textContent='Reading reference deck text…';
    const started=++revision,original=JSON.stringify(active.winnerReference);
    try{
      const text=(await readBrief(file)).slice(0,16000);
      if(project()?.id!==active.id)return;
      if(started!==revision||JSON.stringify(active.winnerReference)!==original){
        if(status.isConnected)status.textContent='Your reference changed while the file was being read. Your latest text was kept. Import the file again if needed.';
        return;
      }
      const next=referenceFromText({name:file.name,text});
      previousReference={id:active.id,value:active.winnerReference?structuredClone(active.winnerReference):null};
      active.winnerReference=next;
      if(await save()===false){if(status.isConnected)status.textContent='Reference kept in this tab only. Export a project backup before reloading.';return;}
      if(project()===active&&started===revision&&status.isConnected){
        render();toast('Reference ready. Text comparison is available below.');
      }
    }catch(error){if(status.isConnected)status.textContent=error.message||'Could not read this reference.';}
  });
  document.addEventListener('click',async event=>{
    const remove=event.target.closest('[data-reference-remove]'),undo=event.target.closest('[data-reference-undo]');
    if(!remove&&!undo)return;
    const active=project();if(!active)return;
    if(remove){
      if(!active.winnerReference)return;
      previousReference={id:active.id,value:structuredClone(active.winnerReference)};
      active.winnerReference=null;
    }else{
      if(previousReference?.id!==active.id)return;
      active.winnerReference=previousReference.value;
      previousReference=undefined;
    }
    const anchor=remove||undo,started=++revision;
    if(await save()===false)return;
    if(project()===active&&started===revision&&anchor.isConnected){
      render();toast(remove?'Reference removed. You can undo this change.':'Previous reference restored.');
    }
  });
}

export function winnerReferencePanel(project,escape) {
  const reference=project.winnerReference;
  return `<section class="panel"><span class="eyebrow">REFERENCE MATERIAL · OPTIONAL</span><h3>Learn from structure, keep your own facts.</h3>
    <p>Add a published pitch or reference notes. These checks compare text signals only; they do not verify winner status. Reference achievements never count as your project’s evidence.</p>
    <details${reference?' open':''}><summary>${reference?'Review your saved reference':'Add or import a reference'}</summary>
      <div class="field"><label for="winner-deck-file">Import reference text</label><input id="winner-deck-file" type="file" accept=".pptx,.docx,.odt,.md,.txt"><p class="hint">PPTX, DOCX, ODT, Markdown or TXT · 8 MB max · first 16,000 text characters · read only in this browser.</p><p id="winner-deck-status" role="status"></p></div>
      <form id="winner-reference-form">
        <div class="field"><label for="reference-name">Reference title</label><input id="reference-name" name="referenceName" maxlength="160" value="${escape(reference?.name||'')}"></div>
        <div class="field"><label for="reference-source">Source link <small>optional</small></label><input id="reference-source" name="referenceSource" type="url" maxlength="1000" placeholder="https://…" value="${escape(reference?.source||'')}"><p class="hint">Saved for your records. The page is not opened or verified.</p></div>
        <div class="field"><label for="reference-text">Reference text</label><textarea id="reference-text" name="referenceText" rows="5" maxlength="16000" required>${escape(reference?.text||'')}</textarea></div>
        <button class="btn" type="submit">Save reference and compare</button><p role="status"></p>
      </form>
      ${winnerComparison(project,escape)}
    </details>
    <div class="toolbar">${reference?'<button class="btn text" data-reference-remove>Remove reference</button>':''}${previousReference?.id===project.id?'<button class="btn text" data-reference-undo>Undo reference change</button>':''}</div>
  </section>`;
}

export function winnerComparison(project,escape) {
  const reference=project.winnerReference;
  if(!reference)return '';
  const result=compareReference(project,reference.text),source=validSource(reference.source);
  return `<h3>${escape(reference.name)}</h3>${source?`<p><a href="${escape(source)}" target="_blank" rel="noopener noreferrer">Open team-supplied source</a></p>`:''}<p>Your draft: ${result.draftWords} words · Reference: ${result.referenceWords} words</p><table><thead><tr><th>Text signal</th><th>Your draft</th><th>Reference</th></tr></thead><tbody>${result.rows.map(row=>`<tr><th>${row.label}</th><td>${row.draft?'Found':'Not found'}</td><td>${row.reference?'Found':'Not found'}</td></tr>`).join('')}</tbody></table><p>This compares wording signals only. It does not verify winner status, factual quality, slide design or competition compliance. ${externalIntegrationsEnabled()?'AI can use the reference as a structure example when you choose to send it.':'Live AI analysis is pending. This comparison stays in your browser.'}</p>`;
}
