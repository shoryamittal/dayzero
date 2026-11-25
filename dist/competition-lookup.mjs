let pending;
const imports=new WeakMap();
async function briefs(){
 if(!pending) pending=fetch('/competition-briefs.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json()}).catch(e=>{pending=null;throw e});
 return pending;
}
function node(parent,tag,text){const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;}
document.addEventListener('input',async e=>{
 const input=e.target;
 if(!input.matches('#launch-event,#intake-form #event'))return;
 const form=input.form,query=input.value.trim().toLowerCase();
 for(const [el,value] of imports.get(form)||[]){if(el.value===value){el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));}}
 imports.delete(form);
 let panel=form.querySelector('.official-brief');
 if(!panel){panel=document.createElement('aside');panel.className='official-brief';panel.setAttribute('aria-live','polite');input.after(panel);}
 panel.replaceChildren();if(query.length<2)return;
 let records;try{records=await briefs();}catch{if(input.value.trim().toLowerCase()===query)panel.textContent='Lookup unavailable. You can enter your organizer’s rules below.';return;}
 if(!input.isConnected||query!==input.value.trim().toLowerCase())return;
 const hits=records.filter(r=>[r.name,r.alias].some(s=>s.toLowerCase().includes(query)));
 if(!hits.length){node(panel,'small','No verified schedule for this edition. You can enter a custom brief below.');return;}
 function show(r){
  panel.replaceChildren();
  node(panel,'strong',r.name);node(panel,'p',r.schedule);node(panel,'p',r.rules);node(panel,'p','Pitch suggestion · '+r.tip);
  const a=node(panel,'a','Organizer source · checked '+r.checked);a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';
  const apply=node(panel,'button','Use this brief');apply.type='button';apply.className='btn small';
  apply.onclick=()=>{
   input.value=r.name;
   input.dispatchEvent(new Event('input',{bubbles:true}));
   const changes=[];
   for(const [id,value] of [['rules',r.rules+'\n'+r.schedule+'\n'+r.url],['eventRound',r.round],['deadline',r.date]]){
    const el=form.elements.namedItem(id);
    if(el&&!el.value.trim()){el.value=value;changes.push([el,value]);el.dispatchEvent(new Event('input',{bubbles:true}));}
   }
   imports.set(form,changes);
   queueMicrotask(()=>{panel.textContent=changes.length?'Competition details added. Edit them below for your track.':'Your custom details are already filled in.';});
  };
 }
 if(hits.length===1){show(hits[0]);return;}
 for(const r of hits){const b=node(panel,'button',r.name);b.type='button';b.onclick=()=>show(r);}
});