import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {clean,validateProject,createId,MAX_PROJECTS} from '../dist/engine.mjs';

test('an idea alone creates a project and opens the deck editor, preserving optional context',async()=>{
  const code=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  const start=code.indexOf("document.addEventListener('submit',async event=>{");
  const end=code.indexOf('\nconst intakeStages',start);
  let submit;
  const values={solution:'We help students find quiet study spaces.',event:'Campus Challenge',rules:'Maximum 6 slides.',team:'Asha and Sam'};
  const form={id:'launch-draft',elements:{event:{dataset:{}}},querySelector:selector=>selector==='[type=submit]'?{disabled:false}:null};
  const context=vm.createContext({document:{addEventListener:(_name,callback)=>{submit=callback;}},library:[],MAX_PROJECTS,clean,validateProject,createId,FormData:class{get(key){return values[key]||null;}},launchDraftFields:()=>({solution:values.solution,name:'Study spaces',team:values.team}),toast:message=>assert.fail(message),resetRehearsal(){},intakeEventRecords:()=>[],safeURL:()=>null,choosePitchTheme:()=> 'editorial',save:async()=>{},go:route=>{context.target=route;},enrichStudio:async()=>{},writeStored(){},project:null,slideIndex:5,tab:'overview'});
  vm.runInContext(code.slice(start,end),context);
  await submit({target:form,preventDefault(){}});
  assert.equal(context.project.solution,values.solution);
  assert.equal(context.project.problem,'');
  assert.equal(context.project.team,values.team);
  assert.equal(context.project.rules,values.rules);
  assert.equal(context.tab,'deck');assert.equal(context.target,'workspace');assert.equal(context.slideIndex,0);
});

test('reference text survives backup validation with bounds',()=>{
  const project=validateProject({name:'Draft',winnerReference:{name:'Reference.pptx',text:'x'.repeat(20000)}});
  assert.equal(project.winnerReference.text.length,16000);
  assert.equal(validateProject(JSON.parse(JSON.stringify(project))).winnerReference.name,'Reference.pptx');
});
