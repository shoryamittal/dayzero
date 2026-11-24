import {readTemplate} from './template-bridge.mjs?v=review-2';
import {inspectSlide,buildReview,reviewMarkdown} from './review-engine.mjs';
import {reviewIntake,reviewIcon as icon} from './review-shell.mjs';
import {demoSlides,demoRules} from './review-demo.mjs';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const pad=n=>String(n).padStart(2,'0');
const states=new WeakMap();
const lenses=[['all','Everything'],['rules','Competition rules'],['evidence','Evidence'],['readability','Readability'],['clarity','Clarity & access']];
const sectionHeading=(kicker,title,extra='')=>`<div class="rv-section-head"><div><span class="rv-eyebrow">${kicker}</span><h3>${title}</h3></div>${extra}</div>`;
const statusTone=c=>['Over limit','Below minimum','Font mismatch'].includes(c.state)?'danger':c.state==='Within limit'?'good':'neutral';

function snippet(text,quote){
 const at=quote?text.indexOf(quote):-1;
 return at<0?esc(text):esc(text.slice(0,at))+'<mark>'+esc(quote)+'</mark>'+esc(text.slice(at+quote.length));
}
function findingCard(i,s,{compact=false}={}){
 const done=s.addressed.has(i.id);
 return `<article class="rv-finding ${done?'is-addressed':''}"><div class="rv-finding-meta"><span class="rv-badge ${i.severity==='priority'?'danger':'neutral'}">${i.severity==='priority'?'Fix first':'Review'}</span><span>${i.index?'SLIDE '+pad(i.index):'DECK RULE'} · ${esc(i.basis)}</span></div><h4>${esc(i.topic)}</h4><blockquote>${esc(i.quote)}</blockquote><p>${esc(i.action)}</p><div class="rv-finding-actions">${compact&&i.index?`<button type="button" class="rv-text-button" data-slide="${i.index}">Inspect slide ${pad(i.index)} ${icon('arrow',14)}</button>`:''}<label class="rv-checkbox"><input type="checkbox" data-address="${i.id}" ${done?'checked':''}><span>${done?'Marked addressed':'Mark addressed'}</span></label></div></article>`;
}
function overview(s){
 const m=s.model;
 const categories=[['Evidence','evidence'],['Rule breaches','rules'],['Readability','readability'],['Clarity & access','clarity']];
 return `<div class="rv-overview-grid"><section class="rv-priority-panel">${sectionHeading('YOUR NEXT BEST MOVES','Start here.',`<span class="rv-pill">${m.findings.length} action${m.findings.length===1?'':'s'}</span>`)}<p class="rv-section-copy">Work through the most important findings, then open each slide for the detail.</p>${m.findings.length?m.findings.slice(0,3).map(i=>findingCard(i,s,{compact:true})).join(''):'<div class="rv-empty">'+icon('check',28)+'<h4>No automatic flags surfaced.</h4><p>Check the original slides and the current organiser’s brief before submitting.</p></div>'}<button class="rv-button rv-secondary" type="button" data-view="plan">Open the complete action plan ${icon('arrow',17)}</button></section>
 <aside class="rv-overview-aside"><section class="rv-signal-card">${sectionHeading('A CLEARER PICTURE','Where to look.')}<p>Observations by review area</p>${categories.map(([title,lens])=>{const count=m.findings.filter(i=>i.lens===lens).length;return `<button class="rv-signal" type="button" data-lens-open="${lens}"><span>${title}</span><b>${pad(count)}</b><span class="rv-signal-track"><i style="width:${count?Math.max(6,count/Math.max(1,m.findings.length)*100):0}%"></i></span></button>`;}).join('')}<small>Counts describe findings. They are not a quality score or your chance of selection.</small></section>
 <section class="rv-round-card"><span class="rv-eyebrow">${s.stage==='demo'?'THE LIVE DEMO LENS':'THE FIRST-READ LENS'}</span><h3>${s.stage==='demo'?'Make the handoff<br>feel effortless.':'Can your opening<br>stand on its own?'}</h3><p>${s.stage==='demo'?'Find the moment where explaining becomes showing. Rehearse one action, its result, and a connection-free fallback.':'A screening judge may only have your slides. Can they identify the user, the problem and your proposed change from the opening?'}</p><button type="button" class="rv-text-button" data-view="slides">Read the opening slides ${icon('arrow',15)}</button></section></aside></div>`;
}
function slidesView(s){
 const m=s.model,slide=m.slides.find(x=>x.index===s.active)||m.slides[0];
 const issues=m.findings.filter(i=>i.index===slide.index&&(s.lens==='all'||i.lens===s.lens));
 const current=m.findings.find(i=>i.id===s.highlight&&i.index===slide.index)||issues[0];
 return `<div class="rv-slide-layout"><nav class="rv-slide-rail" aria-label="Slides in presentation order"><div class="rv-rail-top"><span class="rv-eyebrow">YOUR SLIDES</span><span>${pad(m.slides.length)}</span></div>${m.slides.map(item=>{const n=m.issues.filter(i=>i.index===item.index).length;return `<button class="rv-slide-pick ${item.index===slide.index?'is-active':''}" aria-pressed="${item.index===slide.index}" data-slide="${item.index}" type="button"><span class="rv-mini-slide"><small>${pad(item.index)}</small><strong>${esc(item.title)}</strong><i></i><i></i></span><span class="rv-slide-pick-meta"><b>Slide ${pad(item.index)}</b><span>${n?`${n} finding${n===1?'':'s'}`:'No flags'}${item.hidden?' · hidden':''}</span></span></button>`;}).join('')}</nav>
 <div class="rv-slide-main"><div class="rv-slide-heading"><div><span class="rv-eyebrow">SLIDE ${pad(slide.index)} / ${pad(m.slides.length)}</span><h3>${esc(slide.title)}</h3></div><div class="rv-slide-arrows"><button type="button" class="rv-icon-button" data-step="-1" aria-label="Previous slide" ${slide.index===m.slides[0].index?'disabled':''}>←</button><button type="button" class="rv-icon-button" data-step="1" aria-label="Next slide" ${slide.index===m.slides.at(-1).index?'disabled':''}>→</button></div></div>
 <div class="rv-outline"><div class="rv-outline-top"><span>${icon('deck',14)} EXTRACTED TEXT OUTLINE</span><span>${pad(slide.index)}</span></div><h4>${snippet(slide.title,current?.quote)}</h4><div>${slide.paragraphs.filter((p,n)=>!(n===0&&p===slide.title)).map(p=>`<p>${snippet(p,current?.quote)}</p>`).join('')||'<p>No editable body text found. Inspect images and diagrams in the original deck.</p>'}</div><div class="rv-outline-foot"><span>${esc(s.name.replace(/\.pptx$/i,''))}</span><span>${slide.count} editable words</span></div></div>
 <p class="rv-outline-note">${icon('eye',15)} Text outline, not the original slide layout. Check images, charts and placement in PowerPoint.</p>
 <div class="rv-slide-facts">${[[slide.count,'Editable words'],[slide.pictures,'Pictures'],[new Set(slide.runs.map(r=>r.font)).size,'Font declarations']].map(([n,label])=>`<div><strong>${n}</strong><span>${label}</span></div>`).join('')}</div>
 <details class="rv-type-details"><summary>Inspect text &amp; typography ${icon('chevron',14)}</summary><div class="rv-table-scroll"><table><thead><tr><th>Text</th><th>Declared font</th><th>Size</th></tr></thead><tbody>${slide.runs.map(r=>`<tr><td>${esc(r.text)}</td><td>${esc(r.font)}</td><td>${r.size?r.size+' pt':'Inherited'}</td></tr>`).join('')}</tbody></table></div><p>Inherited and theme styles need inspection in PowerPoint. Font declarations do not guarantee visual rendering.</p></details></div>
 <aside class="rv-inspector"><div class="rv-inspector-heading"><span class="rv-eyebrow">THE SECOND LOOK</span><h3>Slide observations <span>${issues.length}</span></h3></div><label class="rv-sr-only" for="review-lens">Filter findings</label><select id="review-lens">${lenses.map(([id,label])=>`<option value="${id}" ${s.lens===id?'selected':''}>${label}</option>`).join('')}</select>${issues.map(i=>findingCard(i,s)).join('')||'<div class="rv-empty"><h4>No findings in this view.</h4><p>Try another filter. A clear automated check still needs a human look at the original slide.</p></div>'}</aside></div>`;
}
function rulesView(s){return `${sectionHeading('THE BRIEF, MADE VISIBLE','Put every requirement in view.',`<button class="rv-button rv-secondary" type="button" data-edit-context>Edit review context</button>`)}<p class="rv-section-copy">Measured limits and possible wording matches are shown separately. A topic match does not verify that a requirement is satisfied.</p><div class="rv-rules-list">${s.model.checks.map(c=>`<article class="rv-rule-card"><div><span class="rv-badge ${statusTone(c)}">${esc(c.state)}</span><h4>${esc(c.rule)}</h4><p>${esc(c.detail)}</p></div>${c.slide?`<button type="button" class="rv-button rv-secondary" data-slide="${c.slide}">Inspect slide ${pad(c.slide)} ${icon('arrow',15)}</button>`:''}</article>`).join('')||'<div class="rv-empty"><h4>Your brief is missing.</h4><p>Add the current judging rubric or submission rules, then run the review again.</p><button type="button" class="rv-button rv-primary" data-edit-context>Add competition rules</button></div>'}</div>`;}
function planView(s){
 const done=s.model.findings.filter(i=>s.addressed.has(i.id)).length;
 return `${sectionHeading('FROM FEEDBACK TO FOLLOW-THROUGH','Your revision plan.',`<span class="rv-pill">${done} / ${s.model.findings.length} addressed</span>`)}<p class="rv-section-copy">Make changes in your original deck, then mark items addressed here. These marks are your checklist, not a fresh verification. Download it before leaving this session.</p><div class="rv-plan-filters">${lenses.map(([id,label])=>`<button type="button" aria-pressed="${s.lens===id}" data-plan-lens="${id}">${label} <span>${s.model.findings.filter(i=>id==='all'||i.lens===id).length}</span></button>`).join('')}</div><div class="rv-plan-list">${s.model.findings.filter(i=>s.lens==='all'||i.lens===s.lens).map(i=>findingCard(i,s,{compact:true})).join('')||'<div class="rv-empty"><h4>No actions in this area.</h4><p>Review the other areas and inspect the original slides before submitting.</p></div>'}</div>`;
}
function render(s){
 const m=s.model,report=s.report;
 report.innerHTML=`<div class="rv-results-header"><div><span class="rv-eyebrow"><i></i> ${s.demo?'FICTIONAL EXAMPLE REVIEW':'YOUR DECK, WITH FRESH EYES'}</span><h2>${esc(s.event||s.name.replace(/\.pptx$/i,''))}</h2><p>${esc(s.name)} <span>·</span> ${s.stage==='demo'?'Live demo':'Idea screening'} <span>·</span> ${m.slides.length} slides inspected</p></div><div class="rv-results-actions"><button type="button" class="rv-button rv-secondary" data-download>${icon('download',16)} Download report</button><button type="button" class="rv-button rv-primary" data-edit-context>Review another deck ${icon('arrow',16)}</button></div></div>
 <div class="rv-stale" role="status" hidden>Review settings changed. Run the review again to update these findings.</div>
 <div class="rv-summary"><div class="rv-summary-lead"><span>${icon('spark',20)} THE REVIEW SNAPSHOT</span><strong>${m.priority?'A few things to strengthen.':'Time for a closer look.'}</strong><p>${s.demo?'You are exploring a fictional example. Upload your deck for your own findings.':'Start with the priorities. Keep what works. Give every important claim something to stand on.'}</p></div>${[[m.priority,'Priority actions','Fix these first'],[m.affected+'/'+m.slides.length,'Slides with observations','Editable text & metadata'],[m.checks.length,'Rules supplied',m.checks.length?m.breaches.length+' measured breaches':'Add your organiser’s brief']].map(([n,label,detail])=>`<div class="rv-summary-stat"><strong>${n}</strong><span>${label}</span><small>${detail}</small></div>`).join('')}</div>
 <nav class="rv-view-nav" aria-label="Review views">${[['overview','Overview'],['slides','Slide review'],['rules','Rule check'],['plan','Action plan']].map(([id,label])=>`<button type="button" data-view="${id}" aria-pressed="${s.view===id}">${label}${id==='plan'?`<span>${m.findings.length}</span>`:''}</button>`).join('')}<span class="rv-session-status">${icon('shield',13)} Browser-only review</span></nav>
 <div class="rv-view-content">${s.view==='overview'?overview(s):s.view==='slides'?slidesView(s):s.view==='rules'?rulesView(s):planView(s)}</div>
 <details class="rv-coverage"><summary>What this review covers ${icon('chevron',14)}</summary><p>Checks inspect editable slide text, explicit Latin font settings, picture descriptions, hidden slides and stored object bounds. Wording matches are candidate evidence. Inherited styles, rendered layout, charts, factual accuracy, colour contrast and organiser decisions need human review. This review does not predict selection.${s.embeddedCount?' '+s.embeddedCount+' embedded attachment(s) skipped; check chart values against their workbooks.':''}</p><button type="button" class="rv-text-button" data-print>Print or save a full report as PDF ${icon('arrow',14)}</button></details>`;
 report.hidden=false;
}
function showReport({file,event='',rules='',slides,stage='screening',demo=false,embeddedCount=0}){
 const report=$('report');if(!report)return;
 const s={model:buildReview(slides,rules),report,name:file.name,event,stage,demo,embeddedCount,view:'overview',active:slides[0].index,lens:'all',addressed:new Set(),highlight:null};
 states.set(report,s);render(s);report.focus({preventScroll:true});report.scrollIntoView({behavior:'smooth',block:'start'});
}
function refreshFile(form){
 const file=form.querySelector('#file')?.files[0],name=form.querySelector('#review-file-name');
 if(!name)return;
 name.textContent=file?.name||'Drop your PowerPoint here';
 const meta=form.querySelector('#review-file-meta');meta.hidden=!file;meta.textContent=file?`${(file.size/1024/1024).toFixed(2)} MB · Click to choose a different file`:'';
 form.querySelector('.rv-upload').classList.toggle('has-file',!!file);
}
function editContext(){
 const form=$('intake');form?.scrollIntoView({behavior:'smooth',block:'center'});form?.querySelector('#file')?.focus({preventScroll:true});
}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-review-demo]')){showReport({file:{name:'CampusLoop — example.pptx'},event:'Campus innovation challenge',rules:demoRules,slides:demoSlides,stage:'screening',demo:true});return;}
 const report=e.target.closest('#report'),s=report&&states.get(report);if(!s)return;
 const button=e.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-edit-context')){editContext();return;}
 if(button.hasAttribute('data-download')){
  const text=reviewMarkdown(s.model,{...s,addressed:s.addressed}),url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=(s.name.replace(/\.pptx$/i,'').replace(/[^\p{L}\p{N}._ -]/gu,'').slice(0,90)||'deck')+'-review.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
 }
 if(button.hasAttribute('data-print')){window.print();return;}
 if(button.dataset.view){s.view=button.dataset.view;s.lens='all';}
 if(button.dataset.slide){s.active=Number(button.dataset.slide);s.view='slides';s.lens='all';}
 if(button.dataset.step){const at=s.model.slides.findIndex(x=>x.index===s.active);s.active=s.model.slides[Math.max(0,Math.min(s.model.slides.length-1,at+Number(button.dataset.step)))].index;}
 if(button.dataset.lensOpen){s.lens=button.dataset.lensOpen;s.view='plan';}
 if(button.dataset.planLens)s.lens=button.dataset.planLens;
 const focusKey=button.dataset.view?'[data-view="'+s.view+'"]':button.dataset.slide?'[data-slide="'+s.active+'"]':button.dataset.step?'[data-step="'+button.dataset.step+'"]':button.dataset.planLens?'[data-plan-lens="'+s.lens+'"]':'.rv-view-content';
 render(s);report.querySelector(focusKey)?.focus({preventScroll:true});
 if(!button.dataset.planLens)report.querySelector('.rv-view-nav')?.scrollIntoView({behavior:'smooth',block:'start'});
});
document.addEventListener('change',e=>{
 const s=states.get(e.target.closest('#report'));if(s&&e.target.dataset.address){e.target.checked?s.addressed.add(e.target.dataset.address):s.addressed.delete(e.target.dataset.address);const key=e.target.dataset.address;render(s);$('report').querySelector('[data-address="'+key+'"]')?.focus({preventScroll:true});return;}
 if(s&&e.target.id==='review-lens'){s.lens=e.target.value;render(s);$('review-lens')?.focus({preventScroll:true});return;}
 if(e.target.id==='file')refreshFile(e.target.form);
});
document.addEventListener('input',e=>{if(!e.target.closest('form#intake'))return;const stale=$('report')?.querySelector('.rv-stale');if(stale)stale.hidden=false;if($('status'))$('status').textContent='';});
for(const type of ['dragenter','dragover','dragleave','drop'])document.addEventListener(type,e=>{
 const drop=e.target.closest('#review-drop');if(!drop)return;e.preventDefault();
 drop.classList.toggle('is-dragging',type==='dragenter'||type==='dragover');
 if(type==='drop'&&e.dataTransfer?.files.length){if(e.dataTransfer.files.length!==1){$('status').textContent='Choose one PowerPoint at a time.';return;}const input=$('file');input.files=e.dataTransfer.files;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
});
document.addEventListener('submit',async e=>{
 if(!e.target.matches('form#intake'))return;e.preventDefault();const form=e.target,file=$('file').files[0],event=$('event').value.trim(),rules=$('rules').value,stage=$('round').value;
 const fields=Array.from(form.elements);fields.forEach(f=>f.disabled=true);const progress=$('review-progress');progress.hidden=false;form.setAttribute('aria-busy','true');$('status').classList.remove('is-error');
 const step=(n,text)=>{progress.dataset.step=n;$('status').textContent=text;};
 try{
  if(!file||!file.name.toLowerCase().endsWith('.pptx'))throw Error('Choose a .pptx file. Save older .ppt files as .pptx in PowerPoint.');
  if(file.size>8*1024*1024)throw Error('This deck is larger than 8 MB. Compress images in PowerPoint and try again.');
  step(1,'Opening your PowerPoint…');await new Promise(requestAnimationFrame);
  if(!window.JSZip)await import('./vendor/jszip.min.js');
  const slides=[];const template=await readTemplate(new Uint8Array(await file.arrayBuffer()),window.JSZip,(doc,index,canvas)=>{slides.push(inspectSlide(doc,index,canvas));step(2,'Inspecting slide '+index+' in presentation order…');},{reviewOnly:true});
  step(3,'Checking your brief and organising findings…');await new Promise(requestAnimationFrame);
  if(!form.isConnected)return;
  showReport({file,event,rules,slides,stage,embeddedCount:template.embeddedCount});step(3,'Your review is ready.');
 }catch(error){$('status').classList.add('is-error');$('status').textContent=error.message||'We could not read this deck. Save a fresh .pptx copy and try again.';}
 finally{fields.forEach(f=>f.disabled=false);progress.hidden=true;form.removeAttribute('aria-busy');}
});
let printState;
window.addEventListener('beforeprint',()=>{const report=$('report'),s=report&&states.get(report);if(!s)return;printState={report,html:report.innerHTML};report.innerHTML=`<div class="rv-print-report"><h1>${esc(s.demo?'Example deck review':s.name)}</h1><pre>${esc(reviewMarkdown(s.model,{...s,addressed:s.addressed}))}</pre></div>`;});
window.addEventListener('afterprint',()=>{if(printState){printState.report.innerHTML=printState.html;printState=null;}});
const mount=document.querySelector('[data-review-mount]');if(mount)mount.innerHTML=reviewIntake({standalone:true});
