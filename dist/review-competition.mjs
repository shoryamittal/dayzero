import {catalogSearch,searchPublicEvents} from './event-engine.mjs?v=pitchviva-1';
import {aiCall} from './deep-review-client.mjs';
let connection;
const mounted=new WeakSet(),searches=new WeakMap(),imports=new WeakMap();
const field=(form,id)=>form.querySelector('#'+id);
const add=(parent,tag,text)=>{const node=document.createElement(tag);node.textContent=text;parent.append(node);return node;};
export function aiKey(form){return field(form,'review-ai-key')?.value.trim()||'';}
export async function connectionReady(){
 if(!connection)connection=fetch('/api/review-ai',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():{available:false}).catch(()=>({available:false}));
 return connection;
}
function setDepth(form){
 const deep=field(form,'review-depth').value==='deep';
 form.querySelector('.rv-ai-consent').hidden=!deep;
 field(form,'review-key-wrap').hidden=!deep||form.dataset.aiAvailable==='true';
 form.querySelector('.rv-reference').hidden=!deep;
 form.querySelector('.rv-visual').hidden=!deep;
}
export async function mountReviewConnection(form){
 if(mounted.has(form))return;mounted.add(form);
 const info=await connectionReady();if(!form.isConnected)return;
 form.dataset.aiAvailable=String(!!info.available);
 field(form,'review-connection-status').textContent=info.available?'AI connection ready. Deep analysis runs in batches, followed by a competition strategy pass.':'AI connection needed for deep review. Add a Gemini key below, or choose standard checks.';
 setDepth(form);
}
function link(parent,title,url){
 const a=add(parent,'a',title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function safeURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
async function search(form,winners=false){
 const name=field(form,'event').value.trim(),edition=field(form,'review-edition').value.trim(),panel=field(form,'review-search-results');
 searches.get(form)?.abort();const controller=new AbortController();searches.set(form,controller);panel.replaceChildren();
 if(name.length<2){add(panel,'p','Enter the competition name first. Include a country or organizer when names overlap.');return;}
 const query=[name,edition,winners?'past winners winning pitch presentation official':'official judging criteria rules competition'].filter(Boolean).join(' ').slice(0,240);
 add(panel,'p',winners?'Looking for cited past-winner references…':'Searching competition sources…');
 try{
  await mountReviewConnection(form);
  if(aiKey(form)||form.dataset.aiAvailable==='true'){
   const result=await aiCall({action:'search',query},{key:aiKey(form),signal:controller.signal});
   if(!form.isConnected||searches.get(form)!==controller||field(form,'event').value.trim()!==name)return;
   panel.replaceChildren();add(panel,'p',result.answer);
   add(panel,'small','Live search · '+new Date(result.checked).toLocaleDateString()+'. Confirm event identity, edition and source authority.');
   for(const source of result.sources||[]){
    const url=safeURL(source.url);if(!url)continue;
    const row=add(panel,'article','');link(row,source.title,url);
    const button=add(row,'button',winners?'Read reference page':'Use this source');button.type='button';button.className='rv-button rv-secondary';
    button.addEventListener('click',()=>{field(form,'review-source').value=url;readSource(form,winners);});
   }
   if(result.suggestions){
    const iframe=document.createElement('iframe');iframe.title='Google Search suggestions';iframe.setAttribute('sandbox','allow-popups allow-popups-to-escape-sandbox');iframe.referrerPolicy='no-referrer';
    iframe.srcdoc='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src https: data:; script-src \'none\'; base-uri \'none\'; form-action \'none\'">'+result.suggestions;
    panel.append(iframe);
   }
   return;
  }
  const catalog=catalogSearch(name).slice(0,4);
  let publicHits=[],searchFailed=false;
  try{publicHits=await searchPublicEvents(name,{signal:controller.signal});}catch{searchFailed=true;}
  if(!form.isConnected||searches.get(form)!==controller||field(form,'event').value.trim()!==name)return;
  panel.replaceChildren();add(panel,'p','Directory and encyclopedia discovery. Connect Gemini for live web research, including past winners. These results are not a current rulebook.');
  for(const item of [...catalog,...publicHits].slice(0,8)){
   const row=add(panel,'article','');add(row,'strong',item.name);add(row,'p',item.summary);
   const url=safeURL(item.official||item.source);if(url)link(row,item.official?'Organizer page':'Background source',url);
   if(item.official){const button=add(row,'button','Read organizer page');button.type='button';button.className='rv-button rv-secondary';button.addEventListener('click',()=>{field(form,'review-source').value=item.official;readSource(form);});}
  }
  if(!catalog.length&&!publicHits.length)add(panel,'p',searchFailed?'Public lookup could not connect. Paste an official link or current rules below.':'No matching event found. Add its official HTTPS link or paste the current brief; custom competitions are supported.');
 }catch(error){if(!controller.signal.aborted&&form.isConnected){panel.replaceChildren();add(panel,'p',error.message);}}
}
async function readSource(form,reference=false){
 const panel=field(form,'review-source-status'),url=safeURL(field(form,'review-source').value);
 panel.replaceChildren();if(!url){add(panel,'p','Use a public HTTPS organizer or reference link.');return;}
 const button=field(form,'review-read-source');button.disabled=true;add(panel,'p',reference?'Reading the reference page…':'Reading the organizer page…');
 try{
  const response=await fetch('/api/competition?url='+encodeURIComponent(url)+(reference?'&kind=reference':''),{signal:AbortSignal.timeout(20000),credentials:'same-origin'});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Could not read this source.');
  if(!form.isConnected||safeURL(field(form,'review-source').value)!==url)return;
  panel.replaceChildren();add(panel,'strong',reference?'Reference page excerpts':'Organizer page excerpts');
  add(panel,'p','Read '+new Date(data.checked).toLocaleDateString()+'. Check edition, track and linked documents. This may be an incomplete brief.');
  link(panel,'Open source',safeURL(data.source)||url);
  if(!data.excerpts?.length){add(panel,'p','No readable excerpts found. Copy the current rules or reference text manually.');return;}
  const details=add(panel,'details','');add(details,'summary','Preview source excerpts');const list=add(details,'ul','');for(const line of data.excerpts)add(list,'li',line);
  const target=field(form,reference?'review-reference':'rules'),apply=add(panel,'button',reference?'Use reference excerpts':target.value.trim()?'Append these excerpts':'Use these excerpts');
  apply.type='button';apply.className='rv-button rv-secondary';
  apply.addEventListener('click',()=>{
   if(form.hasAttribute('aria-busy'))return;
   const limit=reference?12000:6000,previous=target.value.trim(),selected=[];let used=previous.length;
   for(const line of data.excerpts){if(used+line.length+1>limit)break;selected.push(line);used+=line.length+1;}
   if(!selected.length){add(panel,'p','The brief is full. Keep the relevant round and criteria, then try again.');return;}
   const next=[previous,selected.join('\n')].filter(Boolean).join('\n');
   if(selected.length<data.excerpts.length)add(panel,'p','Attached '+selected.length+' of '+data.excerpts.length+' excerpts. Review the remaining source text for requirements not included.');
   target.value=next;target.dispatchEvent(new Event('input',{bubbles:true}));form.dataset.sourceChecked=data.checked;
   imports.set(form,{event:field(form,'event').value,source:url,text:next,reference});
   if(!reference)form.querySelector('.rv-brief').open=true;else form.querySelector('.rv-reference').open=true;
   apply.disabled=true;apply.textContent=reference?'Reference attached':'Rules attached';
  });
 }catch(error){if(form.isConnected){panel.replaceChildren();add(panel,'p',error.name==='TimeoutError'?'Source timed out. Paste the current brief below.':error.message);}}
 finally{button.disabled=false;}
}
document.addEventListener('click',e=>{
 const form=e.target.closest('#deck-review form#intake');if(!form)return;
 if(e.target.closest('#review-search'))search(form);
 if(e.target.closest('#review-winner-search'))search(form,true);
 if(e.target.closest('#review-read-source'))readSource(form);
});
document.addEventListener('change',e=>{const form=e.target.closest('#deck-review form#intake');if(form&&e.target.id==='review-depth')setDepth(form);});
document.addEventListener('input',e=>{
 const form=e.target.closest('#deck-review form#intake');if(!form)return;
 if(['event','review-source','review-edition','round'].includes(e.target.id)){
  form.dataset.sourceChecked='';const attached=imports.get(form);
  if(attached){const target=field(form,attached.reference?'review-reference':'rules');if(target.value===attached.text){target.value='';target.dispatchEvent(new Event('input',{bubbles:true}));}imports.delete(form);}
  field(form,'review-source-status').textContent='Competition context changed. Read the source again for this edition and round.';
 }
});
function mount(){for(const form of document.querySelectorAll('#deck-review form#intake'))mountReviewConnection(form);}
new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});mount();
