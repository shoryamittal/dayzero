export async function requestDeckReview(slides,rules,fetcher=fetch) {
  let response;
  try {
    response=await fetcher('/api/deck-review',{method:'POST',headers:{'Content-Type':'application/json'},
      credentials:'same-origin',signal:AbortSignal.timeout(20000),body:JSON.stringify({slides,rules})});
  } catch {
    throw Error('Could not reach the review service. Your file is still selected. Check your connection and try again.');
  }
  let data;
  try {data=await response.json();} catch {throw Error('The review service returned an incomplete response. Please try again.');}
  if(!response.ok) throw Error(data?.error||'The review service is temporarily unavailable. Please try again.');
  if(data?.version!==1 || !data.model || !Array.isArray(data.model.slides) ||
    data.model.slides.length!==slides.length || !Array.isArray(data.model.findings) || !Array.isArray(data.model.checks))
    throw Error('The review was incomplete. Please try again.');
  return data.model;
}
