const text=(value,max=1000)=>typeof value==='string'?value.replace(/\0/g,'').trim().slice(0,max):'';
const checked='2026-11-04';
export const eventCatalog=[
 {id:'sih',name:'Smart India Hackathon',aliases:['sih','smart india'],kind:'Hackathon',code:'SIH',color:'citrus',scope:'India · student innovation',summary:'A national initiative that gives students a platform to tackle everyday problems and develop practical innovations.',source:'https://www.india.gov.in/category/education-learning/subcategory/higher-education/details/website-of-smart-india-hackathon',sourceLabel:'National Portal of India',official:'https://sih.gov.in/',edition:'General event background',facts:[['Purpose','Student problem-solving and product innovation'],['Starting point','Check the current problem statements on the organizer’s portal']],angles:['Name the exact problem statement and the people affected.','Show a working path from problem to prototype.','Separate demonstrated capability from the next test.']},
 {id:'imagine',name:'Imagine Cup',aliases:['microsoft','imagine cup 2027'],kind:'Startup challenge',code:'IC',color:'lavender',scope:'Global · Microsoft for Startups',summary:'A Microsoft competition for startups using its technology. The 2027 application pathway asks for the problem, customer, business model, traction, and use of Microsoft technology.',source:'https://imaginecup.microsoft.com/en-us/compete',sourceLabel:'Microsoft · competition guidance',official:'https://imaginecup.microsoft.com/en-us/compete',edition:'2027 application guidance',facts:[['Technology context','Azure-powered solutions'],['Application pathway','Select a competition category; eligibility still needs review']],angles:['Make the customer and their current alternative concrete.','Explain where Microsoft technology is used in the product.','Support traction with evidence and label any untested assumptions.']},
 {id:'hult',name:'Hult Prize',aliases:['hult','ef hult prize'],kind:'Startup challenge',code:'HP',color:'rose',scope:'Global · student entrepreneurship',summary:'A student startup competition focused on solving major challenges through business. Participants develop and pitch their ventures through a competition journey.',source:'https://www.hultprize.org/',sourceLabel:'Hult Prize · organizer overview',official:'https://www.hultprize.org/',edition:'General event background',facts:[['Focus','Student entrepreneurship'],['Approach','Business as a way to address global challenges']],angles:['Connect the social problem to a specific customer.','Explain how the venture could sustain itself financially.','Distinguish intended impact from impact you have measured.']},
 {id:'hackmit',name:'HackMIT',aliases:['hack mit','mit hackathon'],kind:'Hackathon',code:'HM',color:'blue',scope:'MIT · hackathon',summary:'A hackathon organized at MIT. Start with the current organizer website for the edition, schedule, eligibility, and submission requirements.',source:'https://hackmit.org/',sourceLabel:'HackMIT · organizer website',official:'https://hackmit.org/',edition:'Organizer reference · rules not extracted',facts:[['Event identity','Hackathon at MIT'],['Current edition','Check the organizer website']],angles:['Demonstrate the part of the product that actually works.','Explain the technical choices in clear language.','Prepare a concise demo and a recovery plan if it fails.']}
].map(e=>({...e,checked,origin:'catalog'}));

