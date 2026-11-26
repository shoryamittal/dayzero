import test from 'node:test';
import assert from 'node:assert/strict';
import {runPresentationReview} from '../dist/review-runner.mjs';
import {requestDeckReview} from '../dist/review-client.mjs';
import {aiCall,requestDeepReview} from '../dist/deep-review-client.mjs';
import {assessRule,reviewMarkdown,compareReviews} from '../dist/review-engine.mjs';
import {reviewIntake} from '../dist/review-shell.mjs';

const slide=(index=1,text='TODO: We improve outcomes by 80%.')=>({index,title:'Pilot',paragraphs:[text],runs:[{text,font:'Arial',size:16}],outside:[],pictures:0,missingAlt:0,hidden:false,text:'forged',count:0});
const noNetwork=()=>assert.fail('No network request is permitted while integrations are pending.');

test('default presentation review completes locally with provider research and all APIs unreachable',async()=>{
 const result=await runPresentationReview([slide(),slide(2)],{event:'Campus final',source:'https://event.example/rules',additionalRules:'1 slide maximum',fetcher:noNetwork});
 assert.equal(result.model.execution,'local');
 assert.equal(result.model.integrationStatus,'pending');
 assert.equal(result.model.breaches.length,1);
 assert.ok(result.model.findings.some(item=>item.topic==='Evidence'));
 assert.ok(result.model.findings.some(item=>item.topic==='Unfinished text'));
 assert.ok(result.model.slides[0].count>0);
 assert.notEqual(result.model.slides[0].text,'forged');
 assert.equal(result.model.deepReview,undefined);
 assert.deepEqual(result.model.research.sources,[]);
 const report=reviewMarkdown(result.model,{name:'campus.pptx',event:'Campus final'});
 assert.match(report,/on-device/);assert.match(report,/saved reference; not fetched/);
 assert.match(report,/No review content was sent/);assert.match(report,/1 slide maximum/);
 assert.ok(reviewIntake().includes('Your file and slide text stay on this device.'));
});

test('cancelled review and deferred deep analysis never begin network work',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(()=>runPresentationReview([slide()],{signal:controller.signal,fetcher:noNetwork}),/cancelled/);
 await assert.rejects(()=>requestDeckReview([slide()],'',noNetwork,{signal:controller.signal}),/cancelled/);
 await assert.rejects(()=>aiCall({action:'prepare'},{fetcher:noNetwork}),/pending/i);
 await assert.rejects(()=>requestDeepReview({slides:[slide()]},{},{fetcher:noNetwork}),/pending/i);
});

test('revised deck uses the frozen brief even if a different rule or source is supplied later',async()=>{
 const before=await runPresentationReview([slide(),slide(2)],{additionalRules:'Maximum 1 slide',fetcher:noNetwork});
 const after=await runPresentationReview([slide(1,'Students reserve a campus pickup.')],{additionalRules:'Maximum 0 slides',baseline:before.context,fetcher:noNetwork});
 assert.equal(after.rules,'Maximum 1 slide');
 assert.equal(before.model.breaches.length,1);assert.equal(after.model.breaches.length,0);
 assert.equal(after.model.research.frozen,true);
 assert.match(reviewMarkdown(after.model,{comparison:{name:'before.pptx',rows:compareReviews(before.model,after.model)}}),/original saved brief/);
});

test('common exact, minimum and maximum slide rules measure all slides without interpreting exclusions',()=>{
 const slides=[slide(),{...slide(2),hidden:true}];
 for(const rule of ['1 slide maximum','At most 1 slide','Submit a maximum of 1 slide','Exactly 1 slide'])assert.equal(assessRule(rule,slides).state,'Over limit',rule);
 for(const rule of ['At least 3 slides','Minimum 3 slides','Exactly 3 slides'])assert.equal(assessRule(rule,slides).state,'Below minimum',rule);
 for(const rule of ['Exactly 2 slides','2 slides maximum'])assert.equal(assessRule(rule,slides).state,'Within limit',rule);
 assert.equal(assessRule('Maximum 1 slide excluding appendix',slides).state,'Needs manual review');
});

test('cancellation reaches a configured standard review request immediately',async()=>{
 const controller=new AbortController();
 const pending=requestDeckReview([slide()],'',async(_url,{signal})=>new Promise((resolve,reject)=>{
  signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
  controller.abort();
 }),{remote:true,signal:controller.signal});
 await assert.rejects(pending,/cancelled/);
});
