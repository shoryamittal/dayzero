const keys = ['problem', 'solution', 'approach', 'proof', 'impact', 'ask'];
const themes = ['botanical', 'editorial', 'blueprint', 'signal', 'noir', 'electric'];
const bounded = (value, limit) => String(value ?? '').replace(/\0/g, '').slice(0, limit).trim();
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const fields = (value, limit) => Object.fromEntries(keys.map(key => [key, bounded(value?.[key], limit)]));

// Images remain in the project, not repeated in each snapshot. This keeps backups
// within the existing import limit while retaining the content users can rewrite.
export function normalizeProjectSnapshot(value) {
  if (!record(value) || !Number.isFinite(value.at) || !record(value.data)) return null;
  return {
    at: value.at,
    data: fields(value.data, 6000),
    ...(record(value.slideHeadlines) ? {slideHeadlines: fields(value.slideHeadlines, 90)} : {}),
    ...(record(value.notes) ? {notes: fields(value.notes, 3000)} : {}),
    ...(themes.includes(value.template) ? {template: value.template} : {}),
    ...(Array.isArray(value.answers) ? {answers: Array.from({length: 6}, (_, i) => bounded(value.answers[i], 3000))} : {})
  };
}

export function createProjectSnapshot(project, at = Date.now()) {
  return normalizeProjectSnapshot({
    at, data: project,
    slideHeadlines: project.slideHeadlines || {},
    notes: project.notes || {},
    template: project.template,
    answers: project.answers || []
  });
}

export function restoreProjectSnapshot(project, value) {
  const snapshot = normalizeProjectSnapshot(value);
  if (!snapshot || !record(project)) return false;
  Object.assign(project, snapshot.data);
  // Legacy story-only snapshots must not erase newer notes, images or titles.
  for (const key of ['slideHeadlines', 'notes', 'template', 'answers']) {
    if (Object.hasOwn(snapshot, key)) project[key] = structuredClone(snapshot[key]);
  }
  project.slideReviews = {};
  project.checklist = {...project.checklist, facts: false, files: false};
  return true;
}
