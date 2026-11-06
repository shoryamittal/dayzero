import {normalizePreparation} from './preparation.mjs?v=search-2.0';
import {reviewClaims} from './claim-engine.mjs?v=search-2.0';
import {normalizeEvent,eventChecks} from './event-engine.mjs?v=search-2.0';
export const VERSION = 1;
export const TTL = 24 * 60 * 60 * 1000;
export const MAX_PROJECTS = 12;
export const checklistItems=[['facts','Every claim is supported or clearly marked as a goal'],['template','The required organizer template and headings are preserved'],['policy','The current AI-use and plagiarism policy is checked'],['files','Exported files open correctly and meet size / naming rules'],['portal','The official deadline and submission portal are checked']];
export const themes={botanical:{name:'Botanical',label:'Human by nature.',bg:'28412E',fg:'FFFFFF',muted:'BBCCA9',accent:'D5F867'},editorial:{name:'Editorial',label:'Make a statement.',bg:'F1E9DA',fg:'2E2C28',muted:'71644F',accent:'C45535'},blueprint:{name:'Blueprint',label:'Ideas with precision.',bg:'1E3553',fg:'EEF3FA',muted:'B5C5D9',accent:'9CCBFF'},signal:{name:'Signal',label:'Impossible to ignore.',bg:'F45C3B',fg:'211F1E',muted:'32221C',accent:'F9E7CF'},noir:{name:'Noir',label:'Let the idea speak.',bg:'222322',fg:'F5F0E8',muted:'C1BCAF',accent:'DCCAF7'},electric:{name:'Electric',label:'A little more voltage.',bg:'C9BBF2',fg:'2D2340',muted:'554665',accent:'F2F3B7'}};
export function createId(){return globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
export function safeURL(value){try{const u=new URL(clean(value,2000));return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
export function normalizePDFText(value){return String(value).replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/\u2026/g,'...').replace(/\u00a0/g,' ');}
export function canExportPDF(p){return !/[^\x20-\x7E\n\r\t]/.test(normalizePDFText(slides(p).map(s=>s.text).join('\n')+'\n'+p.name));}
export function readingTime(value,wpm=130){const words=clean(value,50000).split(/\s+/).filter(Boolean).length;return {words,seconds:Math.ceil(words/Math.max(1,wpm)*60)};}
export const sample = {
 name:'ReLoop',team:'Team Second Nature',event:'Example Hackathon 2026',plan:'team',template:'botanical',demo:true,
 problem:'Campus canteens discard surplus meals while students need affordable food.',
 solution:'ReLoop connects campus canteens with students to reserve surplus meals for collection.',
 proof:'A clickable prototype demonstrates listing, reservation, and pickup. No user interviews or pilot results yet.',
 approach:'Canteens list available meals. Students reserve a meal and collect it using a pickup code.',
 impact:'We want to reduce food waste and make campus meals more accessible. Impact has not been measured.',
 ask:'We are seeking permission to run a small campus pilot with one canteen.',
 deadline:'',rules:'Maximum 6 slides. Required sections: Problem, Solution, Approach, Evidence, Impact, Ask. PDF and PPTX accepted. AI policy unknown.',
 confirmed:false,createdAt:Date.now(),updatedAt:Date.now(),history:[]
};
export const fields=[['problem','The problem','Who has this problem, and what happens today?'],['solution','Your solution','What does it do, and what makes it useful?'],['approach','How it works','Explain the steps, technology, or prototype.'],['proof','What you can prove','Share real interviews, results, or a demo. It is okay to have none yet.'],['impact','The impact','What change do you aim to make? Separate goals from measured results.'],['ask','Your next step','What help, funding, or permission do you need?']];
export function clean(value,max=6000){return String(value??'').replace(/\u0000/g,'').slice(0,max).trim();}
export function validateProject(p){
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('This is not a Day-Zero project.');
 const result={};
 for(const key of ['name','team','event','problem','solution','approach','proof','impact','ask','deadline','rules'])result[key]=clean(p[key],key==='rules'?10000:6000);
 result.name=result.name.slice(0,80);result.team=result.team.slice(0,100);result.event=result.event.slice(0,160);
 if(!result.name)throw Error('Add a project name first.');
 const notes=Object.fromEntries(fields.map(([k])=>[k,clean(p.notes?.[k],3000)]));
 const evidence=Array.isArray(p.evidence)?p.evidence.slice(0,30).filter(v=>v&&typeof v==='object'&&!Array.isArray(v)).map(v=>({id:clean(v.id,80)||createId(),claim:clean(v.claim,1200),source:clean(v.source,2000),type:['interview','demo','measurement','reference'].includes(v.type)?v.type:'reference',slide:fields.some(([k])=>k===v.slide)?v.slide:'proof'})).filter(v=>v.claim):[];
 const history=Array.isArray(p.history)?p.history.slice(-5).filter(v=>v&&Number.isFinite(v.at)&&v.data&&typeof v.data==='object').map(v=>({at:v.at,data:Object.fromEntries(fields.map(([k])=>[k,clean(v.data[k],6000)]))})):[];
 const checklist=Object.fromEntries(checklistItems.map(([k])=>[k,p.checklist?.[k]===true]));
 const answers=Array.from({length:6},(_,n)=>clean(p.answers?.[n],3000));
 const rehearsals=Array.isArray(p.rehearsals)?p.rehearsals.slice(-5).filter(v=>v&&Number.isFinite(v.at)&&Number.isFinite(v.seconds)&&v.seconds>=0&&v.seconds<=86400).map(v=>({at:v.at,seconds:v.seconds})):[];
 return {...result,preparation:normalizePreparation(p.preparation),id:/^[A-Za-z0-9-]{1,80}$/.test(p.id||'')?p.id:createId(),plan:p.plan==='solo'?'solo':'team',template:Object.hasOwn(themes,p.template)?p.template:'botanical',demo:p.demo===true,confirmed:p.confirmed===true&&!!result.rules,createdAt:Number(p.createdAt)||Date.now(),updatedAt:Number(p.updatedAt)||Date.now(),history,notes,evidence,checklist,answers,rehearsals,eventBrief:normalizeEvent(p.eventBrief)?.name===result.event?normalizeEvent(p.eventBrief):null,eventChecks:Object.fromEntries(eventChecks.map(([k])=>[k,p.eventChecks?.[k]===true]))};
}
export function normalizeWorkspace(raw,now=Date.now()){
 const candidates=raw?.version===2&&Array.isArray(raw.projects)?raw.projects:raw?[raw]:[];
 const projects=[],seen=new Set();
 for(const candidate of candidates.slice(0,MAX_PROJECTS)){try{if(isExpired(candidate,now))continue;const p=validateProject(candidate);if(seen.has(p.id))continue;projects.push(p);seen.add(p.id);}catch{}}
 return {version:2,projects,activeId:projects.some(p=>p.id===raw?.activeId)?raw.activeId:projects[0]?.id||null};
}
export function slides(p){return fields.map(([key,label])=>({key,title:({problem:'Problem',solution:'Solution',approach:'Approach',proof:'Evidence',impact:'Impact',ask:'Ask'})[key],text:clean(p[key])||`[ADD DATA: ${label.toLowerCase()}]`,source:p.demo?'Fictional demo project':'Student supplied · not independently verified'}));}
export function analyze(p){
 const deck=slides(p);const issues=[];
 for(const s of deck){if(!clean(p[s.key]))issues.push({id:s.key,kind:'missing',title:`Add ${s.title.toLowerCase()}`,detail:'This section needs your own information. We have kept an [ADD DATA] placeholder.',slide:deck.indexOf(s)+1});if(s.text.split(/\s+/).length>80)issues.push({id:s.key+'-length',kind:'length',title:`Shorten ${s.title.toLowerCase()}`,detail:'This section exceeds the preview’s 80-word readability target. Your event may have a different limit.',slide:deck.indexOf(s)+1});if(/(?:\b(?:best|guaranteed|revolutionary|first ever)\b|100%)/i.test(s.text))issues.push({id:s.key+'-claim',kind:'claim',title:'Review an absolute claim',detail:'Support this wording with a source or use a specific description without a superlative.',slide:deck.indexOf(s)+1});}
 for(const c of reviewClaims(p).filter(c=>c.status==='needs-source'))issues.push({id:c.key+'-number',kind:'number',title:'Add a source for a numerical claim',detail:'“'+c.quote+'” — add a source note with this exact sentence on the same slide, or label a proposed target as a goal.',slide:fields.findIndex(([k])=>k===c.key)+1});
 const countRule=String(p.rules||'').match(/(?:maximum|max(?:imum)?\.?|no more than|up to)\s*(\d{1,2})\s*slides?/i);if(countRule&&Number(countRule[1])<6)issues.push({id:'slide-limit',kind:'rule',title:'Your slide limit conflicts with this export',detail:'Your saved rules specify at most '+countRule[1]+' slides. This preview exports six. Adapt the content in the official template before submitting.',slide:0});
 if(!p.confirmed)issues.unshift({id:'rules',kind:'rule',title:'Confirm your event rules',detail:'Check the slide limit, required headings, accepted formats, and AI policy before submitting.',slide:0});
 if(!p.proof||/no user|no interview|not yet|none yet|no .*results/i.test(p.proof))issues.push({id:'evidence',kind:'proof',title:'Give the story real-world proof',detail:'Run a small interview or prototype test. Record what happened and its source; do not invent results.',slide:4});
 const blockers=issues.filter(i=>['missing','rule','claim','number'].includes(i.kind));
 return {deck,issues,blockers,ready:blockers.length===0,completed:fields.filter(([k])=>clean(p[k])).length};
}
export function daysLeft(deadline,now=Date.now()){if(!deadline)return null;let t=new Date(deadline).getTime();if(!Number.isFinite(t))return null;return Math.ceil((t-now)/86400000);}
export function isExpired(p,now=Date.now()){return !p||!Number.isFinite(Number(p.updatedAt))||now-Number(p.updatedAt)>=TTL;}
export function wrapText(text,measure,maxWidth){
 const lines=[];
 for(const paragraph of text.split('\n')){
  let line='';
  for(let word of paragraph.split(/\s+/)){
   if(measure(word)>maxWidth){
    if(line){lines.push(line);line='';}
    while(measure(word)>maxWidth&&word.length>1){
     let end=1;while(end<word.length&&measure(word.slice(0,end+1))<=maxWidth)end++;
     lines.push(word.slice(0,end));word=word.slice(end);
    }
   }
   const candidate=line?line+' '+word:word;
   if(line&&measure(candidate)>maxWidth){lines.push(line);line=word;}else line=candidate;
  }
  lines.push(line);
 }
 return lines;
}
export function safeFilename(s){return clean(s,70).replace(/[^a-zA-Z0-9_-]/g,'-').replace(/-+/g,'-')||'dayzero';}
export const questions=[['Problem','Who experiences this problem, and how do you know?','Use an actual observation or interview. If you have not tested it, say so.'],['Solution','Why is this better than the current alternative?','Describe the specific workflow difference. Avoid unmeasured performance claims.'],['Approach','What works today, and what still needs building?','Separate the prototype, planned features, and technical risks.'],['Evidence','What would convince you that your idea is wrong?','Explain a test you can run and what result would change your direction.'],['Impact','How will you measure whether this helps?','Name a measurable outcome and a baseline you still need to collect.'],['Ask','What will you do next if you get the support?','Give a concrete next step that matches your actual stage.']];
