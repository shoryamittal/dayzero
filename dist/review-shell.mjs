export const reviewIcon = (name, size=20) => {
 const paths={arrow:'M7 17 17 7M7 7h10v10',upload:'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',deck:'M4 4h16v13H4zM8 21l4-4 4 4',check:'m5 12 4 4L19 6',shield:'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z',spark:'m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z',file:'M6 3h8l4 4v14H6zM14 3v5h5M9 12h6m-6 4h6',close:'m6 6 12 12M6 18 18 6',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',chevron:'m9 5 7 7-7 7',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM9 12a3 3 0 0 0 6 0 3 3 0 0 0-6 0',target:'M12 8a4 4 0 1 0 4 4M12 3a9 9 0 1 0 9 9M12 12l9-9m-5 0h5v5'};
 return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.spark}"/></svg>`;
};

export function reviewIntake({standalone=false}={}){const heading=standalone?'h1':'h2';return `<div class="rv-intake-grid">
 <div class="rv-intro"><span class="rv-eyebrow"><i></i> PRESENTATION REVIEW</span>
 <${heading} id="deck-review-title">Give your slides<br>a <em>second look.</em></${heading}>
 <p class="rv-lede">Upload your presentation for a slide-by-slide review. Find gaps in your story, evidence and competition requirements, then see what to improve.</p>
 <div class="rv-value-list"><div>${reviewIcon('target')}<span><strong>The brief, beside your story.</strong><small>Connect your slides to the requirements that matter.</small></span></div><div>${reviewIcon('eye')}<span><strong>Every finding has a reason.</strong><small>See the exact wording, the concern, and your next move.</small></span></div><div>${reviewIcon('check')}<span><strong>Leave with a plan.</strong><small>Prioritise fixes and take your checklist back to PowerPoint.</small></span></div></div>
 <button type="button" class="rv-example" data-review-demo>Explore an example review ${reviewIcon('arrow',17)}</button><small class="rv-example-note">A fictional deck. Real checks. No upload needed.</small>
 <div class="rv-trust">${reviewIcon('shield',16)} Your file is inspected in this browser. No account or API key.</div>
 </div>
 <form id="intake" class="rv-intake"><div class="rv-form-top"><span class="rv-eyebrow">UPLOAD YOUR PRESENTATION</span><span class="rv-pill">POWERPOINT</span></div>
 <label class="rv-upload" id="review-drop" for="file"><input type="file" id="file" accept=".pptx,.pptm,.ppsx,.ppsm,.potx,.potm,.ppt,.pps,.pot" required aria-describedby="review-file-help"><span class="rv-upload-icon">${reviewIcon('upload',26)}</span><strong id="review-file-name">Drop your PowerPoint here</strong><span id="review-file-help">or <u>browse files</u> · up to 8 MB · 1–40 slides</span><span class="rv-file-selected" id="review-file-meta" hidden></span></label>
 <p class="rv-form-note">Reads PPTX, PPTM, PPSX, PPSM, POTX and POTM. For older PPT, PPS or POT files, save a PPTX copy in PowerPoint first. Macros are never run.</p>
 <div class="rv-form-row"><div><label for="event">Competition <span>optional</span></label><input id="event" maxlength="160" placeholder="e.g. Smart India Hackathon" autocomplete="off"></div><div><label for="round">Presentation round</label><select id="round"><option value="screening">Idea screening</option><option value="demo">Live demo / final pitch</option></select></div></div>
 <details class="rv-brief" open><summary>Make the review specific to your competition <span>+</span></summary><label for="rules">Judging criteria &amp; submission rules <span>optional</span></label><textarea id="rules" maxlength="6000" rows="3" placeholder="One requirement per line…&#10;Maximum 8 slides&#10;Show evidence of user testing"></textarea><p>Paste the current organiser’s brief. Leave blank for a general review. Wording checks currently work in English.</p></details>
 <button class="rv-button rv-primary rv-analyze" id="submit" type="submit"><span>Review my presentation</span>${reviewIcon('arrow')}</button>
 <div class="rv-progress" id="review-progress" hidden><span></span><span></span><span></span></div><p role="status" aria-live="polite" id="status" class="rv-status"></p>
 <p class="rv-form-note">Content, typography &amp; rule checks. Your original file stays unchanged.</p>
 </form></div><section id="report" class="rv-report" hidden tabindex="-1" aria-label="Deck review results"></section>`;}
