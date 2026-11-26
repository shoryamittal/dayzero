import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStudioPitch,normalizePitchBuild} from '../dist/pitch-builder.mjs';
import {pitchStart} from '../dist/pitch-start.mjs';
import {validateProject} from '../dist/engine.mjs';
import {sections} from '../dist/assist-model.mjs';
import {handleAssist} from '../api/assist.mjs';

const idea=()=>validateProject({id:'pitch-1',name:'Study spaces',team:'Asha',event:'Custom challenge',solution:'Students find quiet study spaces.',rules:'Maximum 6 slides.'});
const draft={story:Object.fromEntries(sections.map(key=>[key,key==='solution'?'Students find quiet study spaces.':'[ADD DATA: add a supported '+key+' detail.]'])),headlines:Object.fromEntries(sections.map(key=>[key,'Your '+key])),gaps:['What did a student do last time they needed a study space?']};
const research={available:true,rules:'Maximum 6 slides.',reference:'The published project shows one complete workflow.',sources:[{title:'Organiser',url:'https://organizer.example/rules',excerpts:['Maximum 6 slides.']}],referenceSources:[],notes:['Edition to confirm.']};
const response=value=>Response.json(value);

test('pitch start is brief and never asks customers for AI or reference setup',()=>{
 const html=pitchStart({arrow:''});
 assert.match(html,/<idea-editor/);assert.match(html,/name="event"/);assert.match(html,/name="competitionLink"/);
 assert.match(html,/name="rules"/);assert.match(html,/name="proof"/);
 assert.ok(!/API key|winner-source|type="password"|competition-picker/.test(html));
});
test('automatic pitch research and drafting use server credentials and preserve the original',async()=>{
 const p=idea(),progress=[],calls=[];
 const result=await buildStudioPitch(p,{source:'https://organizer.example',save:async()=>{},refresh:()=>progress.push(p.pitchBuild.steps.draft),fetcher:async(url,options)=>{
  calls.push({url,data:JSON.parse(options.body)});assert.equal(options.headers['x-gemini-key'],undefined);
  return response(url==='/api/review-ai'?research:{result:draft});
 }});
 assert.equal(calls[0].data.additionalRules,'Maximum 6 slides.');
 assert.equal(calls[1].data.input.winnerReference.text,research.reference);
 assert.equal(p.solution,draft.story.solution);assert.equal(p.problem,draft.story.problem);
 assert.equal(p.history[0].data.solution,'Students find quiet study spaces.');
 assert.equal(p.name,'Study spaces');assert.equal(p.team,'Asha');
 assert.equal(result.aiApplied,true);assert.equal(result.steps.draft,'done');assert.ok(progress.includes('running'));
 assert.equal(p.confirmed,false);assert.equal(result.sources[0].title,'Organiser');
 assert.equal(validateProject(JSON.parse(JSON.stringify(p))).pitchBuild.aiApplied,true);
});
test('without a server AI connection users keep their idea and receive meaningful next questions',async()=>{
 const p=idea();
 const result=await buildStudioPitch(p,{fetcher:async(url)=>{assert.equal(url,'/api/review-ai');return response({...research,available:false});}});
 assert.equal(p.problem,'');assert.equal(p.history.length,0);assert.equal(result.aiApplied,false);
 assert.equal(result.steps.draft,'limited');assert.equal(result.gaps.length,3);assert.match(result.message,/temporarily unavailable/);
});
test('research failures preserve user rules and never trigger a draft with invented context',async()=>{
 const p=idea();let count=0;
 const result=await buildStudioPitch(p,{fetcher:async()=>{count++;throw Error('network');}});
 assert.equal(count,1);assert.equal(p.rules,'Maximum 6 slides.');assert.equal(p.solution,'Students find quiet study spaces.');
 assert.equal(result.steps.research,'limited');assert.equal(result.sources.length,0);
});
test('edits made during an AI request are never overwritten',async()=>{
 const p=idea();
 const result=await buildStudioPitch(p,{fetcher:async(url)=>{
  if(url==='/api/review-ai')return response(research);
  p.solution='My newer product description.';
  return response({result:draft});
 }});
 assert.equal(p.solution,'My newer product description.');assert.equal(p.problem,'');
 assert.equal(result.aiApplied,false);assert.equal(p.history.length,0);assert.match(result.message,/edits were kept/);
});
test('changing the organiser rules while research runs stops automatic application',async()=>{
 const p=idea();let calls=0;
 const result=await buildStudioPitch(p,{fetcher:async()=>{calls++;p.rules='Maximum 4 slides.';return response(research);}});
 assert.equal(calls,1);assert.equal(p.rules,'Maximum 4 slides.');assert.equal(result.steps.draft,'limited');assert.equal(result.aiApplied,false);
});
test('incomplete provider drafts cannot replace the story',async()=>{
 const p=idea();
 const result=await buildStudioPitch(p,{fetcher:async(url)=>response(url==='/api/review-ai'?research:{result:{story:{solution:'Invented'},headlines:{},gaps:[]}})});
 assert.equal(result.aiApplied,false);assert.equal(p.solution,'Students find quiet study spaces.');assert.equal(p.history.length,0);
});
test('saved build metadata bounds data and removes unsafe source URLs',()=>{
 const state=normalizePitchBuild({steps:{draft:'something'},sources:[{url:'javascript:alert(1)'},{url:'https://example.com',excerpts:['x'.repeat(1000)]}],gaps:Array(30).fill('x'.repeat(1000))});
 assert.equal(state.steps.draft,'waiting');assert.equal(state.sources.length,1);assert.equal(state.sources[0].excerpts[0].length,500);assert.equal(state.gaps.length,8);
});
test('pitch drafting accepts owner-side credentials without asking visitors for a key',async()=>{
 const req=new Request('https://pitch.example/api/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'draft',input:{solution:'Students find quiet study spaces.'}})});
 let calls=0;
 const r=await handleAssist(req,async(url,options)=>{calls++;assert.equal(options.headers['x-goog-api-key'],'server-key-for-mocked-provider-only');return response({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(draft)}]}}]});},{serverKey:'server-key-for-mocked-provider-only'});
 assert.equal(r.status,200);assert.equal(calls,1);assert.equal((await r.json()).result.story.solution,draft.story.solution);
});

