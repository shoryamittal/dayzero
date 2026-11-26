import {eventCatalog, searchEventRecords, normalizeEvent, validSource} from './event-engine.mjs';
import {competitionSelection, competitionRoundGuide} from './competition-picker.mjs';

let pending;
const imports=new WeakMap(),versions=new WeakMap();
async function briefs(){
 if(!pending)pending=fetch('/competition-briefs.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).catch(error=>{pending=null;throw error;});
 return pending;
}

export function localCompetitionMatches(records,query){
 const year=String(query).match(/\b20\d{2}\b/)?.[0]||'';
 const dated=records.flatMap(brief=>{
  const href=validSource(brief.url),edition=String(brief.name||'').match(/\b20\d{2}\b/)?.[0]||'';
  if(!href||!brief.name||(year&&edition&&year!==edition))return [];
  const base=eventCatalog.find(event=>event.official&&new URL(event.official).hostname.replace(/^www\./,'')===new URL(href).hostname.replace(/^www\./,''));
  const record=normalizeEvent({
   ...base,id:base?.id||'brief-'+String(brief.alias||brief.name).toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,80),
   name:brief.name,source:href,official:href,sourceLabel:'Saved organizer reference',origin:'catalog',
   edition:edition?edition+' · saved reference':'Saved edition reference',checked:brief.checked,
   summary:[brief.rules,brief.schedule].filter(Boolean).join('\n'),facts:[['Saved schedule',brief.schedule||'Not recorded']],angles:brief.tip?[brief.tip]:[]
  });
  record.aliases=[brief.alias,...(base?.aliases||[])].filter(Boolean);
  return [{record,brief}];
 });
 const byName=new Map(dated.map(item=>[item.record.name.toLowerCase(),item]));
 for(const record of eventCatalog)if(!byName.has(record.name.toLowerCase()))byName.set(record.name.toLowerCase(),{record,brief:null});
 const all=[...byName.values()];
 const matches=searchEventRecords(all.map(item=>item.record),query);
 return matches.slice(0,5).map(record=>({...all.find(item=>item.record===record),year}));
}

function node(parent,tag,text){const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;}

if(typeof document!=='undefined')document.addEventListener('input',async event=>{
 const input=event.target;
 if(!input.matches('#pitch-competition,#launch-event,#intake-form #event'))return;
 const form=input.form,query=input.value.trim();if(!form)return;
 const revision=(versions.get(input)||0)+1;versions.set(input,revision);
 input.eventBrief=null;
 for(const [el,value] of imports.get(form)||[])if(el.value===value){el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));}
 imports.delete(form);
 const roundOptions=form.querySelector('#pitch-round-options');roundOptions?.replaceChildren();
 let panel=form.querySelector('.official-brief');
 if(!panel){panel=document.createElement('aside');panel.className='official-brief';panel.setAttribute('aria-live','polite');input.after(panel);}
 panel.replaceChildren();if(query.length<2)return;
 let saved=[];try{saved=await briefs();}catch{/* The built-in reference directory remains available. */}
 if(!input.isConnected||versions.get(input)!==revision)return;
 const hits=localCompetitionMatches(saved,query);
 if(!hits.length){node(panel,'small','No saved reference matches. Keep your event name and add your organizer’s current rules. Live research is pending.');return;}
 node(panel,'small','Saved references · current rules still need your review');
 for(const item of hits){
  const choice=node(panel,'button',item.record.name+' · '+item.record.edition);choice.type='button';choice.className='btn small';
  choice.onclick=()=>show(item);
 }
 function show({record,brief,year}){
  panel.replaceChildren();
  node(panel,'strong',record.name);
  node(panel,'p',record.summary);
  if(brief?.tip)node(panel,'p','Pitch suggestion · '+brief.tip);
  const a=node(panel,'a','Organizer source · saved '+(record.checked||'date not recorded'));a.href=record.source;a.target='_blank';a.rel='noopener noreferrer';
  node(panel,'p','This is a dated saved reference. No live page or schedule check was made.');
  const apply=node(panel,'button','Use this saved reference');apply.type='button';apply.className='btn small';
  apply.onclick=()=>{
   const chosen=competitionSelection(record,{year});
   input.value=chosen.name;
   input.dispatchEvent(new Event('input',{bubbles:true}));
   versions.set(input,(versions.get(input)||0)+1);
   input.eventBrief=chosen;input.dataset.eventRecord=chosen.id;
   const changes=[];
   const values=[['competitionLink',chosen.official||chosen.source]];
   if(brief){
    values.push(['rules',[brief.rules,brief.schedule,brief.url].filter(Boolean).join('\n')],['eventRound',brief.round]);
    // The compact creation flow deliberately does not ask for a deadline.
    if(form.id==='intake-form')values.push(['deadline',brief.date]);
   }
   for(const [id,value] of values){
    const el=form.elements.namedItem(id);
    if(el&&value&&!el.value.trim()){el.value=value;changes.push([el,value]);el.dispatchEvent(new Event('input',{bubbles:true}));}
   }
   imports.set(form,changes);
   const guide=competitionRoundGuide(record,year);
   if(roundOptions&&guide)for(const choice of Object.keys(guide.choices)){const item=document.createElement('option');item.value=choice;roundOptions.append(item);}
   panel.replaceChildren();
   node(panel,'p','Reference attached. Your own rules and text were kept. Confirm the current edition before submitting.');
   if(guide){
    node(panel,'small','Round/track suggestions: '+guide.edition+'. You can also type your own.');
    const source=node(panel,'a','View the saved round/track source');source.href=guide.source;source.target='_blank';source.rel='noopener noreferrer';
   }
   input.dispatchEvent(new CustomEvent('competition-selected',{bubbles:true}));
  };
 }
});
