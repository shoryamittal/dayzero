import {pitchNextSteps} from './pitch-builder.mjs';
import {hasDraftContent} from './pitch-content.mjs';
import {createProjectSnapshot,restoreProjectSnapshot} from './project-history.mjs';
import {libraryBackup,readBackup,LIBRARY_BACKUP_LIMIT} from './workspace-backup.mjs';
import {persistentWorkspace,mergeWorkspace,transactWorkspace} from './workspace-persistence.mjs';
import {externalIntegrationsEnabled,integrationStatus} from './integration-policy.mjs';
import {projectBriefHandoff} from './backend-handoff.mjs';
import {pitchDelivery,resolvedSpeakerNotes,withSpeakerNotes,pitchKitFiles, slideReviewSignature, slideReviewed} from './pitch-kit.mjs';
import {repairSlideMasters} from './pptx-package.mjs';
import {designGrid} from './design-reference-grid.mjs';
import './review.mjs?v=simple-review-1';
import './competition-lookup.mjs';
import {prepareSlideImage} from './slide-images.mjs?v=visual-qa-1';
import {launchPage} from './launch.mjs?v=pitch-flow-2';
import {pitchStart,enrichStudio,studioLookups} from './pitch-start.mjs?v=3';
import {initWinnerReference,winnerReferencePanel} from './winner-reference.mjs';
import {sampleChapters,sampleDesign} from './sample-deck.mjs?v=sample-dusk-1';
import {renderDeckSlide,makePowerPoint,makePDF} from './deck-design.mjs?v=competition-round-1';
import {assistStudio,initAssist} from './assist-ui.mjs?v=studio-flow-1';
import {communityPlans} from './community.mjs?v=launch-1';
import {templateBridge,initTemplate} from './template-ui.mjs?v=audit-2';
import {preparationHub,initPreparation} from './preparation-ui.mjs?v=ai-1.0';
import {preparationReport} from './preparation.mjs?v=pitchviva-1';
import {reviewClaims} from './claim-engine.mjs?v=ai-1.0';
import {eventDesk,initEvents,selectAttachedEvent,lookupEvent} from './event-ui.mjs?v=pitchviva-1';
import {normalizeEvent,eventChecks,eventBriefText,eventCatalog,searchEventRecords} from './event-engine.mjs?v=pitchviva-1';
import {sample,fields,slides,analyze,validateProject,clean,daysLeft,isExpired,safeFilename,questions,TTL,createId,normalizeWorkspace,MAX_PROJECTS,themes,safeURL,readingTime,checklistItems,canExportPDF} from './engine.mjs?v=studio-flow-1';
const $=s=>document.querySelector(s), app=$('#app');
const icons={home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',deck:'M4 4h16v12H4z M8 21l4-5 4 5 M8 8h8 M8 11h5',event:'M5 5h14v16H5z M8 2v6 M16 2v6 M5 10h14 M9 14h2 M14 14h2 M9 17h2',grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',mic:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0z M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8',arrow:'M5 12h14 M13 6l6 6-6 6',plus:'M12 5v14 M5 12h14',check:'m5 12 4 4L19 6',chevron:'m9 5 7 7-7 7',shield:'M12 3 3 7v6c0 4 9 8 9 8s9-4 9-8V7z m-5 9 3 3 5-5',help:'M9 9a3 3 0 1 1 4 3v3 M12 18h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',bolt:'m13 2-9 12h7l-1 8 10-13h-7z',clock:'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',file:'M5 2h9l5 5v15H5z M14 2v6h5 M8 12h8 M8 16h8',download:'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',upload:'M12 16V4 m-5 5 5-5 5 5 M4 16v5h16v-5',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 4 4 1v8l-4 1-1 4H9l-1-4-4-1V8l4-1z',leaf:'M20 3C5 2 2 10 7 16s14 2 13-13Z M5 21 16 9',spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',menu:'M4 6h16 M4 12h16 M4 18h16',close:'m6 6 12 12 M6 18 18 6',trash:'M3 6h18 M8 6V3h8v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',back:'M19 12H5 m6-6-6 6 6 6',play:'m8 4 12 8-12 8z',pause:'M8 4v16 M16 4v16',external:'M14 3h7v7 M21 3 11 13 M10 4H4v16h16v-6',info:'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',refresh:'M20 7V2l-3 3a8 8 0 1 0 3 10 M20 7h-5',wallet:'M3 6h17v15H3z M3 6V3h14v3 M15 11h6v5h-6z'};
const icon=(name,size=18)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]||icons.spark}"/></svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let offlineStatus='Offline files are preparing. Keep this page open while they install.';
let library=[],heroLens=0,questionIndex=0,focusMode=false,timerStart=0,targetMinutes=3,presentationOpen=false;
let db=null, memory=null, project=null,route='home',tab='overview',slideIndex=0,intakeStep=0,intakeDraft={},saving,toastTimer,timer=null,seconds=0,running=false,storageError=false;
const routeNames={create:'Make my pitch',home:'Overview',projects:'My projects',events:'Event library',templates:'Design studio',practice:'Pitch practice',plans:'Community pilot',settings:'Workspace settings'};
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4200);}
function showModal(title,body,actions=''){const d=$('#modal');d.setAttribute('aria-labelledby','modal-title');d.removeAttribute('aria-label');d.className='';presentationOpen=false;d.innerHTML=`<button class="icon-btn close" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button><h2 id="modal-title">${esc(title)}</h2>${body}<div class="toolbar">${actions}</div>`;d.showModal();}
function privacy(){showModal('Your work stays with you.',`<p>Pitch creation, standard PowerPoint review, editing, evidence notes, rehearsal and exports run locally. Live AI, web research, cloud sync and payments are pending setup. Your idea, slide text and competition search are not sent to provider APIs in this release.</p><p>Projects are saved in this browser’s IndexedDB. Your original PowerPoint stays on your device. Export a project or whole-library backup to keep your work or move it to another device. Projects expire 24 hours after their last edit and are removed when you next open the app. Clear workspace removes saved projects immediately.</p><p>Public application files are cached so the workspace can reopen offline after its first complete load. Google Fonts receives font requests while connected, and the host may process normal access logs. Opening a source link takes you to that external website. Pasted rules, saved directory entries and local findings still need your review; they do not verify facts or certify competition compliance.</p>`);}
function help(){showModal('A little help, right here.',`<p>Start with your own idea. Confirm the rules, edit the six-slide story, and export an editable PowerPoint or PDF.</p><p>Readiness checks in this preview are deterministic checks, not an AI jury. They cannot verify facts, event compliance, visual overflow, or your chance of winning.</p><p>Nothing is charged. The paid service is not open for orders yet.</p>`,`<button class="btn primary" data-action="new">Create a project ${icon('arrow')}</button>`);}
let storageGeneration='initial',storageQueue=Promise.resolve(),dirtySerial=0,storageConflict='';
const knownProjects=new Map(),dirtyProjects=new Map();
function registerProject(target){
 if(!knownProjects.has(target.id))knownProjects.set(target.id,{generation:storageGeneration,revision:null});
}
function markDirty(target){
 registerProject(target);
 const ticket=++dirtySerial;dirtyProjects.set(target.id,{target,ticket});return ticket;
}
function queueStorage(work){const task=storageQueue.then(work);storageQueue=task.catch(()=>{});return task;}
function adoptWorkspace(state,{written=[],deleted=[],cleared=false,initial=false}={}){
 memory=state;storageGeneration=state.persistence.generation;
 if(initial){library=state.projects;project=library.find(item=>item.id===state.activeId)||null;}
 else if(cleared){library=[];project=null;dirtyProjects.clear();storageConflict='';}
 else{
  const storedIds=new Set(state.projects.map(item=>item.id));
  library=library.filter(item=>!deleted.includes(item.id)&&(storedIds.has(item.id)||dirtyProjects.has(item.id)||item===project));
  for(const saved of state.projects)if(!library.some(item=>item.id===saved.id))library.push(saved);
 }
 // Do not replace live project objects or advance the base of an untouched
 // stale draft. Its next write must conflict instead of overwriting another tab.
 for(const saved of state.projects)if(initial||written.includes(saved.id)||!knownProjects.has(saved.id)){
  knownProjects.set(saved.id,{generation:storageGeneration,revision:state.persistence.revisions[saved.id]});
 }
 for(const id of deleted)dirtyProjects.delete(id);
}
async function changeWorkspace(change){
 const state=db?await transactWorkspace(db,change):mergeWorkspace(memory,change);
 if(!db)storageError=true;
 return state;
}
function reportStorageError(error,target){
 const conflict=error?.code==='WORKSPACE_CONFLICT'||error?.code==='WORKSPACE_CAPACITY';
 if(conflict){
  storageConflict=error.message;
  let notice=$('#storage-conflict');
  if(!notice&&$('#main')){notice=document.createElement('div');notice.id='storage-conflict';notice.className='notice';notice.setAttribute('role','alert');$('#main').prepend(notice);}
  if(notice)notice.textContent=storageConflict;
 }else storageError=true;
 if(!target||target===project)document.querySelectorAll('.save-state').forEach(node=>node.textContent=conflict?'Not saved · export a backup before reloading':'Session only · export a backup');
 toast(conflict?error.message:'Device storage is unavailable. Export a backup before closing.');
}
async function initStorage(){
 try{
  db=await new Promise((resolve,reject)=>{const request=indexedDB.open('dayzero-workspace',1);request.onupgradeneeded=()=>request.result.createObjectStore('workspace');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const state=await transactWorkspace(db,{});adoptWorkspace(state,{initial:true});
 }catch{db=null;storageError=true;adoptWorkspace(persistentWorkspace(memory),{initial:true});}
}
function persistLibrary(){
 const activeId=project?.id||null;
 return queueStorage(async()=>{const state=await changeWorkspace({activeId});adoptWorkspace(state);return state;});
}
function writeStored(target){
 const ticket=markDirty(target),snapshot=structuredClone(target);
 const at=library.findIndex(item=>item.id===target.id);
 if(at>=0)library[at]=target;else library.push(target);
 return queueStorage(async()=>{
  const base=knownProjects.get(target.id);
  const state=await changeWorkspace({generation:base.generation,upserts:[{project:snapshot,expectedRevision:base.revision}],activeId:project?.id||null});
  adoptWorkspace(state,{written:[target.id]});
  if(dirtyProjects.get(target.id)?.ticket===ticket)dirtyProjects.delete(target.id);
  return state;
 }).catch(error=>{reportStorageError(error,target);throw error;});
}
function restoreProjects(restored){
 for(const target of restored.projects)registerProject(target);
 const copies=structuredClone(restored.projects);
 return queueStorage(async()=>{
  const generation=knownProjects.get(copies[0].id).generation;
  const state=await changeWorkspace({generation,upserts:copies.map(target=>({project:target,expectedRevision:knownProjects.get(target.id).revision})),activeId:restored.activeId});
  adoptWorkspace(state,{written:copies.map(target=>target.id)});return state;
 });
}
function deleteStored(target){
 registerProject(target);dirtyProjects.delete(target.id);
 return queueStorage(async()=>{
  const base=knownProjects.get(target.id);
  const activeId=library.find(item=>item.id!==target.id)?.id||null;
  const state=await changeWorkspace({generation:base.generation,deletions:[{id:target.id,expectedRevision:base.revision}],activeId});
  adoptWorkspace(state,{deleted:[target.id]});return state;
 }).catch(error=>{reportStorageError(error,target);throw error;});
}
function clearStored(){
 clearTimeout(saving);saving=null;dirtyProjects.clear();
 return queueStorage(async()=>{
  const state=await changeWorkspace({clear:true,newGeneration:createId()});
  // Keep old base identities in this tab so late callbacks cannot recreate a
  // project that the user explicitly cleared.
  adoptWorkspace(state,{cleared:true});return state;
 });
}
function saveStateText(){return storageConflict?'Not saved · export a backup before reloading':dirtyProjects.has(project?.id)?'Saving on this device…':storageError?'Session only · export a backup':'Saved on this device';}
async function save(silent=true,target=project){
 if(!target)return false;target.updatedAt=Date.now();
 try{
  await writeStored(target);
  if(!silent)toast(storageError?'Saved for this session only. Export a backup.':'Saved on this device.');
  if(target===project)document.querySelectorAll('.save-state').forEach(node=>node.textContent=saveStateText());
  return true;
 }catch{return false;}
}
function scheduleSave(target=project){if(!target)return;target.updatedAt=Date.now();markDirty(target);if(target===project)document.querySelectorAll('.save-state').forEach(node=>node.textContent=saveStateText());clearTimeout(saving);saving=setTimeout(()=>{saving=null;flushWorkspace();},300);}
let pendingNavigation=null;
async function navigateDocument(href){
 if(pendingNavigation)return pendingNavigation;
 pendingNavigation=(async()=>{
  const results=await flushWorkspace();
  await storageQueue;
  if(results.some(saved=>saved===false)||dirtyProjects.size||storageConflict||(storageError&&library.length)){
   toast(storageConflict||'Your work is still in this tab. Export a backup before leaving because it could not be saved on this device.');
   return false;
  }
  const destination=new URL(href,location.href);
  if(destination.pathname==='/pitch.html'&&destination.pathname===location.pathname&&destination.search===location.search&&!destination.hash){go('create');return true;}
  location.assign(href);return true;
 })();
 try{return await pendingNavigation;}finally{pendingNavigation=null;}
}
document.addEventListener('click',event=>{
 const link=event.target.closest('a[href]');
 if(!link||link.hasAttribute('data-route')||link.hasAttribute('download')||(link.target&&link.target!=='_self')||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 const url=new URL(link.href,location.href);
 if(url.origin!==location.origin||!['/','/index.html','/pitch.html','/review.html'].includes(url.pathname))return;
 if(url.pathname===location.pathname&&url.search===location.search&&!(url.pathname==='/pitch.html'&&!url.hash))return;
 event.preventDefault();navigateDocument(url.href);
});
function go(name){if(name==='home'&&location.pathname==='/pitch.html')return navigateDocument('/');if(!['workspace','practice'].includes(name)){focusMode=false;document.body.classList.remove('focus-mode');}$('#modal').open&&$('#modal').close();if(timer&&!(name==='practice'||(name==='workspace'&&tab==='questions'))){seconds=Math.floor((Date.now()-timerStart)/1000);clearInterval(timer);timer=null;running=false;}route=name;history.replaceState(null,'','#'+name);render();window.scrollTo({top:0,behavior:'instant'});$('#main')?.focus({preventScroll:true});}
const btn=(label,action,style='primary',i='arrow')=>`<button class="btn ${style}" data-action="${action}">${esc(label)} ${i?icon(i,16):''}</button>`;
function shell(body){
 if(route==='home'||route==='create')return `<div class="launch-site">
  <header class="launch-header"><div class="launch-width launch-header-inner"><a href="#home" class="launch-brand" data-route="home" aria-label="PitchViva home"><span>pv</span><strong>PitchViva</strong></a>
   <nav aria-label="Website navigation"><a href="/#deck-review">Review my presentation</a><a href="/#workflow">How it works</a><button data-route="projects">My projects</button></nav>
   <a class="launch-primary" href="/pitch.html">Make a pitch ${icon('arrow',16)}</a>
  </div></header>
  <main class="route-${route}" id="main" tabindex="-1">${storageConflict?`<div id="storage-conflict" class="notice" role="alert">${esc(storageConflict)}</div>`:''}${body}</main>
  <footer class="launch-footer launch-width"><span>PitchViva <b>✳</b></span><div><button data-action="privacy">Privacy</button><button data-action="help">Help</button></div><small>Independent of event organizers</small></footer>
 </div>`;
 const work=route==='workspace'||route==='intake';
 return `<div class="layout"><aside class="sidebar" id="sidebar"><a href="#home" class="brand" data-route="home" aria-label="PitchViva home"><span class="brand-mark">p<span>v</span></span><span>PitchViva<small>THE PITCH STUDIO</small></span></a><button class="icon-btn mobile-close" data-action="menu-close" aria-label="Close navigation">${icon('close')}</button><button class="sidebar-create" data-action="new">${icon('plus',18)} New pitch <span>↗</span></button><div class="nav-label">THE WORKSPACE</div><nav class="nav" aria-label="Main navigation">${[['home','home','Launchpad'],['projects','deck','Your projects'],['templates','grid','Templates'],['events','event','Event library'],['practice','mic','Rehearse'],['plans','clock','Personal plan']].map(([r,i,t])=>`<button data-route="${r}" class="${route===r||(r==='projects'&&work)?'active':''}" ${route===r?'aria-current="page"':''}>${icon(i,18)}<span>${t}</span>${r==='projects'?`<span class="count">${library.length.toString().padStart(2,'0')}</span>`:''}</button>`).join('')}</nav><div class="sidebar-mini"><div class="nav-label">YOUR ACTIVE PROJECT</div>${project?`<button class="active-project" data-action="open-project"><span class="project-dot" style="--dot:#${themes[project.template].bg}"></span><span>${esc(project.name)}<small>${analyze(project).completed} of 6 sections filled</small></span>${icon('arrow',13)}</button>`:`<p>Your next big thing<br>belongs here.</p>`}</div><div class="side-bottom"><div class="side-note"><span class="side-star">✳</span><strong>A little less ordinary.<br>A lot more you.</strong><p>Your facts. Your voice.<br>Your moment.</p><a href="/pitch.html">Start your next pitch ${icon('arrow',14)}</a></div><button data-route="settings">${icon('settings',17)} Storage & settings</button><button data-action="help">${icon('help',17)} A little guidance</button><div class="profile"><span class="avatar">${project?esc(project.name.slice(0,1).toUpperCase()):'Y'}</span><div>${project?esc(project.team||'Your creative space'):'Your creative space'}<small>Private by default</small></div>${icon('shield',15)}</div></div></aside><div class="page"><header class="topbar"><div class="breadcrumbs"><button class="icon-btn mobile-menu" data-action="menu" aria-label="Toggle navigation" aria-expanded="false">${icon('menu')}</button><span>Studio</span>${icon('chevron',11)}<strong>${work?(route==='intake'?'A new beginning':esc(project?.name||'Your project')):({home:'Launchpad',projects:'Your projects',events:'Event intelligence',templates:'Design playground',practice:'Rehearsal room',plans:'Community pilot',settings:'Storage & settings'})[route]||'Launchpad'}</strong></div><div class="top-actions"><button class="command-trigger" data-action="commands" aria-label="Open command menu">${icon('eye',15)}<span>Jump to anything</span><kbd>⌘ K</kbd></button><span class="device"><span class="dot"></span>${storageError?'Session only':'On your device'}</span><button class="icon-btn" data-action="privacy" aria-label="Privacy and storage information">${icon('shield',17)}</button></div></header><main class="content route-${route}" id="main" tabindex="-1">${storageConflict?`<div id="storage-conflict" class="notice" role="alert">${esc(storageConflict)}</div>`:''}${storageError?'<div class="notice">Device storage is unavailable. Export a backup before leaving; this session may not be recoverable.</div>':''}${body}<footer class="footer"><span class="footer-wordmark">PitchViva<span>✳</span></span><span>Make something worth talking about.<small>Independent tool. Not affiliated with any event organizer.</small></span><div class="footer-links"><button data-action="privacy">Privacy</button><button data-action="help">Help</button><span>© 2026</span></div></footer></main></div></div>`;
}
function projectCard(p){
 const a=analyze(p),theme=themes[p.template];
 return `<button class="project-card" data-project="${esc(p.id)}"><div class="project-preview theme-${p.template}" style="--card-bg:#${theme.bg};--card-fg:#${theme.fg};--card-accent:#${theme.accent}"><div class="preview-kicker"><span>${p.demo?'FICTIONAL SAMPLE':'A WORK IN PROGRESS'}</span>${icon('external',13)}</div><h3>${esc(p.name)}</h3><p>${esc(p.solution?p.solution.slice(0,80):'An idea taking shape.')}</p><span class="cover-geometry geometry-${p.template}" aria-hidden="true"></span><div class="preview-bottom"><span>${p.template.toUpperCase()} EDITION</span><span>01 — 06</span></div></div><div class="project-info"><div class="title-line">${esc(p.name)} <span class="project-card-arrow">${icon('arrow',16)}</span></div><p>${esc(p.event||'Your next big moment')}</p><div class="completion-line"><span style="width:${a.completed/6*100}%"></span></div><div class="card-footer"><span>${a.completed}/6 story sections</span><span class="pill ${a.blockers.length?'amber':''}">${a.blockers.length?'Needs a look':'Basic checks pass'}</span></div></div></button>`;
}
function sampleCard(){return `<button class="project-card" data-action="demo"><div class="project-preview theme-botanical" style="--card-bg:#28412E;--card-fg:#FFFFFF;--card-accent:#D5F867"><div class="preview-kicker"><span>YOUR INSIDE LOOK</span>${icon('external',13)}</div><h3>Before Close</h3><p>Good food. A second chance.</p><span class="cover-geometry geometry-botanical" aria-hidden="true"></span><div class="preview-bottom"><span>FICTIONAL PROJECT / DEMO</span><span>01 — 06</span></div></div><div class="project-info"><div class="title-line">A little inspiration ${icon('arrow',16)}</div><p>Explore the complete workspace. No sign-up needed.</p><div class="card-footer"><span>Fictional sample</span><span class="pill">Try it yourself</span></div></div></button>`;}
function newCard(){return `<button class="new-card" data-action="new"><span class="new-art" aria-hidden="true"><span></span><span></span><span></span><b>+</b></span><strong>What are you<br>thinking about?</strong><span>A rough idea is enough to start.</span><span class="mosaic-link">Create a project ${icon('arrow',15)}</span></button>`;}
const previewProject = {...sample, evidence: []};
const previewSlides = slides(previewProject);
function sampleExhibit(){
 return `<section class="sample-exhibit" id="sample" aria-label="Sample pitch deck">
  <div class="exhibit-stage-label"><span><b aria-hidden="true"></b> DESIGNED SAMPLE</span><span>${esc(sample.name.toUpperCase())}</span></div>
  <div class="exhibit-slide" id="sample-slide" aria-live="polite">${renderDeckSlide(previewProject,heroLens,sampleDesign)}</div>
  <div class="exhibit-control" role="group" aria-label="Choose a sample slide">${sampleChapters.map((chapter,i)=>`<button type="button" data-lens="${i}" aria-label="Slide ${i+1}: ${chapter}" aria-pressed="${i===heroLens}"><span>0${i+1}</span><strong>${chapter}</strong></button>`).join('')}</div>
  <div class="exhibit-caption"><span>Slide <b id="sample-slide-number">0${heroLens+1}</b> / 06</span><div><button type="button" data-action="show-sample">Present ${icon('play',13)}</button><button type="button" data-action="sample-pptx">Download PowerPoint ${icon('download',13)}</button></div></div>
 </section>`;
}
function draftBoard({name='',solution=''}={}){
 return `<article class="launch-board">
  <span class="launch-board-label">PROJECT TITLE</span>
  <h3>${esc(name||'Your project title')}</h3>
  <div class="launch-board-note">
   <span class="launch-board-label">THE IDEA</span>
   <p>${esc(solution||'Describe what your idea does and who it helps.')}</p>
  </div>
 </article>`;
}
function choosePitchTheme(pitch){
 const context=[pitch.event,pitch.rules,pitch.problem,pitch.solution,pitch.approach,pitch.proof,pitch.impact].filter(Boolean).join(' ');
 const directions=[
  ['blueprint',/\b(?:engineer\w*|technolog\w*|robot\w*|software|prototype|data|research|algorithm\w*|hackathon)\b/gi],
  ['botanical',/\b(?:campus|community|climate|food|waste|sustainab\w*|health|accessib\w*|education)\b/gi],
  ['noir',/\b(?:investor\w*|venture|fundrais\w*|revenue|market|business|enterprise|finance)\b/gi]
 ];
 const ranked=directions.map(([theme,pattern])=>({theme,score:new Set(context.toLowerCase().match(pattern)).size}));
 ranked.sort((a,b)=>b.score-a.score);
 return ranked[0].score>ranked[1].score?ranked[0].theme:'editorial';
}
function home(){
 return launchPage({
  draft:draftBoard(),hasProjects:library.length>0,
  icons:Object.fromEntries(['arrow','shield','event','deck','mic'].map(key=>[key,icon(key,18)]))
 });
}
function showSample(){
 const modal=$('#modal');
 showModal(sample.name+' sample deck',`<div id="sample-present-slide">${renderDeckSlide(previewProject,heroLens,sampleDesign)}</div>
  <div class="sample-present-footer"><span id="sample-present-position">Slide ${heroLens+1} of 6</span><div><button class="btn" data-sample-step="-1" aria-label="Previous sample slide">${icon('back',17)}</button><button class="btn" data-sample-step="1" aria-label="Next sample slide">${icon('arrow',17)}</button></div></div>`);
 modal.className='sample-present-dialog';
}
function selectSample(index){
 heroLens=(index+sampleChapters.length)%sampleChapters.length;
 const slide=renderDeckSlide(previewProject,heroLens,sampleDesign);
 const inlineSlide=$('#sample-slide'),inlinePosition=$('#sample-slide-number');
 if(inlineSlide)inlineSlide.innerHTML=slide;
 if(inlinePosition)inlinePosition.textContent=String(heroLens+1).padStart(2,'0');
 document.querySelectorAll('[data-lens]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.lens)===heroLens)));
 const expanded=$('#sample-present-slide');
 if(expanded){
  expanded.innerHTML=slide;
  $('#sample-present-position').textContent='Slide '+(heroLens+1)+' of 6';
 }
}
document.addEventListener('focusin', e=>{const picker=e.target.closest('competition-picker');if(picker)picker.savedRecords=intakeEventRecords;});
const intakeEventSelector = '#launch-event, #intake-form #event';
const intakeEventRecords = () => [...new Map([
 ...eventCatalog, ...library.map(p=>p.eventBrief).filter(Boolean)
].reverse().map(event=>[event.id,event])).values()];
document.addEventListener('input',event=>{
 const input=event.target.closest(intakeEventSelector);
 if(!input)return;
 const results=input.parentElement.querySelector('.event-intake-matches');
 input.dataset.eventRecord='';
 const query=input.value.trim();
 const matches=query.length>=2?searchEventRecords(intakeEventRecords(),query).slice(0,5):[];
 results.innerHTML=query.length<2?'':matches.length
  ? '<div class="hint">Matching event references</div>'+matches.map(match=>`<button type="button" class="btn small" data-intake-event="${esc(match.id)}">${esc(match.name)}</button>`).join(' ')
  : '<span class="hint">No library match. You can keep your event name and paste its official rules.</span>';
});
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-intake-event]');
 if(!button)return;
 const field=button.closest('.field');
 const input=field.querySelector(intakeEventSelector);
 const match=intakeEventRecords().find(record=>record.id===button.dataset.intakeEvent);
 if(!input||!match)return;
 input.value=match.name;
 if(input.form.id==='intake-form'){
  if(intakeDraft.eventBrief?.id!==match.id){
   intakeDraft.eventChecks={};
   intakeDraft.confirmed=false;
   if(intakeDraft.eventBrief)intakeDraft.rules='';
  }
  intakeDraft.eventBrief=match;
 }
 input.dispatchEvent(new Event('input',{bubbles:true}));
 input.dataset.eventRecord=match.id;
 input.focus();
 field.querySelector('.event-intake-matches').innerHTML='<span class="hint">Event reference selected. Check the current edition and rules.</span>';
});
function launchDraftFields(form){
 const fields=new FormData(form);
 const solution=clean(fields.get('solution'),600);
 return {name:clean(fields.get('name'),80)||solution.split(/\s+/).slice(0,7).join(' ').slice(0,80),solution,team:clean(fields.get('team'),100)};
}
document.addEventListener('input',event=>{
 const form=event.target.closest('#launch-draft');
 if(!form)return;
 $('#launch-draft-preview').innerHTML=draftBoard(launchDraftFields(form));
 $('#launch-count').textContent=form.elements.solution.value.length+' / 600';
});
document.addEventListener('submit',async event=>{
 if(event.target.id!=='launch-draft')return;
 event.preventDefault();
 if(library.length>=MAX_PROJECTS)return toast('Your local library is full. Remove or export a project first.');
 const form=event.target;
 const fields=launchDraftFields(form);
 const answers=new FormData(form);
 for(const [field, limit] of [['problem',700],['event',160],['eventRound',160],['deadline',10],['rules',10000],['approach',1200],['proof',800],['impact',800],['ask',600]]) {
  fields[field]=clean(answers.get(field),limit);
 }
 if(!fields.solution)return toast('Add a few sentences about your idea to begin.');
 const submit=form.querySelector('[type=submit]');
 if(submit.disabled)return;
 submit.disabled=true;
 resetRehearsal();
 const picker=form.querySelector('competition-picker');
 const selectedBrief=form.elements.event?.eventBrief;
 const eventRecord=picker?.getBrief?.() || (selectedBrief?.name===fields.event?selectedBrief:null) || intakeEventRecords().find(record=>record.id===form.elements.event?.dataset.eventRecord && record.name===fields.event);
 const notes=picker?.pitchTip ? {approach:[fields.event,fields.eventRound].filter(Boolean).join(' · ')+' — '+picker.pitchTip} : {};
 const source=safeURL(clean(answers.get('evidenceSource'),400));
 const evidence=fields.proof&&source?[{slide:'proof',claim:fields.proof,source}]:[];
 const draft=validateProject({...fields,notes,evidence,eventBrief:eventRecord,template:choosePitchTheme(fields),id:createId()});
 project=draft;
 const saved=await save();
 if(project?.id!==draft.id)return;
 slideIndex=0;
 tab='deck';
 go('workspace');
 if(saved===false){toast('Your draft is kept in this tab but was not saved. Export a backup before closing.');return;}
 const competitionLink=clean(answers.get('competitionLink'),1000) || eventRecord?.official || eventRecord?.source;
 enrichStudio(draft,competitionLink,()=>library.includes(draft)?writeStored(draft):Promise.resolve(),()=>{if(project?.id===draft.id&&route==='workspace'&&['deck','overview'].includes(tab))render();},()=>library.includes(draft)).catch(()=>toast('Your idea is still in this tab. Check the save status and export a backup before closing.'));
});

const intakeStages = ['Project', 'Problem & solution', 'Approach & evidence', 'Impact & next step'];
const intakeTitles = ['Give the idea a name.', 'Make the problem clear.', 'Show how it works.', 'Land the next step.'];
const intakeGuides = [
 'Start with a working title. You can add the event now or find it later.',
 'Describe who has the problem and what your idea changes for them.',
 'Walk through the idea. Add a prototype, observation or result if you have one.',
 'Say what you hope to change and what you need to move forward.'
];
function intakePreview(){
 const name = clean(intakeDraft.name,80);
 const event = clean(intakeDraft.event,160);
 const section = previewSlides[(intakeStep-1)*2];
 const text = section && clean(intakeDraft[section.key],3000);
 return `<div class="intake-preview-meta"><span>${section?'STORY PREVIEW':'PROJECT COVER PREVIEW'}</span><span>${section?'0'+(intakeStep*2-1)+' / 06':'PITCHVIVA / 00'}</span></div>
  <div class="intake-art" aria-hidden="true"><i></i><i></i><i></i><span>✳</span></div>
  <div class="intake-preview-copy">${section?`<span class="intake-project-label">${esc(name||'YOUR PROJECT')}</span>`:''}
    <p class="intake-preview-title">${section?section.title+'.':esc(name||'Your idea goes here.')}</p>
    <p class="intake-preview-text">${esc(section ? (text ? text.slice(0,160)+(text.length>160?'…':'') : 'Your opening words will appear here.') : (event||'Competition pitch / working draft'))}</p>
  </div>`;
}
function projects(){return `<div class="page-heading"><div class="eyebrow">YOUR IDEAS, WITH ROOM TO GROW</div><h1>The drawing <em>board.</em></h1><p>Every project has a different story. Keep up to ${MAX_PROJECTS} on this device, without replacing the one you’re working on.</p></div><div class="project-toolbar"><div class="search-wrap">${icon('eye',17)}<input type="search" id="project-search" placeholder="Find a project or event…" aria-label="Search your projects"></div><div class="toolbar-actions">${project?btn('Duplicate active project','duplicate','','file'):''}${btn('Restore a backup','import','','upload')}${btn('New project','new','primary','plus')}</div></div><div class="project-grid library-grid" id="project-library">${library.map(projectCard).join('')}${newCard()}</div><p id="project-empty-search" class="notice neutral" hidden>No projects match that search. Try another name or event.</p><p class="disabled-note">Local projects expire 24 hours after their last edit and are removed when you next open the app. Export backups to keep your work.</p>`;}
function startNew(){if(library.length>=MAX_PROJECTS){toast('Your local library is full. Export a backup and manage your saved projects.');return go('settings');}return navigateDocument('/pitch.html');}
function newConfirm(){resetRehearsal();intakeDraft={id:createId(),name:'',team:'',event:'',problem:'',solution:'',approach:'',proof:'',impact:'',ask:'',rules:'',deadline:'',template:'signal',plan:'team',demo:false,confirmed:false,createdAt:Date.now(),updatedAt:Date.now(),history:[],notes:{},evidence:[],checklist:{}};intakeStep=0;go('intake');}
function intake(){const stepFields=intakeStep===0?`<div class="field-row"><div class="field"><label for="name">What’s your project called?</label><input id="name" name="name" required maxlength="80" placeholder="e.g. Before Close" value="${esc(intakeDraft.name)}" autocomplete="off"></div><div class="field"><label for="team">Team name <span class="subtle">(optional)</span></label><input id="team" name="team" maxlength="100" placeholder="e.g. Second Nature" value="${esc(intakeDraft.team)}"></div></div><div class="field"><label for="event">Which event are you preparing for?</label><input id="event" name="event" maxlength="160" placeholder="Event name, or leave blank for a general pitch" value="${esc(intakeDraft.event)}"><div class="hint">Search event background, then review the current organizer rules. <button type="button" class="btn text intake-event-link" data-action="event-desk">Find my event ↗</button></div><div class="event-intake-matches" aria-live="polite"></div></div><div class="field"><label for="deadline">Submission deadline <span class="subtle">(optional)</span></label><input id="deadline" name="deadline" type="date" value="${esc(intakeDraft.deadline)}"></div>`:fields.slice((intakeStep-1)*2,intakeStep*2).map(([k,label,hint])=>`<div class="field"><label for="${k}">${label} <span class="subtle">(add later if you need)</span></label><textarea id="${k}" name="${k}" maxlength="3000" placeholder="${esc(hint)}">${esc(intakeDraft[k])}</textarea><div class="hint">${esc(hint)}</div></div>`).join('');return `<section class="intake-studio" aria-label="Pitch intake">
 <header class="intake-heading"><span class="exhibit-kicker"><b>✳</b> NEW PITCH / STEP 0${intakeStep+1} OF 04</span><h1>${intakeTitles[intakeStep]}</h1><p>${intakeGuides[intakeStep]}</p></header>
 <ol class="intake-rail" aria-label="Pitch setup progress">${intakeStages.map((stage,i)=>`<li ${i===intakeStep?'aria-current="step"':''} class="${i<intakeStep?'complete':''}"><span>${i<intakeStep?'✓':'0'+(i+1)}</span><strong>${stage}</strong></li>`).join('')}</ol>
 <div class="intake-composition">
  <form class="panel intake-fields" id="intake-form">${stepFields}<p id="form-error" class="inline-error" role="alert"></p>
   <div class="form-actions"><button type="button" class="btn" data-action="intake-back">${icon('back',15)} ${intakeStep?'Back':'Cancel'}</button><button type="submit" class="btn primary">${intakeStep===3?'Create workspace':'Continue'} ${icon('arrow',15)}</button></div>
   <p class="intake-save-note">${icon('shield',14)} Saved in this browser after you name your project.</p>
  </form>
  <aside class="intake-side" aria-label="Pitch preview">
    <div class="intake-preview" id="intake-preview">${intakePreview()}</div>
    <div class="intake-direction"><span>FROM NOTES TO SLIDES</span><p>${intakeStep===0?'Give the pitch a title now. The next three steps lay out six editable slides.':'These are working notes. Refine the words and choose your slide design in the workspace.'}</p></div>
  </aside>
 </div>
 </section>`;}
const viewGroups=[
 ['Plan',[['overview','Overview'],['rules','Event rules'],['preparation','Preparation']]],
 ['Build',[['story','Story'],['proof','Evidence'],['deck','Deck canvas'],['assist','Writing assistant']]],
 ['Deliver',[['questions','Rehearse'],['official','Official template'],['exports','Export kit']]]
];
function projectViews(){
 return `<nav class="project-views" aria-label="Project views">${viewGroups.map(([label,views])=>`<div class="project-view-group" role="group" aria-label="${label}"><span>${label}</span>${views.map(([key,name])=>`<button data-tab="${key}" ${tab===key?'aria-current="page"':''}>${name}</button>`).join('')}</div>`).join('')}</nav>`;
}
function projectNext(a){
 const missing=fields.find(([key])=>!hasDraftContent(project[key]));
 const step = !project.confirmed&&project.event
  ? ['Review the event rules','Record the current organizer rules before shaping your final deck.','tab-rules','Review rules']
  : missing
   ? ['Draft '+missing[1].toLowerCase(),missing[2],'edit-'+missing[0],'Open story editor']
   : !project.evidence.length
    ? ['Attach your first source note','Add an interview, prototype result, or reference that supports a claim.','tab-proof','Add evidence']
    : !project.rehearsals?.length
     ? ['Run a timed rehearsal','Practise your delivery and save your elapsed time.','tab-questions','Start rehearsal']
     : ['Review the export kit','Open the files and check the layout, event rules, and submission requirements.','tab-exports','Review exports'];
 const [title,description,action,label]=step;
 return `<section class="workspace-next"><div><span class="workspace-kicker">NEXT STEP</span><h2>${title}</h2><p>${description}</p></div><div class="workspace-next-progress"><strong>${a.completed}<small> / 6</small></strong><span>sections drafted</span><progress max="6" value="${a.completed}" aria-label="Story sections drafted"></progress></div>${btn(label,action)}</section>`;
}

function studioProcess(){
 const delivery=pitchDelivery(project);
 const build=project.pitchBuild,active=studioLookups.has(project.id),known=!!project.rules.trim();
 const labels={waiting:'Next',running:active?'Working':'Paused',done:'Ready',limited:'Needs attention',pending:'API pending',local:'Local workspace ready'};
 const stages=[['research','Competition context',known?'Requirements are attached; check the edition and round.':'Add the organizer’s rules or choose a saved event reference. Live research is pending.'],['draft','Your product story','The user, solution, workflow and evidence in editable slides.']];
 const pages=build?.sources||[];
 return `<section class="studio-process" aria-labelledby="studio-process-title"><h2 id="studio-process-title">${active?'Your pitch is taking shape.':'Make the story your own.'}</h2>
 <p role="status" aria-live="polite">${esc(!active&&build&&Object.values(build.steps).includes('running')?'Automatic preparation was interrupted. Your saved idea is ready to edit; retry in the writing assistant.':build?.message||'Start with your user, show the product workflow, and add evidence as you go.')}</p>

 <section class="studio-next-facts" aria-label="Your pitch package"><h3>Your pitch package.</h3><p>${delivery.filled} of ${delivery.total} slides have draft content. ${delivery.missing.length?'Missing facts stay marked so you can complete them.':'Content is filled; check evidence, rules and the exported layout before submitting.'}</p>
 <div class="toolbar"><button class="btn primary" data-export="zip">Download the pitch kit ${icon('download',15)}</button><button class="btn" data-action="preview-pitch-kit">Preview script &amp; judge questions</button><button class="btn" data-export="pptx">Editable PowerPoint</button></div>
 <details><summary>Inside your package</summary><ul>${delivery.files.map(file=>'<li>'+esc(file)+'</li>').join('')}</ul><p>Scripts and answer drafts use your current content. Missing information is a prompt, not a verified result.</p></details>
 <details><summary>Check each slide</summary><ol>${delivery.slides.map(slide=>'<li><button class="btn text" data-action="edit-'+slide.key+'">'+esc(slide.title)+'</button> — '+(slide.hasContent?'Draft content added':'Facts needed')+'</li>').join('')}</ol></details></section>
 <ol class="studio-build-steps"><li><strong>Ready · Idea saved</strong>Your starting point is saved in this browser.</li>${stages.map(([key,title,copy])=>`<li data-state="${build?.steps[key]||'waiting'}"><strong>${esc(labels[build?.steps[key]||'waiting'])} · ${title}</strong>${copy}</li>`).join('')}</ol>
 ${pitchNextSteps(project).length?`<section class="studio-next-facts" aria-label="Next steps for your pitch"><h3>Build the missing pieces.</h3><p>Start with these details. Each one takes you to the right slide.</p>${pitchNextSteps(project).map(step=>'<article><strong>'+esc(step.title)+'</strong><p>'+esc(step.question)+'</p><button class="btn small" data-action="edit-'+step.key+'">Work on this slide '+icon('arrow',14)+'</button></article>').join('')}</section>`:''}
 ${build?.gaps.length?`<details class="studio-next-facts"><summary>${build.aiApplied?'Make this draft stronger':'The next details that will help'}</summary><ul>${build.gaps.map(gap=>'<li>'+esc(gap)+'</li>').join('')}</ul><button class="btn small" data-action="tab-story">Add details to my story</button></details>`:''}
 <div class="toolbar">${!active&&externalIntegrationsEnabled()?'<button class="btn" data-action="retry-pitch-preparation">Retry research &amp; drafting</button>':''}<button class="btn primary" data-action="tab-assist">Improve with the writing assistant</button><button class="btn" data-action="tab-rules">Competition requirements</button><button class="btn" data-action="project-details">Edit title &amp; names</button></div>
 ${pages.length||build?.notes.length?`<details><summary>Sources &amp; research notes</summary>${pages.map(page=>'<article><a href="'+esc(page.url)+'" target="_blank" rel="noopener noreferrer">'+esc(page.title||page.url)+'</a><ul>'+page.excerpts.map(text=>'<li>'+esc(text)+'</li>').join('')+'</ul></article>').join('')}${build?.notes.length?'<ul>'+build.notes.map(note=>'<li>'+esc(note)+'</li>').join('')+'</ul>':''}</details>`:''}
 ${known?'<details><summary>Requirements used in this draft</summary><pre>'+esc(project.rules)+'</pre></details>':''}</section>`;
}

function workspace(){
 if(!project)return `<div class="empty"><span class="empty-star">✳</span><h2>Something good starts here.</h2><p>Give your next idea a place to become a story.</p>${btn('Create a project','new')}</div>`;
 const a=analyze(project),days=daysLeft(project.deadline);
 return `<div class="workspace-heading"><div><div class="eyebrow">${project.demo?'FICTIONAL PROJECT / LIVE WORKSPACE':'YOUR IDEA / IN THE MAKING'}</div><div class="project-title-row"><h1>${esc(project.name)}</h1><span class="project-asterisk" aria-hidden="true">✳</span><button class="project-edit" data-action="project-details" aria-label="Edit project details">${icon('settings',15)}</button></div><p>${esc(project.team||'Your team')}<span class="separator">/</span>${esc(project.event||'A moment worth preparing for')}${days!==null?`<span class="deadline-chip ${days<=1?'urgent':''}">${icon('clock',12)}${days<0?'Deadline passed':days===0?'Due today':`${days} days to go`}</span>`:''}</p></div><div class="workspace-actions"><button class="btn focus-toggle ${focusMode?'selected':''}" data-action="focus">${icon('eye',15)}${focusMode?'Leave focus mode':'Focus mode'}</button><button class="btn" data-action="present">${icon('play',14)} Present</button>${btn('Export kit','tab-exports','primary','download')}</div></div><div class="workspace-bar">${projectViews()}<span class="save-state">${esc(saveStateText())}</span></div>${(tab==='deck'||tab==='overview')?studioProcess():''}${tab==='assist'?assistStudio(project):tab==='official'?templateBridge():tab==='preparation'?preparationHub():tab==='overview'?projectNext(a)+readiness(a):tab==='rules'?rules():tab==='story'?story():tab==='proof'?proofBoard():tab==='deck'?deck():tab==='questions'?judge():exportsPage(a)}`;
}
function readiness(a){
 const checklistCount=checklistItems.filter(([k])=>project.checklist[k]).length;
 return `<section class="event-pulse"><span>✳</span><div><div class="eyebrow">YOUR CONNECTED PREPARATION SPACE</div><h3>Turn the moving parts into a plan.</h3><p>Map requirements, assign tasks, plan the demo, and give every speaker a moment.</p></div><button class="btn" data-quick="preparation">Open preparation hub ↗</button></section><div class="flight-grid"><section class="flight-card"><div class="eyebrow">YOUR PRE-FLIGHT CHECK</div><h2>${a.ready?'All the pieces.':'A little more clarity.'}<br><em>${a.ready?'Now make them count.':'A much stronger pitch.'}</em></h2><p>${a.issues.length?`${a.issues.length} things worth a second look. Start with the facts and rules, then make the story sing.`:'Your basic content checks pass. Give the official rules, your proof, and the exported files one final look.'}</p><div class="flight-ring" style="--progress:${a.completed/6*360}deg"><div><strong>${a.completed}<small>/6</small></strong><span>SECTIONS FILLED</span></div></div><div class="flight-bottom"><span class="pill ${a.blockers.length?'amber':''}">${a.blockers.length?`${a.blockers.length} blocking review item${a.blockers.length===1?'':'s'}`:'Basic content checks pass'}</span><button class="btn text" data-action="method">What we check ${icon('arrow',14)}</button></div></section><section class="journey-map"><div class="section-head"><div><div class="eyebrow">ONE STEP AT A TIME</div><h2>Your way forward.</h2></div>${icon('spark',23)}</div>${[['rules','The rules of the room',project.confirmed?'Reviewed by you':'Your event, your constraints',project.confirmed],['story','The story that sticks',`${a.completed} of 6 sections filled`,a.completed===6],['proof','Something to stand on',`${project.evidence.length} source note${project.evidence.length===1?'':'s'} collected`,project.evidence.length>0],['questions','Your moment, rehearsed',project.rehearsals?.length?`${project.rehearsals.length} practice session${project.rehearsals.length===1?'':'s'} saved`:'A first practice makes a difference',!!project.rehearsals?.length]].map(([k,h,d,done],n)=>`<button data-quick="${k}" class="journey-map-row"><span class="step-orb ${done?'done':''}">${done?icon('check',14):String(n+1).padStart(2,'0')}</span><span><strong>${h}</strong><small>${d}</small></span>${icon('arrow',16)}</button>`).join('')}</section></div><div class="metric-strip"><div><span class="metric-icon">${icon('deck',20)}</span><span><strong>06</strong><small>slides in your story</small></span></div><div><span class="metric-icon">${icon('file',20)}</span><span><strong>${String(project.evidence.length).padStart(2,'0')}</strong><small>source notes collected</small></span></div><div><span class="metric-icon">${icon('check',20)}</span><span><strong>${checklistCount}<i>/5</i></strong><small>final checks confirmed</small></span></div></div><div class="split"><section class="panel next-steps"><div class="section-head"><div><div class="eyebrow">SMALL FIXES. BETTER FOUNDATIONS.</div><h2>Make the next move count.</h2></div><span class="tiny-count">${a.issues.length.toString().padStart(2,'0')}</span></div>${a.issues.length?a.issues.map((i,n)=>`<div class="issue"><span class="issue-num">${String(n+1).padStart(2,'0')}</span><div class="issue-body"><div class="issue-meta"><span>${i.kind==='rule'?'EVENT RULES':i.kind==='proof'?'EVIDENCE':i.kind==='claim'?'CLAIM CHECK':'STORY'}</span>${i.slide?`<span>SLIDE 0${i.slide}</span>`:''}</div><h3>${esc(i.title)}</h3><p>${esc(i.detail)}</p><button class="btn text" data-action="${i.kind==='rule'?'tab-rules':i.kind==='proof'?'tab-proof':'edit-'+a.deck[Math.max(0,i.slide-1)].key}">${i.kind==='proof'?'Open your proof board':'Let’s look at this'} ${icon('arrow',14)}</button></div></div>`).join(''):'<div class="notice neutral">No basic issues found. This is a content check, not a certification of event compliance.</div>'}</section><div class="stack"><section class="deadline-planner"><div class="eyebrow">A LITTLE DEADLINE CLARITY</div><h3>Give your next<br>step a <em>when.</em></h3><div class="field"><label for="project-deadline">Submission deadline</label><input id="project-deadline" type="date" value="${esc(project.deadline)}"></div><p>Fix blocking items first. Check the export next. Leave room for a rehearsal.</p></section><section class="honesty-note"><span>✳</span><p>No pretend quality scores.<br><strong>Just things you can act on.</strong></p><button data-action="method" aria-label="How readiness works">${icon('arrow',18)}</button></section></div></div>`;
}
function rules(){return `${eventAttachment()}${winnerReferencePanel(project,esc)}<div class="notice ${project.demo?'neutral':''}">${project.demo?'These are fictional demo rules, not rules for any real event.':'The event brief provides background and preparation guidance. Paste the organizer’s current rules below; this workspace cannot verify compliance.'}</div><div class="split"><section class="panel"><div class="section-head" style="margin-top:0"><h2>Rules first. Then the story.</h2><span class="pill">${project.demo?'Demo source':'Student supplied'}</span></div><div class="field"><label for="event-rules">Event rules and required headings</label><textarea id="event-rules" maxlength="10000" rows="8" placeholder="Paste the slide limit, required headings, formats, file-size limit, AI policy, and source URL here.">${esc(project.rules)}</textarea><div class="hint">Stored locally as text only. Pasted content cannot run instructions or change the app’s behaviour.</div></div><div class="rules-list">${[['Slide structure','This preview uses 6 story sections. Confirm that the actual event allows this format.'],['Mandatory organizer template','Use Official template to map your wording into a supported PPTX. Check the filled file in PowerPoint before submitting.'],['AI and plagiarism policy','Unknown until you check the official rules. AI assistance may need disclosure or may be prohibited.'],['Deadline, file format, and size','Confirm these on the official portal before upload.']].map(([t,d])=>`<div class="rule"><div><strong>${t}</strong><p>${d}</p></div>${icon('info',17)}</div>`).join('')}</div><label class="check-label" style="margin:21px 0"><input id="rules-confirm" type="checkbox" ${project.confirmed?'checked':''}> I have reviewed these rules. I understand this preview cannot certify event compliance or the final template layout.</label>${btn('Save my confirmation','confirm-rules','primary','check')}</section><aside class="aside-card">${icon('event',25)}<h3>Your event’s template<br>comes first.</h3><p>If your organizer supplies a mandatory deck, keep its headings, layout, masters, and theme unchanged. Use Official template for selective text replacement, then inspect the filled file in PowerPoint.</p><p>Do not submit the exported preview deck in place of a required organizer template.</p></aside></div>`;}
function story(){
 const ss=slides(project),active=ss[slideIndex],time=readingTime(project[active.key]||'');
 return `<div class="story-studio"><nav class="story-rail" aria-label="Story sections"><div class="eyebrow">YOUR STORY ARC</div>${ss.map((s,n)=>`<button data-story-slide="${n}" class="${slideIndex===n?'active':''}"><span>0${n+1}</span><strong>${esc(s.title)}</strong><span class="story-dot ${hasDraftContent(project[s.key])?'filled':''}"></span></button>`).join('')}<div class="rail-endnote">Six moments.<br><em>One clear story.</em></div></nav><section class="story-editor panel"><div class="editor-heading"><div><div class="eyebrow">CHAPTER 0${slideIndex+1} / 06</div><h2>${esc(active.title)}<span>↗</span></h2></div>${btn('Save version','snapshot','','plus')}</div><p class="editor-prompt">${esc(fields[slideIndex][2])}</p><label class="sr-only" for="story-text">${esc(active.title)} slide text</label><textarea class="story-textarea" id="story-text" data-edit="${active.key}" maxlength="3000" placeholder="Start with what you actually know. The perfect words can come later.">${esc(project[active.key]||'')}</textarea><div class="writing-meter"><span id="count-${active.key}">${time.words} words · target 80 or fewer</span><span id="reading-estimate">≈ ${time.seconds}s spoken at 130 words/min</span></div><div class="speaker-note-field"><label for="speaker-notes">${icon('mic',15)} What you’ll say out loud <span>Speaker notes · optional</span></label><textarea id="speaker-notes" data-note="${active.key}" maxlength="3000" placeholder="The context, example, or transition that brings this slide to life…">${esc(project.notes[active.key]||'')}</textarea></div><div class="form-actions"><button class="btn" data-action="story-prev">${icon('back',15)} Previous</button><button class="btn primary" data-action="story-next">${slideIndex===5?'See the full deck':'Next chapter'} ${icon('arrow',15)}</button></div></section><aside class="story-coach"><div class="story-preview-label"><span>LIVE SLIDE PREVIEW</span><span>0${slideIndex+1} / 06</span></div><div id="story-live-preview">${renderDeckSlide(project,slideIndex)}</div><div class="eyebrow">${project[active.key]?'SLIDE DESIGN TIP':'WRITING PROMPT'}</div><p>${esc((project[active.key] && designGrid.rows.find(row=>row.stage===active.key)?.apply) || questions[slideIndex][2])}</p><div class="coach-rule"></div><div class="small-label">THE QUESTION BEHIND THIS SLIDE</div><p class="coach-question">“${esc(questions[slideIndex][1])}”</p><button class="btn text" data-action="tab-proof">Give it some proof ${icon('arrow',15)}</button><details class="history-drawer"><summary>Version history <span>${project.history.length}/5</span></summary><p>New versions restore story text, headlines, speaker notes, design and practice answers. Images and source notes stay with the current project.</p>${project.history.length?project.history.map((v,n)=>`<div class="history-item"><span>Snapshot ${n+1}<small>${esc(new Date(v.at).toLocaleString())}</small></span><button class="btn small" data-restore="${n}">Restore</button></div>`).join(''):'<p>No snapshots yet. Save a version before a big rewrite.</p>'}</details></aside></div>`;
}
function deck(){
 const s=slides(project)[slideIndex],image=project.slideImages[s.key];
 return `<div class="deck-editor"><section class="canvas-panel"><div class="canvas-toolbar"><span>${icon('grid',15)} THE BIG PICTURE</span><button class="btn small" data-action="present">${icon('play',12)} Present your story</button></div><div class="slide-stage">${renderDeckSlide(project,slideIndex)}</div><div class="slide-controls"><button class="icon-btn" data-action="prev-slide" aria-label="Previous slide">${icon('back',17)}</button><span>0${slideIndex+1} <i>/</i> 06 <small>${esc(s.title)}</small></span><button class="icon-btn" data-action="next-slide" aria-label="Next slide">${icon('arrow',17)}</button></div><div class="thumbs">${slides(project).map((t,n)=>`<button class="thumb ${n===slideIndex?'active':''}" data-studio-slide="${n}" aria-label="Slide ${n+1}: ${esc(t.title)}" aria-pressed="${n===slideIndex}"><span>0${n+1}</span><strong>${esc(t.title)}</strong><span class="thumb-line"></span></button>`).join('')}</div><p class="canvas-footnote">Your browser preview. Always check the exported files before submitting.</p></section><aside class="deck-inspector panel"><h3>Review slide ${slideIndex+1}</h3><p>Edit the details and check the preview before marking this slide reviewed.</p><div class="field"><label for="slide-headline">Slide headline <small>(optional)</small></label><input id="slide-headline" maxlength="90" data-key="${s.key}" value="${esc(project.slideHeadlines[s.key])}" placeholder="${esc(s.title)}"></div><div class="field"><label for="slide-text">${esc(s.title)} · slide text</label><textarea id="slide-text" data-edit="${s.key}" maxlength="3000" rows="7">${esc(project[s.key]||'')}</textarea></div><div class="field"><label for="deck-speaker-notes">Speaker notes</label><textarea id="deck-speaker-notes" data-note="${s.key}" maxlength="3000" rows="3">${esc(project.notes[s.key])}</textarea></div><div class="field deck-image-field"><label for="deck-image">Slide image</label><input id="deck-image" type="file" accept="image/jpeg,image/png,image/webp" data-key="${s.key}"><small>JPG, PNG, or WebP up to 10 MB. Center cropped to 4:3 for preview, PowerPoint, and PDF.</small>${image?`<label for="deck-image-alt">Image description</label><input id="deck-image-alt" maxlength="160" data-key="${s.key}" value="${esc(image.alt)}" placeholder="Describe the image for screen readers"><button class="btn small" data-remove-slide-image="${s.key}">Remove image</button>`:''}</div><div class="field"><label>Choose your visual voice</label><div class="theme-swatches">${Object.entries(themes).map(([k,t])=>`<button data-style="${k}" class="${project.template===k?'selected':''}" aria-label="Use ${t.name} style" aria-pressed="${project.template===k}"><span style="background:#${t.bg};color:#${t.fg}">Aa</span><small>${t.name}</small></button>`).join('')}</div></div><p class="disabled-note">A mandatory organizer template takes priority. Use the Official template tab to fill supported text boxes in your organizer’s PPTX.</p><p id="slide-review-status" role="status">${slideReviewed(project,s.key)?'Reviewed by your team':'Review pending'}</p><div class="form-actions"><button class="btn" data-action="mark-slide-reviewed" aria-pressed="${slideReviewed(project,s.key)}" ${hasDraftContent(project[s.key])?'':'disabled'}>Mark slide reviewed</button><button class="btn primary" data-action="tab-exports">Back to export kit ${icon('arrow',15)}</button></div></aside></div>`;
}
document.addEventListener('input',event=>{
 const input=event.target;
 if(input.id==='slide-headline'&&project){
  project.slideHeadlines[input.dataset.key]=clean(input.value,90);
  $('.slide-stage').innerHTML=renderDeckSlide(project,slideIndex);
  project.checklist.files=false;
  scheduleSave();
  return;
 }
 if(input.id!=='deck-image-alt'||!project?.slideImages[input.dataset.key])return;
 const alt=clean(input.value,160);
 project.slideImages[input.dataset.key].alt=alt;
 const image=$('.slide-stage img');
 if(image)image.alt=alt||'Slide image';
 project.checklist.files=false;
 scheduleSave();
});
document.addEventListener('change',async event=>{
 const input=event.target;
 if(input.id!=='deck-image'||!input.files?.length||!project)return;
 const activeProject=project,key=input.dataset.key;
 input.disabled=true;
 try{
  const data=await prepareSlideImage(input.files[0]);
  if(project!==activeProject)return;
  project.slideImages[key]={data,alt:project.slideImages[key]?.alt||''};
  project.checklist.files=false;
  await save();
  if(route==='workspace'&&tab==='deck'&&project===activeProject)render();
  toast('Image added to your slide.');
 }catch(error){toast(error.message);}
 finally{input.disabled=false;input.value='';}
});
document.addEventListener('click',async event=>{
 const remove=event.target.closest('[data-remove-slide-image]');
 if(!remove||!project)return;
 delete project.slideImages[remove.dataset.removeSlideImage];
 project.checklist.files=false;
 await save();
 render();
});
function judge(){
 const s=slides(project)[questionIndex],q=questions[questionIndex];
 return `<div class="rehearsal-intro"><div><div class="eyebrow">THE REHEARSAL ROOM</div><h2>Before the room.<br><em>Find your rhythm.</em></h2><p>These are general preparation prompts, not an AI jury or a prediction. Your actual slide text is the starting point.</p></div><button class="btn" data-action="skim">${icon('eye',16)} The 30-second skim</button></div><div class="rehearsal-grid"><section class="question-stage"><div class="question-topline"><span>THE ${q[0].toUpperCase()} QUESTION</span><span>0${questionIndex+1} / 06</span></div><h3>${q[1]}</h3><div class="question-tabs" role="group" aria-label="Practice questions">${questions.map((_,n)=>`<button data-question="${n}" aria-label="Question ${n+1}" aria-pressed="${questionIndex===n}">${String(n+1).padStart(2,'0')}</button>`).join('')}</div><div class="deck-quote"><span class="small-label">YOUR SLIDE SAYS</span><blockquote>“${esc(s.text)}”</blockquote><button class="btn text" data-action="edit-${s.key}">Refine this slide ${icon('arrow',14)}</button></div><details class="answer-direction"><summary>A useful way to approach this</summary><p>${q[2]}</p></details><div class="field answer-field"><label for="practice-answer">Make the answer your own.</label><textarea id="practice-answer" data-answer="${questionIndex}" maxlength="3000" placeholder="A clear, honest answer you can say out loud…">${esc(project.answers[questionIndex]||'')}</textarea><div class="hint">Your answers stay with this project. Nothing is recorded.</div></div></section><aside class="practice-control"><div class="practice-dark"><div class="eyebrow">THIS IS YOUR SPACE TO PRACTISE</div><div class="timer-orbit"><svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="100"/><circle id="timer-progress" cx="110" cy="110" r="100" style="stroke-dashoffset:${628.32*(1-Math.min(1,seconds/(targetMinutes*60)))}"/></svg><div><div id="clock" class="rehearsal-clock">${clockText(seconds)}</div><span>${targetMinutes}-MINUTE TARGET</span></div></div><div class="duration-options" role="group" aria-label="Rehearsal duration">${[3,5].map(n=>`<button data-duration="${n}" aria-pressed="${targetMinutes===n}">${n} minutes</button>`).join('')}</div><button class="btn primary timer-main" data-action="timer" id="timer-button">${icon(running?'pause':'play',15)} ${running?'Pause rehearsal':seconds?'Continue rehearsal':'Start rehearsal'}</button><div class="timer-secondary"><button data-action="timer-reset">${icon('refresh',13)} Reset</button><button data-action="finish-rehearsal">${icon('check',13)} Finish & save</button></div><button class="present-link" data-action="present-notes">Open presenter view ${icon('external',14)}</button></div><section class="rehearsal-history"><div class="eyebrow">SHOWING UP IS PROGRESS</div><h3>Practice, remembered.</h3>${project.rehearsals.length?project.rehearsals.slice().reverse().map(r=>`<div class="practice-history-row"><span>${icon('mic',15)} ${clockText(r.seconds)}</span><small>${esc(new Date(r.at).toLocaleDateString())}</small></div>`).join(''):'<p>Finish a session to keep its time here. No recording. No performance score.</p>'}</section></aside></div>`;
}
function exportsPage(a){
 const checked=checklistItems.filter(([k])=>project.checklist[k]).length;
 const reviewed=slides(project).filter(slide=>slideReviewed(project,slide.key)).length;
 return `<div class="export-banner"><div class="eyebrow">GOOD WORK DESERVES A GOOD SEND-OFF</div><h2>Take your story<br><em>into the world.</em></h2><div class="export-seal"><span>PITCHVIVA</span><b>↓</b><span>YOUR PITCH KIT</span></div></div><div class="notice neutral"><p><strong>${reviewed} of ${a.deck.length} slides reviewed by your team.</strong> Edit any slide to refresh its review status and the exported script and report.</p><button class="btn" data-action="review-generated-deck">Review and edit slides ${icon('arrow',15)}</button></div>${a.blockers.length?`<div class="notice">${a.blockers.length} blocking review item${a.blockers.length===1?' remains':'s remain'}. Exports are marked as drafts. Check the findings before submitting.</div>`:'<div class="notice neutral">Basic checks pass. This is still a draft: verify facts, rules, and the final exported layout.</div>'}<div class="split"><section class="download-grid">${[['zip','download','The whole story.','Editable deck, slide rationale, timed speaking script, jury practice, and your project backup.','YOUR ALL-IN-ONE KIT'],['pptx','deck','Make the last edit.','A real six-slide, editable PowerPoint. Your speaker notes come with it.','EDITABLE POWERPOINT'],['pdf','file','A clearer view.','Six slides in a PDF, ready for a final review. Latin text supported.','PRESENTATION PDF'],['project','shield','Keep the possibility.','A portable backup of this project, proof board, notes, and saved versions.','PROJECT BACKUP']].map(([type,i,title,desc,kicker])=>`<article class="download-card ${type==='zip'?'download-featured':''}"><div class="download-top"><span class="file-icon">${icon(i,23)}</span><span>.${type==='project'?'JSON':type.toUpperCase()}</span></div><div class="small-label">${kicker}</div><h3>${title}</h3><p>${desc}</p><button class="btn ${type==='zip'?'primary':''}" data-export="${type}">Download ${type==='project'?'project':type.toUpperCase()} ${icon('download',15)}</button>${type==='zip'?'<button class="btn text" data-action="preview-pitch-kit">Preview the report, script and Q&amp;A</button>':''}</article>`).join('')}</section><aside class="final-checklist panel"><div class="eyebrow">THE LAST MILE MATTERS</div><h3>A little care.<br>A better send-off.</h3><div class="checklist-progress"><span style="width:${checked/5*100}%"></span></div><p class="checklist-count">${checked} of 5 confirmed by you</p>${checklistItems.map(([k,t])=>`<label class="check-label"><input type="checkbox" data-checklist="${k}" ${project.checklist[k]?'checked':''}><span>${t}</span></label>`).join('')}<p class="disabled-note">These are your confirmations, not automated certification.</p><div class="expiry-note">${icon('shield',17)}<p>Saved until ${esc(new Date(project.updatedAt+TTL).toLocaleString())}. Expired data is deleted when you next open the app.</p></div><button class="btn text" data-route="settings">Manage your workspace ${icon('arrow',14)}</button></aside></div>`;
}
function templates(){return `<div class="page-heading playground-heading"><div><div class="eyebrow">THE DESIGN PLAYGROUND</div><h1>Find your<br><em>visual voice.</em></h1><p>Six original directions. Same real story. Pick the one that feels like you, and see it on your own words.</p></div><span class="playground-star" aria-hidden="true">✳</span></div><div class="template-lock">${icon('shield',19)}<span>Free-format event? Make it yours. Required organizer template? Keep that layout unchanged.</span></div><div class="template-grid">${Object.entries(themes).map(([k,t],n)=>`<article class="template-card"><button class="template-stage" data-template="${k}" aria-label="Use ${t.name} style"><div class="mini-slide theme-${k}" style="--slide-bg:#${t.bg};--slide-fg:#${t.fg};--slide-muted:#${t.muted};--slide-accent:#${t.accent}"><div class="mini-slide-meta"><span>PITCHVIVA / STUDIO</span><span>0${n+1}</span></div><h3>${esc(t.label)}</h3><span class="mini-decoration" aria-hidden="true"></span><div class="mini-slide-meta bottom"><span>${project?esc(project.name):'YOUR IDEA, IN FOCUS'}</span><span>↗</span></div></div></button><div class="template-info"><div><h3>${t.name}</h3><p>${['Grounded. Human. A breath of fresh air.','A quieter canvas. A louder idea.','Precision, without the complexity.','Bold by design. Clear by intention.','A little mystery. A lot of confidence.','For ideas with a little more voltage.'][n]}</p></div><button class="icon-btn ${project?.template===k?'selected':''}" data-template="${k}" aria-label="${project?.template===k?'Current style: ':'Choose '}${t.name}">${icon(project?.template===k?'check':'arrow',17)}</button></div></article>`).join('')}</div>`;}
function events(){return eventDesk();}
let eventFromIntake=false,pendingEvent=null;
function openEventDesk(){if(route==='intake'){captureIntake();eventFromIntake=true;if(intakeDraft.event)lookupEvent(intakeDraft.event);}else eventFromIntake=false;if(project?.eventBrief)selectAttachedEvent(project.eventBrief);go('events');}
function eventAttachment(){return project.eventBrief?`<div class="event-attachment"><div><strong>Event brief attached · ${esc(project.eventBrief.name)}</strong><small>Background, preparation notes, and ${Object.values(project.eventChecks||{}).filter(Boolean).length}/5 checks reviewed by you.</small></div><button class="btn" data-action="event-desk">Open event brief ${icon('arrow',14)}</button></div>`:`<div class="event-attachment"><div><strong>Get to know the room.</strong><small>Find event background and build a preparation brief.</small></div><button class="btn" data-action="event-desk">Find my event ${icon('arrow',14)}</button></div>`;}
function clearEventReview(p){
 p.rules='';p.confirmed=false;p.eventBrief=null;p.eventChecks={};p.eventRound='';p.slideReviews={};p.winnerReference=null;
 Object.assign(p.checklist,{template:false,policy:false,files:false,portal:false});
 Object.assign(p.preparation,{requirements:[],portal:'',receipt:''});
}
function chooseEvent(event,alreadyAttached){
 if(alreadyAttached){tab='rules';return go('workspace');}
 pendingEvent=normalizeEvent(event);if(!pendingEvent)return;
 if(eventFromIntake){intakeDraft.event=pendingEvent.name;intakeDraft.eventBrief=pendingEvent;intakeDraft.eventChecks={};intakeDraft.confirmed=false;intakeDraft.rules='';eventFromIntake=false;go('intake');return;}
 showModal('Give this event a home.',`<p>Attach <strong>${esc(pendingEvent.name)}</strong> to a project, or start a new one. If you change a project’s event, its old rules, deadline, requirement map, and submission record will be cleared. Your story and source notes stay with the project.</p><div class="event-project-options">${library.map(p=>`<button class="btn" data-attach-event-project="${esc(p.id)}"><span>${esc(p.name)}<small>${esc(p.event||'No event selected')}</small></span>${icon('arrow',15)}</button>`).join('')}<button class="btn primary" data-action="event-new-project">Start a new project ${icon('plus',15)}</button></div>`);
}
async function attachEventProject(id){const p=library.find(p=>p.id===id);if(!p||!pendingEvent)return;project=p;if(p.event!==pendingEvent.name){clearEventReview(p);p.deadline='';}p.event=pendingEvent.name;p.eventBrief=pendingEvent;const saved=await save();pendingEvent=null;tab='rules';go('workspace');toast(saved===false?'Event brief attached in this tab only. Export a backup before reloading.':'Event brief attached. Review the current organizer rules next.');}
function newEventProject(){const event=pendingEvent;newConfirm();intakeDraft.event=event.name;intakeDraft.eventBrief=event;intakeDraft.eventChecks={};pendingEvent=null;render();}
initEvents({project:()=>project,projects:()=>library,save,attach:chooseEvent,download:(text,name)=>downloadBlob(new Blob([text],{type:'text/plain;charset=utf-8'}),safeFilename(name)+'-event-brief.txt'),story:(key,event)=>{if(!project){pendingEvent=event;return newEventProject();}if(key==='proof'){tab='proof';go('workspace');}else{slideIndex=fields.findIndex(([k])=>k===key);tab='story';go('workspace');}}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-attach-event-project]');if(b)attachEventProject(b.dataset.attachEventProject).catch(()=>toast('Could not attach the event. Please try again.'));});
function practice(){if(project){tab='questions';return workspace();}return `<div class="page-heading"><div class="eyebrow">YOUR BIG MOMENT, REHEARSED</div><h1>Let’s make the questions<br>less intimidating.</h1><p>Get a judge’s view of your story, prepare your answers, and run a timed rehearsal. Nothing is recorded.</p></div><div class="empty">${icon('mic',35)}<h2>A little preparation goes a long way.</h2><p>Create a project to practise with your own story.</p>${btn('Create a project','new')}</div>`;}
function plans(){return communityPlans();}
function settings(){return `<div class="page-heading"><div class="eyebrow">YOUR WORK. YOUR CONTROL.</div><h1>A little space.<br><em>Entirely yours.</em></h1><p>${library.length} of ${MAX_PROJECTS} project spaces in use. Your proof boards, speaker notes, answers, and story snapshots stay in this browser.</p></div><div class="split"><section class="panel"><div class="section-head"><h2>The library on this device.</h2>${icon('shield',22)}</div>${library.length?library.map(p=>`<div class="storage-project"><span class="storage-initial" style="background:#${themes[p.template].bg};color:#${themes[p.template].fg}">${esc(p.name[0])}</span><div><strong>${esc(p.name)}</strong><small>Last edited ${esc(new Date(p.updatedAt).toLocaleString())}</small></div><button class="btn small" data-project="${esc(p.id)}">Open ${icon('arrow',13)}</button></div>`).join(''):'<p class="subtle">No saved projects yet.</p>'}<div class="toolbar">${library.length?btn('Back up the whole library','export-library','primary','download'):''}${btn('Restore a backup','import','','upload')}</div><p class="subtle">Projects expire 24 hours after the last edit and are removed on your next visit after expiry. Your browser may also evict data. Download backups to keep your work.</p>${library.length?`<div class="danger-zone"><h3>A clean slate, when you want it.</h3><p>This clears all ${library.length} local projects and their saved notes. Downloaded backups stay on your device.</p><button class="btn" data-action="clear">${icon('trash',16)} Clear all local projects</button></div>`:''}</section><aside class="privacy-card"><span>✳</span><h3>Private should<br>mean <em>private.</em></h3><p>Pitch creation, standard review and exports work on this device. Live AI and web research are pending setup; local use sends no provider API requests.</p><p id="offline-status" role="status">${esc(offlineStatus)}</p><p>Google Fonts receives font requests while connected; hosting may process normal access logs.</p>${btn('Read data handling','privacy','text','arrow')}</aside></div><section class="panel integration-status" aria-labelledby="integration-status-title"><div class="section-head"><h2 id="integration-status-title">Connection status</h2><span class="pill amber">Local mode</span></div><p>These services are intentionally pending. You can finish your local draft and exports now.</p><div class="integration-list">${integrationStatus.map(item=>`<article><div><h3>${esc(item.name)}</h3><span class="pill">Pending</span></div><p>${esc(item.local)}</p></article>`).join('')}</div></section>`;}
function render(){app.innerHTML=shell(route==='home'?home():route==='create'?pitchStart(Object.fromEntries(['arrow'].map(key=>[key,icon(key,18)]))):route==='projects'?projects():route==='intake'?intake():route==='workspace'?workspace():route==='templates'?templates():route==='events'?events():route==='practice'?practice():route==='plans'?plans():settings());syncSidebar();if(route==='create')$('#launch-draft-preview').innerHTML=draftBoard();}
function syncSidebar(){const sidebar=$('#sidebar');if(sidebar)sidebar.inert=window.innerWidth<=700&&!sidebar.classList.contains('open');}
window.addEventListener('resize',syncSidebar);
function resetRehearsal(){questionIndex=0;clearInterval(timer);timer=null;running=false;seconds=0;}
function openProject(id){resetRehearsal();if(id){const selected=library.find(p=>p.id===id);if(selected)project=selected;}if(!project)return demo();persistLibrary().catch(()=>{});tab='overview';slideIndex=0;go('workspace');}
async function demo(practice=false){resetRehearsal();const existing=library.find(p=>p.demo&&p.name===sample.name);if(existing){project=existing;await persistLibrary();tab=practice?'questions':'overview';slideIndex=0;go('workspace');}else await loadDemo(practice);}
async function loadDemo(practice=false){if(library.length>=MAX_PROJECTS)return toast('Your library is full. Manage saved projects before adding the sample.');project=validateProject({...structuredClone(sample),id:createId(),createdAt:Date.now(),updatedAt:Date.now()});await save();tab=practice?'questions':'overview';slideIndex=0;go('workspace');}
function evidence(){showModal('Turn a gap into a real test.',`<p><strong>Your next step:</strong> speak to a few people who actually experience the problem. Do not pitch the solution first.</p><ol style="font-size:13px;line-height:2;color:var(--muted)"><li>When did this problem last happen?</li><li>What did you do to work around it?</li><li>What was difficult, slow, or costly?</li><li>What have you already tried?</li><li>Could you show me how you handle it today?</li></ol><p>Record the date, participant count, and exact observations. Get permission before recording people. Then update your Evidence slide with what you actually learned.</p>`,`<button class="btn primary" data-action="download-interview">Download interview guide ${icon('download')}</button>`);}
function method(){showModal('What readiness actually checks.',`<p>We check whether the six story sections are filled, whether a section exceeds an 80-word readability target, whether it contains certain absolute claims, and whether you confirmed the event rules.</p><p>We also flag an empty Evidence section or wording that explicitly says no interviews or results exist. These are simple text checks and may miss issues.</p><p>We do not verify facts, citations, originality, event rules, template integrity, visual overflow, or market demand. There is no AI-generated quality score in this preview.</p>`);}
function downloadBlob(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function exportProject(){if(!project)return toast('Create a project first.');downloadBlob(new Blob([JSON.stringify({format:'dayzero-project',version:1,...project},null,2)],{type:'application/json'}),safeFilename(project.name)+'-project.json');toast('Project backup downloaded. Keep it somewhere safe.');}
function loadScript(src){return new Promise((resolve,reject)=>{let s=document.querySelector(`script[src="${src}"]`);if(s?.dataset.loaded)return resolve();s=document.createElement('script');s.src=src;s.onload=()=>{s.dataset.loaded='true';resolve()};s.onerror=()=>{s.remove();reject(Error('The export library could not load. Try again while online.'))};document.head.append(s);});}
async function pptxBlob(p,design){
 await Promise.all([loadScript('/vendor/pptxgen.bundle.js'),loadScript('/vendor/jszip.min.js')]);
 const original=await makePowerPoint(withSpeakerNotes(p),window.PptxGenJS,design);
 return repairSlideMasters(original,window.JSZip);
}
async function downloadSample(button){
 const label=button.textContent;
 button.disabled=true;button.textContent='Preparing PowerPoint…';
 try{downloadBlob(await pptxBlob(previewProject,sampleDesign),safeFilename(sample.name)+'-Sample-Pitch.pptx');toast('Sample PowerPoint downloaded.');}
 catch{toast('Could not prepare the sample PowerPoint. Try again.');}
 finally{button.disabled=false;button.textContent=label;}
}
async function pdfBlob(p){await loadScript('/vendor/pdf-lib.min.js');return makePDF(p,window.PDFLib);}
function previewPitchKit(){
 const sections=Object.entries(pitchKitFiles(project));
 const titles=['Slide rationale','Speaker script','Jury questions and answers'];
 const details=sections.map(([,value],index)=>`<details${index===0?' open':''}><summary>${titles[index]}</summary><p style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(value)}</p></details>`).join('');
 showModal('Your pitch kit',details);
}
function reportText(p){const a=analyze(p);return `PITCHVIVA / ${p.name}\n${p.demo?'FICTIONAL PROJECT / DEMO':'STUDENT DRAFT'}\n\nREADINESS REPORT\nNo simulated AI jury was run. These are deterministic content checks. They do not verify facts or event compliance.\n\n${a.issues.length?a.issues.map(i=>`- ${i.title}: ${i.detail}`).join('\n'):'No basic content issues found. Verify all facts and official rules.'}\n\nEVENT RULES (student supplied, not verified)\n${p.rules||'No event rules supplied.'}\n\nPRACTICE QUESTIONS\n${questions.map(([c,q,h])=>`${c}: ${q}\n${h}`).join('\n\n')}\n\nBefore submitting: confirm the official template, headings, count, word limits, file name, size, deadline and AI policy. Replace missing data. Open the exported files and check the layout.\n\nIndependent tool. Not affiliated with any event organizer.\n`;}
async function exportFiles(type,button){if(!project)return;const p=structuredClone(project);if(type==='project')return exportProject();const pdfSupported=canExportPDF(p);if(!pdfSupported&&type==='pdf'){showModal('This PDF export supports Latin text.',`<p>The preview PDF engine cannot safely render Hindi or other non-Latin characters. Use PowerPoint export, which preserves your text, then export a PDF from PowerPoint with the appropriate font installed.</p>`);return;}const old=button.innerHTML;button.disabled=true;button.textContent='Preparing your files…';try{const name=safeFilename(p.name);if(type==='pptx')downloadBlob(await pptxBlob(p),name+'-draft.pptx');if(type==='pdf')downloadBlob(await pdfBlob(p),name+'-draft.pdf');if(type==='zip'){await loadScript('/vendor/jszip.min.js');const zip=new window.JSZip();zip.file(name+'-draft.pptx',await pptxBlob(p));if(pdfSupported){
 try{zip.file(name+'-draft.pdf',await pdfBlob(p));}
 catch(error){zip.file('PDF-export-note.txt','PitchViva could not make the PDF. '+clean(error.message,240)+' Open the included PowerPoint to export a PDF.');}
 }else zip.file('PDF-export-note.txt','The built-in PDF export cannot render some characters in this pitch. Open the included PowerPoint with a font that supports your text and export a PDF there.');for(const [file,content] of Object.entries(pitchKitFiles(p)))zip.file(file,content);zip.file('preparation-workbook.txt',preparationReport(p));zip.file('readiness-and-practice.txt',reportText(p));if(p.eventBrief)zip.file('event-brief.txt',eventBriefText(p.eventBrief,p));zip.file('source-notes.json',JSON.stringify(p.evidence,null,2));zip.file('speaker-notes.txt',slides(p).map(s=>s.title+'\n'+resolvedSpeakerNotes(p)[s.key]).join('\n\n'));zip.file(name+'-project.json',JSON.stringify({format:'dayzero-project',version:1,...p},null,2));downloadBlob(await zip.generateAsync({type:'blob'}),name+'-pitch-kit.zip');}toast('Draft exported. Open the files and check them before submission.');}catch(e){toast('Export failed. Your project is still saved. '+clean(e.message,130));}finally{button.disabled=false;button.innerHTML=old;}}
function importProject(){
 if(library.length>=MAX_PROJECTS)return toast('Your library is full. Export a backup and manage saved projects first.');
 const input=document.createElement('input');input.type='file';input.accept='.json,.zip,application/json,application/zip';
 input.onchange=async()=>{
  const file=input.files?.[0];if(!file)return;
  if(file.size>LIBRARY_BACKUP_LIMIT)return toast('Choose a project or library backup smaller than 40 MB.');
  try{
   if(/\.zip$/i.test(file.name))await loadScript('/vendor/jszip.min.js');
   const restored=await readBackup(file,{JSZip:window.JSZip,existingCount:library.length});
   // Validate every project and capacity before changing the workspace.
   if(library.length+restored.projects.length>MAX_PROJECTS)throw Error('Your library changed. Free enough project spaces and try again.');
   await flushWorkspace();
   // The read/merge/write transaction validates capacity against the newest
   // saved library. It imports every fresh copy or none of them.
   const state=await restoreProjects(restored);
   resetRehearsal();project=library.find(item=>item.id===state.activeId);
   tab='overview';go('workspace');
   toast(restored.projects.length+' project'+(restored.projects.length===1?'':'s')+' restored as new copies. '+(storageError?'Export before closing: storage is unavailable.':'Your existing projects are unchanged.'));
  }catch(error){toast('Could not restore: '+clean(error.message,190));}
 };
 input.click();
}
async function snapshot(){if(!project)return;project.history.push(createProjectSnapshot(project));project.history=project.history.slice(-5);const saved=await save();render();if(saved!==false)toast('Version saved. You can restore it from Story studio.');}
function updateClock(){const c=$('#clock');if(c)c.textContent=clockText(seconds);const progress=$('#timer-progress');if(progress)progress.style.strokeDashoffset=628.32*(1-Math.min(1,seconds/(targetMinutes*60)));}
function toggleTimer(){if(running){seconds=Math.floor((Date.now()-timerStart)/1000);clearInterval(timer);timer=null;running=false;}else{running=true;timerStart=Date.now()-seconds*1000;timer=setInterval(()=>{const previous=seconds;seconds=Math.floor((Date.now()-timerStart)/1000);updateClock();if(previous<targetMinutes*60&&seconds>=targetMinutes*60)toast('Target reached. Finish your ask, then pause.');},500);}const b=$('#timer-button');if(b)b.innerHTML=icon(running?'pause':'play',14)+(running?' Pause rehearsal':' Continue rehearsal');updateClock();}

function claimReview(){const claims=reviewClaims(project);showModal('Numbers deserve a paper trail.',`<p>We flag numerical wording using text patterns. This is a review aid, not fact-checking. A matching source note means the exact sentence is saved on the same slide with a source; it does not prove the claim.</p><div class="claim-review-list">${claims.length?claims.map(c=>`<article class="claim-review-item"><div><span class="pill ${c.status==='needs-source'?'amber':''}">${c.status==='goal'?'Proposed goal / estimate':c.status==='source-note'?'Matching source note':'Source needed'}</span><small>${esc(slides(project).find(s=>s.key===c.key).title)} slide</small></div><blockquote>${esc(c.quote)}</blockquote><button class="btn text" data-review-claim="${esc(c.key)}" data-claim-quote="${esc(c.quote)}">${c.status==='needs-source'?'Add a source note':'Review in story studio'} ${icon('arrow',13)}</button></article>`).join(''):'<div class="empty"><h3>No numerical wording found.</h3><p>This check catches currency, percentages, and common counts. It cannot catch every claim. Review your sources yourself.</p></div>'}</div>`);}
function claimSpotlight(){const claims=reviewClaims(project),need=claims.filter(c=>c.status==='needs-source').length;return `<section class="claim-spotlight"><span aria-hidden="true">“</span><div><div class="eyebrow">THE CLAIM CHECK</div><h3>${need?`${need} numerical claim${need===1?' needs':'s need'} a paper trail.`:'Keep your numbers connected to their story.'}</h3><p>${claims.length?`${claims.length} numerical statement${claims.length===1?'':'s'} found · goals and matching source notes shown separately.`:'We look for percentages, currency, and common counts. No automatic fact-checking.'}</p></div><button class="btn" data-action="claim-review">Review the wording ${icon('arrow',14)}</button></section>`;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-review-claim]');if(!b)return;const key=b.dataset.reviewClaim;const need=reviewClaims(project).some(c=>c.key===key&&c.quote===b.dataset.claimQuote&&c.status==='needs-source');$('#modal').close();if(need){tab='proof';go('workspace');$('#evidence-claim').value=b.dataset.claimQuote;$('#evidence-slide').value=key;$('#evidence-source').focus();}else{tab='story';slideIndex=fields.findIndex(([k])=>k===key);go('workspace');}});
function proofBoard(){
 const entries=project.evidence;
 return `<div class="proof-heading"><div><div class="eyebrow">THE PROOF BOARD</div><h2>Big claims.<br><em>Meet real things.</em></h2><p>A home for what you observed, tested, or found. A source note helps you keep track; it does not independently verify a claim.</p></div><button class="btn" data-action="evidence">${icon('bolt',15)} Plan your first interview</button></div>${claimSpotlight()}<div class="proof-layout"><section><div class="proof-board-stats"><span>${String(entries.length).padStart(2,'0')} <small>source notes</small></span><span>${new Set(entries.map(e=>e.slide)).size}<small>slides with source notes</small></span></div><div class="proof-cards">${entries.length?entries.map((e,n)=>{const url=safeURL(e.source);return `<article class="proof-note type-${e.type}"><div class="proof-note-top"><span>${esc(e.type.toUpperCase())}</span><span>0${n+1}</span></div><p class="proof-claim">${esc(e.claim)}</p><div class="proof-source"><span>SOURCE / SUPPLIED BY YOU</span>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(e.source)} ${icon('external',12)}</a>`:`<p>${esc(e.source)}</p>`}</div><div class="proof-note-foot"><span>${esc(slides(project).find(s=>s.key===e.slide)?.title||'Evidence')} slide</span><button data-edit-evidence="${esc(e.id)}" aria-label="Edit source note ${n+1}">Edit ${icon('arrow',13)}</button></div><span class="note-disclaimer">Not independently verified</span></article>`;}).join(''):`<div class="proof-empty"><div class="empty-note-art"><span>?</span><span>✳</span></div><h3>Your first proof<br>doesn’t need to be big.</h3><p>An interview note. A working demo. A published source. Start with something real.</p><button class="btn" data-action="focus-proof-form">Add your first source note ${icon('arrow',15)}</button></div>`}</div></section><aside class="proof-form panel"><div class="eyebrow">CONNECT THE CLAIM TO THE PROOF</div><h3>Something you<br>can <em>stand behind.</em></h3><form id="evidence-form"><input type="hidden" name="noteId" id="evidence-id"><div class="field"><label for="evidence-claim">What does this support?</label><textarea id="evidence-claim" name="claim" maxlength="1200" required placeholder="An observation, result, or specific claim…" rows="4"></textarea></div><div class="field"><label for="evidence-source">Where did it come from?</label><textarea id="evidence-source" name="source" maxlength="2000" required placeholder="A source URL, demo link, or dated notes from your own test…" rows="3"></textarea><div class="hint">Avoid personal details about interview participants.</div></div><div class="field-row"><div class="field"><label for="evidence-type">Kind of proof</label><select name="type" id="evidence-type"><option value="interview">Interview</option><option value="demo">Demo / prototype</option><option value="measurement">Measurement</option><option value="reference">Reference</option></select></div><div class="field"><label for="evidence-slide">For this slide</label><select name="slide" id="evidence-slide">${slides(project).map(s=>`<option value="${s.key}" ${s.key==='proof'?'selected':''}>${s.title}</option>`).join('')}</select></div></div><p class="inline-error" id="evidence-error" role="alert"></p><button class="btn primary" type="submit" id="evidence-submit">Add to proof board ${icon('plus',15)}</button><div class="proof-edit-actions" id="proof-edit-actions" hidden><button type="button" class="btn text" data-action="cancel-proof-edit">Cancel edit</button><button type="button" class="btn text remove-link" data-action="remove-proof-note">Remove note</button></div></form><p class="disabled-note">Up to 30 source notes per project. Stored on this device and included in your backup and pitch kit.</p></aside></div>`;
}
const commandItems=[['Open the preparation hub','quick:preparation','event'],['Find an event and open its brief','route:events','event'],['Create a new project','new','plus'],['Your project library','route:projects','deck'],['Open the story studio','quick:story','file'],['Open the proof board','quick:proof','shield'],['Open the deck canvas','quick:deck','grid'],['Enter the rehearsal room','quick:questions','mic'],['Export the active pitch kit','quick:exports','download'],['Explore the design playground','route:templates','spark'],['Manage device storage','route:settings','settings']];
function commandPalette(){showModal('A shortcut to your next step.',`<div class="command-search">${icon('eye',18)}<input id="command-search" type="search" placeholder="Where do you want to go?" aria-label="Search commands" autocomplete="off"></div><div id="command-results">${commandResults('')}</div><div class="command-hint"><span>↑ ↓ to explore · Enter to choose</span><kbd>ESC to close</kbd></div>`);$('#modal').className='command-dialog';$('#command-search').focus();}
function commandResults(search){const matches=commandItems.filter(([label])=>label.toLowerCase().includes(search.toLowerCase()));return matches.length?matches.map(([label,action,i])=>`<button class="command-result" data-command="${action}">${icon(i,18)}<span>${label}</span>${icon('arrow',14)}</button>`).join(''):'<p class="command-empty">No matching action. Try “story”, “proof”, or “export”.</p>';}
async function quickView(target){if(!project)await demo();if(!project)return;tab=target;go('workspace');}
function toggleFocus(){focusMode=!focusMode;document.body.classList.toggle('focus-mode',focusMode);render();}
function clockText(value){return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;}
function skimView(){showModal('The 30-second skim.',`<p>Read these opening lines like you’ve never seen the project. Does the story connect?</p><div class="skim-list">${slides(project).map((s,n)=>`<div><span>0${n+1}</span><p><strong>${s.title}</strong>${esc(s.text.split(/(?<=[.!?])\s/)[0])}</p></div>`).join('')}</div>`);}
function openPresentation(withNotes=false){if(!project)return toast('Open a project first.');presentationOpen=true;$('#modal').dataset.notes=String(withNotes);presentationMarkup();$('#modal').showModal();}
function presentationMarkup(){$('#modal').removeAttribute('aria-labelledby');$('#modal').setAttribute('aria-label','Presentation: '+project.name);const notes=$('#modal').dataset.notes==='true';$('#modal').className='presentation-dialog';$('#modal').innerHTML=`<div class="present-toolbar"><span>${esc(project.name)}<small>${project.demo?'FICTIONAL DEMO':'DRAFT PRESENTATION'}</small></span><div><button class="btn small" data-action="toggle-present-notes">${icon('mic',14)} ${notes?'Hide notes':'Speaker notes'}</button><button class="icon-btn" data-action="close-modal" aria-label="Close presentation">${icon('close',19)}</button></div></div><div class="present-content ${notes?'with-notes':''}">${renderDeckSlide(project,slideIndex)}${notes?`<aside class="present-notes"><div class="eyebrow">WHAT YOU’LL SAY</div><h3>${esc(slides(project)[slideIndex].title)}</h3><p>${esc(resolvedSpeakerNotes(project)[slides(project)[slideIndex].key])}</p><div class="small-label">BE READY FOR</div><p>${esc(questions[slideIndex][1])}</p></aside>`:''}</div><div class="present-controls"><span>← → to move between slides · Esc to close</span><div><button class="icon-btn" data-action="present-prev" aria-label="Previous presentation slide">${icon('back',17)}</button><span>0${slideIndex+1} / 06</span><button class="icon-btn" data-action="present-next" aria-label="Next presentation slide">${icon('arrow',17)}</button></div></div>`;}
async function finishRehearsal(){if(timer){seconds=Math.floor((Date.now()-timerStart)/1000);clearInterval(timer);timer=null;running=false;}if(seconds<1)return toast('Start a rehearsal first, then finish it to save the elapsed time.');project.rehearsals.push({at:Date.now(),seconds});project.rehearsals=project.rehearsals.slice(-5);const saved=await save();const elapsed=clockText(seconds);seconds=0;render();toast(saved===false?`Practice kept in this tab only: ${elapsed}. Export a backup before reloading.`:`Practice saved: ${elapsed}. Small starts add up.`);}
async function exportLibrary(){
 if(!library.length)return toast('There are no saved projects yet.');
 const backup=libraryBackup(library,project?.id);
 downloadBlob(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),'pitchviva-library-backup.json');
 toast('Library backup downloaded. Use Restore a backup to bring every project back together.');
}
async function duplicateProject(){if(!project)return;if(library.length>=MAX_PROJECTS)return toast('Your local library is full.');project=validateProject({...structuredClone(project),id:createId(),name:project.name.slice(0,70)+' — copy',createdAt:Date.now(),updatedAt:Date.now()});const saved=await save();tab='story';go('workspace');toast(saved===false?'The project copy is kept in this tab only. Export it before closing.':'A new project copy is saved. Your original is unchanged.');}

document.addEventListener('submit',e=>{if(e.target.matches('#intake-form,#evidence-form,#project-details-form'))e.preventDefault();},true);
document.addEventListener('click',async e=>{const projectButton=e.target.closest('[data-project]');if(projectButton)return openProject(projectButton.dataset.project);
 const ruleLink=e.target.closest('[data-open-rules]');if(ruleLink){openProject(ruleLink.dataset.openRules);tab='rules';go('workspace');return;}
 const lens=e.target.closest('[data-lens]');
 if(lens)return selectSample(Number(lens.dataset.lens));
 const sampleStep=e.target.closest('[data-sample-step]');
 if(sampleStep)return selectSample(heroLens+Number(sampleStep.dataset.sampleStep));
 const quick=e.target.closest('[data-quick]');if(quick)return quickView(quick.dataset.quick);
 const storyButton=e.target.closest('[data-story-slide]');if(storyButton){slideIndex=Number(storyButton.dataset.storySlide);return render();}
 const style=e.target.closest('[data-style]');if(style&&project){project.template=style.dataset.style;project.checklist.files=false;await save();return render();}
 const question=e.target.closest('[data-question]');if(question){questionIndex=Number(question.dataset.question);render();return;}
 const duration=e.target.closest('[data-duration]');if(duration){targetMinutes=Number(duration.dataset.duration);render();updateClock();return;}
 const command=e.target.closest('[data-command]');if(command){const [kind,value]=command.dataset.command.split(':');$('#modal').close();if(kind==='route')return go(value);if(kind==='quick')return quickView(value);if(kind==='new')return startNew();if(kind==='demo')return demo();}
 const editEvidence=e.target.closest('[data-edit-evidence]');if(editEvidence){const entry=project.evidence.find(x=>x.id===editEvidence.dataset.editEvidence);if(entry){for(const key of ['id','claim','source','type','slide'])$('#evidence-'+key).value=entry[key];$('#evidence-submit').innerHTML='Save source note '+icon('check',15);$('#proof-edit-actions').hidden=false;$('#evidence-claim').focus();}return;}
 const routeEl=e.target.closest('[data-route]');if(routeEl){e.preventDefault();return go(routeEl.dataset.route);}const t=e.target.closest('[data-tab]');if(t){tab=t.dataset.tab;go('workspace');return;}const sl=e.target.closest('[data-studio-slide]');if(sl){slideIndex=Number(sl.dataset.studioSlide);return render();}const te=e.target.closest('[data-template]');if(te){if(!project){toast('Create a project to use this style.');newConfirm();intakeDraft.template=te.dataset.template;return;}project.template=te.dataset.template;project.checklist.files=false;await save();tab='deck';go('workspace');return;}const ex=e.target.closest('[data-export]');if(ex)return exportFiles(ex.dataset.export,ex);const restore=e.target.closest('[data-restore]');if(restore){const v=project.history[Number(restore.dataset.restore)];if(v?.data){const before=createProjectSnapshot(project);if(restoreProjectSnapshot(project,v)){project.history.push(before);project.history=project.history.slice(-5);const saved=await save();render();if(saved!==false)toast('Version restored. Your previous draft was saved as a version.');}}return;}const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;if(a.startsWith('tab-')){tab=a.slice(4);return go('workspace');}if(a.startsWith('edit-')){slideIndex=Math.max(0,fields.findIndex(([key])=>key===a.slice(5)));tab='story';go('workspace');document.querySelector(`[data-edit="${a.slice(5)}"]`)?.focus();return;}
 const actions={'retry-pitch-preparation':async()=>{const draft=project;if(!draft)return;await enrichStudio(draft,'',()=>library.includes(draft)?writeStored(draft):Promise.resolve(),()=>{if(project===draft&&route==='workspace')render();},()=>library.includes(draft));},'server-generation':()=>{tab='exports';go('workspace');},'review-generated-deck':()=>{const next=slides(project).findIndex(s=>!slideReviewed(project,s.key));slideIndex=Math.max(0,next);tab='deck';go('workspace');},'mark-slide-reviewed':async()=>{const slide=slides(project)[slideIndex];if(!hasDraftContent(project[slide.key]))return;project.slideReviews ||= {};if(slideReviewed(project,slide.key))delete project.slideReviews[slide.key];else project.slideReviews[slide.key]=slideReviewSignature(project,slide.key);updateSlideReviewStatus();await save();},'preview-pitch-kit':previewPitchKit,'claim-review':claimReview,'event-desk':openEventDesk,'event-new-project':newEventProject,'cancel-proof-edit':()=>{$('#evidence-form').reset();$('#evidence-id').value='';$('#evidence-submit').innerHTML='Add to proof board '+icon('plus',15);$('#proof-edit-actions').hidden=true;},'remove-proof-note':confirmRemoveProof,'remove-proof-confirm':removeProof,'remove-project':confirmRemoveProject,'remove-project-confirm':removeProject,'project-details':projectDetails,commands:commandPalette,focus:toggleFocus,present:()=>openPresentation(false),'present-notes':()=>openPresentation(true),'present-prev':()=>{slideIndex=(slideIndex+5)%6;presentationMarkup();},'present-next':()=>{slideIndex=(slideIndex+1)%6;presentationMarkup();},'toggle-present-notes':()=>{$('#modal').dataset.notes=String($('#modal').dataset.notes!=='true');presentationMarkup();},skim:skimView,'finish-rehearsal':finishRehearsal,'export-library':exportLibrary,duplicate:duplicateProject,'focus-proof-form':()=>$('#evidence-claim')?.focus(),'story-prev':()=>{slideIndex=(slideIndex+5)%6;render();},'story-next':()=>{if(slideIndex===5){tab='deck';go('workspace');}else{slideIndex++;render();}},new:startNew,'new-confirm':newConfirm,demo:demo,'demo-practice':()=>demo(true),'replace-demo':loadDemo,'open-project':openProject,help,privacy,settings:()=>go('settings'),evidence,method,import:importProject,'export-project':exportProject,'close-modal':()=>{presentationOpen=false;$('#modal').close();},'menu-close':()=>{$('#sidebar').classList.remove('open');syncSidebar();$('.mobile-menu')?.setAttribute('aria-expanded','false');},menu:()=>{const open=$('#sidebar').classList.toggle('open');b.setAttribute('aria-expanded',String(open));syncSidebar();},'prev-slide':()=>{slideIndex=(slideIndex+5)%6;render();},'next-slide':()=>{slideIndex=(slideIndex+1)%6;render();},'sample-pptx':()=>downloadSample(b),'show-sample':showSample,'confirm-rules':async()=>{project.rules=clean($('#event-rules').value,10000);project.confirmed=$('#rules-confirm').checked;if(project.confirmed&&!project.rules){toast('Add the rules before confirming them.');return;}const saved=await save();render();if(saved!==false)toast(project.confirmed?'Your rule confirmation is saved.':'Rules saved. Confirmation is still needed.');},snapshot,'timer':toggleTimer,'timer-reset':()=>{clearInterval(timer);timer=null;running=false;seconds=0;updateClock();$('#timer-button').innerHTML=icon('play',14)+' Start rehearsal';},'intake-back':()=>{if(intakeStep>0){captureIntake();intakeStep--;render();}else go('projects');},'clear':()=>showModal('Clear this workspace?',`<p>This removes all saved projects, proof boards, notes, and version histories from this browser. Export a library backup first to keep your work. Downloaded files are not deleted.</p>`,`<button class="btn" data-action="export-library">Export library backup</button><button class="btn primary" data-action="clear-confirm">Clear all saved projects ${icon('trash',15)}</button>`),'clear-confirm':async()=>{try{await clearStored();project=null;go('home');toast('All saved projects and version histories cleared.');}catch{toast('Could not clear device storage. Try again in browser settings.');}},'download-interview':()=>{downloadBlob(new Blob(['PITCHVIVA / INTERVIEW GUIDE\n\nAsk about real past behaviour. Do not pitch first.\n\n1. When did this problem last happen?\n2. What did you do to work around it?\n3. What was difficult, slow, or costly?\n4. What have you already tried?\n5. Could you show me how you handle it today?\n\nRecord date, participant count, consent, and observations. Do not invent results.\n'],{type:'text/plain'}),'pitchviva-interview-guide.txt');toast('Interview guide downloaded.');}};try{await actions[a]?.();}catch{toast('That action could not finish. Your saved project is still available.');}});
function captureIntake(){const form=$('#intake-form');if(form)for(const [k,v]of new FormData(form))intakeDraft[k]=clean(v,3000);}
document.addEventListener('submit',async e=>{if(e.target.id!=='intake-form')return;e.preventDefault();clearTimeout(saving);captureIntake();if(!intakeDraft.name){$('#form-error').textContent='Give your project a name to continue.';$('#name')?.focus();return;}project=validateProject({...intakeDraft,template:intakeDraft.template||choosePitchTheme(intakeDraft)});intakeDraft.id=project.id;if(await save()===false)return;if(intakeStep<3){intakeStep++;render();}else{tab='rules';slideIndex=0;go('workspace');toast('Your workspace is ready. Confirm the event rules next.');}});
document.addEventListener('input',e=>{if(e.target.matches('[data-edit]')&&project){project[e.target.dataset.edit]=e.target.value;
 const preview=e.target.id==='slide-text'?$('.slide-stage'):$('#story-live-preview');
 if(preview)preview.innerHTML=renderDeckSlide(project,slideIndex);
 project.checklist.facts=false;project.checklist.files=false;project.updatedAt=Date.now();const count=$('#count-'+e.target.dataset.edit);if(count)count.textContent=clean(e.target.value).split(/\s+/).filter(Boolean).length+' words · target 80 or fewer';document.querySelectorAll('.save-state').forEach(n=>n.textContent='Saving on this device…');scheduleSave();}if(e.target.id==='event-rules'&&project){project.rules=clean(e.target.value,10000);project.confirmed=false;Object.assign(project.checklist,{template:false,policy:false,files:false,portal:false});const cb=$('#rules-confirm');if(cb)cb.checked=false;document.querySelectorAll('.save-state').forEach(n=>n.textContent='Saving on this device…');scheduleSave();}});
document.addEventListener('change',async e=>{if(e.target.id==='template-select'&&project){project.template=e.target.value;project.checklist.files=false;await save();render();}});
function flushWorkspace(){clearTimeout(saving);saving=null;const pending=[...dirtyProjects.values()].map(item=>item.target);return Promise.all(pending.map(target=>save(true,target)));}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushWorkspace();});
window.addEventListener('pagehide',flushWorkspace);
function openHomeSection(id){if(!['deck-review','workflow'].includes(id))return false;if(route!=='home'){route='home';render();}document.getElementById(id)?.scrollIntoView({behavior:'instant',block:'start'});return true;}
window.addEventListener('hashchange',()=>{const r=location.hash.slice(1);if(openHomeSection(r))return;if(routeNames[r]||r==='workspace')go(r);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#sidebar')?.classList.remove('open');syncSidebar();}});

$('#modal').addEventListener('close',()=>{presentationOpen=false;});
document.addEventListener('keydown',e=>{
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if($('#modal').open)$('#modal').close();else commandPalette();return;}
 if($('#modal').open&&$('#modal').classList.contains('sample-present-dialog')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();selectSample(heroLens+(e.key==='ArrowRight'?1:-1));return;}
 if(presentationOpen&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();slideIndex=(slideIndex+(e.key==='ArrowRight'?1:5))%6;presentationMarkup();return;}
 if($('#modal').classList.contains('command-dialog')&&$('#modal').open&&['ArrowDown','ArrowUp','Enter'].includes(e.key)){
  const items=[...document.querySelectorAll('.command-result')];if(!items.length)return;const current=items.indexOf(document.activeElement);
  if(e.key==='Enter'&&current<0){e.preventDefault();items[0].click();}else if(e.key!=='Enter'){e.preventDefault();items[current<0?(e.key==='ArrowDown'?0:items.length-1):(current+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();}
 }
});
document.addEventListener('input',e=>{
 if(e.target.id==='command-search')$('#command-results').innerHTML=commandResults(e.target.value);
 if(e.target.id==='project-search'){let count=0;document.querySelectorAll('#project-library [data-project]').forEach(card=>{const match=card.textContent.toLowerCase().includes(e.target.value.toLowerCase());card.hidden=!match;if(match)count++;});$('#project-empty-search').hidden=count>0||!e.target.value;}
 if(project&&(e.target.matches('[data-note]')||e.target.matches('[data-answer]'))){if(e.target.dataset.note){project.notes[e.target.dataset.note]=e.target.value;project.checklist.files=false;}else {project.answers[Number(e.target.dataset.answer)]=e.target.value;project.checklist.files=false;}project.updatedAt=Date.now();document.querySelectorAll('.save-state').forEach(n=>n.textContent='Saving on this device…');scheduleSave();}
 if(e.target.matches('[data-edit]')){const estimate=$('#reading-estimate');if(estimate)estimate.textContent='≈ '+readingTime(e.target.value).seconds+'s spoken at 130 words/min';}
});
document.addEventListener('change',async e=>{
 if(project&&e.target.id==='project-deadline'){project.deadline=e.target.value;project.checklist.portal=false;await save();render();}
 if(project&&e.target.matches('[data-checklist]')){project.checklist[e.target.dataset.checklist]=e.target.checked;await save();render();}
});
document.addEventListener('submit',async e=>{
 if(e.target.getAttribute('id')!=='evidence-form')return;e.preventDefault();const data=Object.fromEntries(new FormData(e.target));
 if(!data.claim.trim()||!data.source.trim()){$('#evidence-error').textContent='Add the claim and where it came from before saving.';return;}
 if(!data.noteId&&project.evidence.length>=30){$('#evidence-error').textContent='You can keep up to 30 source notes per project.';return;}
 const entry={id:data.noteId||createId(),claim:clean(data.claim,1200),source:clean(data.source,2000),type:data.type,slide:data.slide};const existing=project.evidence.findIndex(x=>x.id===entry.id);if(existing>=0)project.evidence[existing]=entry;else project.evidence.push(entry);project.checklist.facts=false;project.checklist.files=false;const saved=await save();render();if(saved!==false)toast('Source note saved. Add only what it actually supports to your slides.');
});

document.addEventListener('input',e=>{if(!e.target.closest('#intake-form'))return;captureIntake();$('#intake-preview').innerHTML=intakePreview();if(!intakeDraft.name)return;project=validateProject(intakeDraft);intakeDraft.id=project.id;project.updatedAt=Date.now();const index=library.findIndex(p=>p.id===project.id);if(index<0&&library.length<MAX_PROJECTS)library.push(project);else if(index>=0)library[index]=project;scheduleSave(project);});

function projectDetails(){showModal('A few details. A little more you.',`<form id="project-details-form"><div class="field"><label for="detail-name">Project name</label><input id="detail-name" name="projectName" required maxlength="80" value="${esc(project.name)}"></div><div class="field"><label for="detail-team">Team name</label><input id="detail-team" name="team" maxlength="100" value="${esc(project.team)}"></div><div class="field"><label for="detail-event">Event name</label><input id="detail-event" name="event" maxlength="160" value="${esc(project.event)}"></div><div class="field"><label for="detail-deadline">Submission deadline</label><input id="detail-deadline" name="deadline" type="date" value="${esc(project.deadline)}"></div><p class="disabled-note">Changing the event clears its rules, requirement map, and submission record. Update the deadline for the new event before saving.</p><button class="btn primary" type="submit">Save project details ${icon('check',15)}</button><div class="details-extra-actions"><button type="button" class="btn text" data-action="export-project">Export a backup ${icon('download',13)}</button><button type="button" class="btn text remove-link" data-action="remove-project">Remove project</button></div></form>`);}
document.addEventListener('submit',async e=>{if(e.target.getAttribute('id')!=='project-details-form')return;e.preventDefault();const data=Object.fromEntries(new FormData(e.target));const changed=project.event!==clean(data.event,160);project.name=clean(data.projectName,80);if(!project.name)return;project.team=clean(data.team,100);project.event=clean(data.event,160);const deadline=clean(data.deadline,20);if(changed){clearEventReview(project);project.deadline=deadline===project.deadline?'':deadline;}else if(project.deadline!==deadline){project.deadline=deadline;project.checklist.portal=false;}if(await save()===false)return;$('#modal').close();render();toast(changed?'Details saved. Recheck the rules for the new event.':'Project details saved.');});


let pendingProofRemoval=null;
function confirmRemoveProof(){pendingProofRemoval=$('#evidence-id').value;const entry=project.evidence.find(e=>e.id===pendingProofRemoval);if(!entry)return;$('#modal').open&&$('#modal').close();showModal('Remove this source note?',`<p>“${esc(entry.claim)}” will be removed from this project. Your slide wording will stay unchanged. Export a project backup first if you want to keep the note.</p>`,`<button class="btn" data-action="close-modal">Keep the note</button><button class="btn primary" data-action="remove-proof-confirm">Remove source note</button>`);}
async function removeProof(){project.evidence=project.evidence.filter(e=>e.id!==pendingProofRemoval);pendingProofRemoval=null;project.checklist.facts=false;project.checklist.files=false;if(await save()===false)return;$('#modal').close();render();toast('Source note removed. Review any slide wording that relied on it.');}
function confirmRemoveProject(){$('#modal').close();showModal('Remove this project?',`<p>“${esc(project.name)}” and its local notes, proof board, and versions will be removed from this browser. Your other projects will stay saved. Download a backup first if you want to keep it.</p>`,`<button class="btn" data-action="export-project">Export backup ${icon('download',14)}</button><button class="btn primary" data-action="remove-project-confirm">Remove this project</button>`);}
async function removeProject(){const target=project;if(!target)return;const state=await deleteStored(target);project=library.find(item=>item.id===state.activeId)||null;go('projects');toast('Project removed from this device. Your other projects are still saved.');}

await initStorage();route=location.hash.slice(1)||(location.pathname==='/pitch.html'?'create':'home');if(!routeNames[route]&&route!=='workspace')route='home';render();openHomeSection(location.hash.slice(1));

async function prepareOfflineWorkspace(){
 const update=message=>{offlineStatus=message;const status=$('#offline-status');if(status)status.textContent=message;};
 if(!('serviceWorker' in navigator))return update('Offline installation is unavailable in this browser. Export a backup before closing.');
 try{
  const registration=await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});
  const ready=()=>update('Offline workspace installed: editing, standard review and exports can reopen without a connection. Keep backups of your projects.');
  const observed=new WeakSet();
  const observe=()=>{
   const worker=registration.installing||registration.waiting;
   if(worker&&!observed.has(worker)){
    observed.add(worker);
    const changed=()=>{if(worker.state==='activated')ready();else if(worker.state==='redundant')update(registration.active?'The latest offline update could not finish. Your installed workspace is still available; retry while connected.':'Offline installation could not finish. Reopen while connected to retry; your project is still available.');};
    worker.addEventListener('statechange',changed);changed();
   }else if(registration.active)ready();
  };
  registration.addEventListener('updatefound',observe);observe();
  if(registration.active){
   // Check the current release on each opening without relying on the browser's
   // normal update interval. A stalled/offline update must not block local work.
   let timeout;
   try{await Promise.race([registration.update().catch(()=>{}),new Promise(resolve=>{timeout=setTimeout(resolve,4000);})]);}
   finally{clearTimeout(timeout);}
   observe();
  }
 }catch{update('Offline installation could not finish. Reopen while connected to retry; export a backup to keep your work.');}
}
prepareOfflineWorkspace();

initPreparation({project:()=>project,save,render,toast,story:key=>{slideIndex=fields.findIndex(([k])=>k===key);tab='story';go('workspace');},download:(text,name)=>downloadBlob(new Blob([text],{type:'text/plain;charset=utf-8'}),safeFilename(name)+'-preparation-workbook.txt')});

initTemplate({project:()=>project,render,toast,loadScript,download:downloadBlob});

initAssist({project:()=>project,save,render,download:text=>downloadBlob(new Blob([text],{type:'application/json'}),'pitchviva-gemini-result.json')});
initWinnerReference({project:()=>project,save,render,toast});

function updateSlideReviewStatus(){
 const button=$('[data-action="mark-slide-reviewed"]');
 if(!button)return;
 const slide=slides(project)[slideIndex];
 const reviewed=slideReviewed(project,slide.key);
 button.disabled=!hasDraftContent(project[slide.key]);
 button.setAttribute('aria-pressed',String(reviewed));
 const status=$('#slide-review-status');
 const label=reviewed?'Reviewed by your team':'Review pending';
 if(status.textContent!==label)status.textContent=label;
}
document.addEventListener('input',event=>{
 if(event.target.matches('#slide-headline,#slide-text,#deck-speaker-notes,#deck-image-alt'))updateSlideReviewStatus();
});

