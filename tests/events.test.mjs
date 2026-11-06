import test from 'node:test';
import assert from 'node:assert/strict';
import {eventCatalog,catalogSearch,normalizeEvent,wikiResults,searchPublicEvents,eventBriefText,pitchCompass} from '../dist/event-engine.mjs';
import {validateProject,analyze,sample} from '../dist/engine.mjs';
import {reviewClaims} from '../dist/claim-engine.mjs';
test('event search recognizes aliases and keeps filters independent of remote results',()=>{assert.equal(catalogSearch('SIH')[0].name,'Smart India Hackathon');assert.equal(catalogSearch('microsoft')[0].id,'imagine');assert.equal(catalogSearch('hult','Hackathon').length,0);assert.equal(catalogSearch('no-such-event-123').length,0);});
test('untrusted event imports cannot introduce executable source URLs or unbounded arrays',()=>{const e=normalizeEvent({name:'X',source:'javascript:alert(1)',official:'https://u:p@example.com/',summary:'x'.repeat(5000),facts:Array(100).fill(['a','b']),angles:Array(100).fill('a')});assert.equal(e.source,'');assert.equal(e.official,'');assert.equal(e.summary.length,1200);assert.equal(e.facts.length,4);assert.equal(e.angles.length,3);assert.equal(e.origin,'manual');});
test('Wikipedia lookup preserves rank, rejects disambiguation, and removes irrelevant article titles',()=>{const pages=[{pageid:9,ns:0,title:'Hackathon',extract:'a',index:1},{pageid:10,ns:0,title:'TechCrunch',extract:'a',index:2},{pageid:11,ns:0,title:'TechCrunch Disrupt',extract:'a',index:0},{pageid:12,ns:0,title:'Disrupt',extract:'a',pageprops:{disambiguation:''}}];const out=wikiResults({query:{pages}},new Date('2026-11-04'),'TechCrunch Disrupt');assert.deepEqual(out.map(e=>e.name),['TechCrunch Disrupt','TechCrunch']);assert.ok(out.every(e=>e.origin==='wikipedia'&&!e.official));});
test('public search encodes input, omits credentials, and never transmits project data',async()=>{let requested;await searchPublicEvents('A & B?',{fetcher:async(url,options)=>{requested={url,options};return {ok:true,json:async()=>({query:{pages:[]}})};}});assert.equal(requested.url.searchParams.get('gsrsearch'),'A & B?');assert.equal(requested.url.origin,'https://en.wikipedia.org');assert.equal(requested.options.credentials,'omit');assert.equal(requested.options.referrerPolicy,'no-referrer');});
test('public search errors stay errors and never turn into invented event facts',async()=>{await assert.rejects(()=>searchPublicEvents('Unknown',{fetcher:async()=>({ok:false})}));await assert.rejects(()=>searchPublicEvents('Unknown',{fetcher:async()=>({ok:true,json:async()=>({error:{code:'bad'}})})}));assert.deepEqual(wikiResults({}),[]);});
test('brief, reviewed checks, and source attribution survive backup round-trip',()=>{const p=validateProject({...sample,event:eventCatalog[0].name,eventBrief:eventCatalog[0],eventChecks:{edition:true,policy:true,unknown:true}});const reloaded=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(reloaded.eventBrief.source,eventCatalog[0].source);assert.equal(reloaded.eventChecks.policy,true);assert.equal(reloaded.eventChecks.unknown,undefined);assert.match(eventBriefText(reloaded.eventBrief,reloaded),/\[x\] Check AI/);assert.match(eventBriefText(reloaded.eventBrief,reloaded),/does not establish eligibility/);});
test('changing the event name drops an imported brief for another event',()=>{const p=validateProject({...sample,event:'Something else',eventBrief:eventCatalog[0]});assert.equal(p.eventBrief,null);});
test('pitch compass reports draft presence and does not invent an event fit score',()=>{const result=pitchCompass(sample);assert.equal(result[0].ready,true);assert.equal(result[2].ready,false);assert.equal(result[0].score,undefined);});
test('a numerical claim cannot be cleared by an unrelated source or by the same number alone',()=>{const base={...sample,impact:'We have 250 users.',evidence:[{id:'one',slide:'impact',claim:'250 meals collected.',source:'Test notes'}]};assert.equal(reviewClaims(base).find(c=>c.key==='impact').status,'needs-source');assert.ok(analyze(base).blockers.some(i=>i.kind==='number'));base.evidence[0].claim='We have 250 users.';assert.equal(reviewClaims(base).find(c=>c.key==='impact').status,'source-note');assert.ok(!analyze(base).blockers.some(i=>i.kind==='number'));});
test('matching source notes must belong to the same slide and have a source',()=>{const p={...sample,impact:'We reduced waste by 34.5%.',evidence:[{slide:'proof',claim:'We reduced waste by 34.5%.',source:'https://example.com/'}]};assert.equal(reviewClaims(p).find(c=>c.key==='impact').status,'needs-source');p.evidence[0].slide='impact';p.evidence[0].source='';assert.equal(reviewClaims(p).find(c=>c.key==='impact').status,'needs-source');});
test('goals are explicitly distinct from measured claims, with decimal values preserved',()=>{const claims=reviewClaims({...sample,impact:'Our goal is to reduce waste by 34.5%. We have 250 users.'});assert.equal(claims[0].status,'goal');assert.match(claims[0].quote,/34\.5%/);assert.equal(claims[1].status,'needs-source');});
test('conflicting slide limits produce a blocking warning instead of a false readiness pass',()=>{const p={...sample,confirmed:true,rules:'Maximum 4 slides.'};assert.ok(analyze(p).blockers.some(i=>i.id==='slide-limit'));});

test('event aliases match even when an edition year is included',()=>{
 assert.equal(catalogSearch('SIH 2026')[0]?.id,'sih');
 assert.equal(catalogSearch('Smart India Hackathon 2027')[0]?.id,'sih');
 assert.equal(catalogSearch('Hult Prize 2026')[0]?.id,'hult');
});

test('library searches punctuation, reordered words, topics, locations and a small typo',()=>{
 assert.equal(catalogSearch('smart-india 2027')[0]?.id,'sih');
 assert.equal(catalogSearch('prize hult')[0]?.id,'hult');
 assert.equal(catalogSearch('Harvard hackathon')[0]?.id,'hackharvard');
 assert.equal(catalogSearch('HackHarvrd')[0]?.id,'hackharvard');
 assert.ok(catalogSearch('social innovation').some(e=>e.id==='mitsolve'));
 assert.ok(catalogSearch('Cambridge').some(e=>e.id==='hackharvard'));
 assert.equal(catalogSearch('MIT Solve','Hackathon').length,0);
 assert.equal(new Set(eventCatalog.map(e=>e.id)).size,eventCatalog.length);
 assert.ok(eventCatalog.every(e=>e.source.startsWith('https://')));
});
