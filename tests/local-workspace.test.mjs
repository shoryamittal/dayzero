import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';
import {sample, validateProject, MAX_PROJECTS, isExpired} from '../dist/engine.mjs';
import {libraryBackup, parseBackup, readBackup, PROJECT_BACKUP_LIMIT} from '../dist/workspace-backup.mjs';
import {createProjectSnapshot} from '../dist/project-history.mjs';
import {offlineManifest, writeOfflineManifest} from '../scripts/offline-manifest.mjs';

test('whole-library backup restores all content, selected project and history without replacing existing IDs', () => {
  const first = validateProject({...sample, id: 'original-a', notes: {solution: 'My exact script'}, answers: ['My practice answer'], winnerReference: {name: 'Source', text: 'Reference text', source: 'https://example.org/reference'}});
  first.history.push(createProjectSnapshot(first, 123));
  const second = validateProject({...sample, id: 'original-b', name: 'Another pitch'});
  const backup = JSON.parse(JSON.stringify(libraryBackup([first, second], second.id)));
  const original = JSON.stringify(backup);
  let sequence = 0;
  const restored = parseBackup(backup, {now: 2000000000000, makeId: () => 'restored-' + ++sequence});
  assert.equal(restored.projects.length, 2);
  assert.equal(restored.activeId, 'restored-2');
  assert.equal(restored.projects[0].notes.solution, 'My exact script');
  assert.equal(restored.projects[0].answers[0], 'My practice answer');
  assert.equal(restored.projects[0].history[0].notes.solution, 'My exact script');
  assert.equal(restored.projects[0].winnerReference.source, 'https://example.org/reference');
  assert.equal(isExpired(restored.projects[0], 2000000000000), false);
  assert.equal(JSON.stringify(backup), original);
});

test('restore validates every project and capacity before returning any changes', () => {
  const valid = {format: 'dayzero-project', version: 1, ...sample};
  assert.throws(() => parseBackup({format: 'dayzero-library', version: 1, projects: [valid, {}]}), /project name/);
  assert.throws(() => parseBackup({format: 'dayzero-library', version: 1, projects: [valid, valid]}, {existingCount: MAX_PROJECTS - 1}), /No projects were imported/);
  assert.throws(() => parseBackup({...valid, untrusted: 'x'.repeat(PROJECT_BACKUP_LIMIT)}), /3 MB/);
  assert.throws(() => parseBackup({...valid, version: 2}), /version 1/);
  const restored = parseBackup({...valid, providerKey: 'never-export-this', updatedAt: 1});
  assert.equal(restored.projects[0].providerKey, undefined);
  assert.equal(isExpired(restored.projects[0]), false);
});

test('legacy ZIP library backups restore together with bounded decompression', async () => {
  const context = {ArrayBuffer, Uint8Array, setTimeout, clearTimeout, setImmediate, Blob, Promise};
  runInNewContext(readFileSync(new URL('../dist/vendor/jszip.min.js', import.meta.url), 'utf8'), context);
  const zip = new context.JSZip();
  zip.file('1-pitch.json', JSON.stringify({format: 'dayzero-project', version: 1, ...sample}));
  zip.file('2-pitch.json', JSON.stringify({format: 'dayzero-project', version: 1, ...sample, name: 'Second'}));
  const buffer = await zip.generateAsync({type: 'uint8array'});
  const restored = await readBackup({name: 'backup.zip', size: buffer.byteLength, arrayBuffer: async () => buffer}, {JSZip: context.JSZip});
  assert.deepEqual(restored.projects.map(project => project.name), [sample.name, 'Second']);
  zip.file('source-notes.json', JSON.stringify([{claim: 'Source note', source: 'Team notes'}]));
  const kit = await zip.generateAsync({type: 'uint8array'});
  assert.equal((await readBackup({name: 'pitch-kit.zip', size: kit.byteLength, arrayBuffer: async () => kit}, {JSZip: context.JSZip})).projects.length, 2);
  zip.file('huge.json', 'x'.repeat(PROJECT_BACKUP_LIMIT + 1));
  const huge = await zip.generateAsync({type: 'uint8array', compression: 'DEFLATE'});
  await assert.rejects(readBackup({name: 'backup.zip', size: huge.byteLength, arrayBuffer: async () => huge}, {JSZip: context.JSZip}), /3 MB/);
});

test('review slide buttons do not trigger the studio renderer and discard an embedded report', async () => {
  const code = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
  const start = code.indexOf("document.addEventListener('click',async e=>{const projectButton=");
  const end = code.indexOf('\nfunction captureIntake()', start);
  assert.ok(start > 0 && end > start);
  let handler, renders = 0;
  runInNewContext(code.slice(start, end), {document: {addEventListener(_type, callback) {handler = callback;}}, render() {renders++;}, slideIndex: 0});
  const button = {dataset: {slide: '1'}};
  await handler({target: {closest(selector) {return selector === '[data-slide]' ? button : null;}}});
  assert.equal(renders, 0);
  const studioButton = {dataset: {studioSlide: '1'}};
  await handler({target: {closest(selector) {return selector === '[data-studio-slide]' ? studioButton : null;}}});
  assert.equal(renders, 1);
});

