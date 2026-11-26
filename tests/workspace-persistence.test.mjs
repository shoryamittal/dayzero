import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {persistentWorkspace,mergeWorkspace,transactWorkspace} from '../dist/workspace-persistence.mjs';
import {validateProject,MAX_PROJECTS,TTL} from '../dist/engine.mjs';

const now=Date.now();
const project=(id,solution='Original')=>validateProject({id,name:'Project '+id,solution,updatedAt:now,createdAt:now});
const initial=(projects=[project('a')])=>persistentWorkspace({version:2,projects,activeId:projects[0]?.id},now);
const update=(state,value)=>({generation:state.persistence.generation,upserts:[{project:value,expectedRevision:state.persistence.revisions[value.id]??null}]});

// Minimal asynchronous IndexedDB fixture: readwrite transactions are serialized,
// request callbacks may enqueue more operations, and aborted writes are rolled back.
function indexedStore(raw){
 const data=new Map([['library',structuredClone(raw)]]);let tail=Promise.resolve(),transactions=0;
 return {data,get transactions(){return transactions;},transaction(){
  transactions++;let release;const before=tail;tail=new Promise(resolve=>{release=resolve;});
  let active=false,pending=0,ended=false,aborted=false,draft;const waiting=[];
  const tx={error:null,abort(){aborted=true;queueMicrotask(finish);},objectStore(){return store;}};
  function finish(){
   if(ended||!active||(!aborted&&pending))return;
   ended=true;
   if(!aborted){data.clear();for(const [key,value] of draft)data.set(key,value);tx.oncomplete?.();}
   else tx.onabort?.();
   release();
  }
  const queue=work=>{
   const request={result:undefined};pending++;
   const run=()=>queueMicrotask(()=>{if(!aborted){work(request);request.onsuccess?.();}pending--;queueMicrotask(finish);});
   if(active)run();else waiting.push(run);return request;
  };
  const store={
   get:key=>queue(request=>{request.result=structuredClone(draft.get(key));}),
   put:(value,key)=>queue(()=>{draft.set(key,structuredClone(value));}),
   delete:key=>queue(()=>{draft.delete(key);})
  };
  before.then(()=>{active=true;draft=new Map(structuredClone([...data]));for(const run of waiting)run();queueMicrotask(finish);});
  return tx;
 }};
}

test('selection-only writes cannot remove a project restored by another tab',()=>{
 const tabB=initial(),restored=project('restored');
 const latest=mergeWorkspace(tabB,update(tabB,restored),now);
 const selected=mergeWorkspace(latest,{activeId:'a'},now);
 assert.deepEqual(selected.projects.map(item=>item.id),['a','restored']);
 assert.equal(selected.persistence.revisions.restored,1);
 assert.equal(selected.projects[1].solution,'Original');
});

test('concurrent atomic transactions retain independent new projects and edits',async()=>{
 const state=initial(),db=indexedStore(state);
 await Promise.all([
  transactWorkspace(db,update(state,project('new-a')),now),
  transactWorkspace(db,update(state,project('new-b')),now)
 ]);
 assert.deepEqual(db.data.get('library').projects.map(item=>item.id),['a','new-a','new-b']);
 const current=persistentWorkspace(db.data.get('library'),now);
 await Promise.all([
  transactWorkspace(db,update(current,project('a','Edited A')),now),
  transactWorkspace(db,update(current,project('new-b','Edited B')),now)
 ]);
 assert.equal(db.data.get('library').projects.find(item=>item.id==='a').solution,'Edited A');
 assert.equal(db.data.get('library').projects.find(item=>item.id==='new-b').solution,'Edited B');
});

test('stale edits and deletions cannot replace a newer revision or resurrect a removed project',async()=>{
 const stale=initial(),db=indexedStore(stale);
 await transactWorkspace(db,update(stale,project('a','Newest text')),now);
 await assert.rejects(()=>transactWorkspace(db,update(stale,project('a','Stale text')),now),{code:'WORKSPACE_CONFLICT'});
 await assert.rejects(()=>transactWorkspace(db,{generation:'initial',deletions:[{id:'a',expectedRevision:1}]},now),{code:'WORKSPACE_CONFLICT'});
 assert.equal(db.data.get('library').projects[0].solution,'Newest text');
 await transactWorkspace(db,{generation:'initial',deletions:[{id:'a',expectedRevision:2}]},now);
 await assert.rejects(()=>transactWorkspace(db,update(stale,project('a','Resurrected')),now),{code:'WORKSPACE_CONFLICT'});
 assert.equal(db.data.get('library').projects.length,0);
});

