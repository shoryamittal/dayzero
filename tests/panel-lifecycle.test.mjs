import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const moduleCode=name=>readFileSync(new URL('../dist/'+name,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export function /g,'function ');
const templateResult=()=>({slides:1,slots:[{id:'s1',slide:1,label:'Body',text:'Original template',locked:false}]});
const file={name:'fixture.pptx',size:20,arrayBuffer:async()=>new Uint8Array([1]).buffer};

function templateApp({readTemplate=async()=>templateResult(),fillTemplate=async()=>({blob:'file',changed:1})}={}){
 const handlers={},downloads=[],toasts=[];
 let active={id:'a',name:'Project A',solution:'Original wording',template:'signal'},panel=null,route='template',renders=0,lastMarkup='';
 const context=vm.createContext({structuredClone,Uint8Array,readTemplate,fillTemplate,window:{JSZip:{}},document:{
  addEventListener(name,handler){(handlers[name]||=[]).push(handler);},
  querySelector(){return panel;}
 }});
 vm.runInContext(moduleCode('template-ui.mjs'),context);
 const render=()=>{
  renders++;
  lastMarkup=route==='template'?context.templateBridge():'Home review results';
  if(panel)panel.isConnected=false;
  panel=route==='template'?{isConnected:true}:null;
 };
 context.initTemplate({project:()=>active,render,toast:value=>toasts.push(value),download:(blob,name)=>downloads.push({blob,name}),loadScript:async()=>{}});
 render();
 return {
  read:()=>handlers.change[0]({target:{id:'official-pptx',dataset:{},files:[file]}}),
  map:value=>handlers.change[0]({target:{dataset:{templateSlot:'s1'},value}}),
  fill:()=>handlers.click[0]({target:{closest:()=>({})}}),
  leave(){route='home';render();},
  reopen(){route='template';render();},
  switchProject(){active={id:'b',name:'Project B',solution:'Other project',template:'noir'};route='template';render();},
  active:()=>active,renders:()=>renders,markup:()=>lastMarkup,downloads,toasts
 };
}

test('template reading can finish after leaving its panel without replacing homepage review results',async()=>{
 const read=deferred(),app=templateApp({readTemplate:()=>read.promise});
 const running=app.read();app.leave();const rendered=app.renders();
 read.resolve(templateResult());await running;
 assert.equal(app.renders(),rendered);
 assert.equal(app.markup(),'Home review results');
 app.reopen();assert.match(app.markup(),/fixture\.pptx · 1 slides/);
 assert.doesNotMatch(app.markup(),/Reading template/);
});

test('template fill snapshots project content and refuses an export after newer edits or theme changes',async()=>{
 const fill=deferred();let captured;
 const app=templateApp({fillTemplate:(_template,_mapping,project)=>{captured=project;return fill.promise;}});
 await app.read();await app.map('solution');
 const running=app.fill();
 app.active().solution='Latest manual edit';app.active().template='editorial';
 assert.equal(captured.solution,'Original wording');assert.equal(captured.template,'signal');
 fill.resolve({blob:'stale file',changed:1});await running;
 assert.equal(app.downloads.length,0);
 assert.ok(app.toasts.some(message=>/changed while/.test(message)));
 assert.equal(app.active().solution,'Latest manual edit');
});

test('a read for a previous project cannot clear a newer template operation or publish its result',async()=>{
 const first=deferred(),second=deferred();let calls=0;
 const app=templateApp({readTemplate:()=>++calls===1?first.promise:second.promise});
 const earlier=app.read();
 // Let the first read reach the parser before starting the other project.
 await new Promise(resolve=>setImmediate(resolve));
 app.switchProject();const later=app.read();
 const rendered=app.renders();
 first.resolve(templateResult());await earlier;
 assert.equal(app.renders(),rendered);
 assert.match(app.markup(),/Reading template/);
 second.resolve({slides:2,slots:[]});await later;
 assert.match(app.markup(),/fixture\.pptx · 2 slides/);
 assert.doesNotMatch(app.markup(),/Reading template/);
});

test('reference import saves valid text after route navigation without rerendering the new page',async()=>{
 const handlers={},read=deferred(),saved=deferred(),status={isConnected:true,textContent:''};
 const active={id:'a',winnerReference:null};let renders=0,saves=0;
 const context=vm.createContext({structuredClone,readBrief:()=>read.promise,sections:[],validSource:()=>'',externalIntegrationsEnabled:()=>false,document:{
  addEventListener(name,handler){(handlers[name]||=[]).push(handler);},querySelector:()=>status
 }});
 vm.runInContext(moduleCode('winner-reference.mjs'),context);
 context.initWinnerReference({project:()=>active,save:()=>{saves++;return saved.promise;},render:()=>renders++,toast:()=>{}});
 const running=handlers.change[0]({target:{id:'winner-deck-file',files:[file],value:'fixture'}});
 read.resolve('A reference describes a tested pilot.');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(saves,1);
 status.isConnected=false;saved.resolve();await running;
 assert.equal(active.winnerReference.text,'A reference describes a tested pilot.');
 assert.equal(renders,0);
});
