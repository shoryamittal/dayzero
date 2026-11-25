import {eventCatalog, searchEventRecords, searchPublicEvents, normalizeEvent, validSource} from './event-engine.mjs?v=pitchviva-1';

const guides = {
  imagine: {edition:'Imagine Cup 2027', year:'2027', label:'Competition category', source:'https://imaginecup.microsoft.com/en-us/compete', choices:{
    'Developer tools':'Show the developer workflow and demonstrate the step your tool improves.',
    Retail:'Follow one shopper or store team through the problem and show the operational benefit.',
    'Healthcare & life sciences':'Explain who uses the solution, where it fits into care, and what you have validated.',
    Cybersecurity:'Describe the threat, the affected user, and the protection your demo demonstrates.',
    'Financial services':'Walk through one financial workflow and show how the user benefits.',
    'Deep tech + physical AI':'Connect the software to its physical system and show a measured prototype result.',
    'Student startup':'Show what your team has built, who needs it, and what you learned from testing.'}},
  hult: {edition:'Hult Prize competition journey', label:'Competition stage', source:'https://ask.hultprize.org/understanding-the-requirements/how-do-we-select-the-winning-team', choices:{
    Qualifiers:'Connect the team, the idea, its social impact, and how the business can sustain itself.',
    Nationals:'Show evidence of customer demand and how you plan to reach your first market.',
    'Digital Incubator':'Show what your pilot taught you and the evidence of traction.',
    'Global Accelerator':'Use customer, revenue, or partnership evidence to explain your progress.',
    'Global Finals':'Explain how you would expand your impact and overcome a specific barrier to growth.'}},
  sih: {edition:'SIH 2024 · past edition', year:'2024', label:'Finale track', source:'https://finale.sih.gov.in/', choices:{
    Software:'Walk through your working software against the selected problem statement.',
    Hardware:'Show the physical prototype, its operating conditions, and what your tests demonstrated.'}}
};

function linkName(link) {
  const url = new URL(link);
  const host = url.hostname.replace(/^www\./,'');
  if (/\.(devpost\.com|devfolio\.co)$/.test(host)) return host.split('.')[0].replace(/-/g,' ');
  const slug = url.pathname.split('/').filter(Boolean).pop() || '';
  if (slug && !/^(?:index|home|en|compete|about|rounds|overview)(?:\.|$)/i.test(slug))
    return slug.replace(/\.html?$/i,'').replace(/[-_]\d{4,}$/,'').replace(/[-_]/g,' ').slice(0,160);
  return host.split('.')[0];
}

