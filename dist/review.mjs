import {readTemplate} from './template-bridge.mjs?v=review-1';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const nodes = (root, name) => Array.from(root.getElementsByTagNameNS('*', name));
const words = value => value.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
const stop = new Set('a an the for with must include demonstrate show should our and or in of on to by points weight criterion criteria evidence your slide slides project team'.split(' '));
const groups = ['testing test tested interviews interview surveyed survey validation feedback','prototype prototype demo demonstration mvp','impact outcomes outcome benefit benefits','users user users customer customers audience','feasibility feasible implementation implement technical architecture','cost costs budget pricing price','innovation novelty novel innovative differentiation','metrics results measured measurement benchmark','market competitors competition alternatives competitor','privacy consent confidential data-protection'].map(group=>group.split(' '));
function related(term){return groups.find(g=>g.includes(term)) || [term];}

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
 const text=paragraphs.join(' '), titleShape=nodes(doc,'sp').find(shape=>['title','ctrTitle'].includes(nodes(shape,'ph')[0]?.getAttribute('type')));
 const title=titleShape?nodes(titleShape,'t').map(t=>t.textContent).join('').trim():'';
 return {index,outside,title:title||paragraphs[0]?.slice(0,90)||'Visual slide',paragraphs,runs,text,count:words(text).length,pictures:pictures.length,missingAlt:pictures.filter(pic=>!nodes(pic,'cNvPr')[0]?.getAttribute('descr')?.trim()).length,hidden:doc.documentElement.getAttribute('show')==='0'};
}

function auditSlide(slide){
 const findings=[];
 function add(topic,quote,action){findings.push({topic,quote,action,index:slide.index});}
 if(!slide.count)add('Visual review','No editable slide text found','Open the slide and verify the message in images, charts or diagrams.');
 if(slide.outside.length)add('Object bounds',slide.outside.join(', '),'Check these objects in slideshow view. Their stored bounds cross the canvas edge. Cropping may be intentional.');
 if(slide.hidden)add('Submission','Slide is marked hidden','Confirm whether judges should see it and whether it counts toward the slide limit.');
 if(slide.count>65)add('Reading load',slide.count+' words','Keep the main takeaway and move supporting detail into speaker notes.');
 const fonts=new Set(slide.runs.map(r=>r.font).filter(x=>x!=='Inherited'));
 if(fonts.size>2)add('Typography',[...fonts].join(', '),'Check whether each family serves a distinct role. Consolidate accidental substitutions.');
 const tiny=slide.runs.filter(r=>r.size&&r.size<18).sort((a,b)=>a.size-b.size);
 if(tiny.length)add('Projection',tiny[0].size+' pt · '+tiny[0].text,'Inspect this passage at presentation size. 18 pt is a review guideline unless your event sets a minimum.');
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
  return {state:hits.length?'Below minimum':'Inspect inherited styles',detail:(hits.length?hits.length+' text runs below '+limit+' pt. '+hits.slice(0,4).join(' / '):'No explicitly sized text below '+limit+' pt found.')+' '+unknown+' runs have inherited sizes. Check the final rendered slides.'};
 }
 const terms=[...new Set(words(rule).filter(t=>t.length>2&&!stop.has(t)&&!/^[0-9]+$/.test(t)))];
 const matches=slides.flatMap(s=>s.paragraphs.map(line=>{const tokens=new Set(words(line));return {index:s.index,line,score:terms.filter(t=>related(t).some(w=>tokens.has(w))).length};})).filter(m=>m.score).sort((a,b)=>b.score-a.score);
 return {state:matches.length?'Candidate evidence':'Needs manual review',detail:matches.length?matches.slice(0,2).map(m=>'Slide '+m.index+' · “'+m.line+'”').join(' / '):'No corresponding wording found in editable text. Check diagrams and terminology, or add a slide that directly addresses this requirement.'};
}