test('deleted or replaced projects are not saved or drafted when research returns',async()=>{
 const p=idea();let current=true,saves=0,calls=0;
 const result=await buildStudioPitch(p,{isCurrent:()=>current,save:async()=>{saves++;},fetcher:async()=>{
  calls++;current=false;return response(research);
 }});
 assert.equal(result,null);assert.equal(calls,1);assert.equal(saves,1);assert.equal(p.history.length,0);
});
test('deleted projects cannot receive a delayed AI draft',async()=>{
 const p=idea();let current=true,saves=0;
 const result=await buildStudioPitch(p,{isCurrent:()=>current,save:async()=>{saves++;},fetcher:async(url)=>{
  if(url==='/api/review-ai')return response(research);
  current=false;return response({result:draft});
 }});
 assert.equal(result,null);assert.equal(saves,2);assert.equal(p.history.length,0);
});
test('headline edits made during AI drafting are preserved',async()=>{
 const p=idea();
 const result=await buildStudioPitch(p,{fetcher:async(url)=>{
  if(url==='/api/review-ai')return response(research);
  p.slideHeadlines.solution='My edited headline';return response({result:draft});
 }});
 assert.equal(result.aiApplied,false);assert.equal(p.slideHeadlines.solution,'My edited headline');assert.equal(p.history.length,0);
});
test('retry remembers the event link and keeps newly edited references',async()=>{
 const p=idea();p.pitchBuild=normalizePitchBuild({source:'https://organizer.example/rules'});let query;
 const result=await buildStudioPitch(p,{fetcher:async(url,options)=>{
  query=JSON.parse(options.body);p.winnerReference={name:'My reference',text:'Keep my reference'};
  return response({...research,available:false});
 }});
 assert.equal(query.source,'https://organizer.example/rules');assert.equal(result.source,query.source);
 assert.equal(p.winnerReference.text,'Keep my reference');
});
test('malformed research cannot partially replace the user rules',async()=>{
 const p=idea();
 const result=await buildStudioPitch(p,{fetcher:async()=>response({...research,rules:'Different rules',sources:{bad:true}})});
 assert.equal(p.rules,'Maximum 6 slides.');assert.equal(result.steps.research,'limited');assert.equal(p.history.length,0);
});

test('retry preserves the full saved rulebook beyond the research input limit',async()=>{
 const p=idea();p.rules='x'.repeat(7000)+' Keep this final instruction.';
 const original=p.rules;
 await buildStudioPitch(p,{fetcher:async(url,options)=>{
  const data=JSON.parse(options.body);
  return response({...research,available:false,rules:data.additionalRules+'\nNew readable requirement.'});
 }});
 assert.ok(p.rules.startsWith(original));assert.match(p.rules,/New readable requirement/);assert.ok(p.rules.length<=10000);
});