async function devpostSearch(query, signal) {
  const url = new URL('https://devpost.com/api/hackathons');
  url.searchParams.set('search',query);
  const res = await fetch(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if (!res.ok) throw Error('Directory unavailable');
  const data = await res.json();
  return (data.hackathons || []).filter(x=>validSource(x.url) && x.title && x.id).slice(0,4).map(x=>normalizeEvent({
    id:'devpost-'+x.id,name:x.title,kind:'Hackathon',official:x.url,source:x.url,sourceLabel:'Devpost listing',
    edition:x.submission_period_dates || 'Devpost listing',origin:'manual'
  }));
}

async function pageGuide(href,signal) {
  const url=new URL(href);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) || /\.(localhost|local|internal|test)$/i.test(url.hostname)) return null;
  const res=await fetch(url,{signal,mode:'cors',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'});
  if (!res.ok || !/text\/html/i.test(res.headers.get('content-type')||'') || !res.body) return null;
  const reader=res.body.getReader(), decoder=new TextDecoder();
  let size=0,html='';
  for (;;) {
    const {value,done}=await reader.read();
    if(done)break;
    size+=value.length;
    if(size>1000000){await reader.cancel();return null;}
    html+=decoder.decode(value,{stream:true});
  }
  const template=document.createElement('template');
  template.innerHTML=html+decoder.decode();
  const root=template.content;
  const clean=s=>typeof s==='string'?s.replace(/\s+/g,' ').trim().slice(0,150):'';
  const choices={};
  let title='';
  for(const script of root.querySelectorAll('script[type="application/ld+json"]')){
    let data;try{data=JSON.parse(script.textContent);}catch{continue;}
    for(const item of [data].flat().flatMap(x=>Array.isArray(x?.['@graph'])?x['@graph']:[x])){
      if(![item?.['@type']].flat().some(t=>typeof t==='string'&&/Event$/.test(t)))continue;
      title=clean(item.name);
      for(const child of [item.subEvent || []].flat()){
        const name=clean(child?.name);
        if(name && /round|track|final|qualif|semi|stage/i.test(name))choices[name]='';
      }
      if(title)break;
    }
  }
  for(const h of root.querySelectorAll('main h2,main h3,article h2,article h3')){
    if(!/^(?:competition |hackathon |challenge )?(?:rounds|tracks|stages)$/i.test(clean(h.textContent)))continue;
    const list=h.nextElementSibling;
    if(list?.matches('ul,ol'))for(const li of Array.from(list.children).slice(0,24)){
      const name=clean(li.querySelector('strong,b')?.textContent || li.textContent);
      if(name && name.length<=85)choices[name]='';
    }
  }
  title=title || clean(root.querySelector('meta[property="og:title"]')?.content || root.querySelector('title')?.textContent);
  return {title,choices};
}

const winnerExamples = {
  "sih": [
    2024,
    "Team Anurved",
    "Software finale at IIT Gandhinagar",
    "The team described a mapping tool that assigns tasks across government departments.",
    "Show one task moving between two real users in your prototype.",
    "https://news.iitgn.ac.in/iitgn-celebrates-the-winners-of-smart-india-hackathon-sih-2024/"
  ],
  "imagine": [
    2025,
    "Argus",
    "World Champion",
    "The team built a wearable assistant for people with low vision.",
    "Walk through one task your target user can complete with the prototype.",
    "https://techcommunity.microsoft.com/blog/StudentDeveloperBlog/announcing-the-2025-imagine-cup-world-champion/4414342"
  ],
  "hult": [
    2024,
    "Korion Health",
    "Global Finals winner",
    "The team paired an electronic stethoscope with a guided interface for home use.",
    "Show how a user completes one difficult step and how you would measure the benefit.",
    "https://www.hultprize.org/hult-prize-winners/2024/korion-health"
  ]
};
const cached = new Map();
const hostOf = link => new URL(link).hostname.replace(/^www\./,'');
const option = (label,value) => new Option(label,value);

customElements.define('competition-picker',class extends HTMLElement {
  connectedCallback() {
    if (this.childElementCount) return;
    this.innerHTML = `<div class="field"><label for="competition-name">Find your competition</label>
      <input id="competition-name" name="event" maxlength="160" autocomplete="off" placeholder="Search by name, e.g. Imagine Cup">
      <div class="reference-link">
        <label for="competition-link">Official link <small>(optional)</small></label>
        <input id="competition-link" type="url" placeholder="https://…" maxlength="1000">
        <button type="button" data-link>Read link</button></div>
      <p class="competition-status" role="status"></p><div class="competition-results"></div></div>
      <div class="competition-context" hidden><a target="_blank" rel="noopener noreferrer"></a>
        <label for="competition-options">Round or track</label><select id="competition-options"></select>
        <input aria-label="Your round or track" maxlength="160" placeholder="Enter your round or track" hidden>
        <input type="hidden" name="eventRound"><p class="pitch-guidance"></p><details data-winners><summary>Learn from a past winner</summary><p data-example></p><a data-story target="_blank" rel="noopener noreferrer">Read the winner profile ↗</a><label for="winner-source">Add a winner reference (optional)</label><input type="url" id="winner-source" placeholder="https://…"><label for="winner-lesson">What would you apply to your pitch?</label><input id="winner-lesson" maxlength="300" placeholder="For example, show one complete user workflow"></details></div>
      <details><summary>Add judging rules</summary><label for="launch-rules">Organizer’s rubric or instructions</label>
      <textarea id="launch-rules" name="rules" rows="3" maxlength="10000" placeholder="Paste any judging criteria, slide limit or template requirements."></textarea></details>`;
    const q = s => this.querySelector(s);
    const name=q('[name=event]'), link=q('#competition-link'), results=q('.competition-results'), status=q('[role=status]');
    const context=q('.competition-context'), select=q('select'), round=q('[name=eventRound]'), custom=q('[aria-label="Your round or track"]');
    const guideText=q('.pitch-guidance'), source=q('.competition-context a');
    let linkedGuide=null, pageController, timer, controller, sequence=0, guide=null, reference='', typedYear='';
    const stop=()=>{clearTimeout(timer);controller?.abort();sequence++;};
    this.stopSearch=()=>{stop();pageController?.abort();};
    const updateRound=()=>{
      custom.hidden=select.value!=='other';
      round.value=custom.hidden?select.value:custom.value.trim();
      this.pitchTip=guide?.choices[select.value] || this.record?.angles?.[0] || '';
      guideText.textContent=this.pitchTip?'Deck tip · '+this.pitchTip:'';
      const example=winnerExamples[this.record?.id];
      const year=Number(typedYear)||new Date().getFullYear();
      const applicable=example && example[0]<=year && !(this.record.id==='sih' && select.value==='Hardware');
      const link=q('[data-story]');
      link.hidden=!applicable;
      const lessons=[this.pitchTip];
      if(applicable){
        const [edition,team,award,description,lesson,url]=example;
        link.href=url;
        q('[data-example]').textContent=team+' · '+edition+' · '+award+'. '+description+' PitchViva suggestion: '+lesson;
        lessons.push('Preparation idea from '+team+' ('+edition+', '+award+'): '+lesson+' Source: '+url);
      }else q('[data-example]').textContent='Add a winner announcement or published pitch from this competition to your preparation notes.';
      const extra=validSource(q('#winner-source').value.trim());
      if(extra)lessons.push('Team-supplied winner reference: '+extra+' '+q('#winner-lesson').value.trim());
      this.pitchTip=lessons.filter(Boolean).join('\n');

    };
    function merge(local,remote) {
      const names=new Set(local.map(e=>e.name.toLowerCase()));
      return [...local,...remote.filter(e=>!names.has(e.name.toLowerCase()) && names.add(e.name.toLowerCase()))].slice(0,7);
    }
    const choose=(record)=>{
      stop();
      const row=normalizeEvent(record);
      this.record=reference?{...row,source:reference,sourceLabel:'Competition reference',official:reference}:row;
      name.value=row.name;
      results.replaceChildren();
      const g=guides[row.id];
      guide=linkedGuide || (g && !(typedYear && g.year && typedYear!==g.year)?g:null);
      if (guide && this.record.origin==='catalog') this.record={...this.record,edition:guide.edition};
      const href=validSource(reference || guide?.source || row.official || row.source);
      source.hidden=!href;
      if(href){source.href=href;source.textContent=reference?'Open your reference ↗':guide?guide.edition+' ↗':row.sourceLabel+' ↗';}
      status.textContent=guide?(reference?guide.edition:'Competition selected.'):'Competition selected. You can add a round from the organizer’s brief.';
      context.hidden=false;
      q('label[for=competition-options]').textContent=guide?.label || 'Round or track';
      select.replaceChildren(option('Choose later',''),...Object.keys(guide?.choices || {}).map(x=>option(x,x)),option('Enter my own…','other'));
      custom.value='';updateRound();
      this.dispatchEvent(new CustomEvent('competition-selected',{bubbles:true}));
      if(!guide && row.id.startsWith('devpost-') && row.official){
        const token=sequence;
        const active=new AbortController();pageController=active;
        const timeout=setTimeout(()=>active.abort(),3800);
        pageGuide(row.official,active.signal).then(page=>{
          if(token!==sequence || !this.isConnected || !page || select.value || !Object.keys(page.choices).length)return;
          guide={label:'Round or track',choices:page.choices};
          for(const choice of Object.keys(page.choices))select.add(option(choice,choice),select.options.length-1);
          status.textContent='Rounds found on the event listing.';
        }).catch(()=>{}).finally(()=>clearTimeout(timeout));
      }
    };
    const display=(items)=>{
      results.replaceChildren();
      for (const e of items){
        const b=document.createElement('button');b.type='button';b.textContent=e.name;
        const small=document.createElement('small');small.textContent=e.id.startsWith('devpost-')?'Devpost listing':e.origin==='wikipedia'?'Wikipedia background':guides[e.id]?.edition||e.edition;
        b.append(small);b.onclick=()=>choose(e);results.append(b);
      }
      if(name.value.trim()){
        const b=document.createElement('button');b.type='button';b.textContent='Use “'+name.value.trim()+'” as entered';
        b.onclick=()=>choose({id:'custom-'+name.value.trim().toLowerCase().slice(0,80),name:name.value.trim(),source:reference,origin:'manual'});results.append(b);
      }
    };
    const search=()=>{
      q('#winner-source').value='';q('#winner-lesson').value='';q('[data-winners]').open=false;
      stop();this.record=null;this.pitchTip='';context.hidden=true;round.value='';custom.value='';
      const query=name.value.trim();
      typedYear=query.match(/\b20\d{2}\b/)?.[0]||'';
      results.replaceChildren();status.textContent='';
      if(query.length<2)return;
      const local=searchEventRecords(this.savedRecords?.() || eventCatalog,query).slice(0,4);
      display(local);status.textContent='Looking for online matches…';
      const token=sequence;
      timer=setTimeout(async()=>{
        controller=new AbortController();
        const active=controller;
        const timeout=setTimeout(()=>active.abort(),5500);
        let remote=cached.get(query.toLowerCase()),failed=false;
        try{
          if(!remote){
            const responses=await Promise.allSettled([devpostSearch(query,active.signal),searchPublicEvents(query,{signal:active.signal})]);
            failed=responses.every(r=>r.status==='rejected');
            remote=responses.flatMap(r=>r.status==='fulfilled'?r.value:[]);
            if(!failed && remote.length){if(cached.size>40)cached.clear();cached.set(query.toLowerCase(),remote);}
          }
          if(token!==sequence || !this.isConnected)return;
          const list=merge(local,remote);
          if(!results.contains(document.activeElement))display(list);
          status.textContent=failed?'Online lookup unavailable. Choose a saved match, use a link, or keep the name.':list.length?'Choose the matching competition.':'No matches. Add a competition link or use the name you entered.';
        }finally{clearTimeout(timeout);}
      },350);
    };
    name.oninput=()=>{pageController?.abort();linkedGuide=null;if(this.record){reference='';link.value='';}search();};
    q('#winner-source').oninput=updateRound;
    q('#winner-lesson').oninput=updateRound;
    select.onchange=()=>{updateRound();if(!custom.hidden)custom.focus();};
    custom.oninput=updateRound;
    const attach=async()=>{
      const href=validSource(link.value.trim());
      if(!href){status.textContent='Paste a full https:// competition link.';link.focus();return;}
      const domain=hostOf(href);
      const match=eventCatalog.find(e=>e.official && hostOf(e.official)===domain);
      reference=href;linkedGuide=null;pageController?.abort();
      if(match){typedYear=(href+' '+name.value).match(/\b20\d{2}\b/)?.[0]||'';choose(match);}
      else {
        stop();
        status.textContent='Checking the competition page…';
        const active=new AbortController();pageController=active;
        const timeout=setTimeout(()=>active.abort(),3800), token=sequence;
        let page;
        try{page=await pageGuide(href,active.signal);}catch{}finally{clearTimeout(timeout);}
        if(sequence!==token || !this.isConnected)return;
        if(page?.title || Object.keys(page?.choices || {}).length){
          if(Object.keys(page.choices).length)linkedGuide={edition:'Rounds from the linked page',label:'Round or track',source:href,choices:page.choices};
          choose({id:'link-'+href.slice(8,90),name:name.value.trim() || page.title || linkName(href),source:href,sourceLabel:'Competition reference',origin:'manual'});
        }else{
          if(!name.value.trim())name.value=linkName(href);
          search();status.textContent='Link saved. Choose a match or use the name as entered.';
        }
      }
      this.dispatchEvent(new CustomEvent('competition-selected',{bubbles:true}));
    };
    q('[data-link]').onclick=attach;
    link.oninput=()=>{pageController?.abort();linkedGuide=null;reference='';search();};
    link.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();attach();}};
    // Persist a supplied link even when the student continues without choosing a result.
    this.getBrief=()=>this.record || (name.value.trim() && validSource(link.value.trim())?normalizeEvent({id:'custom-'+name.value.trim().toLowerCase().slice(0,80),name:name.value.trim(),source:link.value.trim(),sourceLabel:'Competition reference',origin:'manual'}):null);
  }
  disconnectedCallback(){this.stopSearch?.();}
});

