import {buildStudioPitch} from './pitch-builder.mjs';
import {externalIntegrationsEnabled} from './integration-policy.mjs';
export const studioLookups = new Map();
export function pitchStart(icons) {
 const connected=externalIntegrationsEnabled();
 return `<section class="pitch-start launch-width" aria-labelledby="pitch-start-title">
 <a class="pitch-back" href="/">← Back to home</a>
 <div class="pitch-start-heading"><p class="launch-kicker"><span></span> A LITTLE IDEA. A STRONGER STORY.</p>
 <h1 id="pitch-start-title">Bring the idea.<br><em>We’ll shape the pitch.</em></h1>
 <p>Tell us what you’re building and who it helps. Start with what you know. You can shape every slide in the studio.</p></div>
 <div class="pitch-start-grid"><form id="launch-draft" class="launch-form">
 <idea-editor class="field"></idea-editor>
 <div class="field"><label for="pitch-competition">Which competition is this for? <small>optional</small></label><input id="pitch-competition" name="event" maxlength="160" placeholder="Competition name, edition or track"><p class="pitch-field-help">${connected?'We’ll look for relevant requirements and reference material.':'Keep the competition with your draft and add any organiser rules you already have.'} Leave blank for a general product pitch.</p></div>
 <details class="pitch-extra"><summary>Add competition details <small>optional</small></summary><div class="field"><label for="competition-link">Official competition page</label><input id="competition-link" name="competitionLink" type="url" maxlength="1000" placeholder="https://organizer.com/competition"></div><div class="field"><label for="pitch-round">Round or track <small>optional</small></label><input id="pitch-round" name="eventRound" list="pitch-round-options" maxlength="160" placeholder="For example: idea screening or hardware track"><datalist id="pitch-round-options"></datalist><p class="pitch-field-help">Use the exact round or track from your organiser. Saved suggestions need checking against the current edition.</p></div></details>
 <details class="pitch-extra"><summary>Add facts you already know <small>optional</small></summary>
 <div class="field"><label for="launch-proof">What have you built or tested?</label><textarea id="launch-proof" name="proof" maxlength="800" rows="3" placeholder="A prototype, user feedback or a measured result. It’s fine if you haven’t tested it yet."></textarea></div>
 <div class="field"><label for="launch-rules">Extra rules from your organiser</label><textarea id="launch-rules" name="rules" maxlength="3000" rows="3" placeholder="Any instructions shared with your team, such as slide limits or required sections."></textarea></div>
 <div class="field"><label for="launch-name">Project title</label><input id="launch-name" name="name" maxlength="80" placeholder="You can name it later"></div>
 <div class="field"><label for="launch-team">Team / presenter names</label><input id="launch-team" name="team" maxlength="100" placeholder="Add names now or in the editor"></div></details>
 <button type="submit" class="launch-primary">Build my pitch ${icons.arrow}</button>
 <p class="pitch-start-note">${connected?'Opens your editable Pitch Studio immediately. We’ll try to research the competition and draft your story.':'Opens your editable Pitch Studio immediately. AI drafting and online research are pending; editing, local checks, rehearsal and downloads work now.'} Missing facts stay clearly marked.</p>
 <details class="pitch-content-use"><summary>How your idea is used</summary><p>${connected?'Your idea and optional details are sent to our service and, when available, Google Gemini to draft your pitch. Google may use free-tier submissions to improve its products. We don’t save this content on our server.':'Your idea, facts and rules stay in this browser. This version sends no AI, live competition research or payment requests. Explicitly labelled notes can be arranged into the six story sections without changing your facts.'} Your editable project is saved in this browser. Export a project backup to keep a durable copy.</p></details>
 </form><aside class="pitch-start-aside"><div class="launch-output-label"><span><i></i> YOUR NEXT STOP</span><span>PITCH STUDIO</span></div>
 <div id="launch-draft-preview"></div><ol class="pitch-promises">
 <li><b>01</b><div><strong>A story built around your user</strong><p>The problem, the product workflow, and why your solution helps.</p></div></li>
 <li><b>02</b><div><strong>${connected?'Competition context, collected for you':'Your competition requirements'}</strong><p>${connected?'Readable requirements and reference sources, with gaps made clear.':'Keep supplied rules and map them to your slides. Live research stays pending.'}</p></div></li>
 <li><b>03</b><div><strong>A draft you can make your own</strong><p>Edit slides, names, images and notes. Rehearse and export an editable PowerPoint.</p></div></li>
 </ol></aside></div></section>`;
}
export async function enrichStudio(project,href,save,refresh,isCurrent=()=>true) {
 if(studioLookups.has(project.id))return;
 studioLookups.set(project.id,true);
 try{return await buildStudioPitch(project,{source:href,save,refresh,isCurrent});}
 finally{studioLookups.delete(project.id);refresh();}
}
