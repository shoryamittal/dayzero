import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pitchKitFiles} from '../dist/pitch-kit.mjs';

test('a pitch kit follows the project and flags where the team needs proof', () => {
  const project = {
    name: 'Campus Meals', team: 'Team Table', event: 'College Innovation Day', eventRound: 'Final',
    problem: 'Students miss the last canteen service.',
    solution: 'Reserve unclaimed surplus meals before closing.',
    approach: 'A canteen updates its available meals in a shared form.',
    proof: 'We reached 100 students.',
    ask: 'Give us permission to test with one canteen.',
    slideHeadlines: {proof: 'Early validation'},
    notes: {problem: 'The last tray leaves the serving counter just before many night classes end.'},
    preparation: {duration: 60, speakers: {problem:'Asha'}, requirements: [
      {title:'Show pilot evidence', quote:'Include what you tested in the field.', source:'https://example.org/rules', section:'proof'}
    ]}
  };
  const files = pitchKitFiles(project);
  const report = files['deck-rationale.txt'];
  assert.match(report, /Slide 4 \/ Early validation/);
  assert.match(report, /Include what you tested in the field/);
  assert.match(report, /We reached 100 students/);
  const script = files['speaker-script.txt'];
  assert.equal((script.match(/^Slide \d/gm) || []).length, 6);
  assert.match(script, /0–10 s \/ Asha/);
  assert.match(script, /Trim to 10 s/);
  assert.match(script, /Hello, we’re Team Table/);
  assert.match(script, /last tray leaves the serving counter/);
  assert.match(script, /Thank you for listening/);
  const practice = files['jury-questions-and-answers.txt'];
  assert.match(practice, /Show pilot evidence/);
  assert.match(practice, /Add proof or remove the unsupported number/);
  assert.match(practice, /\[Name the outcome, baseline and measurement plan\.\]/);
});
