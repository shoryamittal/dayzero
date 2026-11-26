import test from 'node:test';
import assert from 'node:assert/strict';
import {pitchDelivery,resolvedSpeakerNotes,withSpeakerNotes,pitchKitFiles} from '../dist/pitch-kit.mjs';
import {validateProject} from '../dist/engine.mjs';
test('delivery distinguishes real draft content from missing information',()=>{
 const p=validateProject({name:'Space finder',solution:'Find quiet study spaces.',problem:'[ADD DATA: name the user]',proof:'[ADD EVIDENCE: test results]'});
 const d=pitchDelivery(p);assert.equal(d.total,6);assert.equal(d.filled,1);assert.ok(d.missing.includes('problem'));assert.ok(d.missing.includes('proof'));
 assert.equal(d.files.length,5);assert.equal(d.slides.find(s=>s.key==='solution').hasContent,true);
});
test('PowerPoint speaker-note fallback follows current text and never mutates manual notes',()=>{
 const p=validateProject({name:'Space finder',team:'Campus team',solution:'Find quiet study spaces.',notes:{problem:'Our handwritten opening.'}});
 const before=JSON.stringify(p),notes=resolvedSpeakerNotes(p);
 assert.equal(notes.problem,'Our handwritten opening.');assert.match(notes.solution,/Find quiet study spaces/);
 assert.match(notes.proof,/Describe a completed test/);assert.equal(Object.keys(notes).length,6);
 const exported=withSpeakerNotes(p);assert.equal(exported.notes.solution,notes.solution);assert.equal(JSON.stringify(p),before);
 p.solution='The updated workflow.';assert.match(resolvedSpeakerNotes(p).solution,/updated workflow/);
});
test('delivery package provides a grounded script, rationale and judge practice together',()=>{
 const p=validateProject({name:'Space finder',solution:'Find quiet study spaces.'});
 const files=pitchKitFiles(p);
 assert.match(files['speaker-script.txt'],/Find quiet study spaces/);
 assert.match(files['jury-questions-and-answers.txt'],/current alternative/);
 assert.match(files['deck-rationale.txt'],/Slide 6/);
});