export function catalogSearch(query='',kind='All'){
 const q=text(query,160).toLowerCase().replace(/\b20\d{2}\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 return eventCatalog.filter(e=>(kind==='All'||kind===e.kind)&&(!q||[e.name,...e.aliases].some(v=>v.toLowerCase().includes(q))));
}
export function validSource(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function normalizeEvent(e){
 if(!e||typeof e!=='object'||Array.isArray(e)||!text(e.name,160))return null;
 return {id:text(e.id,100),name:text(e.name,160),kind:['Hackathon','Startup challenge'].includes(e.kind)?e.kind:'Background result',code:text(e.code,4)||'EV',color:['citrus','lavender','rose','blue'].includes(e.color)?e.color:'lavender',scope:text(e.scope,120),summary:text(e.summary,1200),source:validSource(e.source),sourceLabel:text(e.sourceLabel,160),official:validSource(e.official),edition:text(e.edition,120),checked:/^\d{4}-\d{2}-\d{2}$/.test(e.checked||'')?e.checked:'',origin:['catalog','wikipedia','manual'].includes(e.origin)?e.origin:'manual',facts:Array.isArray(e.facts)?e.facts.slice(0,4).filter(v=>Array.isArray(v)&&v.length===2).map(v=>[text(v[0],100),text(v[1],300)]):[],angles:Array.isArray(e.angles)?e.angles.slice(0,3).map(v=>text(v,400)):[]};
}
export function wikiResults(data,now=new Date(),query=''){
 const pages=data?.query?.pages;if(!Array.isArray(pages))return [];
 const tokens=query.toLowerCase().split(/\s+/).filter(t=>t.length>2&&!/^(the|and|for|202\d)$/.test(t));
 return pages.filter(p=>p.ns===0&&p.pageid>0&&p.title&&p.extract&&!Object.hasOwn(p.pageprops||{},'disambiguation')&&(!tokens.length||tokens.some(t=>p.title.toLowerCase().includes(t)))).sort((a,b)=>(a.index||0)-(b.index||0)).slice(0,5).map(p=>normalizeEvent({id:'wiki-'+p.pageid,name:p.title,kind:'Background result',code:'W',color:'blue',scope:'Wikipedia · background only',summary:p.extract,source:'https://en.wikipedia.org/?curid='+p.pageid,sourceLabel:'Wikipedia · CC BY-SA',edition:'Article background · event identity unconfirmed',checked:now.toISOString().slice(0,10),origin:'wikipedia',facts:[['Source type','Encyclopedia background, not organizer rules'],['Event identity','Confirm this is the event and edition you mean']],angles:[]}));
}
export async function searchPublicEvents(query,{signal,fetcher=fetch}={}){
 const q=text(query,160);if(q.length<2)return [];
 const url=new URL('https://en.wikipedia.org/w/api.php');url.search=new URLSearchParams({action:'query',format:'json',formatversion:'2',origin:'*',generator:'search',gsrsearch:q,gsrlimit:'5',gsrnamespace:'0',prop:'extracts|pageprops',exintro:'1',explaintext:'1',exsentences:'3',exlimit:'5',redirects:'1'});
 const response=await fetcher(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
 if(!response.ok)throw Error('Public search is temporarily unavailable.');
 const data=await response.json();if(data.error)throw Error('Public search could not finish.');return wikiResults(data,new Date(),q);
}
export const eventChecks=[['edition','Confirm the event edition and your track'],['eligibility','Check eligibility and team-size limits'],['template','Get the official deck template and slide limit'],['deadline','Confirm the deadline and time zone'],['policy','Check AI, plagiarism, and disclosure rules']];
export function pitchCompass(p){
 return [
  {key:'problem',title:'Make the problem specific.',ready:!!text(p?.problem),detail:text(p?.problem,180)||'Who faces the problem, and what do they do today?'},
  {key:'approach',title:'Show what works today.',ready:!!text(p?.approach),detail:text(p?.approach,180)||'Bring one working interaction, prototype, or concrete workflow.'},
  {key:'proof',title:'Give the story a source.',ready:!!p?.evidence?.length,detail:p?.evidence?.length?`${p.evidence.length} source note${p.evidence.length===1?'':'s'} on your proof board. Review their quality before using them.`:'Add an interview, demo, measurement, or reference to the proof board.'}
 ];
}
export function eventBriefText(e,p){
 const v=normalizeEvent(e);if(!v)return '';
 return `DAY-ZERO / EVENT BRIEF\n${v.name}\n${v.edition}\n\n${v.summary}\n\nSOURCE\n${v.sourceLabel}: ${v.source||'Not provided'}\n${v.origin==='wikipedia'?'Article retrieved':'Reference reviewed'}: ${v.checked||'Not recorded'}\n${v.origin==='wikipedia'?'Wikipedia excerpt is CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/); see the source article and its history.\n':''}\nPREPARATION SUGGESTIONS (Day-Zero guidance, not an official rubric)\n${(v.angles.length?v.angles:['Clarify the problem, show the working product, and bring evidence.']).map(a=>'- '+a).join('\n')}\n\nSTILL TO VERIFY\n${eventChecks.map(([k,label])=>`[${p?.eventChecks?.[k]===true?'x':' '}] ${label}`).join('\n')}\n\nThis brief does not establish eligibility or verify compliance. Confirm current requirements with the organizer.\n`;
}
