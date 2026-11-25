import {catalogSearch} from '../dist/event-engine.mjs';
import {competitionBrief,competitionURL} from './competition.mjs';
const bounded=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const safe=value=>{try{return competitionURL(value).href;}catch{return '';}};
function unique(items){const seen=new Set();return items.filter(item=>item.url&&!seen.has(item.url)&&seen.add(item.url));}
function combine(pages,max){
 const lines=[];let length=0;
 for(const page of pages)for(const line of page.excerpts||[]){if(typeof line!=='string'||!line.trim())continue;if(length+line.length+1>max)continue;lines.push(line);length+=line.length+1;}
 return lines.join('\n');
}
async function readBounded(reader,url,kind){
 let timer;
 try{return await Promise.race([reader(url,kind),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Source timed out.')),6500);})]);}
 finally{clearTimeout(timer);}
}
export async function prepareCompetition(data,{searcher,reader=(url,kind)=>competitionBrief(url,undefined,kind)}={}){
 const event=bounded(data.event,240),provided=bounded(data.source,1000);
 if(provided&&!safe(provided))throw Error('Use a public HTTPS event link.');
 const additionalRules=bounded(data.additionalRules,3000);
 const notes=[],catalog=event?catalogSearch(event).slice(0,2):[];
 const known=catalog.map(item=>({title:item.name,url:safe(item.official||item.source),kind:'directory'}));
 let discovered=[],references=[],suggestions='';
 if(event&&searcher){
  const results=await Promise.allSettled([
   searcher(event+' official organizer current edition judging criteria submission rules'),
   searcher(event+' previous winners pitch presentation project official')
  ]);
  if(results[0].status==='fulfilled'){
   discovered=(results[0].value.sources||[]).map(s=>({title:bounded(s.title,180),url:safe(s.url),kind:'discovered'}));
   suggestions=results[0].value.suggestions||'';
  }else notes.push('Live competition discovery did not finish. Only successfully read sources are used.');
  if(results[1].status==='fulfilled'){
   references=(results[1].value.sources||[]).map(s=>({title:bounded(s.title,180),url:safe(s.url),kind:'reference'}));
   if(!suggestions)suggestions=results[1].value.suggestions||'';
  }else notes.push('A past-winner reference could not be collected for this run.');
 }
 const candidates=unique([...(provided?[{title:'Event page',url:safe(provided),kind:'provided'}]:[]),...known,...discovered]).slice(0,3);
 const referenceCandidates=unique(references.filter(s=>!candidates.some(c=>c.url===s.url))).slice(0,2);
 async function read(items,kind){
  const results=await Promise.allSettled(items.map(async item=>{
   const page=await readBounded(reader,item.url,kind);
   if(!Array.isArray(page.excerpts)||!page.excerpts.length)throw Error('No readable excerpts.');
   return {...item,url:safe(page.source)||item.url,checked:bounded(page.checked,80),excerpts:page.excerpts};
  }));
  if(results.some(r=>r.status==='rejected'))notes.push(kind==='rules'?'Some competition pages could not be read. This is not a complete rulebook.':'Some reference pages could not be read.');
  return results.filter(r=>r.status==='fulfilled').map(r=>r.value);
 }
 const [sources,referenceSources]=await Promise.all([read(candidates,'rules'),read(referenceCandidates,'reference')]);
 const discoveredRules=combine(sources,additionalRules?6000-additionalRules.length-2:6000),reference=combine(referenceSources,12000);
 const rules=[additionalRules,discoveredRules].filter(Boolean).join('\n\n');
 if(event&&!discoveredRules)notes.push('Competition rules were not found in readable sources. This run uses your additional rules, if supplied, and general pitch guidance, without claiming full event compliance.');
 if(reference)notes.push('Reference pages inform structure only. Past-winner status and achievements are not independently verified.');
 if(!reference)notes.push('No readable past-winner reference was used.');
 if(sources.length)notes.push('Check that the discovered pages match your edition and round. Only the displayed excerpts were available to the reviewer.');
 return {event,rules,additionalRules,reference,source:sources[0]?.url||'',referenceSource:referenceSources[0]?.url||'',
  sources,referenceSources,notes:[...new Set(notes)],suggestions:bounded(suggestions,60000),visualAvailable:false};
}
