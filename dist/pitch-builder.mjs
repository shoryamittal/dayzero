import {assistInput,sections,validateAssistResult} from './assist-model.mjs';
import {externalIntegrationsEnabled,INTEGRATION_PENDING_MESSAGE} from './integration-policy.mjs';
import {hasDraftContent} from './pitch-content.mjs';
import {createProjectSnapshot} from './project-history.mjs';
const bounded=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
export function normalizePitchBuild(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const steps={};
 for(const key of ['research','draft'])steps[key]=['waiting','running','done','limited','pending','local'].includes(value.steps?.[key])?value.steps[key]:'waiting';
 const sources=(Array.isArray(value.sources)?value.sources:[]).slice(0,5).flatMap(page=>{
  const url=safeURL(page?.url);return url?[{url,title:bounded(page.title,180),checked:bounded(page.checked,80),
   excerpts:(Array.isArray(page.excerpts)?page.excerpts:[]).slice(0,12).map(v=>bounded(v,500)).filter(Boolean)}]:[];
 });
 return {steps,mode:value.mode==='local'?'local':'assisted',source:safeURL(value.source),message:bounded(value.message,500),gaps:(Array.isArray(value.gaps)?value.gaps:[]).slice(0,8).map(v=>bounded(v,350)).filter(Boolean),
  notes:(Array.isArray(value.notes)?value.notes:[]).slice(0,8).map(v=>bounded(v,500)).filter(Boolean),sources,aiApplied:value.aiApplied===true};
}
const fingerprint=project=>JSON.stringify({input:assistInput(project,'draft'),headlines:project.slideHeadlines});
const nextQuestions=[
 'Who has this problem, and what do they do today?',
 'What can someone do with your product that is difficult with the current alternative?',
 'What have you actually built or tested, and what did you learn?'
];
async function call(url,data,fetcher){
 const response=await fetcher(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
 body:JSON.stringify(data),signal:AbortSignal.timeout(50000)});
 if(!response.ok)throw Error('Service unavailable.');
 return response.json();
}

const noteHeadings = {
 problem:'problem', 'the problem':'problem', solution:'solution', 'your solution':'solution',
 approach:'approach', 'how it works':'approach', workflow:'approach',
 proof:'proof', evidence:'proof', validation:'proof',
 impact:'impact', outcome:'impact', outcomes:'impact',
 ask:'ask', 'next step':'ask', 'next steps':'ask'
};

