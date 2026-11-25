import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewIntake} from '../dist/review-shell.mjs';
import {prepareCompetition} from '../api/review-research.mjs';
import {handleReviewAI} from '../api/review-ai.mjs';
import {handleDeckReview} from '../api/deck-review.mjs';
import {runPresentationReview} from '../dist/review-runner.mjs';

const slide=()=>({index:1,title:'Pilot',text:'We will test with students.',paragraphs:['We will test with students.'],runs:[],outside:[],pictures:0,missingAlt:0,hidden:false});
const request=data=>new Request('https://pitch.test/api/review-ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
const reader=async(url,kind)=>({source:url,checked:'2026-11-26T00:00:00Z',excerpts:[kind==='reference'?'The reference starts with a concrete user and workflow.':'Maximum 0 slides']});

test('public intake asks for the presentation and competition, optional event link and additional rules',()=>{
 const html=reviewIntake();
 assert.equal((html.match(/type="file"/g)||[]).length,1);
 assert.match(html,/id="event"/);assert.match(html,/id="review-source"/);assert.match(html,/id="review-additional-rules"/);
 for(const removed of ['review-ai-key','review-depth','review-ai-consent','review-visual-pdf','review-visual-confirm','review-reference-file','review-reference','id="rules"','id="round"'])assert.ok(!html.includes(removed),removed);
 assert.ok(!/configure|API key|Export this PowerPoint as PDF/.test(html));
});
test('research gathers actual rule and reference pages without using model prose as a rulebook',async()=>{
 const queries=[],read=[];
 const result=await prepareCompetition({event:'One-off global event'},{searcher:async query=>{
  queries.push(query);return {answer:'Invented requirement: use 50 slides',sources:[{title:'Source',url:query.includes('previous winners')?'https://winner.example/pitch':'https://organizer.example/rules'}]};
 },reader:async(url,kind)=>{read.push({url,kind});return reader(url,kind);}});
 assert.equal(queries.length,2);assert.equal(read.length,2);
 assert.equal(result.rules,'Maximum 0 slides');assert.ok(!result.rules.includes('50'));
 assert.ok(result.reference);assert.equal(result.sources.length,1);assert.equal(result.referenceSources.length,1);
 assert.ok(result.notes.some(n=>/not independently verified/.test(n)));
});
test('missing sources stay missing, and unsafe source links are rejected',async()=>{
 const result=await prepareCompetition({event:'Unknown event'},{reader});
 assert.equal(result.rules,'');assert.equal(result.reference,'');assert.ok(result.notes.some(n=>/not found/.test(n)));
 await assert.rejects(()=>prepareCompetition({source:'http://localhost/internal'},{reader}),/public HTTPS/);
 const failed=await prepareCompetition({source:'https://organizer.example/rules'},{reader:async()=>{throw Error('blocked');}});
 assert.equal(failed.rules,'');assert.equal(failed.sources.length,0);
});
test('research output stays within rule and reference input limits',async()=>{
 const result=await prepareCompetition({event:'Custom event'},{searcher:async query=>({sources:Array.from({length:10},(_,i)=>({title:'Source '+i,url:'https://page'+i+'.example/'+(query.includes('previous winners')?'winner':'rules')}))}),
 reader:async(url)=>({source:url,excerpts:Array(40).fill('x'.repeat(450)),checked:'2026-11-26'})});
 assert.ok(result.rules.length<=6000);assert.ok(result.reference.length<=12000);assert.ok(result.sources.length<=3);assert.ok(result.referenceSources.length<=2);
});
test('preparation works without asking visitors for a provider credential',async()=>{
 let upstream=0;
 const response=await handleReviewAI(request({action:'prepare',event:'Custom event',source:'https://organizer.example/rules'}),{serverKey:'',reader,fetcher:async()=>{upstream++;throw Error('must not call');}});
 assert.equal(response.status,200);const body=await response.json();assert.equal(body.available,false);assert.equal(body.rules,'Maximum 0 slides');assert.equal(upstream,0);
});
test('the one-click runner completes real standard checks when extended analysis is unavailable',async()=>{
 const progress=[],payloads=[];
 const result=await runPresentationReview([slide()],{event:'Custom event',onProgress:s=>progress.push(s),fetcher:async(url,options)=>{
  payloads.push(JSON.parse(options.body));assert.ok(!options.headers['x-gemini-key']);
  if(url==='/api/review-ai')return handleReviewAI(new Request('https://pitch.test'+url,options),{serverKey:'',reader});
  return handleDeckReview(new Request('https://pitch.test'+url,options));
 },source:'https://organizer.example/rules'});
 assert.equal(result.model.breaches.length,1);assert.ok(result.model.aiError);assert.ok(!/key|configure|PDF/.test(result.model.aiError));
 assert.equal(payloads[0].action,'prepare');assert.equal(progress.length,2);assert.equal(result.model.research.sources.length,1);
});
test('extended review failure preserves completed checks and cancellation stops the run',async()=>{
 const result=await runPresentationReview([slide()],{fetcher:async(url,options)=>{
  const data=JSON.parse(options.body);
  if(data.action==='prepare')return Response.json({available:true,rules:'',reference:'',sources:[],referenceSources:[],notes:[]});
  if(url==='/api/deck-review')return handleDeckReview(new Request('https://pitch.test'+url,options));
  return Response.json({error:'internal provider credential problem'},{status:502});
 }});
 assert.ok(result.model.aiError.includes('could not finish'));assert.ok(!result.model.aiError.includes('credential'));
 const controller=new AbortController();controller.abort();
 await assert.rejects(()=>runPresentationReview([slide()],{signal:controller.signal,fetcher:async()=>{throw Error('abort');}}),/cancelled/);
});

test('additional organiser rules survive research failure and accompany discovered requirements',async()=>{
 const prepared=await prepareCompetition({source:'https://organizer.example/rules',additionalRules:'Maximum 6 slides'},{reader});
 assert.match(prepared.rules,/Maximum 6 slides/);assert.match(prepared.rules,/Maximum 0 slides/);
 assert.equal(prepared.additionalRules,'Maximum 6 slides');
 const result=await runPresentationReview([slide()],{additionalRules:'Maximum 0 slides',fetcher:async(url,options)=>{
  if(url==='/api/review-ai')throw Error('offline research');
  return handleDeckReview(new Request('https://pitch.test'+url,options));
 }});
 assert.equal(result.model.breaches.length,1);assert.equal(result.model.research.additionalRules,'Maximum 0 slides');
});
test('long extra rules keep the combined research within the review limit',async()=>{
 const prepared=await prepareCompetition({source:'https://organizer.example/rules',additionalRules:'x'.repeat(5000)},{reader:async url=>({source:url,excerpts:Array(20).fill('a'.repeat(450))})});
 assert.equal(prepared.additionalRules.length,3000);assert.ok(prepared.rules.length<=6000);
});
