const nodes = (root, name) => Array.from(root.getElementsByTagNameNS('*', name));
const words = value => value.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
const stop = new Set('a an the for with must include demonstrate show should our and or in of on to by points weight criterion criteria evidence your slide slides project team'.split(' '));
const groups = ['testing test tested interviews interview surveyed survey validation feedback','prototype prototype demo demonstration mvp','impact outcomes outcome benefit benefits','users user users customer customers audience','feasibility feasible implementation implement technical architecture','cost costs budget pricing price','innovation novelty novel innovative differentiation','metrics results measured measurement benchmark','market competitors competition alternatives competitor','privacy consent confidential data-protection'].map(group=>group.split(' '));
function related(term){return groups.find(g=>g.includes(term)) || [term];}

// Prefer PowerPoint's title placeholder. For free-form decks, use the most
// prominent explicitly sized text box, retaining file order for ties.
function outlineTitle(doc, fallback) {
 let best = '', bestSize = 0;
 for (const shape of nodes(doc,'sp')) {
  const text = nodes(shape,'p').map(p=>nodes(p,'t').map(t=>t.textContent).join('')).join(' ').trim();
  if(!text)continue;
  const type = nodes(shape,'ph')[0]?.getAttribute('type');
  if(type==='title'||type==='ctrTitle')return text;
  if(['sldNum','dt','ftr','hdr'].includes(type))continue;
  const size = [...nodes(shape,'rPr'),...nodes(shape,'defRPr')].reduce((max,prop)=>Math.max(max,Number(prop.getAttribute('sz'))||0),0);
  if(size>bestSize){bestSize=size;best=text;}
 }
 return (best||fallback||'Visual slide').slice(0,90);
}

export function inspectSlide(doc, index, canvas){
 const paragraphs=[], runs=[], pictures=nodes(doc,'pic');
 for(const p of nodes(doc,'p')){
   const defaults=nodes(p,'pPr')[0]?.getElementsByTagNameNS('*','defRPr')[0];
   const parts=[];
   for(const child of p.children){
     if(child.localName==='br'){parts.push(' ');continue;}
     const t=nodes(child,'t')[0]; if(!t)continue;
     const raw=t.textContent;parts.push(raw);
     if(!raw.trim())continue;
     const props=nodes(child,'rPr')[0];
     const font=props?.getElementsByTagNameNS('*','latin')[0]?.getAttribute('typeface') || defaults?.getElementsByTagNameNS('*','latin')[0]?.getAttribute('typeface') || 'Inherited';
     const size=Number(props?.getAttribute('sz') || defaults?.getAttribute('sz'))/100 || null;
     runs.push({text:raw,font,size});
   }
   const line=parts.join('').trim();if(line)paragraphs.push(line);
 }
 const outside=[];
 if(canvas){
  const width=Number(canvas.getAttribute('cx')), height=Number(canvas.getAttribute('cy'));
  const tree=nodes(doc,'spTree')[0];
  for(const shape of tree?.children||[]){
   if(!['sp','pic','graphicFrame'].includes(shape.localName))continue;
   const transform=nodes(shape,'xfrm')[0];if(!transform)continue;
   const offset=nodes(transform,'off')[0], extent=nodes(transform,'ext')[0];if(!offset||!extent)continue;
   const x=Number(offset.getAttribute('x')),y=Number(offset.getAttribute('y'));
   if(width&&height&&(x<0||y<0||x+Number(extent.getAttribute('cx'))>width+1000||y+Number(extent.getAttribute('cy'))>height+1000))outside.push(nodes(shape,'cNvPr')[0]?.getAttribute('name')||'Unnamed object');
  }
 }
 const text=paragraphs.join(' '),title=outlineTitle(doc,paragraphs[0]);
 return {index,outside,title,paragraphs,runs,text,count:words(text).length,pictures:pictures.length,missingAlt:pictures.filter(pic=>!nodes(pic,'cNvPr')[0]?.getAttribute('descr')?.trim()).length,hidden:doc.documentElement.getAttribute('show')==='0'};
}

