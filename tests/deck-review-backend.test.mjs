import test from 'node:test';
import assert from 'node:assert/strict';
import {handleDeckReview,reviewInput} from '../api/deck-review.mjs';
import {requestDeckReview} from '../dist/review-client.mjs';

const slide = (index=1) => ({index,title:'Results',paragraphs:['TODO: Revolutionary solution improves outcomes by 80%'],runs:[{text:'TODO',font:'Arial',size:12}],outside:[],pictures:1,missingAlt:1,hidden:false,count:0,text:'forged'});
const request = (data,options={}) => new Request('https://pitch.test/api/deck-review',{
 method:'POST',headers:{'Content-Type':'application/json',Origin:'https://pitch.test',...options.headers},
 body:JSON.stringify(data),...options});
test('server reviews actual slide wording and supplied rules, ignoring forged derived fields',async()=>{
 const response=await handleDeckReview(request({slides:[slide(),slide(2)],rules:'Maximum 1 slides\nMinimum font size 18 pt'}));
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const {model}=await response.json();
 assert.equal(model.slides.length,2);assert.equal(model.breaches.length,2);
 assert.ok(model.findings.some(f=>f.topic==='Evidence'&&f.index===1));
 assert.ok(model.findings.some(f=>f.topic==='Unfinished text'));
 assert.ok(model.slides[0].count>0);assert.notEqual(model.slides[0].text,'forged');
});
test('rejects malformed slide structure, invalid sizes, slide limits and oversized input',async()=>{
 const invalid=[
 {slides:[]},{slides:Array.from({length:41},(_,i)=>slide(i+1))},
 {slides:[{...slide(),index:4}]},{slides:[{...slide(),runs:[{text:'x',font:'Arial',size:-1}]}]},
 {slides:[{...slide(),missingAlt:2}]},{slides:[slide()],rules:'x'.repeat(6001)}
 ];
 for(const data of invalid)assert.equal((await handleDeckReview(request(data))).status,400);
 assert.equal((await handleDeckReview(new Request('https://pitch.test/api/deck-review',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(769*1024)}))).status,400);
 assert.throws(()=>reviewInput({slides:[{...slide(),paragraphs:['x'.repeat(30001)]}]}));
});
test('endpoint handles invalid JSON, method, content type and cross-origin requests',async()=>{
 assert.equal((await handleDeckReview(new Request('https://pitch.test/api/deck-review'))).status,405);
 assert.equal((await handleDeckReview(new Request('https://pitch.test/api/deck-review',{method:'POST',body:'{}'}))).status,415);
 assert.equal((await handleDeckReview(request({slides:[slide()]},{headers:{'Content-Type':'application/json',Origin:'https://other.test'}}))).status,403);
 assert.equal((await handleDeckReview(new Request('https://pitch.test/api/deck-review',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'}))).status,400);
});
test('browser review client completes against the real handler',async()=>{
 const model=await requestDeckReview([slide()],'Maximum 1 slides',async(url,options)=>{
   assert.equal(url,'/api/deck-review');assert.equal(options.credentials,'same-origin');
   return handleDeckReview(new Request('https://pitch.test'+url,options));
 });
 assert.equal(model.slides.length,1);assert.ok(model.findings.length);
});
test('browser surfaces service and network errors instead of claiming success',async()=>{
 await assert.rejects(()=>requestDeckReview([slide()],'',async()=>{throw Error('offline');}),/connection/);
 await assert.rejects(()=>requestDeckReview([slide()],'',async()=>Response.json({error:'Try again later.'},{status:503})),/Try again later/);
 await assert.rejects(()=>requestDeckReview([slide()],'',async()=>Response.json({version:1,model:{}})),/incomplete/);
});
