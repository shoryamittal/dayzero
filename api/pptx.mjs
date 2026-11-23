import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {makePowerPoint} from '../dist/deck-design.mjs';
import {safeFilename, validateProject} from '../dist/engine.mjs';
import {repairSlideMasters} from '../dist/pptx-package.mjs';

const mime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const limit = 4 * 1024 * 1024;
const slots = 2;
let active = 0;
let libraries;

// Load only the fixed, vendored browser distribution. Project data stays outside the script.
function exportLibraries() {
  if (!libraries) {
    const context = {Blob, Uint8Array, ArrayBuffer, Promise, setTimeout, clearTimeout, setImmediate, console};
    const bundle = readFileSync(new URL('../dist/vendor/pptxgen.bundle.js', import.meta.url), 'utf8');
    runInNewContext(bundle, context, {filename: 'pptxgen.bundle.js'});
    libraries = {PptxGenJS: context.PptxGenJS, JSZip: context.JSZip};
  }
  return libraries;
}

function json(res, status, body) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
  res.end(JSON.stringify(body));
}

export default async function generate(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, {error: 'Use POST with a JSON project.'});
  }
  if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json')
    return json(res, 415, {error: 'Send application/json.'});
  if (Number(req.headers['content-length']) > limit)
    return json(res, 413, {error: 'Project exceeds 4 MiB.'});
  if (active >= slots) {
    res.setHeader('Retry-After', '3');
    return json(res, 503, {error: 'Both export slots are occupied. Retry shortly.'});
  }
  active++;
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit) return json(res, 413, {error: 'Project exceeds 4 MiB.'});
      chunks.push(chunk);
    }
    let project;
    try {
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (typeof input?.name !== 'string' || !input.name.trim() ||
          !['problem','solution','approach','proof','impact','ask'].some(k => typeof input[k] === 'string' && input[k].trim()))
        return json(res, 422, {error: 'Include a project name and at least one slide section.'});
      project = validateProject(input);
    } catch (error) {
      return json(res, error instanceof SyntaxError ? 400 : 422, {error: 'Invalid project JSON.'});
    }
    const {PptxGenJS, JSZip} = exportLibraries();
    const original = await makePowerPoint(project, PptxGenJS);
    const file = await repairSlideMasters(original, JSZip);
    const bytes = Buffer.from(await file.arrayBuffer());
    res.writeHead(200, {'Content-Type': mime, 'Content-Length': bytes.length,
      'Content-Disposition': 'attachment; filename="' + safeFilename(project.name) + '.pptx"'});
    res.end(bytes);
  } catch {
    if (!res.headersSent && !res.destroyed) json(res, 500, {error: 'PowerPoint export failed. Your project can be retried.'});
  } finally {
    active--;
  }
}

export const config = {api: {bodyParser: false}};