test('offline manifest covers current entry pages, all imported modules and export libraries', async () => {
  const {assets} = await offlineManifest();
  const available = new Set(assets);
  for (const path of ['/index.html', '/pitch.html', '/review.html', '/workspace-backup.mjs', '/pitch-kit.mjs', '/site-polish.css', '/competition-briefs.json', '/vendor/jszip.min.js', '/vendor/pdf-lib.min.js', '/vendor/pptxgen.bundle.js']) {
    assert.ok(available.has(path), path);
  }
  for (const path of assets.filter(path => /\.(?:mjs|js)$/.test(path) && !path.startsWith('/vendor/'))) {
    const source = readFileSync(new URL('../dist' + path, import.meta.url), 'utf8');
    for (const match of source.matchAll(/(?:from\s+|import\s*)['"]\.\/([^'"?]+)(?:\?[^'"]*)?['"]/g)) {
      assert.ok(available.has('/' + match[1]), path + ' imports uncached ' + match[1]);
    }
  }
  assert.ok(assets.every(path => !path.startsWith('/api/') && !path.includes('.sqlite')));
});

test('new app releases change the worker and manifest URL while repeated builds stay stable', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dayzero-offline-release-'));
  try {
    await mkdir(join(root, 'vendor'));
    await writeFile(join(root, 'app.js'), 'const release = 1;');
    await writeFile(join(root, 'sw.js'), readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8'));
    const first = await writeOfflineManifest(root);
    const worker = await readFile(join(root, 'sw.js'), 'utf8');
    assert.ok(worker.includes("importScripts('/offline-assets.js?v=" + first.version + "');"));
    assert.deepEqual(await writeOfflineManifest(root), first);
    assert.equal(await readFile(join(root, 'sw.js'), 'utf8'), worker);
    await writeFile(join(root, 'app.js'), 'const release = 2;');
    const next = await writeOfflineManifest(root);
    assert.notEqual(next.version, first.version);
    assert.notEqual(await readFile(join(root, 'sw.js'), 'utf8'), worker);
    assert.ok((await readFile(join(root, 'sw.js'), 'utf8')).includes('/offline-assets.js?v=' + next.version));
    assert.ok((await readFile(join(root, 'offline-assets.js'), 'utf8')).includes(next.version));
    assert.deepEqual(await writeOfflineManifest(root), next);
    const changedWorker = (await readFile(join(root, 'sw.js'), 'utf8')).replace("'dayzero-shell-local-'", "'dayzero-shell-local-v2-'");
    await writeFile(join(root, 'sw.js'), changedWorker);
    const workerRelease = await writeOfflineManifest(root);
    assert.notEqual(workerRelease.version, next.version);
    assert.deepEqual(await writeOfflineManifest(root), workerRelease);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('offline worker normalizes asset queries and preserves the requested page without waiting for the network or caching API traffic', async () => {
  const handlers = {}, requests = [];
  let networkRequests = 0;
  const context = {
    URL, Request, Response, Set,
    importScripts() {},
    self: {PITCHVIVA_OFFLINE: {version: 'test', assets: ['/index.html', '/review.html', '/pitch.html', '/app.js']}, location: {origin: 'https://pitch.test'}, addEventListener(name, handler) {handlers[name] = handler;}},
    fetch: async () => {networkRequests++;throw Error('offline');},
    caches: {match: async path => {requests.push(path); return new Response('cached ' + path);}}
  };
  runInNewContext(readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8'), context);
  const request = async path => {
    let response;
    handlers.fetch({request: new Request('https://pitch.test' + path), respondWith(value) {response = value;}});
    return response ? (await response).text() : null;
  };
  assert.equal(await request('/review.html'), 'cached /review.html');
  assert.equal(await request('/app.js?v=new-release'), 'cached /app.js');
  assert.equal(await request('/'), 'cached /index.html');
  assert.equal(await request('/api/review-ai'), null);
  assert.deepEqual(requests, ['/review.html', '/app.js', '/index.html']);
  assert.equal(networkRequests, 0);
});

test('a full offline cache does not discard a successful application asset response', async () => {
  const handlers = {};
  const context = {
    URL, Request, Response, Set, importScripts() {},
    self: {PITCHVIVA_OFFLINE: {version: 'test', assets: ['/app.js']}, location: {origin: 'https://pitch.test'}, addEventListener(name, handler) {handlers[name] = handler;}},
    fetch: async () => new Response('usable application code'),
    caches: {match: async () => null, open: async () => ({put: async () => {throw Error('quota exceeded');}})}
  };
  runInNewContext(readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8'), context);
  let response;
  handlers.fetch({request: new Request('https://pitch.test/app.js'), respondWith(value) {response = value;}});
  assert.equal(await (await response).text(), 'usable application code');
});
