import test from 'node:test';
import assert from 'node:assert/strict';
import {pitchNextSteps} from '../dist/pitch-builder.mjs';
test('rough idea gets three concrete next steps without repeating the supplied solution',()=>{
 const steps=pitchNextSteps({solution:'Help students find quiet spaces.'});
 assert.deepEqual(steps.map(s=>s.key),['problem','approach','proof']);
 assert.match(steps[1].question,/workflow/);
});
test('completed sections disappear and unsupported placeholders stay actionable',()=>{
 const p={problem:'Students lack space.',solution:'A space finder.',approach:'Search and reserve.',proof:'[ADD DATA: test results]',impact:'More useful study time.',ask:'A campus pilot.'};
 assert.deepEqual(pitchNextSteps(p).map(s=>s.key),['proof']);
 p.proof='Testing is planned, not completed.';
 assert.deepEqual(pitchNextSteps(p),[]);
});
test('missing project is safe and the guide never mutates the story',()=>{
 assert.equal(pitchNextSteps(null).length,3);
 const p=Object.freeze({solution:'An idea.'});
 pitchNextSteps(p);assert.equal(Object.keys(p).length,1);
});
