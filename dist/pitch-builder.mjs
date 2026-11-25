import {assistInput,sections,validateAssistResult} from './assist-model.mjs';
const bounded=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
export function normalizePitchBuild(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const steps={};
 for(const key of ['research','draft'])steps[key]=['waiting','running','done','limited'].includes(value.steps?.[key])?value.steps[key]:'waiting';
 const sources=(Array.isArray(value.sources)?value.sources:[]).slice(0,5).flatMap(page=>{
  const url=safeURL(page?.url);return url?[{url,title:bounded(page.title,180),checked:bounded(page.checked,80),
   excerpts:(Array.isArray(page.excerpts)?page.excerpts:[]).slice(0,12).map(v=>bounded(v,500)).filter(Boolean)}]:[];
 });
 return {steps,message:bounded(value.message,500),gaps:(Array.isArray(value.gaps)?value.gaps:[]).slice(0,8).map(v=>bounded(v,350)).filter(Boolean),
  notes:(Array.isArray(value.notes)?value.notes:[]).slice(0,8).map(v=>bounded(v,500)).filter(Boolean),sources,aiApplied:value.aiApplied===true};
}
const fingerprint=project=>JSON.stringify(assistInput(project,'draft'));
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
export async function buildStudioPitch(project,{source='',save=async()=>{},refresh=()=>{},fetcher=fetch}={}){
 project.pitchBuild=normalizePitchBuild({steps:{research:'running',draft:'waiting'},message:'Finding competition context…',gaps:nextQuestions});
 const state=project.pitchBuild;
 const update=async()=>{await save();refresh();};
 await update();
 const event=project.event,originalRules=project.rules||'';
 let prepared={available:false};
 try{
  prepared=await call('/api/review-ai',{action:'prepare',event,source,additionalRules:originalRules.slice(0,3000)},fetcher);
  if(typeof prepared.rules!=='string'||prepared.rules.length>6000||typeof prepared.reference!=='string'||prepared.reference.length>12000)throw Error();
  if(project.event!==event||project.rules!==originalRules){
   state.steps.research='limited';state.steps.draft='limited';state.message='Your competition details changed. Automatic drafting stopped to keep your edits.';await update();return state;
  }
  project.rules=prepared.rules;project.confirmed=false;
  state.sources=[...(prepared.sources||[]),...(prepared.referenceSources||[])];
  state.notes=prepared.notes||[];
  if(prepared.reference)project.winnerReference={name:'Automatically collected references · winner status unverified',text:prepared.reference};
  state.steps.research=prepared.rules?'done':'limited';
 }catch{
  prepared={available:false};
  state.steps.research='limited';state.notes=['Competition research did not finish. Your additional rules are kept; no unverified event requirements were added.'];
 }
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
  const result=validateAssistResult('draft',body.result,input);
  if(fingerprint(project)!==snapshot){
   state.steps.draft='limited';state.message='You edited the story while drafting ran. Your edits were kept; the automatic draft was not applied.';
  }else{
   project.history=[...(project.history||[]),{at:Date.now(),data:Object.fromEntries(sections.map(key=>[key,project[key]])),slideHeadlines:{...project.slideHeadlines}}].slice(-5);
   for(const key of sections){project[key]=result.story[key];project.slideHeadlines[key]=result.headlines[key];}
   project.checklist.facts=false;project.checklist.files=false;
   state.steps.draft='done';state.aiApplied=true;state.gaps=result.gaps;
   state.message='Your first draft is ready. Check the facts and fill the evidence gaps before presenting.';
  }
 }catch{
  state.steps.draft='limited';state.message='Automatic drafting could not finish. Your idea and collected context are kept. You can keep editing or retry in the writing assistant.';
 }
 project.pitchBuild=normalizePitchBuild(state);await update();return project.pitchBuild;
}
