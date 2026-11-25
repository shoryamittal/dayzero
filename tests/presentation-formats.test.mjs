import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePresentationFile,presentationFormats} from '../dist/presentation-format.mjs';
import {inspectArchive} from '../dist/template-bridge.mjs';
test('review accepts modern presentation, show, template and macro-enabled extensions',()=>{
 for(const ext of presentationFormats)assert.equal(validatePresentationFile({name:'slides.'+ext.toUpperCase(),size:100}),ext);
});
test('legacy files receive conversion guidance and unsupported/oversized uploads are rejected',()=>{
 for(const ext of ['ppt','pps','pot'])assert.throws(()=>validatePresentationFile({name:'slides.'+ext,size:100}),/Renaming/);
 assert.throws(()=>validatePresentationFile({name:'slides.pdf',size:100}),/PowerPoint/);
 assert.throws(()=>validatePresentationFile({name:'slides.pptx',size:9*1024*1024}),/8 MB/);
});
test('read-only inspection can ignore macro bytes while template filling still rejects macros',()=>{
 const name=new TextEncoder().encode('ppt/vbaProject.bin');
 const data=new Uint8Array(46+name.length+22),view=new DataView(data.buffer),end=46+name.length;
 view.setUint32(0,0x02014b50,true);view.setUint32(24,5,true);view.setUint16(28,name.length,true);data.set(name,46);
 view.setUint32(end,0x06054b50,true);view.setUint16(end+10,1,true);
 assert.equal(inspectArchive(data,{reviewOnly:true}).count,1);
 assert.throws(()=>inspectArchive(data),/macro-free/);
});
