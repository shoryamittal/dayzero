import test from 'node:test';
import assert from 'node:assert/strict';
import {competitionURL,publicAddress,extractRequirements,competitionBrief} from '../api/competition.mjs';

test('competition reader rejects private targets, credentials and unexpected ports',()=>{
  for(const url of ['http://example.org','https://127.0.0.1','https://[::1]','https://user:pass@example.org','https://event.internal','https://example.org:8443']) assert.throws(()=>competitionURL(url));
  for(const ip of ['127.0.0.1','10.0.0.2','172.16.0.1','169.254.169.254','192.168.1.1','100.64.0.1','::1','::ffff:127.0.0.1'])assert.equal(publicAddress(ip),false);
  assert.equal(publicAddress('93.184.216.34'),true);
});
test('rule excerpts remove scripts and navigation and retain actual source limits', async()=>{
  const html='<nav>Submission navigation</nav><script>Pitch rules: invented</script><main><h2>Judging criteria</h2><p>Submit a maximum of 6 slides.</p><p>Pitch duration is 3 minutes.</p><p>Welcome to our event.</p></main>';
  assert.deepEqual(extractRequirements(html),['Judging criteria','Submit a maximum of 6 slides.','Pitch duration is 3 minutes.']);
  const result=await competitionBrief('https://example.org/event',async()=>({html,source:'https://example.org/event'}));
  assert.equal(result.status,'source_excerpts');assert.equal(result.excerpts.length,3);assert.ok(result.checked);
});
