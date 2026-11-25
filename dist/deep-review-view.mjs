const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function deepSummary(model){
 const d=model.deepReview;
 if(model.aiError)return '<section class="rv-deep-status" role="status"><strong>Standard review ready · deep review not completed</strong><p>'+esc(model.aiError)+'</p><p>Your standard findings remain below. Connect AI and run the review again for the full slide-by-slide analysis.</p></section>';
 if(!d?.complete)return '';
 return '<section class="rv-deep-strategy"><span class="rv-eyebrow">YOUR COMPETITION GAME PLAN · AI SUGGESTIONS</span><h3>A stronger argument, slide by slide.</h3><p>'+esc(d.summary)+'</p><p class="rv-deep-scope">Reviewed every slide against the supplied text and metadata. '+(d.context.rules?'Check the edition and round of the attached brief.':'No organizer rules supplied: this is general pitch coaching.')+' AI visual checks are suggestions; original slides and facts still need your review.</p>'+
 (d.criteria.length?'<details class="rv-criteria-detail"><summary>Competition criteria · '+d.criteria.length+'</summary><div class="rv-deep-criteria">'+d.criteria.map(c=>'<article><span class="rv-badge neutral">'+esc({candidate:'Candidate evidence',partial:'Partial coverage',missing:'Missing coverage',manual:'Manual check'}[c.state])+'</span><blockquote>'+esc(c.quote)+'</blockquote><p>'+esc(c.reason)+'</p><strong>Next move</strong><p>'+esc(c.next)+'</p><div class="rv-occurrences">'+c.slides.map(i=>'<button type="button" data-slide="'+i+'">Slide '+i+'</button>').join('')+'</div></article>').join('')+'</div></details>':'')+
 (d.crossSlide.length?'<details><summary>Across the deck · '+d.crossSlide.length+' findings</summary>'+d.crossSlide.map(c=>'<article class="rv-cross-finding"><h4>'+esc(c.title)+'</h4>'+c.quotes.map(q=>'<blockquote>Slide '+q.index+' · '+esc(q.quote)+'</blockquote>').join('')+'<p><strong>Why it matters</strong> '+esc(c.why)+'</p><p><strong>How to fix it</strong> '+esc(c.fix)+'</p></article>').join('')+'</details>':'')+
 (d.unresolved.length?'<details><summary>Questions to resolve before submission</summary><ul>'+d.unresolved.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul></details>':'')+'</section>';
}
export function deepSlide(model,index){
 const s=model.deepReview?.slides.find(s=>s.index===index);if(!s)return '';
 return '<section class="rv-deep-slide"><span class="rv-eyebrow">SLIDE '+index+' · THE JUDGE’S LENS</span><h4>The job of this slide</h4><p>'+esc(s.purpose)+'</p><h4>Keep what works</h4><p>'+esc(s.strength)+'</p>'+
 (s.headline?'<h4>Try this headline</h4><blockquote>'+esc(s.headline)+'</blockquote>':'')+
 (s.referenceLesson?'<h4>Reference structure lesson</h4><blockquote>'+esc(s.referenceQuote)+'</blockquote><p>'+esc(s.referenceLesson)+'</p>':'')+
 (s.visualScope?'<h4>Visual review scope</h4><p>'+esc(s.visualScope)+'</p>':'')+'<h4>Be ready for this question</h4><p>'+esc(s.judgeQuestion)+'</p>'+
 (s.evidenceNeeded?'<h4>Evidence to add</h4><p>'+esc(s.evidenceNeeded)+'</p>':'')+'</section>';
}

const measuredReasons={
 'Reading load':'Dense text asks the audience to read while listening, which can hide the slide’s main point.',
 'Evidence':'A numerical claim needs a traceable source or test description so judges can assess what the number means.',
 'Unfinished text':'A placeholder signals that an important part of the submission is still unresolved.',
 'Projection':'Small explicitly sized text can be difficult to read when projected. This is a guideline unless your organizer specifies a minimum.',
 'Typography':'Several declared typefaces can signal accidental font substitutions or competing visual roles.',
 'Object bounds':'An object’s stored bounds cross the slide canvas. Important content could be clipped, although intentional cropping is possible.',
 'Submission':'A hidden slide may be excluded from the presentation while still counting toward a file-based slide limit.',
 'Visual review':'The file contains no editable text here, so text checks cannot assess the slide’s message.',
 'Wording':'Broad promotional wording does not tell a judge what the user can do or what evidence supports the claim.',
 'Long passage':'A long sentence can bury the takeaway and make the slide harder to scan.',
 'Image accessibility':'A missing stored description can make informative visual content harder to access.',
 'Over limit':'The measured slide or word count exceeds the limit explicitly supplied in your brief.',
 'Below minimum':'An explicitly sized text run is smaller than the minimum specified in your brief.',
 'Font mismatch':'A declared Latin font differs from the font family named in your supplied rule.'
};
export function deepFinding(i){
 const why=i.why||measuredReasons[i.topic];
 return (why?'<h5>Why it matters</h5><p>'+esc(why)+'</p><h5>How to fix it</h5><p>'+esc(i.fix||i.action)+'</p>':'<p>'+esc(i.action)+'</p>')+
 (i.ruleQuote?'<p class="rv-rule-anchor"><strong>Competition requirement</strong> '+esc(i.ruleQuote)+'</p>':'')+
 (i.rewrite?'<h5>Suggested wording · verify before using</h5><blockquote>'+esc(i.rewrite)+'</blockquote>':'');
}
