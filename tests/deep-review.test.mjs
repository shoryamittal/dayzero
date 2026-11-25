import test from 'node:test';
import assert from 'node:assert/strict';
import {handleReviewAI} from '../api/review-ai.mjs';
import {validateSlideBatch,validateStrategy,mergeDeepReview,deepReviewMarkdown} from '../dist/deep-review-model.mjs';
import {requestDeepReview} from '../dist/deep-review-client.mjs';
import {buildReview} from '../dist/review-engine.mjs';

const key='test-key-with-at-least-twenty-characters';
const slide=(index=1)=>({index,title:'Pilot',paragraphs:['We plan to test with 12 students.'],text:'We plan to test with 12 students.',count:7,runs:[{text:'12 students',font:'Arial',size:24}],outside:[],pictures:0,missingAlt:0,hidden:false});
const finding=()=>({title:'Distinguish the plan from results',quote:'We plan to test with 12 students.',visualRegion:'',why:'Judges cannot evaluate validation from a planned sample.',fix:'Add the recruitment method and show measured outcomes once the pilot is complete.',rewrite:'We plan to test with 12 students. [ADD EVIDENCE]',ruleQuote:'Show testing evidence',lens:'evidence',severity:'priority'});
const coached=(index=1)=>({index,purpose:'Explain what has been tested.',strength:'The pilot is labelled as a plan.',headline:'A student pilot is the next test',judgeQuestion:'What result would change your approach?',evidenceNeeded:'Collect completed tasks and failures.',visualScope:'No matching PDF: rendered design was not inspected.',findings:[finding()]});
const rules='Show testing evidence';
const strategy=()=>({summary:'Make the evidence gap explicit before the next round.',criteria:[{quote:rules,state:'partial',slides:[1],reason:'A test is planned but results are absent.',next:'Run the test and cite the observed outcome.'}],crossSlide:[],unresolved:['Confirm the current round.']});
const req=(data,headers={})=>new Request('https://pitch.test/api/review-ai',{method:'POST',headers:{'Content-Type':'application/json','x-gemini-key':key,...headers},body:JSON.stringify(data)});
const upstream=result=>async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(result)}]}}]});

