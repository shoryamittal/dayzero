import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {projectBriefHandoff} from '../dist/backend-handoff.mjs';

const code=readFileSync(new URL('../dist/deck-workspace.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../dist/deck-workspace.html',import.meta.url),'utf8');
class Element {
 constructor(){this.value='';this.children=[];this.hidden=false;this.handlers={};}
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=items}
 add(item){this.children.push(item)}
 addEventListener(name,fn){this.handlers[name]=fn}
}
function browser(fetcher,stored=new Map()) {
 const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 const defaults={name:'Case Buster 2.0',organizer:'IETE SPIT',year:'2026',round:'Round 1',topic:'Queue pilot',audience:'Judges',token:'fixture-secret'};
 for(const [id,value] of Object.entries(defaults))elements[id].value=value;
 const context=vm.createContext({document:{getElementById:id=>elements[id],createElement:()=>new Element(),createTextNode:text=>text},location:{hostname:'localhost'},crypto:webcrypto,sessionStorage:{setItem:(k,v)=>stored.set(k,v),getItem:k=>stored.get(k)||null,removeItem:k=>stored.delete(k)},Option:class extends Element{constructor(label,value){super();this.value=value;this.textContent=label}},URL,Blob,AbortController,TypeError,fetch:fetcher,setTimeout:(fn,delay)=>delay===45000?1:(queueMicrotask(fn),1),clearTimeout(){}});
 vm.runInContext(code,context);
 return {elements,stored};
}
const response=value=>({ok:true,json:async()=>structuredClone(value)});
function draft(){return {id:'job1',revision:1,status:'choose_design',profile:{rules:[],verification:{status:'manual_unverified',sources:[]}},options:[{id:'option',template:'test',palette:{id:'green'},typography:{id:'readable'},slides:['title']}],selected:null,slides:null};}
const submit=app=>app.elements.brief.onsubmit({preventDefault(){}});

test('a lost create response retries with the same idempotency key and keeps credentials out of the backup',async()=>{
 const keys=[];let calls=0;
 const app=browser(async(path,request)=>{
  keys.push(request.headers['Idempotency-Key']);
  if(++calls===1)throw new TypeError('connection dropped');
  return response(draft());
 });
 await submit(app);
 assert.match(app.elements.status.textContent,/preserved/);
 await submit(app);
 assert.equal(keys[0],keys[1]);
 assert.equal(calls,2);
 assert.ok(![...app.stored.values()].join('').includes('fixture-secret'));
 const restored=browser(()=>{throw Error('must not send a request on reload')},app.stored);
 assert.equal(restored.elements.topic.value,'Queue pilot');
 assert.match(restored.elements.status.textContent,/restored/);
});

test('retry recovers a committed generation after its response is lost, without creating a second render',async()=>{
 let server=draft(),generates=0;
 const app=browser(async(path,request)=>{
  if(path==='/backend/decks')return response(server);
  if(path.endsWith('/draft')){const body=JSON.parse(request.body);server={...server,revision:server.revision+1,status:'review',selected:body.option_id,slides:body.slides||[{title:'Pilot',blocks:[{label:'Evidence',text:'Observed wait'}]}]};return response(server)}
  if(path.endsWith('/generate')){generates++;server={...server,status:'queued'};throw new TypeError('response lost')}
  if(server.status==='queued')return response(server={...server,status:'ready',downloads:{pptx:'/file'},checks:{pages:1,font_substitutions:{}}});
  return response(server);
 });
 await submit(app);await app.elements.options.children[0].children.at(-1).onclick();
 await app.elements.generate.onclick();
 assert.match(app.elements.status.textContent,/preserved/);
 await app.elements.retry.onclick();
 assert.equal(generates,1);assert.match(app.elements.status.textContent,/ready/);
 assert.equal(app.elements.files.children[0].textContent,'Download PPTX');
});

test('retry saves local edits after a failed save before requesting generation',async()=>{
 let server=draft(),failSave=false,renderedText='';
 const app=browser(async(path,request)=>{
  if(path==='/backend/decks')return response(server);
  if(path.endsWith('/draft')){
   if(failSave){failSave=false;throw new TypeError('save disconnected')}
   const body=JSON.parse(request.body);server={...server,revision:server.revision+1,status:'review',selected:body.option_id,slides:body.slides||[{title:'Pilot',blocks:[{label:'Evidence',text:'Original'}]}]};return response(server);
  }
  if(path.endsWith('/generate')){renderedText=server.slides[0].blocks[0].text;return response(server={...server,status:'ready',downloads:{},checks:{pages:1,font_substitutions:{}}})}
  return response(server);
 });
 await submit(app);await app.elements.options.children[0].children.at(-1).onclick();
 const content=app.elements.slides.children[0].children[2].children[0];content.value='Corrected evidence';content.oninput();
 failSave=true;await app.elements.generate.onclick();await app.elements.retry.onclick();
 assert.equal(renderedText,'Corrected evidence');
});

test('project handoff preserves all six sections, speaker notes, rules and source records for review',()=>{
 const p={name:'Pilot',event:'College case',problem:'p',solution:'s',approach:'a',proof:'e',impact:'i',ask:'q',rules:'Organizer rules',notes:{problem:'Speaker notes'},evidence:[{url:'https://example.org',claim:'Source claim'}]};
 const handoff=projectBriefHandoff(p);
 for(const text of ['p','s','a','e','i','q','Organizer rules','Speaker notes','Source claim'])assert.ok(handoff.form.notes.includes(text));
 assert.equal(handoff.form.organizer,'');assert.equal(handoff.form.round,'');
 assert.throws(()=>projectBriefHandoff({problem:'x'.repeat(91000)}),/exceeds/);
});