function row(label,quote,action=''){return '<div class="row"><b>'+esc(label)+'</b><p>'+esc(quote)+'</p>'+(action?'<p class="sub">'+esc(action)+'</p>':'')+'</div>';}
function showReport(file,event,rules,slides){
 const issues=slides.flatMap(auditSlide);
 const priorities=['Unfinished text','Evidence','Submission','Object bounds','Projection','Visual review','Wording','Reading load','Image accessibility','Typography','Long passage'];
 issues.sort((a,b)=>priorities.indexOf(a.topic)-priorities.indexOf(b.topic));
 const checks=rules.split(/\r?\n/).map(s=>s.replace(/^\s*[-•]\s*/,'').trim()).filter(Boolean).map(rule=>({rule,...assessRule(rule,slides)}));
 const breaches=checks.filter(c=>['Over limit','Below minimum','Font mismatch'].includes(c.state));
 const first=[...breaches.map(c=>row(c.state,c.rule,c.detail)),...issues.map(i=>row('Slide '+i.index+' · '+i.topic,i.quote,i.action))].slice(0,3);
 const total=slides.reduce((n,s)=>n+s.count,0);
 const slideHTML=slides.map(s=>{
  const list=issues.filter(i=>i.index===s.index);
  const samples=s.runs.map(r=>'<tr><td>'+esc(r.text)+'</td><td>'+esc(r.font)+'</td><td>'+(r.size?r.size+' pt':'Inherited')+'</td></tr>').join('');
  return '<details class="slide"><summary>Slide '+s.index+' · '+esc(s.title)+'</summary><p class="sub">'+s.count+' words · '+s.pictures+' pictures · '+list.length+' observations</p>'+list.map(i=>row(i.topic,i.quote,i.action)).join('')+'<details><summary>Inspect wording and typography</summary><table><thead><tr><th>Slide text</th><th>Latin font</th><th>Size</th></tr></thead><tbody>'+samples+'</tbody></table></details></details>';
 }).join('');
 const families=new Map();
 for(const slide of slides){
  for(const run of slide.runs){
   if(!families.has(run.font))families.set(run.font,{locations:new Set(),sizes:new Set(),count:0});
   const family=families.get(run.font);
   family.locations.add(slide.index);family.sizes.add(run.size);family.count++;
  }
 }
 const typeSummary=[...families].map(([name,f])=>row(name,'Slides '+[...f.locations].join(', '),f.count+' text runs · '+[...f.sizes].sort((a,b)=>a-b).map(n=>n?n+' pt':'Inherited size').join(', '))).join('');
 const questions=checks.filter(c=>c.state==='Candidate evidence'||c.state==='Needs manual review').slice(0,3).map(c=>row('Judge’s question','How does your team demonstrate “'+c.rule+'”?',c.detail));
 const claim=issues.find(i=>i.topic==='Evidence');
 if(claim)questions.push(row('Slide '+claim.index+' · defend the number','How did you measure “'+claim.quote+'”?','Prepare the baseline, sample, time period and calculation.'));
 const report=$('report');report.innerHTML='<h2>'+esc(event||'Your deck')+' review</h2><p class="sub">'+esc(file.name)+'</p><div class="metrics">'+[[slides.length,'Slides inspected'],[total,'Words inspected'],[issues.length,'Slide observations'],[breaches.length,'Measured rule breaches']].map(([n,t])=>'<span><b>'+n+'</b>'+t+'</span>').join('')+'</div><h3>Fix first</h3><div class="panel">'+(first.join('')||'No priority issues surfaced in the automated checks. Review the slide details against your brief.')+'</div><h3>Competition requirements</h3><div class="panel">'+(checks.map(c=>row(c.state+' · '+c.rule,c.detail)).join('')||'No rules supplied. Paste the organizer’s requirements above and run the review again.')+'</div><h3>Slide by slide</h3>'+slideHTML+'<h3>Font inventory</h3><div class="panel">'+(typeSummary||'No editable text runs.')+'</div>'+(questions.length?'<h3>Prepare for judging</h3><div class="panel">'+questions.join('')+'</div>':'')+'<h3>Review coverage</h3><p class="sub">Findings use editable slide text, local Latin font settings and picture metadata. Candidate evidence uses word matching and needs a judge’s interpretation. Verify inherited fonts, chart values, images, contrast, reading order and overflow in PowerPoint. This report does not predict selection.</p><div class="actions"><button id="print">Print or save PDF</button><a class="cta" href="/#try">Build a new pitch →</a></div>';
 report.hidden=false;report.focus();report.scrollIntoView();
 $('print').onclick=()=>window.print();
}
let opened=[];
window.addEventListener('beforeprint',()=>{opened=Array.from(document.querySelectorAll('#report details:not([open])'));opened.forEach(d=>d.open=true);});
window.addEventListener('afterprint',()=>{opened.forEach(d=>d.open=false);opened=[];});
$('intake').addEventListener('input',()=>{$('report').hidden=true;$('status').textContent='';});
$('intake').addEventListener('submit',async e=>{
 e.preventDefault();const file=$('file').files[0],event=$('event').value.trim(),rules=$('rules').value;
 $('report').hidden=true;
 const fields=Array.from(e.target.elements);fields.forEach(f=>f.disabled=true);
 try{
  if(!file||!file.name.toLowerCase().endsWith('.pptx'))throw Error('Choose a .pptx file. Save older .ppt files as .pptx in PowerPoint.');
  if(file.size>8*1024*1024)throw Error('Choose a deck up to 8 MB.');
  $('status').textContent='Reading slides in presentation order…';
  const slides=[];await readTemplate(new Uint8Array(await file.arrayBuffer()),window.JSZip,(doc,index,canvas)=>slides.push(inspectSlide(doc,index,canvas)));
  showReport(file,event,rules,slides);$('status').textContent='Report ready.';
 }catch(error){$('status').textContent=error.message||'Could not read this deck. Open it in PowerPoint and save a fresh copy.';}
 finally{fields.forEach(f=>f.disabled=false);}
});
