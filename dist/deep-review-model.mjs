const text=(v,max=800)=>typeof v==='string'?v.trim().slice(0,max):'';
export const deepLenses=['clarity','evidence','readability','rules'];
export function deepContext(data,slides,rules){
 const event=text(data.event,160),edition=text(data.edition,120),stage=text(data.stage,160);
 const source=text(data.source,1000);
 let sourceURL='';try{const u=new URL(source);if(u.protocol==='https:'&&!u.username&&!u.password)sourceURL=u.href;}catch{}
 return {event,edition,stage,source:sourceURL,rules,reference:text(data.reference,12000),referenceSource:text(data.referenceSource,1000),slides:slides.map(s=>({
  index:s.index,title:s.title,paragraphs:s.paragraphs,runs:s.runs,
  hidden:s.hidden,outside:s.outside,pictures:s.pictures,missingAlt:s.missingAlt
 }))};
}
const numberTokens=value=>new Set((value.match(/\d+(?:[.,]\d+)*%?/g)||[]));
function rewrite(value,context){
 const out=text(value,900),known=numberTokens(context);
 return [...numberTokens(out)].every(n=>known.has(n))?out:'';
}
function finding(item,slide,rules,context,n,visual=false){
 const quote=text(item?.quote,600),why=text(item?.why,900),fix=text(item?.fix,1000);
 const visualRegion=text(item?.visualRegion,300);
 if(!why||!fix||(!quote&&!(visual&&visualRegion))||(quote&&!slide.text.includes(quote)))throw Error('AI finding did not match the quoted slide text.');
 if(visualRegion&&!visual)throw Error('AI claimed a visual inspection without rendered slides.');
 const ruleQuote=text(item.ruleQuote,600);
 if(ruleQuote&&!rules.includes(ruleQuote))throw Error('AI rule attribution did not match the supplied brief.');
 if(!deepLenses.includes(item.lens)||!['priority','review'].includes(item.severity))throw Error('Invalid review category.');
 return {id:'ai-'+slide.index+'-'+n,index:slide.index,topic:text(item.title,120)||'Refine the story',
  quote:quote||('Visual region: '+visualRegion),passage:quote,visualRegion,why,fix,action:why+' '+fix,rewrite:rewrite(item.rewrite,context),ruleQuote,
  lens:item.lens,severity:item.severity,basis:visualRegion?'AI visual suggestion':'AI suggestion'};
}
export function validateSlideBatch(result,indexes,slides,rules,{visual=false,reference=''}={}){
 if(!Array.isArray(result?.slides)||result.slides.length!==indexes.length)throw Error('AI did not review every requested slide.');
 const seen=new Set(),context=slides.map(s=>s.text).join('\n');
 return result.slides.map(item=>{
  if(!indexes.includes(item?.index)||seen.has(item.index))throw Error('AI returned duplicate or unknown slides.');
  seen.add(item.index);const slide=slides.find(s=>s.index===item.index);
  const referenceQuote=text(item.referenceQuote,500),referenceLesson=text(item.referenceLesson,700);
  if(referenceLesson&&(!referenceQuote||!reference.includes(referenceQuote)))throw Error('AI reference comparison did not match the supplied reference text.');
  if(!text(item.purpose)||!text(item.strength)||!text(item.judgeQuestion)||!Array.isArray(item.findings)||item.findings.length>4)throw Error('AI slide review was incomplete.');
  return {index:item.index,purpose:text(item.purpose,500),strength:text(item.strength,500),
   headline:rewrite(item.headline,context).slice(0,120),judgeQuestion:text(item.judgeQuestion,500),
   evidenceNeeded:text(item.evidenceNeeded,600),referenceQuote:reference?referenceQuote:'',referenceLesson:reference?referenceLesson:'',visualScope:text(item.visualScope,500),findings:item.findings.map((f,n)=>finding(f,slide,rules,context,n,visual))};
 }).sort((a,b)=>a.index-b.index);
}
export function validateStrategy(result,slides,rules){
 if(!text(result?.summary)||!Array.isArray(result?.criteria)||result.criteria.length>20||
   !Array.isArray(result?.crossSlide)||result.crossSlide.length>8)throw Error('AI strategy review was incomplete.');
 const criteria=result.criteria.map((item,n)=>{
  const quote=text(item?.quote,600),reason=text(item?.reason,900),next=text(item?.next,900);
  if(!quote||!rules.includes(quote)||!reason||!next||!['candidate','partial','missing','manual'].includes(item.state)||!Array.isArray(item.slides))throw Error('AI invented or misstated a competition criterion.');
  const hits=[...new Set(item.slides)];
  if(hits.some(i=>!Number.isInteger(i)||!slides.some(s=>s.index===i)))throw Error('Unknown slide in criterion map.');
  return {id:'criterion-'+n,quote,state:item.state,slides:hits,reason,next};
 });
 if(!rules.trim()&&criteria.length)throw Error('No official brief was provided.');
 const crossSlide=result.crossSlide.map((item,n)=>{
  if(!Array.isArray(item?.quotes)||item.quotes.length<2||item.quotes.length>4)throw Error('A cross-slide finding needs specific passages.');
  const quotes=item.quotes.map(q=>{const s=slides.find(s=>s.index===q?.index),quote=text(q?.quote,600);
   if(!s||!quote||!s.text.includes(quote))throw Error('Cross-slide quote did not match the deck.');
   return {index:s.index,quote};});
  if(new Set(quotes.map(q=>q.index)).size<2||!text(item.why)||!text(item.fix))throw Error('Incomplete cross-slide finding.');
  return {id:'cross-'+n,title:text(item.title,120),quotes,why:text(item.why,900),fix:text(item.fix,1000)};
 });
 return {summary:text(result.summary,1200),criteria,crossSlide,
  unresolved:(Array.isArray(result.unresolved)?result.unresolved:[]).slice(0,8).map(v=>text(v,500)).filter(Boolean)};
}
export function mergeDeepReview(model,review){
 if(review.slides.length!==model.slides.length||new Set(review.slides.map(s=>s.index)).size!==model.slides.length)throw Error('The deep review is incomplete.');
 const ai=review.slides.flatMap(s=>s.findings);
 const issues=[...model.issues,...ai],findings=[...model.findings,...ai];
 return {...model,issues,findings,priority:findings.filter(f=>f.severity==='priority').length,
  affected:model.slides.filter(s=>issues.some(f=>f.index===s.index)).length,
  deepReview:{...review,complete:true}};
}
export function deepReviewMarkdown(model){
 const d=model.deepReview;if(!d?.complete)return model.aiError?'\n## AI review not completed\n'+model.aiError:'';
 return ['\n## Competition strategy — AI suggestions',d.summary,'Competition: '+(d.context.event||'General review'),'Edition / track: '+(d.context.edition||'Not supplied'),'Organizer source: '+(d.context.source||'Pasted brief / not supplied'),'Reference source: '+(d.context.referenceSource||'Imported or pasted reference / not supplied'),'Visual PDF: '+(d.context.visual?'Supplied by user':'Not supplied — text and metadata only'),'Reviewed: '+d.checked,
  ...d.criteria.map(c=>'- '+c.quote+'\n  '+c.state+' · Slides '+(c.slides.join(', ')||'none')+'\n  '+c.reason+'\n  Next: '+c.next),
  '\n## Cross-slide checks',...d.crossSlide.map(c=>'### '+c.title+'\n'+c.quotes.map(q=>'Slide '+q.index+': “'+q.quote+'”').join('\n')+'\nWhy: '+c.why+'\nFix: '+c.fix),
  '\n## Slide-by-slide coaching',...d.slides.map(s=>'### Slide '+s.index+'\nPurpose: '+s.purpose+'\nKeep: '+s.strength+'\nSuggested headline: '+(s.headline||'Review manually')+'\nJudge question: '+s.judgeQuestion+'\nEvidence to add: '+s.evidenceNeeded+'\n'+s.findings.map(f=>'Quoted passage: '+f.quote+'\nWhy: '+f.why+'\nFix: '+f.fix+(f.ruleQuote?'\nRequirement: '+f.ruleQuote:'')+(f.rewrite?'\nSuggested wording: '+f.rewrite:'')).join('\n\n')),
  '\n## Unresolved questions',...d.unresolved.map(x=>'- '+x),
  '\nAI suggestions are not verified facts or a prediction of selection. Rendered slides and official organizer decisions still need review.'].join('\n\n');
}
