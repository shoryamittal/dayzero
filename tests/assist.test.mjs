import test from 'node:test';
import assert from 'node:assert/strict';
import {handleAssist} from '../api/assist.mjs';

const fakeKey = 'test-key-for-mocked-provider-only';
const input = {problem: 'Students miss submission deadlines.', rules: 'Maximum six slides.', name: 'Private title', team: 'Private team'};
function request(body, headers = {}) {
  return new Request('https://dayzero.example/api/assist', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'x-gemini-key': fakeKey, ...headers},
    body: JSON.stringify(body)
  });
}
const upstream = value => Response.json({candidates: [{finishReason: 'STOP', content: {parts: [{text: JSON.stringify(value)}]}}]});

test('review sends a bounded payload and discards invented quotes', async () => {
  const response = await handleAssist(request({mode: 'review', input}), async (url, options) => {
    assert.equal(new URL(url).hostname, 'generativelanguage.googleapis.com');
    assert.equal(options.headers['x-goog-api-key'], fakeKey);
    const payload = JSON.parse(JSON.parse(options.body).contents[0].parts[0].text);
    assert.equal(payload.story.problem, input.problem);
    assert.equal(payload.name, undefined);
    assert.equal(payload.team, undefined);
    return upstream({gaps: ['How often?'], findings: [
      {section: 'problem', quote: input.problem, advice: 'Show an example.'},
      {section: 'problem', quote: '99% fail', advice: 'Invented.'},
      {section: 'proof', quote: input.problem, advice: 'Wrong section.'}
    ]});
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).result.findings, [{section: 'problem', quote: input.problem, advice: 'Show an example.'}]);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('missing key, foreign origin and invalid mode never call Gemini', async () => {
  const noCall = () => assert.fail('Provider called');
  assert.equal((await handleAssist(request({mode: 'draft', input}, {'x-gemini-key': ''}), noCall)).status, 401);
  assert.equal((await handleAssist(request({mode: 'draft', input}, {origin: 'https://other.example'}), noCall)).status, 403);
  assert.equal((await handleAssist(request({mode: 'anything', input}), noCall)).status, 400);
  assert.equal((await handleAssist(request({mode: 'review', input: {problem: 'a'.repeat(66000)}}), noCall)).status, 400);
});

test('rule findings require pasted wording and incomplete drafts fail closed', async () => {
  const rule = await handleAssist(request({mode: 'rules', input}), async () => upstream({gaps: [], findings: [
    {section: 'rules', quote: input.rules, advice: 'Keep the deck to six slides.'},
    {section: 'rules', quote: 'Deadline is Monday', advice: 'Submit early.'}
  ]}));
  assert.equal((await rule.json()).result.findings.length, 1);
  const draft = await handleAssist(request({mode: 'draft', input}), async () => upstream({story: {problem: 'Only one section'}}));
  assert.equal(draft.status, 502);
});

test('quota errors never expose upstream bodies or credentials', async () => {
  const response = await handleAssist(request({mode: 'review', input}), async () => Response.json({secret: fakeKey}, {status: 429}));
  assert.equal(response.status, 429);
  assert.ok(!(await response.text()).includes(fakeKey));
});
