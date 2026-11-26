import {buildReview} from '../dist/review-engine.mjs';
import {reviewInput} from '../dist/review-input.mjs';
export {reviewInput} from '../dist/review-input.mjs';

const MAX_BYTES = 768 * 1024;
const reply = (body, status=200) => Response.json(body, {status, headers:{
  'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'
}});
async function readJSON(request) {
  if(Number(request.headers.get('content-length'))>MAX_BYTES) throw Error('Review input exceeds 768 KiB.');
  const reader=request.body?.getReader();
  if(!reader) throw Error('Missing review input.');
  let total=0,content='';
  const decoder=new TextDecoder();
  while(true) {
    const {value,done}=await reader.read();
    if(done) break;
    total+=value.byteLength;
    if(total>MAX_BYTES){await reader.cancel();throw Error('Review input exceeds 768 KiB.');}
    content+=decoder.decode(value,{stream:true});
  }
  return JSON.parse(content+decoder.decode());
}
export async function handleDeckReview(request) {
  if(request.method!=='POST') return reply({error:'Use POST to review a presentation.'},405);
  const origin=request.headers.get('origin');
  if((origin && origin!==new URL(request.url).origin) || request.headers.get('sec-fetch-site')==='cross-site')
    return reply({error:'Open the review on its own website.'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))
    return reply({error:'Expected JSON review input.'},415);
  try {
    const {slides,rules}=reviewInput(await readJSON(request));
    return reply({version:1,engine:'Slide and rule checks',model:buildReview(slides,rules)});
  } catch(error) {
    return reply({error:error instanceof SyntaxError?'Send valid JSON review input.':error.message},400);
  }
}
export default {fetch:handleDeckReview};
