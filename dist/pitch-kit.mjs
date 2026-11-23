import {analyze, clean, questions, slides, themes} from './engine.mjs?v=competition-round-1';
import {slideReadability} from './deck-design.mjs?v=competition-round-1';
import {challengeQuestions, normalizePreparation, requirementState, runOfShow} from './preparation.mjs?v=pitchviva-1';
import {reviewClaims} from './claim-engine.mjs?v=ai-1.0';

const slidePurpose = [
  'Start with the people affected and the problem they face.',
  'Give the jury a concrete picture of what would change for the user.',
  'Show how the solution works and where implementation risks remain.',
  'Distinguish completed work from experiments and results still needed.',
  'Explain the outcome you want and how you would measure it.',
  'Leave the jury with the next step and the support it requires.'
];
const transitions = [
  'Here is what we propose.',
  'Let me show you how it works.',
  'Here is where the work stands today.',
  'Here is what we want to measure next.',
  'That brings us to our next step.',
  'Thank you for listening. We’re ready for your questions.'
];

const missingAnswer = [
  '[Name the user and describe a real example of the problem.]',
  '[Name the current alternative and one concrete difference in your workflow.]',
  '[Describe what the prototype does today and what still needs to be built.]',
  '[Describe a completed test, or say what you still need to test.]',
  '[Name the outcome, baseline and measurement plan.]',
  '[Name the support you need and the first action it enables.]'
];

function hasDraft(value) {
  const text = clean(value);
  return Boolean(text) && !/^\[ADD DATA\b/i.test(text);
}

function context(p) {
  return [p.name, [p.event, p.eventRound].filter(Boolean).join(' / ') || 'Event and round to confirm',
    p.demo ? 'Fictional project / practice only' : 'Team draft / review before presenting'].join('\n');
}

function buildReport(p) {
  const assessment = analyze(p);
  const layoutChecks = slideReadability(p);
  const prep = normalizePreparation(p.preparation);
  const theme = themes[p.template] || themes.botanical;
  const layoutNote = 'Layout checks estimate text fit in the built-in design. Open the exported deck to confirm rendering and organizer requirements.';
  const sections = assessment.deck.map((slide, index) => {
    const findings = assessment.issues.filter(issue => issue.slide === index + 1);
    const mappedRules = prep.requirements.filter(rule => rule.section === slide.key);
    const notes = (p.evidence || []).filter(note => note.slide === slide.key);
    return [
      'Slide ' + (index + 1) + ' / ' + (p.slideHeadlines?.[slide.key] || slide.title),
      'Why this slide is here — ' + slidePurpose[index],
      p.slideImages?.[slide.key] ? 'Design choice — The text and supplied visual sit side by side.' :
        'Design choice — The ' + theme.name + ' palette is applied to the built-in layout.',
      ...mappedRules.map(rule => 'Mapped requirement — ' + rule.title + ' (' + requirementState(rule, p) + ')' +
        (rule.quote ? '\nOrganizer wording — ' + rule.quote : '') + (rule.source ? '\nSource — ' + rule.source : '')),
      ...notes.map(note => 'Team evidence — ' + note.claim + (note.source ? ' | ' + note.source : ' | Add a source')),
      ...findings.map(issue => 'Revision — ' + issue.detail),
      ...layoutChecks.filter(check => check.section === slide.title).map(check => 'Layout — ' + check.detail)
    ].join('\n');
  });
  const deckIssues = assessment.issues.filter(issue => !issue.slide).map(issue => issue.detail);
  return ['HOW YOUR DECK WAS BUILT', context(p),
    'The deck orders your material as problem, solution, approach, evidence, impact and next step.',
    ...deckIssues, ...sections, layoutNote].join('\n\n') + '\n';
}

function speakerScript(p) {
  const timing = runOfShow(p);
  const opening = 'Hello, we’re ' + (p.team || 'the team behind ' + p.name) + '.';
  const sections = timing.map((slot, index) => {
    const draft = hasDraft(slot.script) ? slot.script : missingAnswer[index];
    const lines = [index === 0 ? opening : '', draft, transitions[index]].filter(Boolean);
    // Count spoken text, including the opening and speaker handoffs. Bracketed prompts are edit cues.
    const words = lines.filter(line => !line.startsWith('[')).join(' ').split(/\s+/u).filter(Boolean).length;
    const estimated = Math.ceil(words * 60 / 130);
    const speaker = slot.speaker || 'Assign a speaker';
    return [
      'Slide ' + (index + 1) + ' / ' + (p.slideHeadlines?.[slot.key] || slot.title),
      slot.start + '–' + slot.end + ' s / ' + speaker,
      ...lines,
      estimated > slot.duration ? 'Timing — Estimated ' + estimated + ' s. Trim to ' + slot.duration + ' s.' : ''
    ].filter(Boolean).join('\n');
  });
  return ['SPEAKER SCRIPT', context(p), 'Total speaking slot — ' + timing.at(-1).end + ' s',
    'Use this as a draft. Replace bracketed lines, confirm every claim, and rehearse aloud. Slide notes take priority over slide text when supplied.',
    ...sections].join('\n\n') + '\n';
}

function juryPractice(p) {
  const claims = reviewClaims(p);
  function answer(key, index) {
    const draft = hasDraft(p[key]) ? clean(p[key], 6000) : missingAnswer[index];
    const unsupported = claims.some(claim => claim.key === key && claim.status === 'needs-source');
    return unsupported
      ? 'Add proof or remove the unsupported number before answering. Draft wording to revise — ' + draft
      : 'Answer draft — ' + draft;
  }
  const deck = slides(p);
  const base = deck.map((slide, index) => [
    questions[index][1], answer(slide.key, index), 'Prepare — ' + questions[index][2]
  ].join('\n'));
  const prep = normalizePreparation(p.preparation);
  const followUps = challengeQuestions(p).slice(0, prep.requirements.length).map((question, index) => {
    const rule = prep.requirements[index];
    return [
      question.question,
      'Organizer wording — ' + (rule.quote || 'Add the official wording'),
      'Source — ' + (rule.source || 'Add the organizer’s reference'),
      answer(rule.section, deck.findIndex(slide => slide.key === rule.section)),
      'Prepare — Point to the exact part of the slide and bring evidence for the requirement.'
    ].join('\n');
  });
  if (prep.demo || prep.fallback) {
    followUps.push('What would you show if the live demo failed?\n' +
      (prep.fallback ? 'Answer draft — ' + prep.fallback : 'Plan a fallback using files your team can open during the pitch.'));
  }
  return ['JURY PRACTICE', context(p),
    'These are practice questions drawn from your project and mapped rules. Edit the answers to reflect what your team can demonstrate.',
    ...base, ...followUps].join('\n\n') + '\n';
}

export function pitchKitFiles(project) {
  return {
    'deck-rationale.txt': buildReport(project),
    'speaker-script.txt': speakerScript(project),
    'jury-questions-and-answers.txt': juryPractice(project)
  };
}