test('an explicit clear invalidates old saves and pending creations across tabs',()=>{
 const stale=initial(),cleared=mergeWorkspace(stale,{clear:true,newGeneration:'cleared-generation'},now);
 for(const value of [project('a'),project('not-yet-saved')])assert.throws(()=>mergeWorkspace(cleared,update(stale,value),now),{code:'WORKSPACE_CONFLICT'});
 const afterSelection=mergeWorkspace(cleared,{activeId:'a'},now);
 assert.equal(afterSelection.projects.length,0);
 assert.equal(afterSelection.activeId,null);
 const currentNew=mergeWorkspace(cleared,update(cleared,project('fresh')),now);
 assert.equal(currentNew.projects[0].id,'fresh');
});

test('restore batches enforce latest capacity atomically and abort entirely on conflict',async()=>{
 const state=initial(Array.from({length:MAX_PROJECTS-1},(_,i)=>project('saved-'+i))),db=indexedStore(state);
 const batch={generation:'initial',upserts:[{project:project('restore-a'),expectedRevision:null},{project:project('restore-b'),expectedRevision:null}]};
 await assert.rejects(()=>transactWorkspace(db,batch,now),{code:'WORKSPACE_CAPACITY'});
 assert.equal(db.data.get('library').projects.length,MAX_PROJECTS-1);
 assert.ok(!db.data.get('library').projects.some(item=>item.id.startsWith('restore-')));
 await assert.rejects(()=>transactWorkspace(db,{generation:'initial',upserts:[{project:project('fresh'),expectedRevision:null},{project:project('saved-0'),expectedRevision:99}]},now),{code:'WORKSPACE_CONFLICT'});
 assert.ok(!db.data.get('library').projects.some(item=>item.id==='fresh'));
});

test('expiry cleanup preserves edit timestamps and prevents a stale open draft from returning',()=>{
 const live=project('live'),expired={...project('expired'),updatedAt:now-TTL};
 const state=persistentWorkspace({version:2,projects:[live,expired],activeId:'expired',persistence:{generation:'g',revisions:{live:7,expired:3}}},now);
 assert.equal(state.projects.length,1);assert.equal(state.projects[0].updatedAt,now);
 assert.equal(state.persistence.revisions.live,7);assert.equal(state.activeId,'live');
 assert.throws(()=>mergeWorkspace(state,{generation:'g',upserts:[{project:project('expired'),expectedRevision:3}]},now),{code:'WORKSPACE_CONFLICT'});
});

test('background flush writes only actual dirty targets and keeps live object identities',async()=>{
 const code=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const block=code.slice(code.indexOf("let storageGeneration='initial'"),code.indexOf('function go(name)'));
 const flush=code.slice(code.indexOf('function flushWorkspace()'),code.indexOf("document.addEventListener('visibilitychange'"));
 let writes=0;
 const context=vm.createContext({persistentWorkspace,mergeWorkspace:(...args)=>{writes++;return mergeWorkspace(...args);},transactWorkspace,structuredClone,createId:()=> 'new-generation',console,
  document:{querySelectorAll:()=>[],addEventListener(){}},$:()=>null,toast(){},setTimeout:()=>1,clearTimeout(){},
 });
 vm.runInContext('let db=null,memory=null,library=[],project=null,saving=null,storageError=false;'+block+flush,context);
 context.setup=initial([project('a'),project('b')]);
 vm.runInContext('adoptWorkspace(setup,{initial:true}); globalThis.original=project;',context);
 await context.flushWorkspace();assert.equal(writes,0,'clean pagehide/visibility must not write');
 vm.runInContext("project.solution='Unsaved A';scheduleSave();project=library[1];",context);
 await context.flushWorkspace();assert.equal(writes,1);
 const stored=vm.runInContext('memory',context);
 assert.equal(stored.projects.find(item=>item.id==='a').solution,'Unsaved A');
 assert.equal(stored.projects.find(item=>item.id==='b').solution,'Original');
 assert.equal(vm.runInContext('library.includes(original)',context),true);
 await context.flushWorkspace();assert.equal(writes,1,'a completed save leaves no dirty flush');
});

