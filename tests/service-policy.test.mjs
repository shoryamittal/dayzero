import test from 'node:test';
import assert from 'node:assert/strict';
import {handleAssist} from '../api/assist.mjs';
import {handleReviewAI} from '../api/review-ai.mjs';
import competition from '../api/competition.mjs';

const key='configured-server-key-for-offline-test';
const noNetwork=()=>assert.fail('The pending service attempted outbound traffic.');
const request=(path,body,headers={})=>new Request('https://pitch.test'+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});

test('provider credentials alone cannot enable pending services or source retrieval',async()=>{
 const previous=process.env.PITCHVIVA_ENABLE_EXTERNAL_APIS;
 delete process.env.PITCHVIVA_ENABLE_EXTERNAL_APIS;
 try{
  const assist=await handleAssist(request('/api/assist',{mode:'draft',input:{problem:'Students wait.'}}),noNetwork,{serverKey:key});
  assert.equal(assist.status,503);assert.equal((await assist.json()).status,'pending');
  const review=await handleReviewAI(request('/api/review-ai',{action:'prepare',source:'https://event.example/rules'}),{serverKey:key,fetcher:noNetwork,reader:noNetwork});
  assert.equal(review.status,503);assert.equal((await review.json()).status,'pending');
  for(const [handler,path] of [[handleReviewAI,'/api/review-ai'],[(req,opts)=>handleAssist(req,noNetwork,opts),'/api/assist']]){
   const status=await handler(new Request('https://pitch.test'+path),{serverKey:key});
   assert.equal((await status.json()).available,false);
  }
  const output={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await competition({method:'GET',url:'/api/competition?url=https://event.example/rules'},output);
  assert.equal(output.code,503);assert.equal(output.body.status,'pending');
 }finally{if(previous===undefined)delete process.env.PITCHVIVA_ENABLE_EXTERNAL_APIS;else process.env.PITCHVIVA_ENABLE_EXTERNAL_APIS=previous;}
});

test('client-supplied credentials cannot activate a service without an owner-side key',async()=>{
 const headers={'x-gemini-key':key};
 assert.equal((await handleAssist(request('/api/assist',{mode:'review',input:{problem:'Example'}},headers),noNetwork,{externalEnabled:true,serverKey:''})).status,401);
 assert.equal((await handleReviewAI(request('/api/review-ai',{action:'slides'},headers),{externalEnabled:true,serverKey:'',fetcher:noNetwork})).status,401);
});
