import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eventCatalog, searchPublicEvents} from '../dist/event-engine.mjs';
import {competitionSelection, competitionRoundGuide} from '../dist/competition-picker.mjs';
import {localCompetitionMatches} from '../dist/competition-lookup.mjs';
import {localWordingSuggestions, applyWordingSuggestion, requestPitchAssist, assistStudio} from '../dist/assist-ui.mjs';
import {referenceFromText, compareReference, winnerReferencePanel} from '../dist/winner-reference.mjs';
import {validateProject, sample} from '../dist/engine.mjs';

const briefs=JSON.parse(readFileSync(new URL('../dist/competition-briefs.json',import.meta.url),'utf8'));

test('saved competition references match aliases without applying another edition’s saved rules',()=>{
  assert.equal(localCompetitionMatches(briefs,'CIH')[0].record.name,'Central India Hackathon 4.0');
  const results=localCompetitionMatches(briefs,'Imagine Cup 2026');
  assert.ok(results.some(item=>item.record.id==='imagine'));
  assert.ok(results.every(item=>!item.brief||!item.record.name.includes('2027')));
  const selection=competitionSelection(eventCatalog.find(item=>item.id==='imagine'),{year:'2026',reference:'https://example.com/current-rules'});
  assert.equal(selection.name,'Imagine Cup 2026');
  assert.match(selection.edition,/2026.*not verified/);
  assert.equal(selection.official,'https://example.com/current-rules');
  assert.equal(competitionRoundGuide(selection,'2026'),null);
  assert.ok(competitionRoundGuide(selection,'2027').choices['Developer tools']);
  assert.equal(competitionRoundGuide(eventCatalog.find(item=>item.id==='sih'),'2026'),null);
});

test('local competition source links reject executable URLs',()=>{
  const result=localCompetitionMatches([{name:'Unsafe event',alias:'unsafe',url:'javascript:alert(1)'}],'unsafe');
  assert.deepEqual(result,[]);
  assert.equal(competitionSelection({name:'Custom',source:'javascript:alert(1)'},{reference:'javascript:alert(1)'}).source,'');
});

test('background search and writing assistance make no request while integrations are pending',async()=>{
  let calls=0;
  await assert.rejects(()=>searchPublicEvents('SIH',{fetcher:async()=>{calls++;throw Error('Network should not run');}}),/pending/);
  const previousFetch=globalThis.fetch;
  try{
    globalThis.fetch=async()=>{calls++;throw Error('Network should not run');};
    const result=await requestPitchAssist(validateProject({...sample}),'draft');
    assert.equal(result.status,'pending');
  }finally{globalThis.fetch=previousFetch;}
  assert.equal(calls,0);
  const html=assistStudio(validateProject({...sample}));
  assert.match(html,/Check wording locally/);
  assert.match(html,/AI suggestions pending/);
  assert.doesNotMatch(html,/name="apiKey"|type="password"/);
});

test('local wording changes preserve facts, apply only to the original section and support exact undo',()=>{
  const project=validateProject({...sample,problem:'we are planning to interview 12 students in order to understand the problem. We are planning to interview 12 students in order to understand the problem.',solution:'Our app has the ability to reserve a meal.',notes:{problem:'Keep this custom note.'}});
  project.slideReviews={problem:'old',solution:'untouched'};
  const original=project.problem;
  const suggestion=localWordingSuggestions(project).find(item=>item.section==='problem');
  assert.match(suggestion.after,/12 students/);
  assert.equal((suggestion.after.match(/12 students/g)||[]).length,1);
  assert.equal(applyWordingSuggestion(project,suggestion),true);
  assert.equal(project.notes.problem,'Keep this custom note.');
  assert.equal(project.history.at(-1).data.problem,original);
  assert.equal(project.slideReviews.problem,undefined);
  assert.equal(project.slideReviews.solution,'untouched');
  assert.equal(applyWordingSuggestion(project,suggestion),false,'stale suggestion must not overwrite edits');
  assert.equal(applyWordingSuggestion(project,{section:suggestion.section,before:suggestion.after,after:suggestion.before}),true);
  assert.equal(project.problem,original);
  assert.equal(project.solution,'Our app has the ability to reserve a meal.');
});

test('reference material is bounded, source-labelled and separate from project claims',()=>{
  const source='https://example.com/published-pitch';
  const reference=referenceFromText({name:'Example',text:'The team tested a pilot and measured results.',source});
  const project=validateProject({...sample,winnerReference:reference});
  assert.equal(project.winnerReference.source,source);
  assert.equal(validateProject(JSON.parse(JSON.stringify(project))).winnerReference.source,source);
  assert.throws(()=>referenceFromText({text:'  '}),/Paste reference/);
  assert.throws(()=>referenceFromText({text:'Example',source:'javascript:alert(1)'}),/https/);
  assert.equal(referenceFromText({text:'x'.repeat(20000)}).text.length,16000);
  const before=JSON.stringify(project);
  const comparison=compareReference(project,reference.text);
  assert.equal(comparison.rows.find(item=>item.label==='Evidence').reference,true);
  assert.equal(JSON.stringify(project),before);
  const html=winnerReferencePanel(project,value=>String(value).replaceAll('<','&lt;'));
  assert.match(html,/Reference achievements never count/);
  assert.match(html,/Live AI analysis is pending/);
});
