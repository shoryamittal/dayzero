import {readBrief} from './launch.mjs?v=pitch-flow-2';
import {sections} from './assist-model.mjs';

export function compareReference(project, text) {
  const words=value=>String(value||'').trim().split(/\s+/).filter(Boolean).length;
  const draft=sections.map(key=>project[key]||'').join('\n');
  const signals={Problem:/\b(problem|challenge|struggle)\b/i,Solution:/\b(solution|helps|platform|app)\b/i,Evidence:/\b(tested|interview|pilot|results|measured)\b/i,Impact:/\b(impact|reduce|improve|benefit)\b/i};
  return {referenceWords:words(text),draftWords:words(draft),rows:Object.entries(signals).map(([label,pattern])=>({label,reference:pattern.test(text),draft:pattern.test(draft)}))};
}

export function initWinnerReference({project,save,toast,render}) {
  document.addEventListener('change',async event=>{
    if(event.target.id!=='winner-deck-file')return;
    const file=event.target.files?.[0],active=project();
    if(!file||!active)return;
    event.target.value='';
    const status=document.querySelector('#winner-deck-status');
    status.textContent='Reading reference deck text…';
    try{
      const text=(await readBrief(file)).slice(0,16000);
      if(project()?.id!==active.id)return;
      if(!text.trim())throw Error('Choose a deck with selectable text.');
      active.winnerReference={name:file.name.slice(0,160),text};
      await save();render();toast('Reference ready. Text comparison is available below.');
    }catch(error){if(status.isConnected)status.textContent=error.message||'Could not read this reference.';}
  });
}

export function winnerComparison(project,escape) {
  const reference=project.winnerReference;
  if(!reference)return '';
  const result=compareReference(project,reference.text);
  return `<h3>${escape(reference.name)}</h3><p>Your draft: ${result.draftWords} words · Reference: ${result.referenceWords} words</p><table><thead><tr><th>Text signal</th><th>Your draft</th><th>Reference</th></tr></thead><tbody>${result.rows.map(row=>`<tr><th>${row.label}</th><td>${row.draft?'Found':'Not found'}</td><td>${row.reference?'Found':'Not found'}</td></tr>`).join('')}</tbody></table><p>This compares wording signals only. It does not verify winner status, factual quality, slide design or competition compliance. AI can use the reference as a structure example when you choose to send it.</p>`;
}