// This recognises explicit headings only. It does not guess what the user's
// product does, manufacture a test result, or turn an intention into evidence.
export function arrangeLabeledNotes(value) {
 const text=bounded(value,6000),result={},found=new Set();let current=null;
 for(const line of text.split(/\r?\n/)){
  const match=line.match(/^\s*(?:#{1,6}\s*)?(?:\d+[.)]\s*)?(?:\*\*)?([A-Za-z ]{3,24})(?:\*\*)?\s*[:：]\s*(.*)$/);
  const key=match&&noteHeadings[match[1].trim().toLowerCase()];
  if(key){current=key;found.add(key);result[key]=[result[key],match[2]].filter(Boolean).join('\n');}
  else if(current)result[current]=[result[current],line].join('\n');
 }
 if(found.size<2)return {};
 return Object.fromEntries(Object.entries(result).map(([key,value])=>[key,bounded(value,6000)]).filter(([,value])=>hasDraftContent(value)));
}

export function prepareLocalPitch(project,source=''){
 const previous=normalizePitchBuild(project.pitchBuild);
 const arranged=arrangeLabeledNotes(project.solution);
 const changes=Object.entries(arranged).filter(([key,value])=>(key==='solution'||!hasDraftContent(project[key]))&&project[key]!==value);
 if(changes.length){
  project.history=[...(project.history||[]),createProjectSnapshot(project)].slice(-5);
  for(const [key,value] of changes)project[key]=value;
  project.checklist={...project.checklist,facts:false,files:false};
 }
 project.pitchBuild=normalizePitchBuild({
  mode:'local',source:source||previous?.source||'',steps:{research:'pending',draft:'local'},
  message:'Your editable six-slide workspace is ready. '+INTEGRATION_PENDING_MESSAGE+' Add the missing facts, review the rules, and export whenever you are ready.',
  gaps:pitchNextSteps(project).map(step=>step.question),
  sources:previous?.sources||[],
  notes:[
   changes.length?'Explicitly labelled sections were arranged from your notes. Your original wording is saved in version history.':'Your supplied idea, facts and organiser rules have been kept without automatic rewriting.',
   'No web research or AI request was made. Empty slides remain prompts; no evidence or competition rules were invented.',
   ...(previous?.sources.length?['Saved source excerpts have not been refreshed. Check the current edition and round yourself.']:[])
  ],aiApplied:false
 });
 return project.pitchBuild;
}

export async function buildStudioPitch(project,{source='',save=async()=>{},refresh=()=>{},fetcher=fetch,isCurrent=()=>true,allowExternal=externalIntegrationsEnabled()}={}){
 if(!isCurrent())return null;
 if(allowExternal!==true){
  const state=prepareLocalPitch(project,source);
  await save();
  if(!isCurrent())return null;
  refresh();return state;
 }
 source=source||project.pitchBuild?.source||'';
 project.pitchBuild=normalizePitchBuild({source,steps:{research:'running',draft:'waiting'},message:'Finding competition context…',gaps:nextQuestions});
 const state=project.pitchBuild;
 const update=async()=>{if(!isCurrent())return;await save();if(isCurrent())refresh();};
 await update();
 if(!isCurrent())return null;
 const originalReference=JSON.stringify(project.winnerReference);
 const event=project.event,originalRules=project.rules||'';
 let prepared={available:false};
 try{
  prepared=await call('/api/review-ai',{action:'prepare',event,source,additionalRules:originalRules.slice(0,3000)},fetcher);
  if(!isCurrent())return null;
  if(typeof prepared.rules!=='string'||prepared.rules.length>6000||typeof prepared.reference!=='string'||prepared.reference.length>12000)throw Error();
  if(project.event!==event||project.rules!==originalRules){
   state.steps.research='limited';state.steps.draft='limited';state.message='Your competition details changed. Automatic drafting stopped to keep your edits.';await update();return state;
  }
  if(!Array.isArray(prepared.sources)||!Array.isArray(prepared.referenceSources)||!Array.isArray(prepared.notes))throw Error();
  const research=normalizePitchBuild({sources:[...prepared.sources,...prepared.referenceSources],notes:prepared.notes});
  const sentRules=originalRules.slice(0,3000);
  const foundRules=sentRules&&prepared.rules.startsWith(sentRules)?prepared.rules.slice(sentRules.length).trim():prepared.rules;
  project.rules=[originalRules,foundRules].filter(Boolean).join('\n\n').slice(0,10000);project.confirmed=false;
  state.source=safeURL(prepared.source)||state.source;
  state.sources=research.sources;
  state.notes=research.notes;
  if(prepared.reference&&JSON.stringify(project.winnerReference)===originalReference)project.winnerReference={name:'Automatically collected references · winner status unverified',text:prepared.reference};
  state.steps.research=prepared.rules?'done':'limited';
 }catch{
  prepared={available:false};
  state.steps.research='limited';state.notes=['Competition research did not finish. Your additional rules are kept; no unverified event requirements were added.'];
 }
 if(!isCurrent())return null;
 if(project.event!==event){state.steps.draft='limited';state.message='The competition changed. Continue with your edited project.';await update();return state;}
 if(!prepared.available){
  state.steps.draft='limited';state.message='Your idea is ready to edit. Automatic AI drafting is temporarily unavailable; unfilled slides are prompts, not a completed pitch.';
  project.pitchBuild=normalizePitchBuild(state);await update();return project.pitchBuild;
 }
 state.steps.draft='running';state.message='Shaping the user problem, product story and evidence into slides…';
 const snapshot=fingerprint(project);await update();
 try{
  const input=assistInput(project,'draft');
  const body=await call('/api/assist',{mode:'draft',input},fetcher);
  if(!isCurrent())return null;
  const result=validateAssistResult('draft',body.result,input);
  if(fingerprint(project)!==snapshot){
   state.steps.draft='limited';state.message='You edited the story while drafting ran. Your edits were kept; the automatic draft was not applied.';
  }else{
   project.history=[...(project.history||[]),createProjectSnapshot(project)].slice(-5);
   for(const key of sections){project[key]=result.story[key];project.slideHeadlines[key]=result.headlines[key];}
   project.checklist.facts=false;project.checklist.files=false;
   state.steps.draft='done';state.aiApplied=true;state.gaps=result.gaps;
   state.message='Your first draft is ready. Check the facts and fill the evidence gaps before presenting.';
  }
 }catch{
  state.steps.draft='limited';state.message='Automatic drafting could not finish. Your idea and collected context are kept. You can keep editing or retry in the writing assistant.';
 }
 if(!isCurrent())return null;
 project.pitchBuild=normalizePitchBuild(state);await update();return project.pitchBuild;
}

export function pitchNextSteps(project){
 const prompts=[
 ['problem','Start with the user','Who experiences the problem, and what do they do today?'],
 ['solution','Make the benefit clear','What changes for that user when they use your product?'],
 ['approach','Show the product working','Describe one workflow: what the user does, what the product does, and what happens next.'],
 ['proof','Show what you know','What have you built or tested? If testing is still planned, say so and describe the next test.'],
 ['impact','Define a useful outcome','What would improve for the user, and how would you measure it?'],
 ['ask','Land the next step','What support do you need, and what specific action would it enable?']
 ];
 return prompts.filter(([key])=>!hasDraftContent(project?.[key]))
 .slice(0,3).map(([key,title,question])=>({key,title,question}));
}