export function auditSlide(slide){
 const findings=[];
 function add(topic,quote,action,passage=quote){findings.push({topic,quote,action,passage,index:slide.index});}
 if(!slide.count)add('Visual review','No editable slide text found','Open the slide and verify the message in images, charts or diagrams.');
 if(slide.outside.length)add('Object bounds',slide.outside.join(', '),'Check these objects in slideshow view. Their stored bounds cross the canvas edge. Cropping may be intentional.');
 if(slide.hidden)add('Submission','Slide is marked hidden','Confirm whether judges should see it and whether it counts toward the slide limit.');
 if(slide.count>65)add('Reading load',slide.count+' words','Keep the main takeaway and move supporting detail into speaker notes.');
 const fonts=new Set(slide.runs.map(r=>r.font).filter(x=>x!=='Inherited'));
 if(fonts.size>2)add('Typography',[...fonts].join(', '),'Check whether each family serves a distinct role. Consolidate accidental substitutions.');
 const tiny=slide.runs.filter(r=>r.size&&r.size<18).sort((a,b)=>a.size-b.size);
 if(tiny.length)add('Projection',tiny[0].size+' pt · '+tiny[0].text,'Inspect this passage at presentation size. 18 pt is a review guideline unless your event sets a minimum.',tiny[0].text);
 if(slide.missingAlt)add('Image accessibility',slide.missingAlt+' picture(s) without a stored description','Describe informative pictures and check decorative status for the rest.');
 for(const line of slide.paragraphs){
   const vague=line.match(/\b(revolutionary|game[- ]changing|cutting[- ]edge|seamless|best[- ]in[- ]class|state[- ]of[- ]the[- ]art)\b/i);
   if(vague)add('Wording',line,'Replace “'+vague[0]+'” with the action a user can take or the change you observed.');
   if(/\b(?:TODO|TBD|lorem ipsum|insert (?:text|title) here)\b/i.test(line))add('Unfinished text',line,'Resolve the placeholder before submission.');
   if(/\d(?:[\d,.]*\d)?\s*(?:%|percent\b|times faster\b)/i.test(line)&&!/https?:|\b(source|survey|pilot|sample|baseline|measured|study|interview)\b/i.test(slide.text))add('Evidence',line,'Add a source or test description with the baseline, sample size and date. Verify the underlying number.');
   if(words(line).length>32)add('Long passage',line,'Split the takeaway from the supporting detail. Read the first sentence aloud as a slide headline.');
 }
 return findings;
}

