import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReview, inspectSlide, reviewMarkdown, splitReviewRules} from '../dist/review-engine.mjs';

const slide=index=>({index,title:'Evidence',paragraphs:['A prototype shows the pickup flow.'],text:'A prototype shows the pickup flow.',count:7,runs:[{text:'Evidence',font:'Arial',size:16}],pictures:0,missingAlt:0,hidden:false,outside:[]});
const slides=Array.from({length:6},(_,index)=>slide(index+1));

test('separate sentences expose the actual slide-limit breach without losing their source',()=>{
 const original='5 slides maximum. Include evidence and a clear next step.';
 const model=buildReview(slides,original);
 assert.equal(model.checks.length,2);
 assert.equal(model.checks[0].rule,'5 slides maximum.');
 assert.equal(model.checks[0].state,'Over limit');
 assert.equal(model.checks[1].rule,'Include evidence and a clear next step.');
 assert.equal(model.breaches.length,1);
 assert.ok(model.checks.every(check=>check.originalRule===original));
 assert.equal(model.suppliedRules,original);
 assert.ok(reviewMarkdown(model).includes(original));
});

test('independent semicolon clauses measure abbreviated counts and decimal font sizes',()=>{
 const model=buildReview(slides,'Max. 5 slides; Minimum font size 18.5 pt; Include evidence.');
 assert.deepEqual(model.checks.map(check=>check.rule),['Max. 5 slides;','Minimum font size 18.5 pt;','Include evidence.']);
 assert.deepEqual(model.breaches.map(check=>check.state),['Over limit','Below minimum']);
 assert.match(model.breaches[1].detail,/18\.5 pt/);
});

test('exclusions and conditional count qualifications remain manual across clause boundaries',()=>{
 for(const original of [
  'Maximum 6 slides excluding title/appendix. Include evidence.',
  'Maximum 6 slides. Excluding title and appendix.',
  'Maximum 6 slides; title and appendix do not count.',
  'Maximum 6 slides. The appendix is excluded. Include evidence.',
  'Maximum 6 slides. Include evidence if an appendix is used.',
  'Maximum 6 slides\nExcluding title/appendix.',
  'Excluding title/appendix:\nMaximum 6 slides.',
  'Maximum 6 slides\nTitle and appendix slides are not counted.',
  'Maximum 6 slides, including the title and appendix. Include evidence.'
 ]){
  for(const deck of [slides.slice(0,2),[...slides,slide(7)]]){
   const model=buildReview(deck,original);
   assert.equal(model.checks.length,1,original);
   assert.equal(model.checks[0].state,'Needs manual review',original);
   assert.equal(model.breaches.length,0,original);
  }
 }
});

test('sentence splitting preserves decimal numbers, abbreviations and URL tokens',()=>{
 for(const [original,expected] of [
  ['Minimum font size 18.5 pt. Include evidence.',['Minimum font size 18.5 pt.','Include evidence.']],
  ['Max. 6 slides; Include evidence.',['Max. 6 slides;','Include evidence.']],
  ['Use e.g. Include diagrams as examples.',['Use e.g. Include diagrams as examples.']],
  ['Use U.S. examples. Include evidence.',['Use U.S. examples.','Include evidence.']],
  ['Use https://organizer.example/rules/v1.5. Include evidence.',['Use https://organizer.example/rules/v1.5. Include evidence.']]
 ])assert.deepEqual(splitReviewRules(original).map(check=>check.rule),expected,original);
});

test('the exported report retains the exact original multiline brief alongside derived checks',()=>{
 const original='  • 5 slides maximum. Include evidence.\r\n- Minimum font size 18.5 pt.\n';
 const model=buildReview(slides,original),report=reviewMarkdown(model);
 assert.equal(model.checks.length,3);
 assert.equal(model.suppliedRules,original);
 assert.ok(report.includes('### Original supplied text\n\n'+original));
 assert.ok(report.includes('### Requirement checks'));
});

// Small DOM fixtures use the same element/attribute interface as parsed OOXML.
// The first slide fixture reproduces the text boxes in the real QueueWise deck.
function element(localName,attributes={},children=[],text=''){
 return {localName,children,get textContent(){return text+children.map(child=>child.textContent).join('');},
  getAttribute(name){return attributes[name]??'';},
  getElementsByTagNameNS(_namespace,name){return children.flatMap(child=>[...(child.localName===name?[child]:[]),...child.getElementsByTagNameNS('*',name)]);}};
}
function textBox(text,size,{type,name='Text box'}={}){
 return element('sp',{},[
  element('nvSpPr',{},[element('cNvPr',{name}),element('nvPr',{},type?[element('ph',{type})]:[])]),
  element('txBody',{},[element('p',{},[element('r',{},[element('rPr',{sz:String(size)}),element('t',{},[],text)])])])]);
}
function documentWith(...shapes){
 const root=element('sld',{},[element('spTree',{},shapes)]);
 return {documentElement:root,getElementsByTagNameNS:(namespace,name)=>root.getElementsByTagNameNS(namespace,name)};
}

test('a large decorative ordinal cannot replace the Impact heading in the extracted outline',()=>{
 const doc=documentWith(textBox('05',13200),textBox('QueueWise QA',1500),textBox('05 / 06',1500),textBox('Impact',7500),textBox('Goal: reduce waiting; measure before and after a pilot.',3000),textBox('Draft for review',1200));
 const result=inspectSlide(doc,5);
 assert.equal(result.title,'Impact');
 assert.ok(result.paragraphs.includes('05'));
 assert.ok(result.paragraphs.includes('05 / 06'));
 assert.equal(result.runs[0].size,132);
});

test('title placeholders and named headings take priority over larger ordinary text',()=>{
 const doc=documentWith(textBox('05',13200),textBox('Big body text',9000),textBox('Named heading',3200,{name:'Slide headline'}),textBox('Placeholder title',2400,{type:'title'}));
 assert.equal(inspectSlide(doc,5).title,'Placeholder title');
 assert.equal(inspectSlide(documentWith(textBox('Big body text',9000),textBox('Named heading',3200,{name:'Title 1'})),1).title,'Named heading');
 assert.equal(inspectSlide(documentWith(textBox('Subtitle text',9000,{name:'Subtitle 1'}),textBox('Main heading',3200,{name:'Heading 1'})),1).title,'Main heading');
});

test('ordinal-only slides retain a usable title while meaningful numeric headings remain eligible',()=>{
 assert.equal(inspectSlide(documentWith(textBox('05',13200),textBox('05 / 06',1500)),5).title,'05');
 for(const text of ['2026','50% reduction','5 opportunities']){
  assert.equal(inspectSlide(documentWith(textBox(text,9000),textBox('Supporting detail',2400)),5).title,text);
 }
 assert.equal(inspectSlide(documentWith(textBox('Page 5 of 6',13200),textBox('Impact',7500)),5).title,'Impact');
});
