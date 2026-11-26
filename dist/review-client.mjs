import {buildReview} from './review-engine.mjs';
import {reviewInput} from './review-input.mjs';
import {externalIntegrationsEnabled} from './integration-policy.mjs';

export async function requestDeckReview(slides,rules,fetcher=fetch,{signal,remote=externalIntegrationsEnabled()}={}) {
  if(signal?.aborted) throw Error('Review cancelled.');
  const input=reviewInput({slides,rules});
  // Identical measured checks run in both environments; an API is not needed.
  if(!remote) return {...buildReview(input.slides,input.rules),execution:'local'};
  let response;
  try {
    response=await fetcher('/api/deck-review',{method:'POST',headers:{'Content-Type':'application/json'},
      credentials:'same-origin',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000),body:JSON.stringify(input)});
  } catch {
    if(signal?.aborted) throw Error('Review cancelled.');
    throw Error('Could not reach the review service. Your file is still selected. Check your connection and try again.');
  }
  if(signal?.aborted) throw Error('Review cancelled.');
  let data;
  try {data=await response.json();} catch {throw Error('The review service returned an incomplete response. Please try again.');}
  if(!response.ok) throw Error(data?.error||'The review service is temporarily unavailable. Please try again.');
  if(data?.version!==1 || !data.model || !Array.isArray(data.model.slides) ||
    data.model.slides.length!==slides.length || !Array.isArray(data.model.findings) || !Array.isArray(data.model.checks))
    throw Error('The review was incomplete. Please try again.');
  return {...data.model,execution:'service'};
}
