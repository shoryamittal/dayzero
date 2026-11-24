import test from 'node:test';
import assert from 'node:assert/strict';
import {assessRule,buildReview,reviewMarkdown,groupOpenFindings,compareReviews} from '../dist/review-engine.mjs';
import {demoSlides,demoRules} from '../dist/review-demo.mjs';

const slide=(text,extra={})=>({index:1,title:'Test slide',paragraphs:[text],text,count:text.split(/\s+/).length,runs:[{text,font:'Aptos',size:24}],pictures:0,missingAlt:0,hidden:false,outside:[],...extra});
test('an unsupported numeric rule remains manual rather than a false pass',()=>{
 assert.equal(assessRule('Maximum 6 slides excluding appendix',[slide('Demo')]).state,'Needs manual review');
});
test('planned testing is not presented as completed evidence',()=>{
 const result=assessRule('Show evidence of user testing',[slide('We plan to test the prototype with 12 students.')]);
 assert.equal(result.state,'Plan mentioned');
});
test('hidden slide counts towards the supplied file limit and produces a priority',()=>{
 const m=buildReview([slide('One'),slide('Two',{index:2,hidden:true})],'Maximum 1 slide');
 assert.equal(m.breaches.length,1);assert.ok(m.findings.some(i=>i.topic==='Submission'&&i.severity==='priority'));
});
test('inherited font sizes are explicitly unresolved',()=>{
 const result=assessRule('Minimum font size 18 pt',[slide('Hello',{runs:[{text:'Hello',font:'Inherited',size:null}]})]);
 assert.equal(result.state,'Inspect inherited styles');
});
test('demo runs through actual checks and includes actionable evidence and readability findings',()=>{
 const m=buildReview(demoSlides,demoRules);
 assert.ok(m.findings.some(i=>i.lens==='evidence'&&i.index===2));
 assert.ok(m.findings.some(i=>i.topic==='Projection'&&i.index===3));
 assert.equal(m.breaches.length,1);
 assert.ok(m.findings.some(i=>i.topic==='Unfinished text'&&i.index===4));
 assert.equal(m.checks.at(-1).state,'Plan mentioned');
 assert.equal('score' in m,false);
});
test('a clean slide and absent brief do not fabricate rules, evidence or action items',()=>{
 const m=buildReview([slide('Students list a book and reserve a campus pickup.')]);
 assert.equal(m.checks.length,0);assert.equal(m.findings.length,0);assert.equal(m.affected,0);
});
test('checklist export preserves supplied facts, manual scope and addressed state',()=>{
 const m=buildReview(demoSlides,demoRules),id=m.findings[0].id;
 const report=reviewMarkdown(m,{name:'Example',demo:true,addressed:new Set([id])});
 assert.match(report,/FICTIONAL EXAMPLE/);assert.match(report,/- \[x\]/);assert.match(report,/- \[ \]/);
 assert.match(report,/not automatically verified/);assert.match(report,/No selection prediction/);
});
test('duplicate wording findings have distinct checklist identifiers',()=>{
 const s=slide('We are revolutionary. Our game-changing platform.',{paragraphs:['We are revolutionary.','Our game-changing platform.']});
 const m=buildReview([s]);assert.equal(new Set(m.findings.map(i=>i.id)).size,m.findings.length);
});

test('overview groups identical advice across slides while retaining each open occurrence',()=>{
 const model=buildReview([1,2,3].map(index=>slide('Same footer',{index,runs:[{text:'Footer',font:'Arial',size:14}]})));
 const [first,...rest]=model.findings;
 assert.deepEqual(groupOpenFindings(model.findings,new Set([first.id])),[rest]);
 assert.equal(first.passage,'Footer');
 assert.match(first.quote,/14 pt/);
});
test('different claims and separate deck rules remain distinct in the queue',()=>{
 const model=buildReview([slide('We save 80%.',{paragraphs:['We save 80%.','We save 50%.']})],'Maximum 0 slides\nMaximum 0 slides');
 assert.equal(groupOpenFindings(model.findings,new Set()).length,4);
});
test('comparison and export use freshly measured counts independently of checklist marks',()=>{
 const before=buildReview(demoSlides,demoRules), after=buildReview([slide('Students reserve books for pickup.')],demoRules);
 const rows=compareReviews(before,after);
 assert.deepEqual(rows.map(r=>r.after),[1,0,0,0]);
 assert.equal(rows.at(-1).before,before.findings.length);
 assert.match(reviewMarkdown(after,{comparison:{name:'first.pptx',rows}}),/Previous file: first.pptx[\s\S]*All findings: 5 → 0/);
});
