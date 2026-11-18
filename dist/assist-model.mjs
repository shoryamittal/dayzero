export const sections = ['problem', 'solution', 'approach', 'proof', 'impact', 'ask'];
export const modes = ['draft', 'review', 'rules'];
export const model = 'gemini-3.5-flash-lite';

function bounded(value, max) {
  return typeof value === 'string' ? value.replace(/\0/g, '').trim().slice(0, max) : '';
}

export function assistInput(project, mode) {
  const context = {event: bounded(project.event, 160), rules: bounded(project.rules, 10000)};
  if (mode === "rules") return context;
  return {
    ...context,
    eventRound: bounded(project.eventRound, 160),
    requirements: (Array.isArray(project.requirements) ? project.requirements :
      Array.isArray(project.preparation?.requirements) ? project.preparation.requirements : [])
      .slice(0, 20).filter(item => item?.quote).map(item => ({
        title: bounded(item.title, 180),
        section: sections.includes(item.section) ? item.section : 'problem',
        quote: bounded(item.quote, 1600),
        source: bounded(item.source, 400),
        weight: Math.min(100, Math.max(0, Number(item.weight) || 0))
      })),
    story: Object.fromEntries(sections.map(key => [key, bounded(project.story?.[key] ?? project[key], 3000)])),
    evidence: Array.isArray(project.evidence) ? project.evidence.slice(0, 12).map(item => ({
      section: sections.includes(item?.section ?? item?.slide) ? (item.section ?? item.slide) : 'proof',
      claim: bounded(item?.claim, 800),
      source: bounded(item?.source, 400)
    })).filter(item => item.claim) : []
  };
}

export function validateAssistResult(mode, result, input) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw Error('Invalid assistant response.');
  const gaps = (Array.isArray(result.gaps) ? result.gaps : []).slice(0, 8).map(gap => bounded(gap, 350)).filter(Boolean);
  if (mode === 'draft') {
    const story = Object.fromEntries(sections.map(key => [key, bounded(result.story?.[key], 1800)]));
    const headlines = Object.fromEntries(sections.map(key => [key, bounded(result.headlines?.[key], 1800)]));
    if (sections.some(key => !story[key] || !headlines[key])) throw Error('The draft was incomplete. Try again.');
    if (sections.some(key => story[key].length > 360 || story[key].split(/\s+/u).length > 55 ||
      story[key].split(/\r?\n/u).length > 5 || headlines[key].length > 90 || /[\r\n]/u.test(headlines[key]))) {
      throw Error('The draft exceeded the slide text limits. Try again.');
    }
    return {story, headlines, gaps};
  }
  const findings = (Array.isArray(result.findings) ? result.findings : []).slice(0, 10).flatMap(item => {
    const section = item?.section;
    const text = mode === 'rules' && section === 'rules' ? input.rules :
      mode === 'review' && sections.includes(section) ? input.story[section] : '';
    const quote = bounded(item?.quote, 500);
    const advice = bounded(item?.advice, 600);
    return quote && advice && text.includes(quote) ? [{section, quote, advice}] : [];
  });
  return {findings, gaps};
}