function navigationApp({transaction,sessionOnly=false}={}){
 const code=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const block=code.slice(code.indexOf("let storageGeneration='initial'"),code.indexOf('function go(name)'));
 const flush=code.slice(code.indexOf('function flushWorkspace()'),code.indexOf("document.addEventListener('visibilitychange'"));
 const start=code.slice(code.indexOf('function startNew()'),code.indexOf('function newConfirm()'));
 const navigations=[],messages=[],clickHandlers=[],routes=[];
 const context=vm.createContext({persistentWorkspace,mergeWorkspace,transactWorkspace:transaction||transactWorkspace,structuredClone,MAX_PROJECTS,URL,createId:()=> 'new-generation',
  document:{querySelectorAll:()=>[],addEventListener(name,handler){if(name==='click')clickHandlers.push(handler);}},$:()=>null,toast:message=>messages.push(message),setTimeout:()=>1,clearTimeout(){},go:route=>routes.push(route),
  location:{assign:href=>navigations.push(href),href:'https://app.test/pitch.html#workspace',origin:'https://app.test',pathname:'/pitch.html',search:''}
 });
 vm.runInContext(`let db=${sessionOnly?'null':'{}'},memory=null,library=[],project=null,saving=null,storageError=${sessionOnly};`+block+flush+start,context);
 context.setup=initial();vm.runInContext('adoptWorkspace(setup,{initial:true});',context);
 return {context,navigations,messages,clickHandlers,routes};
}
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));

test('immediate edit then New pitch waits for an in-flight save and the final dirty revision',async()=>{
 let stored=initial();const commits=[];
 const app=navigationApp({transaction:(_db,change)=>new Promise(resolve=>commits.push(()=>{stored=mergeWorkspace(stored,change);resolve(stored);} ))});
 app.context.location.pathname='/';app.context.location.href='https://app.test/#workspace';
 vm.runInContext("project.solution='First edit';",app.context);
 const inFlight=app.context.save();
 vm.runInContext("project.solution='Final edit before navigation';scheduleSave();",app.context);
 const navigation=app.context.startNew();
 await nextTurn();assert.equal(commits.length,1);assert.deepEqual(app.navigations,[]);
 commits.shift()();await inFlight;await nextTurn();
 assert.equal(commits.length,1);assert.deepEqual(app.navigations,[]);
 commits.shift()();assert.equal(await navigation,true);
 assert.equal(stored.projects[0].solution,'Final edit before navigation');
 assert.deepEqual(app.navigations,['/pitch.html']);
});

test('New pitch from the pitch-page workspace explicitly opens creation after saving the old draft',async()=>{
 let stored=initial();
 const app=navigationApp({transaction:async(_db,change)=>(stored=mergeWorkspace(stored,change))});
 vm.runInContext("project.solution='Last edit on the pitch page';scheduleSave();",app.context);
 assert.equal(await app.context.startNew(),true);
 assert.deepEqual(app.routes,['create']);
 assert.deepEqual(app.navigations,[]);
 assert.equal(stored.projects[0].solution,'Last edit on the pitch page');
 assert.equal(vm.runInContext('library.includes(project)',app.context),true);
});

test('conflicting saves stop full navigation and remain visibly unsaved after a render',async()=>{
 const conflict=Object.assign(Error('Changed in another tab. Export a backup before reloading.'),{code:'WORKSPACE_CONFLICT'});
 const app=navigationApp({transaction:async()=>{throw conflict;}});
 vm.runInContext("project.solution='Keep my unsaved words';scheduleSave();",app.context);
 assert.equal(await app.context.navigateDocument('/'),false);
 assert.deepEqual(app.navigations,[]);
 assert.equal(vm.runInContext('project.solution',app.context),'Keep my unsaved words');
 assert.match(app.context.saveStateText(),/Not saved.*backup/);
 const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 assert.ok(source.includes('<span class="save-state">${esc(saveStateText())}</span>'),'rerenders use the persistent save state');
});

test('session-only drafts block internal full-page links even after successful in-memory save',async()=>{
 const app=navigationApp({sessionOnly:true});
 vm.runInContext("project.solution='Session-only work';",app.context);
 assert.equal(await app.context.save(),true);
 assert.equal(vm.runInContext('dirtyProjects.size',app.context),0);
 assert.equal(await app.context.navigateDocument('/'),false);
 assert.deepEqual(app.navigations,[]);
 assert.ok(app.messages.some(message=>/backup/.test(message)));
 let prevented=false;
 const link={href:'https://app.test/',target:'',hasAttribute:()=>false};
 app.clickHandlers[0]({target:{closest:()=>link},button:0,preventDefault(){prevented=true;}});
 await nextTurn();assert.equal(prevented,true);assert.deepEqual(app.navigations,[]);
});
