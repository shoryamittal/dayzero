import {requestDeckReview} from './review-client.mjs';
import {aiCall,requestDeepReview} from './deep-review-client.mjs';
export async function runPresentationReview(slides,{event='',source='',additionalRules='',signal,onProgress=()=>{},fetcher=fetch}={}){
 additionalRules=String(additionalRules||'').trim().slice(0,3000);
 let prepared={event,rules:additionalRules,reference:'',source,sources:[],referenceSources:[],notes:[],available:false};
 onProgress(event?'Finding competition requirements and reference material…':'Preparing your slide-by-slide review…');
 try{
  const body=await aiCall({action:'prepare',event,source,additionalRules},{signal,fetcher});
  if(typeof body.rules!=='string'||body.rules.length>6000||typeof body.reference!=='string'||body.reference.length>12000)throw Error('Incomplete research');
  prepared=body;
 }catch(error){
  if(signal?.aborted)throw Error('Review cancelled.');
  prepared.notes=['Competition research could not finish. No unverified rules or reference comparisons are included.'];
 }
 if(signal?.aborted)throw Error('Review cancelled.');
 onProgress('Checking slide text, typography and the requirements we could read…');
 let model=await requestDeckReview(slides,prepared.rules,fetcher);
 if(signal?.aborted)throw Error('Review cancelled.');
 if(prepared.available){
  try{model=await requestDeepReview(model,{event,rules:prepared.rules,reference:prepared.reference,source:prepared.source,referenceSource:prepared.referenceSource,stage:'Use the applicable round only if established by the provided sources; flag ambiguity'},
   {signal,onProgress,fetcher});}
  catch{if(signal?.aborted)throw Error('Review cancelled.');model.aiError='In-depth analysis could not finish. The completed text, typography and rule checks are shown below.';}
 }else model.aiError='In-depth analysis is temporarily unavailable. This review contains text, typography and readable-rule checks only.';
 model.research={additionalRules,sources:prepared.sources||[],referenceSources:prepared.referenceSources||[],notes:prepared.notes||[],suggestions:prepared.suggestions||''};
 return {model,rules:prepared.rules,source:prepared.source||source};
}
