import './competition-picker.mjs';

export function pitchStart(icons) {
  return `<section class="pitch-start launch-width" aria-labelledby="pitch-start-title">
    <a class="pitch-back" href="/">← Back to home</a>
    <div class="pitch-start-heading"><p class="launch-kicker"><span></span> A LITTLE IDEA. A STRONGER STORY.</p>
    <h1 id="pitch-start-title">Bring the idea.<br><em>We’ll shape the pitch.</em></h1>
    <p>A few sentences are enough. Add your competition and we’ll look for its requirements. You can edit every slide in the studio.</p></div>
    <div class="pitch-start-grid"><form id="launch-draft" class="launch-form">
      <idea-editor class="field"></idea-editor>
      <competition-picker></competition-picker>
      <details class="pitch-extra"><summary>Project title &amp; team <small>optional</small></summary>
        <div class="field"><label for="launch-name">Project title</label><input id="launch-name" name="name" maxlength="80" placeholder="You can name it later"></div>
        <div class="field"><label for="launch-team">Team / presenter names</label><input id="launch-team" name="team" maxlength="100" placeholder="Add names now or in the editor"></div>
      </details>
      <button type="submit" class="launch-primary">Create my pitch ${icons.arrow}</button>
      <p class="pitch-start-note">Opens your editable Pitch Studio. AI drafting is optional and requires a Gemini key. Your idea stays on this device until you choose to send it.</p>
    </form><aside class="pitch-start-aside"><div class="launch-output-label"><span><i></i> YOUR NEXT STOP</span><span>PITCH STUDIO</span></div>
      <div id="launch-draft-preview"></div>
      <ol class="pitch-promises"><li><b>01</b><div><strong>Competition in context</strong><p>Source excerpts and judging requirements beside your slides.</p></div></li><li><b>02</b><div><strong>Your story, taking shape</strong><p>Edit text, names, images and speaker notes. Ask AI for a draft when you’re ready.</p></div></li><li><b>03</b><div><strong>A clearer next step</strong><p>See gaps, check the rules and export an editable PowerPoint.</p></div></li></ol>
    </aside></div></section>`;
}

let sequence = 0;
let controller;
let timer;
const imported = new WeakMap();
export const studioLookups = new Map();

export async function enrichStudio(project, href, save, refresh) {
  if (!href || project.rules.trim()) return;
  studioLookups.set(project.id,'Reading competition page…');
  refresh();
  try {
    const response = await fetch('/api/competition?url='+encodeURIComponent(href),{signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw Error();
    const result = await response.json();
    if (!result.excerpts?.length) throw Error();
    if (!project.rules.trim()) {
      project.rules=(result.excerpts.join('\n')+'\nSource: '+result.source+'\nRead: '+result.checked).slice(0,10000);
      await save();
    }
    studioLookups.delete(project.id);
  } catch { studioLookups.set(project.id,'Could not read this page. Paste the organizer rules in the Rules tab.'); }
  refresh();
}

export async function readCompetition(picker) {
  const sequenceId = ++sequence;
  controller?.abort();
  const name = picker.querySelector('[name=event]');
  const link = picker.querySelector('#competition-link');
  const rules = picker.querySelector('[name=rules]');
  const previous = imported.get(picker);
  let panel = picker.querySelector('.competition-reading');
  if (!panel) { panel = document.createElement('div'); panel.className = 'competition-reading'; panel.setAttribute('role','status'); picker.append(panel); }
  const record = picker.getBrief?.() || picker.record;
  const href = link.value.trim() || record?.official || record?.source;
  if (!href) { panel.textContent = name.value.trim() ? 'Choose a competition match or add its official link to read the requirements. You can also continue now.' : ''; return; }
  if (rules.value === previous?.text) rules.value = '';
  imported.delete(picker);
  controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  panel.textContent = 'Reading competition page… You can continue while we check.';
  try {
    const response = await fetch('/api/competition?url=' + encodeURIComponent(href), {signal:controller.signal});
    if (!response.ok) throw Error();
    const result = await response.json();
    if (sequenceId !== sequence || !picker.isConnected) return;
    if (!result.excerpts?.length) throw Error();
    const text = result.excerpts.join('\n') + '\nSource: ' + result.source + '\nRead: ' + result.checked;
    if (!rules.value.trim()) {
      rules.value = text.slice(0,10000);
      imported.set(picker, {text:rules.value});
      rules.dispatchEvent(new Event('input',{bubbles:true}));
      panel.textContent = 'Requirements found · ' + result.excerpts.length + ' source excerpts. Check the edition and round before submitting.';
    } else panel.textContent = 'Your pasted rules were kept. Review the linked page for any changes.';
  } catch {
    if (sequenceId === sequence && picker.isConnected) panel.textContent = 'We couldn’t read requirements from this page. Paste the rules below, upload notes, or continue and add them in the studio.';
  } finally { clearTimeout(timeout); }
}

if (typeof document !== 'undefined') {
  document.addEventListener('competition-selected', event => { clearTimeout(timer); readCompetition(event.target); });
  document.addEventListener('input', event => {
    if (!event.target.matches('#competition-name,#competition-link')) return;
    const picker = event.target.closest('competition-picker');
    if (!picker) return;
    ++sequence; controller?.abort(); clearTimeout(timer);
    const rules = picker.querySelector('[name=rules]');
    if (rules.value === imported.get(picker)?.text) rules.value = '';
    imported.delete(picker);
    const panel = picker.querySelector('.competition-reading');
    if (panel) panel.textContent = '';
    timer = setTimeout(() => { if (picker.isConnected) readCompetition(picker); }, 900);
  });
}
