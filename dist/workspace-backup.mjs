import {validateProject, createId, MAX_PROJECTS} from './engine.mjs';

export const PROJECT_BACKUP_LIMIT = 3 * 1024 * 1024;
export const LIBRARY_BACKUP_LIMIT = 40 * 1024 * 1024;
const byteLength = text => new TextEncoder().encode(text).length;

export function libraryBackup(projects, activeId, now = Date.now()) {
  return {
    format: 'dayzero-library', version: 1, exportedAt: new Date(now).toISOString(),
    activeId: projects.some(project => project.id === activeId) ? activeId : projects[0]?.id || null,
    projects: projects.map(project => validateProject(project))
  };
}

export function parseBackup(raw, {existingCount = 0, now = Date.now(), makeId = createId} = {}) {
  const single = raw?.format === 'dayzero-project' && raw.version === 1;
  const full = raw?.format === 'dayzero-library' && raw.version === 1;
  if (!single && !full) throw Error('Choose a PitchViva project or library backup, version 1.');
  const items = single ? [raw] : raw.projects;
  if (!Array.isArray(items) || !items.length || items.length > MAX_PROJECTS) {
    throw Error('A library backup must contain between 1 and ' + MAX_PROJECTS + ' projects.');
  }
  if (items.length + existingCount > MAX_PROJECTS) {
    throw Error('This backup contains ' + items.length + ' projects, but only ' + (MAX_PROJECTS - existingCount) + ' spaces are free. No projects were imported.');
  }
  const projects = items.map(item => {
    if (byteLength(JSON.stringify(item)) > PROJECT_BACKUP_LIMIT) throw Error('One project exceeds the 3 MB restore limit.');
    return {...validateProject(item), id: makeId(), updatedAt: now};
  });
  const selected = full ? items.findIndex(item => item.id === raw.activeId) : 0;
  return {projects, activeId: projects[Math.max(0, selected)].id};
}

async function boundedZipText(entry) {
  if (entry._data?.uncompressedSize > PROJECT_BACKUP_LIMIT) throw Error('One project exceeds the 3 MB restore limit.');
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0, failed = false;
    const stream = entry.internalStream('uint8array');
    stream.on('data', chunk => {
      if (failed) return;
      total += chunk.length;
      if (total > PROJECT_BACKUP_LIMIT) {
        failed = true;
        stream.pause();
        reject(Error('One project exceeds the 3 MB restore limit.'));
      } else chunks.push(chunk);
    });
    stream.on('error', reject);
    stream.on('end', () => {
      if (failed) return;
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.length;}
      try {resolve(new TextDecoder('utf-8', {fatal: true}).decode(bytes));} catch (error) {reject(error);}
    });
    stream.resume();
  });
}

export async function readBackup(file, {JSZip, ...options} = {}) {
  if (!file || file.size > LIBRARY_BACKUP_LIMIT) throw Error('Choose a backup smaller than 40 MB.');
  if (!/\.zip$/i.test(file.name || '')) {
    return parseBackup(JSON.parse(await file.text()), options);
  }
  if (!JSZip) throw Error('The ZIP reader is unavailable. Reopen the workspace while connected once.');
  const archive = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(archive.files).filter(entry => !entry.dir && /\.json$/i.test(entry.name) && !entry.name.startsWith('__MACOSX/') && !/(^|\/)source-notes\.json$/i.test(entry.name));
  if (!entries.length || entries.length > MAX_PROJECTS) throw Error('Choose a PitchViva library ZIP with up to ' + MAX_PROJECTS + ' project files.');
  const projects = [];
  for (const entry of entries) {
    const raw = JSON.parse(await boundedZipText(entry));
    if (raw?.format !== 'dayzero-project' || raw.version !== 1) throw Error('This ZIP contains a JSON file that is not a PitchViva project backup.');
    projects.push(raw);
  }
  return parseBackup({format: 'dayzero-library', version: 1, projects}, options);
}
