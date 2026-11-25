import {mergeDeepReview} from './deep-review-model.mjs';
export async function aiCall(data,{key='',signal,fetcher=fetch}={}){
 let response;
 try{response=await fetcher('/api/review-ai',{method:'POST',credentials:'same-origin',
  headers:{'Content-Type':'application/json',...(key?{'x-gemini-key':key}:{})},
  signal:signal?AbortSignal.any([signal,AbortSignal.timeout(50000)]):AbortSignal.timeout(50000),body:JSON.stringify(data)});}
 catch(error){if(signal?.aborted)throw Error('Deep review cancelled. Standard checks are still available.');throw Error('AI connection failed or timed out. Standard checks are still available.');}
 let body;try{body=await response.json();}catch{throw Error('AI service returned an incomplete response.');}
 if(!response.ok)throw Error(body.error||'AI service is unavailable.');
 return body;
}
export async function requestDeepReview(model,context,{key='',signal,onProgress=()=>{},fetcher=fetch}={}){
 const reviews=[];
 for(let start=0;start<model.slides.length;start+=5){
  if(signal?.aborted)throw Error('Deep review cancelled. Standard checks are still available.');
  const indexes=model.slides.slice(start,start+5).map(s=>s.index);
  onProgress('Reviewing story, evidence and judge questions · slides '+indexes[0]+'–'+indexes.at(-1)+' of '+model.slides.length);
  const body=await aiCall({...context,slides:model.slides,action:'slides',indexes},{key,signal,fetcher});
  if(!Array.isArray(body.result)||body.result.length!==indexes.length||body.result.some(s=>!indexes.includes(s.index)))throw Error('AI skipped a requested slide. Deep review was not completed.');
  reviews.push(...body.result);
 }
 onProgress('Connecting the argument across slides and mapping competition criteria…');
 const body=await aiCall({...context,slides:model.slides,action:'strategy'},{key,signal,fetcher});
 if(!body.result?.summary||!Array.isArray(body.result.criteria)||!Array.isArray(body.result.crossSlide))throw Error('AI did not finish the competition strategy.');
 return mergeDeepReview(model,{...body.result,slides:reviews,provider:body.provider,model:body.model,context:{event:context.event,edition:context.edition,stage:context.stage,source:context.source,rules:context.rules,visual:!!context.visualPDF,reference:context.reference?'Reference supplied':''},checked:new Date().toISOString()});
}
