import {requestDeckReview} from './review-client.mjs';
import {aiCall,requestDeepReview} from './deep-review-client.mjs';
import {externalIntegrationsEnabled} from './integration-policy.mjs';

const cancelled=signal=>{if(signal?.aborted)throw Error('Review cancelled.');};
const safeSource=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}};

export async function runPresentationReview(slides,{event='',source='',additionalRules='',signal,onProgress=()=>{},fetcher=fetch,externalEnabled=externalIntegrationsEnabled(),baseline}={}){
 cancelled(signal);
 additionalRules=String(additionalRules||'').trim().slice(0,3000);
 source=safeSource(source);
 // Freeze the original brief for comparison; changing web sources must not
 // change the meaning of the reported before/after counts.
 let prepared={event,additionalRules,rules:baseline?.rules??additionalRules,reference:'',source,sources:[],referenceSources:[],notes:[],available:false};
 if(baseline){
  prepared={...prepared,...baseline,rules:String(baseline.rules||'').slice(0,6000)};
  additionalRules=String(prepared.additionalRules||'').slice(0,3000);source=safeSource(prepared.source);
  onProgress('Comparing the revised slides against the same saved brief…');
 }else if(externalEnabled){
  onProgress(event?'Finding competition requirements and reference material…':'Preparing your slide-by-slide review…');
  try{
   const body=await aiCall({action:'prepare',event,source,additionalRules},{signal,fetcher,externalEnabled});
   if(typeof body.rules!=='string'||body.rules.length>6000||typeof body.reference!=='string'||body.reference.length>12000)throw Error('Incomplete research');
   prepared=body;
  }catch(error){
   cancelled(signal);
   prepared.notes=['Competition research could not finish. No unverified rules or reference comparisons are included.'];
  }
 }else{
  onProgress('Preparing your private, on-device review…');
  prepared.notes=[
   'Live competition research and AI coaching are pending. No review content was sent to a server or external provider.',
   additionalRules?'Only the organiser rules you supplied are checked. Confirm their edition and round before submission.':'No organiser rules were supplied. Add the current brief to check its requirements.',
   ...(source?['Your event link is saved as a reference only; its contents were not fetched.']:[])
  ];
 }
 cancelled(signal);
 onProgress('Checking slide text, typography and supplied requirements on this device…');
 let model=await requestDeckReview(slides,prepared.rules,fetcher,{signal,remote:false});
 cancelled(signal);
 if(externalEnabled&&prepared.available){
  try{model=await requestDeepReview(model,{event,rules:prepared.rules,reference:prepared.reference,source:prepared.source,referenceSource:prepared.referenceSource,stage:'Use the applicable round only if established by the provided sources; flag ambiguity'},
   {signal,onProgress,fetcher,externalEnabled});}
  catch{cancelled(signal);model.aiError='In-depth analysis could not finish. The completed text, typography and rule checks are shown below.';}
 }else if(externalEnabled)model.aiError='In-depth analysis is temporarily unavailable. This review contains text, typography and readable-rule checks only.';
 else model.integrationStatus='pending';
 model.research={additionalRules,source:source||prepared.source||'',sources:prepared.sources||[],referenceSources:prepared.referenceSources||[],notes:prepared.notes||[],suggestions:externalEnabled?prepared.suggestions||'':'',mode:externalEnabled?'connected':'local',frozen:!!baseline};
 model.checked=new Date().toISOString();
 return {model,rules:prepared.rules,source:prepared.source||source,context:{...prepared,available:externalEnabled&&!!prepared.available}};
}
