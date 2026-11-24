const $=id=>document.getElementById(id);
const API=location.hostname==='dayzero-pitch-studio.onrender.com'?'https://pitchviva-deck-workspace.onrender.com/backend':'/backend';
const storageKey='pitchviva-deck-workspace-v5';
let job=null,workspace=crypto.randomUUID(),polling=false,records=[],selectedRecord=null,createKey=crypto.randomUUID(),createPayload='',jobMissing=false;
const fields=['name','organizer','year','round','track','topic','audience','notes','supplied-rules'];
function status(message){$('status').textContent=message}
function persist(){
 const draft={version:1,workspace,job,form:Object.fromEntries(fields.map(id=>[id,$(id).value])),createKey,createPayload};
 try{sessionStorage.setItem(storageKey,JSON.stringify(draft))}catch{status('Browser storage is unavailable. Download a draft backup to keep your edits.')}
}
function restore(draft){
 if(draft?.version!==1||typeof draft.workspace!=='string'||!draft.form)throw Error('Unsupported draft backup.');
 workspace=draft.workspace;job=draft.job||null;createKey=draft.createKey||crypto.randomUUID();createPayload=draft.createPayload||'';
 for(const id of fields)if(typeof draft.form[id]==='string')$(id).value=draft.form[id];
 if(job){showJob();showSlides()}
}
try{const saved=sessionStorage.getItem(storageKey);if(saved){restore(JSON.parse(saved));status('Draft restored in this tab. Enter the access token to reconnect.')}}catch{status('The saved draft could not be restored. You can import a backup or create a new draft.')}
async function request(path,method='GET',body,extra={}){
 if(!$('token').value.trim())throw Error('Enter your workspace access token first.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
 try{
  const r=await fetch(API+path,{method,signal:controller.signal,headers:{Authorization:'Bearer '+$('token').value.trim(),'X-Workspace':workspace,'Content-Type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body)});
  if(!r.ok){let e;try{e=await r.json()}catch{e={detail:'Server returned '+r.status}}const error=Error(typeof e.detail==='string'?e.detail:JSON.stringify(e.detail));error.status=r.status;throw error}
  return r;
 }catch(e){
  if(e.name==='AbortError'||e instanceof TypeError)throw Error('Connection interrupted. Your draft is preserved. Reconnect or retry to check the saved job.');
  throw e;
 }finally{clearTimeout(timer)}
}
async function json(path,method,body,headers){return(await request(path,method,body,headers)).json()}
function button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>action().catch(e=>status(e.message));return b}
function sourceLink(url,label){
 const a=document.createElement('a');a.textContent=label;
 try{const u=new URL(url);if(u.protocol==='https:'){a.href=u.href;a.target='_blank';a.rel='noopener noreferrer'}}catch{}
 return a;
}
function eventInfo(record){
 const box=$('event-info');$('event-sources').replaceChildren();
 if(!record){box.textContent='Manual entry. The organizer, edition, round, track and supplied rules require verification.';return}
 box.textContent=record.coverage+' Registration: '+record.registration.replaceAll('_',' ')+'. Track: '+(record.track||'not specified')+'.';
 for(const source of record.sources){
  const p=document.createElement('p');p.append(sourceLink(source.url,'Organizer source'),document.createTextNode(' · checked '+source.checked_on+' · verified fields: '+source.verified_fields.join(', ')));$('event-sources').append(p);
 }
}
function filterRecords(){
 const current=$('event-record').value,q=$('event-search').value.toLowerCase();
 $('event-record').replaceChildren(new Option('Enter competition details manually',''));
 for(const r of records)if([r.name,r.organizer,r.year,r.round,r.track].join(' ').toLowerCase().includes(q))$('event-record').add(new Option(r.name+' · '+r.year+' · '+r.round+' · '+(r.track||'track not specified'),r.id));
 $('event-record').value=current;
}
async function loadRecords(){
 const data=await json('/competitions/catalog');records=data.records;filterRecords();
 selectedRecord=records.find(r=>['name','organizer','round','track'].every(k=>r[k]===$(k).value)&&r.year===Number($('year').value))||null;
 if(selectedRecord)$('event-record').value=selectedRecord.id;eventInfo(selectedRecord);
}
$('event-search').oninput=filterRecords;
$('event-record').onchange=()=>{
 selectedRecord=records.find(r=>r.id===$('event-record').value)||null;
 if(selectedRecord)for(const k of ['name','organizer','year','round','track'])$(k).value=selectedRecord[k];
 eventInfo(selectedRecord);persist();
};
for(const id of fields)$(id).addEventListener('input',()=>{
 if(['name','organizer','year','round','track'].includes(id)){selectedRecord=null;$('event-record').value='';eventInfo(null)}
 persist();
});
function showJob(){
 $('choices').hidden=false;$('options').replaceChildren();$('rules').replaceChildren();
 const verification=job.profile.verification||{status:'manual_unverified',sources:[]};
 const lead=document.createElement('p');lead.textContent=verification.status==='reviewed_source_record'?verification.coverage:'Manual competition identity. Verify the organizer brief before submitting.';$('rules').append(lead);
 for(const src of verification.sources||[]){const p=document.createElement('p');p.append(sourceLink(src.url,'Source checked '+src.checked_on));$('rules').append(p)}
 for(const r of job.profile.rules){const p=document.createElement('p');p.textContent=r.kind.replaceAll('_',' ')+': '+r.value+' · '+r.status+' · ';p.append(sourceLink(r.source,r.source));$('rules').append(p)}
 if(!job.profile.rules.length){const p=document.createElement('p');p.textContent='Submission rules are unavailable. This remains an unverified draft.';$('rules').append(p)}
 const winners=job.profile.winner_references||[];
 if(winners.length){
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Past winning presentations';details.append(summary);
  for(const w of winners){const p=document.createElement('p');p.append(document.createTextNode(w.year+' · '+w.value+' · '),sourceLink(w.source,'Result source'));if(w.deck_url)p.append(document.createTextNode(' · '),sourceLink(w.deck_url,'Presentation'));details.append(p)}$('rules').append(details);
 }
 for(const o of job.options){
  const card=document.createElement('div');card.className='card'+(job.selected===o.id?' selected':'');
  const title=document.createElement('h2');title.textContent=o.template.replaceAll('-',' ');
  const info=document.createElement('p');info.textContent=o.palette.id+' · '+o.typography.id+' · '+o.slides.length+' slides';
  card.append(title,info,button('Use this design',async()=>{
   job=await json('/decks/'+job.id+'/draft','PUT',{revision:job.revision,option_id:o.id});
   persist();showJob();showSlides();status('Review your slides and fill every content slot.');
  }));$('options').append(card);
 }
 $('retry').hidden=!job.selected;
}
function showSlides(){
 if(!job.slides)return;$('review').hidden=false;$('slides').replaceChildren();
 job.slides.forEach((slide,i)=>{
  const article=document.createElement('article');article.className='card';const title=document.createElement('h2');title.textContent='Slide '+(i+1);article.append(title);
  function field(label,value,set,multi=false){
   const l=document.createElement('label');l.textContent=label;const x=document.createElement(multi?'textarea':'input');x.value=value||'';
   x.oninput=()=>{set(x.value);$('result').hidden=true;persist()};l.append(x);article.append(l);
  }
  field('Headline',slide.title,v=>slide.title=v);
  for(const b of slide.blocks){
   if(b.chart||b.table||b.icon){const note=document.createElement('p');note.textContent='This block contains a chart, table or icon. Its structured content is preserved.';article.append(note)}
   field(b.label||'Content',b.text,v=>{b.text=v;delete b.chart;delete b.table;delete b.icon},true);
  }
  field('Source',slide.source,v=>slide.source=v);$('slides').append(article);
 });
}
async function save(){
 if(!job?.selected)throw Error('Select a design first.');
 const desired=job.slides;persist();
 try{job=await json('/decks/'+job.id+'/draft','PUT',{revision:job.revision,option_id:job.selected,slides:desired});persist();status('Draft saved.')}
 catch(e){
  // A timed-out save may already be committed. Refresh its revision while preserving local edits.
  try{const fresh=await json('/decks/'+job.id);job={...fresh,slides:desired};persist()}catch{}
  throw e;
 }
}
async function results(){
 $('files').replaceChildren();
 for(const[k,path]of Object.entries(job.downloads))$('files').append(button('Download '+(k==='article'?'reading copy':k.toUpperCase()),async()=>{
  const r=await request(path),url=URL.createObjectURL(await r.blob()),a=document.createElement('a');
  a.href=url;a.download='presentation.'+(k==='article'?'html':k);a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }));
 $('checks').textContent=job.checks.pages+' pages checked. Font substitutions: '+JSON.stringify(job.checks.font_substitutions);
 $('result').hidden=false;status('Your presentation is ready. Download your files.');
}
async function monitor(){
 if(polling)return;polling=true;$('generate').disabled=$('save').disabled=true;
 try{
  let errors=0;
  while(['queued','rendering'].includes(job.status)){
   status(job.status==='queued'?'Queued. Your approved draft is saved.':'Rendering and checking the presentation. Your draft is saved.');
   await new Promise(r=>setTimeout(r,2000));
   try{job=await json('/decks/'+job.id);persist();errors=0}
   catch(e){if(++errors>=3)throw e;status('Connection interrupted. Rechecking the saved job…');await new Promise(r=>setTimeout(r,2000*errors))}
  }
  if(job.status==='failed'){status(job.reason+'\n'+(job.checks?.issues||[]).join('\n'));return}
  if(job.status==='ready')await results();
 }catch(e){status(e.message)}finally{polling=false;$('generate').disabled=$('save').disabled=false;$('retry').hidden=false}
}
$('brief').onsubmit=async e=>{
 e.preventDefault();if(polling)return;
 try{
  const supplied_rules=$('supplied-rules').value.split('\n').filter(x=>x.trim()).map(line=>{
   const [kind,value,...source]=line.split('|').map(s=>s.trim());
   if(!kind||!value||!source.join('|'))throw Error('Each supplied rule needs kind | value | source.');
   return {kind,value,source:source.join('|')};
  });
  const body={competition:Object.fromEntries(['name','organizer','round','track'].map(k=>[k,$(k).value.trim()])),topic:$('topic').value,audience:$('audience').value,notes:$('notes').value.split('\n').map(s=>s.trim()).filter(Boolean),supplied_rules};
  body.competition.year=Number($('year').value);
  const serialized=JSON.stringify(body),recoverPrevious=jobMissing&&serialized===createPayload;if(serialized!==createPayload){createKey=crypto.randomUUID();createPayload=serialized}persist();
  const previous=job;status('Finding compatible designs…');job=await json('/decks','POST',body,{'Idempotency-Key':createKey});persist();
  if(recoverPrevious&&previous?.slides&&previous.id!==job.id&&job.status==='choose_design'){
   const prior=previous.options.find(o=>o.id===previous.selected);
   const compatible=prior&&job.options.find(o=>o.slides.join('|')===prior.slides.join('|'));
   if(compatible){job=await json('/decks/'+job.id+'/draft','PUT',{revision:job.revision,option_id:compatible.id,slides:previous.slides});persist()}
  }
  jobMissing=false;$('review').hidden=$('result').hidden=true;showJob();showSlides();
  status(job.status==='blocked'?'Organizer requirement needs attention: '+job.reason:'Choose a design.');
 }catch(e){status(e.message)}
};
$('connect').onclick=async()=>{try{
 await loadRecords();
 if(job){
  const local=job.slides,oldRevision=job.revision;
  const fresh=await json('/decks/'+job.id);
  job=fresh.revision===oldRevision&&local?{...fresh,slides:local}:fresh;
  persist();showJob();showSlides();if(['queued','rendering'].includes(job.status))await monitor();else if(job.status==='ready')await results();else status('Connected. Your draft is available.');
 }else status('Connected. Select a reviewed competition record or enter the organizer details.');
}catch(e){jobMissing=e.status===404;status(e.message+(jobMissing?' Your server draft is unavailable. Find designs again to recreate it from this tab.':''))}};
$('save').onclick=()=>save().catch(e=>status(e.message));
$('generate').onclick=async()=>{if(polling)return;try{await save();job=await json('/decks/'+job.id+'/generate','POST',{revision:job.revision});persist();await monitor()}catch(e){status(e.message);$('retry').hidden=false}};
$('retry').onclick=async()=>{if(polling||!job)return;try{
 const local=job.slides;
 job=await json('/decks/'+job.id);persist();
 if(job.status==='failed'||job.status==='review'){
  if(local){job.slides=local;await save()}
  job=await json('/decks/'+job.id+'/generate','POST',{revision:job.revision});persist()
 }
 await monitor();
}catch(e){status(e.message)}};
$('backup').onclick=()=>{
 persist();const data=sessionStorage.getItem(storageKey);if(!data)return;
 const url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='pitchviva-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
};
$('restore').onchange=async e=>{try{
 const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw Error('The draft backup is too large.');
 const draft=JSON.parse(await file.text());restore(draft);persist();status('Draft backup restored. Connect to recover the server job, or create a fresh job if server storage was reset.');
}catch(e){status(e.message)}};
eventInfo(null);

// Project handoff stays in this origin until the user creates the server draft.
const handoffKey='pitchviva-project-handoff-v1';
try{
 const handoff=JSON.parse(sessionStorage.getItem(handoffKey)||'null');
 if(handoff?.version===1&&handoff.form){
  $('import-project').hidden=false;
  $('import-project').onclick=()=>{
   restore({version:1,workspace:crypto.randomUUID(),form:handoff.form});
   $('choices').hidden=$('review').hidden=$('result').hidden=true;
   eventInfo(null);persist();sessionStorage.removeItem(handoffKey);$('import-project').hidden=true;
   status('Project brief imported. Confirm the organizer, year, round and track, then find designs. Nothing has been sent to the server yet.');
  };
 }
}catch{}