test('AI review requires a connection and never calls upstream without it',async()=>{
 let calls=0;
 const response=await handleReviewAI(new Request('https://pitch.test/api/review-ai',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),{serverKey:'',fetcher:async()=>{calls++;}});
 assert.equal(response.status,401);assert.equal(calls,0);
 const info=await handleReviewAI(new Request('https://pitch.test/api/review-ai'),{serverKey:''});
 assert.equal((await info.json()).available,false);
 assert.equal((await handleReviewAI(req({action:'slides'},{origin:'https://foreign.test'}),{serverKey:''})).status,403);
});
test('AI slide endpoint sends the actual deck and returns grounded reasons and fixes',async()=>{
 const response=await handleReviewAI(req({action:'slides',slides:[slide()],rules,indexes:[1],reference:'Winning decks often introduce the user first.'}),{serverKey:'',fetcher:async(url,options)=>{
  assert.equal(options.headers['x-goog-api-key'],key);
  const sent=JSON.parse(options.body),context=JSON.parse(sent.contents[0].parts[0].text);
  assert.equal(context.reference,'Winning decks often introduce the user first.');assert.deepEqual(context.selectedIndexes,[1]);
  return upstream({slides:[coached()]})()
 }});
 assert.equal(response.status,200);
 const result=(await response.json()).result[0];
 assert.equal(result.findings[0].basis,'AI suggestion');assert.ok(result.findings[0].why);assert.ok(result.findings[0].fix);
});
test('rejects invented passages, unsourced criteria, missing slides and visual claims without PDF',()=>{
 assert.throws(()=>validateSlideBatch({slides:[{...coached(),findings:[{...finding(),quote:'We tested 100 customers.'}]}]},[1],[slide()],rules),/quoted/);
 assert.throws(()=>validateSlideBatch({slides:[]},[1],[slide()],rules),/every/);
 assert.throws(()=>validateSlideBatch({slides:[{...coached(),findings:[{...finding(),ruleQuote:'Revenue is required'}]}]},[1],[slide()],rules),/brief/);
 assert.throws(()=>validateSlideBatch({slides:[{...coached(),findings:[{...finding(),visualRegion:'Bottom right'}]}]},[1],[slide()],rules),/without rendered/);
 assert.throws(()=>validateStrategy({...strategy(),criteria:[{...strategy().criteria[0],quote:'Must use Azure'}]},[slide()],rules),/invented/);
});
test('suggested wording cannot introduce a new numeric claim',()=>{
 const result=validateSlideBatch({slides:[{...coached(),findings:[{...finding(),rewrite:'We tested 500 students and achieved 90% satisfaction.'}]}]},[1],[slide()],rules);
 assert.equal(result[0].findings[0].rewrite,'');
});
test('cross-slide reasoning must cite passages on different known slides',()=>{
 const item={title:'Pilot stages are unclear',quotes:[{index:1,quote:slide().text},{index:2,quote:slide().text}],why:'Make the pilot stage consistent.',fix:'Name the stage and evidence date on both slides.'};
 const result=validateStrategy({...strategy(),crossSlide:[item]},[slide(),slide(2)],rules);assert.equal(result.crossSlide.length,1);
 assert.throws(()=>validateStrategy({...strategy(),crossSlide:[{...item,quotes:[item.quotes[0],item.quotes[0]]}]},[slide(),slide(2)],rules),/Incomplete/);
});
test('PDF visual analysis requires real PDF bytes, size limits and matching-order confirmation',async()=>{
 const data={action:'slides',slides:[slide()],rules,indexes:[1]};
 assert.equal((await handleReviewAI(req({...data,visualPDF:Buffer.from('not a pdf').toString('base64'),visualConfirmed:true}),{serverKey:''})).status,400);
 assert.equal((await handleReviewAI(req({...data,visualPDF:Buffer.from('%PDF-1.7 test').toString('base64')}),{serverKey:''})).status,400);
 const visual={...coached(),findings:[{...finding(),quote:'',visualRegion:'Title at the top left',lens:'readability',ruleQuote:''}]};
 const response=await handleReviewAI(req({...data,visualPDF:Buffer.from('%PDF-1.7 test').toString('base64'),visualConfirmed:true}),{serverKey:'',fetcher:async(url,options)=>{
  const parts=JSON.parse(options.body).contents[0].parts;assert.equal(parts[1].inlineData.mimeType,'application/pdf');
  return upstream({slides:[visual]})()
 }});
 assert.equal(response.status,200);assert.equal((await response.json()).result[0].findings[0].basis,'AI visual suggestion');
});
test('provider quota, blocked output and malformed results never become completed reviews or expose keys',async()=>{
 for(const response of [Response.json({secret:key},{status:429}),Response.json({candidates:[{finishReason:'SAFETY'}]}),Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'not JSON'}]}}]})]){
  const out=await handleReviewAI(req({action:'slides',slides:[slide()],rules,indexes:[1]}),{serverKey:'',fetcher:async()=>response});
  assert.ok(out.status>=400);assert.ok(!(await out.text()).includes(key));
 }
});
test('live search requires grounded sources and keeps only HTTPS links',async()=>{
 const fetcher=async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'Check the organizer page.'}]},groundingMetadata:{groundingChunks:[{web:{title:'Organizer',uri:'https://event.example/rules'}},{web:{title:'bad',uri:'javascript:alert(1)'}}],searchEntryPoint:{renderedContent:'<p>Search suggestions</p>'}}}]});
 const response=await handleReviewAI(req({action:'search',query:'Example competition 2027'}),{serverKey:'',fetcher});
 const data=await response.json();assert.equal(response.status,200);assert.equal(data.sources.length,1);assert.ok(data.suggestions);
 const empty=await handleReviewAI(req({action:'search',query:'Unknown competition'}),{serverKey:'',fetcher:upstream({})});assert.equal(empty.status,502);
});
test('the client reviews every batch then runs strategy and exports full reasoning',async()=>{
 const slides=Array.from({length:7},(_,i)=>slide(i+1)),model=buildReview(slides,rules),progress=[],batches=[];
 const result=await requestDeepReview(model,{rules,event:'Example event',visualPDF:'not retained in report'},{key,onProgress:s=>progress.push(s),fetcher:async(url,options)=>{
  assert.equal(url,'/api/review-ai');const data=JSON.parse(options.body);
  if(data.action==='slides'){batches.push(data.indexes);return Response.json({result:data.indexes.map(coached),provider:'Gemini',model:'test'});}
  return Response.json({result:strategy(),provider:'Gemini',model:'test'});
 }});
 assert.deepEqual(batches,[[1,2,3,4,5],[6,7]]);assert.equal(result.deepReview.slides.length,7);assert.equal(result.deepReview.complete,true);assert.equal(progress.length,3);
 assert.ok(!JSON.stringify(result.deepReview.context).includes('not retained'));assert.ok(deepReviewMarkdown(result).includes('Why:'));
 assert.throws(()=>mergeDeepReview(model,{...strategy(),slides:[coached()]}),/incomplete/);
});
test('cancellation stops the deep workflow and incomplete batches never count as success',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(()=>requestDeepReview(buildReview([slide()],rules),{rules},{signal:controller.signal}),/cancelled/);
 await assert.rejects(()=>requestDeepReview(buildReview([slide()],rules),{rules},{fetcher:async()=>Response.json({result:[]})}),/skipped/);
});

test('reason and fix are rendered separately, with untrusted HTML escaped',async()=>{
 const {deepFinding,deepSummary,deepSlide}=await import('../dist/deep-review-view.mjs');
 const html=deepFinding({...finding(),why:'<script>alert(1)</script>',fix:'Add the source'});
 assert.ok(html.includes('Why it matters'));assert.ok(html.includes('How to fix it'));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
 assert.ok(deepFinding({topic:'Projection',action:'Inspect at presentation size.'}).includes('Why it matters'));
 const model=mergeDeepReview(buildReview([slide()],rules),{...strategy(),context:{rules},slides:validateSlideBatch({slides:[coached()]},[1],[slide()],rules)});
 assert.ok(deepSummary(model).includes('Competition criteria'));assert.ok(deepSlide(model,1).includes('Be ready for this question'));
});
test('non-English source pages and reference pages retain readable excerpts',async()=>{
 const {extractRequirements,extractReference}=await import('../api/competition.mjs');
 const text='Les critères du concours exigent une démonstration du prototype et des preuves de validation.';
 assert.ok(extractRequirements('<p>'+text+'</p>').includes(text));
 assert.ok(extractReference('<p>Past teams demonstrated a real workflow and explained the evidence behind it.</p>').length);
});

test('reference comparisons require an exact passage from the supplied reference',()=>{
 const item={...coached(),referenceQuote:'Open with a concrete user problem',referenceLesson:'Introduce the affected user before naming the product.'};
 assert.throws(()=>validateSlideBatch({slides:[item]},[1],[slide()],rules,{reference:'Different reference'}),/reference comparison/);
 const result=validateSlideBatch({slides:[item]},[1],[slide()],rules,{reference:'Open with a concrete user problem, then demonstrate the workflow.'});
 assert.ok(result[0].referenceLesson);
});
