import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import generate from '../api/pptx.mjs';
import {resolvedSpeakerNotes,pitchKitFiles} from '../dist/pitch-kit.mjs';
import {validateProject} from '../dist/engine.mjs';

test('export handler returns editable slides and notes and rejects invalid projects', async () => {
  // Invoke the same streamed request handler without requiring a loopback port.
  const send = async (method, body='') => {
    const request=Readable.from([Buffer.from(body)]);
    request.method=method;
    request.headers={'content-type':'application/json'};
    const headers=new Headers();
    let status, bytes;
    await generate(request,{
      setHeader:(key,value)=>headers.set(key,value),
      writeHead:(code,values)=>{status=code;for(const [key,value] of Object.entries(values))headers.set(key,String(value));},
      end:data=>{bytes=Buffer.from(data||'');}
    });
    return {status,headers,text:async()=>bytes.toString('utf8'),arrayBuffer:async()=>new Uint8Array(bytes).buffer};
  };
  const post = body => send('POST',body);
  assert.equal((await send('GET')).status, 405);
  assert.equal((await post('{')).status, 400);
  assert.equal((await post('{}')).status, 422);
  assert.equal((await post('x'.repeat(4 * 1024 * 1024 + 1))).status, 413);
  const project=validateProject({name:'Campus Meals', problem:'Unused meals after closing.', solution:'Reserve surplus food.', notes:{problem:'Interview cafeteria managers.'}});
  const response = await post(JSON.stringify(project));
  assert.equal(response.status, 200, response.status === 200 ? '' : await response.text());
  assert.match(response.headers.get('content-disposition'), /Campus-Meals.pptx/);
  const context = {ArrayBuffer, Uint8Array, setTimeout, clearTimeout, setImmediate, Blob, Promise};
  runInNewContext(readFileSync(new URL('../dist/vendor/pptxgen.bundle.js', import.meta.url), 'utf8'), context);
  const zip = await context.JSZip.loadAsync(new Uint8Array(await response.arrayBuffer()));
  assert.equal(zip.file(/^ppt\/slides\/slide\d+\.xml$/).length, 6);
  assert.match(await zip.file('ppt/slides/slide1.xml').async('string'), /Unused meals after closing/);
  assert.match(await zip.file('ppt/notesSlides/notesSlide1.xml').async('string'), /Interview cafeteria managers/);
  const script=pitchKitFiles(project)['speaker-script.txt'];
  for(const [index,key] of ['problem','solution','approach','proof','impact','ask'].entries()){
    const xml=await zip.file('ppt/notesSlides/notesSlide'+(index+1)+'.xml').async('string');
    // XML text nodes are the editable notes delivered in the actual file.
    const text=[...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(match=>match[1].replace(/&amp;/g,'&').replace(/&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>')).join('\n');
    const note=resolvedSpeakerNotes(project)[key];
    assert.ok(script.includes(note));
    for(const line of note.split('\n').filter(Boolean))assert.ok(text.includes(line),key+': '+line);
  }
  const manifest = await zip.file('[Content_Types].xml').async('string');
  for (const [,part] of manifest.matchAll(/PartName="\/([^"]+)"/g)) assert.ok(zip.file(part), part);
});