export function assessRule(rule,slides){
 const wordLimit=rule.match(/^(?:max(?:imum)?(?: of)?|up to|no more than)\s+(\d+)\s+words\s+(?:per|on each)\s+slide[.!]?$/i);
 if(wordLimit){
  const over=slides.filter(s=>s.count>Number(wordLimit[1]));
  return {state:over.length?'Over limit':'Within limit',detail:over.length?over.map(s=>'Slide '+s.index+' · '+s.count+' editable words').join(' / '):'Every slide is within the supplied editable-word limit.'};
 }
 const family=rule.match(/^(?:required (?:font|typeface)|font family)\s*:\s*([\p{L}\d][\p{L}\d -]{0,55})$/iu);
 if(family){
  const exceptions=slides.filter(s=>s.runs.some(r=>r.font!=='Inherited'&&!r.font.startsWith('+')&&r.font.toLowerCase()!==family[1].trim().toLowerCase()));
  return {state:exceptions.length?'Font mismatch':'Inspect inherited styles',detail:(exceptions.length?'Explicit Latin font differs on slides '+exceptions.map(s=>s.index).join(', ')+'.':'No explicit Latin font conflicts found.')+' Verify inherited and theme fonts in PowerPoint.'};
 }
 const max=/\bslides?\b/i.test(rule) && rule.match(/^(?:max(?:imum)?\.?\s*(?:of\s*)?(?:slide(?:s)?(?:\s+limit)?\s*)?[:=]?\s*(\d+)\s*(?:slides?)?|(?:up to|no more than)\s+(\d+)\s+slides?|(\d+)[- ]slide limit)\s*[.!]?$/i);
 if(max){const limit=Number(max[1]||max[2]||max[3]);return {state:slides.length<=limit?'Within limit':'Over limit',detail:slides.length+' slides in the file, including hidden slides. Limit '+limit+'.'};}
 const min=rule.match(/^(?:min(?:imum)?\.?\s*(?:font(?:\s+size)?\s*)?[:=]?\s*)(\d+(?:\.\d+)?)\s*(?:pt|points?)\s*[.!]?$/i);
 if(min){
  const limit=Number(min[1]), hits=slides.flatMap(s=>s.runs.filter(r=>r.size&&r.size<limit).map(r=>'Slide '+s.index+' · '+r.size+' pt · “'+r.text+'”'));
  const unknown=slides.reduce((n,s)=>n+s.runs.filter(r=>!r.size).length,0);
  return {state:hits.length?'Below minimum':unknown||slides.some(s=>!s.runs.length)?'Inspect inherited styles':'Within limit',detail:(hits.length?hits.length+' text runs below '+limit+' pt. '+hits.slice(0,4).join(' / '):'No explicitly sized text below '+limit+' pt found.')+' '+unknown+' runs have inherited sizes. Check the final rendered slides.'};
 }
 if(/\b(?:max(?:imum)?|min(?:imum)?|at (?:least|most)|no more than|exactly|limit|up to)\b/i.test(rule)&&/\d/.test(rule)){
  return {state:'Needs manual review',detail:'This numeric requirement has wording or exceptions the reviewer cannot measure reliably. Check the organizer’s counting method before submission.'};
 }
 const terms=[...new Set(words(rule).filter(t=>t.length>2&&!stop.has(t)&&!/^[0-9]+$/.test(t)))];
 const matches=[];
 for(const slide of slides.filter(s=>!s.hidden)){
  for(const line of slide.paragraphs){
   const tokens=new Set(words(line));
   const hits=terms.filter(t=>related(t).some(w=>tokens.has(w))).length;
   if(!hits)continue;
   const planned=/\b(we will|we aim|will (?:be|test|build|conduct)|plan(?:s|ned)? to|next steps?|future work|not yet|haven['’]t|have not|no (?:tests?|prototype|interviews?))\b/i.test(line);
   const heading=words(line).length<4;
   matches.push({index:slide.index,line,hits,planned,heading});
  }
 }
 matches.sort((a,b)=>Number(a.planned||a.heading)-Number(b.planned||b.heading)||b.hits-a.hits);
 if(!matches.length)return {state:'Needs manual review',detail:'No corresponding wording found in visible slide text. Check diagrams and terminology, or add a slide that directly addresses this requirement.'};
 const best=matches[0];
 return {state:best.planned?'Plan mentioned':best.heading?'Topic mentioned':'Candidate evidence',
  detail:matches.slice(0,2).map(m=>'Slide '+m.index+' · “'+m.line+'”'+(m.planned?' (planned or incomplete)':m.heading?' (short label)':'')).join(' / '),
  slide:best.index};
}

export function buildReview(slides, rules='') {
 const priority=['Unfinished text','Evidence','Submission','Object bounds','Projection','Visual review','Wording','Reading load','Image accessibility','Typography','Long passage'];
 const lens=topic=>topic==='Evidence'?'evidence':['Projection','Reading load','Typography','Long passage'].includes(topic)?'readability':topic==='Submission'?'rules':'clarity';
 const issues=slides.flatMap(auditSlide).sort((a,b)=>priority.indexOf(a.topic)-priority.indexOf(b.topic)).map((i,n)=>({...i,id:'slide-'+n,lens:lens(i.topic),severity:['Unfinished text','Evidence','Submission'].includes(i.topic)?'priority':'review',basis:['Projection','Object bounds','Image accessibility','Typography','Submission','Reading load'].includes(i.topic)?'File check':'Wording check'}));
 const checks=rules.split(/\r?\n/).map(s=>s.replace(/^\s*[-•]\s*/,'').trim()).filter(Boolean).map((rule,n)=>({id:'rule-'+n,rule,...assessRule(rule,slides)}));
 const breaches=checks.filter(c=>['Over limit','Below minimum','Font mismatch'].includes(c.state));
 const findings=[...breaches.map(c=>({id:c.id,topic:c.state,quote:c.rule,action:c.detail,index:c.slide||null,lens:'rules',severity:'priority',basis:'Supplied rule'})),...issues];
 return {slides,issues,checks,breaches,findings,totalWords:slides.reduce((n,s)=>n+s.count,0),affected:slides.filter(s=>issues.some(i=>i.index===s.index)).length,priority:findings.filter(i=>i.severity==='priority').length};
}

export function groupOpenFindings(findings, addressed) {
 const groups = new Map();
 for (const item of findings) {
  if (addressed.has(item.id)) continue;
  const key = item.index ? JSON.stringify([item.topic, item.quote, item.action]) : item.id;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(item);
 }
 return [...groups.values()];
}

export function compareReviews(previous, current) {
 const counts = model => [model.slides.length, model.priority, model.breaches.length, model.findings.length];
 const before = counts(previous), after = counts(current);
 return ['Slides', 'Priority actions', 'Measured rule breaches', 'All findings'].map((label, index) => ({
  label, before:before[index], after:after[index]
 }));
}

export function reviewMarkdown(model, {name='Deck review',event='',demo=false,stage='screening',addressed=new Set(),comparison=null}={}) {
 const out=['# '+name,event?'Competition: '+event:'General review',demo?'FICTIONAL EXAMPLE — not a review of your deck.':'',
 `${model.slides.length} slides; ${model.totalWords} editable words; ${model.issues.length} slide observations; ${model.breaches.length} measured rule breaches.`,
 ...(comparison ? ['\n## Draft comparison', 'Previous file: '+comparison.name, ...comparison.rows.map(r=>r.label+': '+r.before+' → '+r.after)] : []),
 '\n## Action plan',...model.findings.map(i=>`- [${addressed.has(i.id)?'x':' '}] ${i.index?'Slide '+i.index+' — ':''}${i.topic}: ${i.quote}\n  ${i.action}`),
 '\n## Supplied rules',...(model.checks.length?model.checks.map(c=>`- ${c.rule}\n  ${c.state}: ${c.detail}`):['No organiser rules supplied.']),
 '\n## Slide text',...model.slides.map(s=>`### Slide ${s.index}: ${s.title}\n${s.paragraphs.join('\n\n')}`),
 '\n## Review scope',`Round: ${stage==='demo'?'Live demo':'Idea screening'}. Checks use editable text and stored metadata. Topic matches are candidates, not verified evidence. Inspect original slide layouts, inherited fonts, chart data and organiser rules manually. No selection prediction.`,
 'Checked items are marked addressed by you, not automatically verified. Checklist state lasts for this review session.'];
 return out.filter(Boolean).join('\n\n');
}

