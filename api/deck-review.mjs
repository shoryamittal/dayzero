import {buildReview} from '../dist/review-engine.mjs';

const MAX_BYTES = 768 * 1024;
const reply = (body, status=200) => Response.json(body, {status, headers:{
  'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'
}});
const text = (value, limit) => {
  if(typeof value !== 'string' || value.length > limit) throw Error('Invalid slide text.');
  return value;
};
const integer = (value, max) => {
  if(!Number.isInteger(value) || value < 0 || value > max) throw Error('Invalid slide metadata.');
  return value;
};
export function reviewInput(data) {
  if(!data || !Array.isArray(data.slides) || !data.slides.length || data.slides.length > 40)
    throw Error('Upload a presentation with 1–40 slides.');
  const rules=text(data.rules ?? '',6000);
  const slides=data.slides.map((slide,i)=>{
    if(!slide || slide.index!==i+1 || !Array.isArray(slide.paragraphs) || slide.paragraphs.length>2000 ||
      !Array.isArray(slide.runs) || slide.runs.length>5000 || !Array.isArray(slide.outside) ||
      slide.outside.length>2000 || typeof slide.hidden!=='boolean') throw Error('Invalid slide structure.');
    const paragraphs=slide.paragraphs.map(p=>text(p,30000));
    const joined=paragraphs.join(' ');
    if(joined.length>60000) throw Error('Too much text on one slide.');
    const runs=slide.runs.map(run=>{
      if(!run || !(run.size===null || Number.isFinite(run.size)&&run.size>0&&run.size<=4000))
        throw Error('Invalid text size.');
      return {text:text(run.text,30000),font:text(run.font,200),size:run.size};
    });
    const pictures=integer(slide.pictures,10000),missingAlt=integer(slide.missingAlt,10000);
    if(missingAlt>pictures) throw Error('Invalid picture metadata.');
    return {index:i+1,title:text(slide.title,90),paragraphs,text:joined,
      count:(joined.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).length,
      runs,outside:slide.outside.map(name=>text(name,1000)),pictures,missingAlt,hidden:slide.hidden};
  });
  return {slides,rules};
}
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
