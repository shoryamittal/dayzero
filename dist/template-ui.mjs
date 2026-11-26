import {readTemplate,fillTemplate} from './template-bridge.mjs?v=audit-2';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let api={},loaded=null,owner='',filename='',mapping={},busy=false,operation=0,operationPanel=null;
const contentFields=['name','team','problem','solution','approach','proof','impact','ask'];
const projectSignature=project=>JSON.stringify({id:project?.id,template:project?.template,...Object.fromEntries(contentFields.map(key=>[key,project?.[key]||'']))});
export function initTemplate(options){api=options;}
export function templateBridge(){if(owner!==api.project().id){loaded=null;mapping={};owner=api.project().id;busy=false;operation++;operationPanel=null;}else if(busy&&operationPanel&&!operationPanel.isConnected){busy=false;operation++;operationPanel=null;}return `<div class="prep-section-title"><span>OFFICIAL TEMPLATE / TEXT ONLY</span><h3>The organizer’s canvas.<br><em>Your own words.</em></h3><p>Upload a PPTX and choose which text boxes receive your content. The bridge keeps the original slides, masters, themes, and media. Recognized title and footer placeholders are locked.</p></div><div class="notice neutral">This is a text replacement tool. It does not render or certify the final layout. Text length, fonts, special shapes, and organizer restrictions still need a manual check in PowerPoint. Use the original file when the template cannot be safely adapted.</div><div class="panel"><label for="official-pptx"><strong>Choose the organizer’s PPTX</strong></label><input id="official-pptx" type="file" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" ${busy?'disabled':''}><p class="hint">Up to 8 MB and 40 slides. Processed in this browser, kept in memory for this project until you switch projects or close the tab. Re-upload after reopening. Macros, encrypted files, and embedded objects are rejected.</p><p role="status" id="template-status">${busy?'Reading template…':loaded?esc(filename)+' · '+loaded.slides+' slides · '+loaded.slots.length+' text boxes':'No template loaded.'}</p></div>${loaded?`<section class="template-slot-list">${loaded.slots.map(s=>`<article class="template-slot"><div><span class="eyebrow">SLIDE ${s.slide} / ${esc(s.label)}</span><p>${esc(s.text||'(Empty text box)')}</p></div><div><label for="slot-${esc(s.id)}">${s.locked?'Protected placeholder':'Replace with'}</label><select id="slot-${esc(s.id)}" data-template-slot="${esc(s.id)}" ${s.locked?'disabled':''}><option value="">Keep original text</option>${['name','team','problem','solution','approach','proof','impact','ask'].map(k=>`<option value="${k}" ${mapping[s.id]===k?'selected':''}>${k[0].toUpperCase()+k.slice(1)}</option>`).join('')}</select></div></article>`).join('')}</section><div class="template-export-bar"><p>Unmapped boxes keep their original text. Replacements use the first text run’s formatting; review overflow and mixed formatting in PowerPoint.</p><button class="btn primary" data-fill-template ${busy?'disabled':''}>Download filled template ↓</button></div>`:''}`;}
document.addEventListener('change',async event=>{
 if(event.target.dataset.templateSlot){mapping[event.target.dataset.templateSlot]=event.target.value;return;}
 if(event.target.id!=='official-pptx'||!event.target.files[0]||busy)return;
 const file=event.target.files[0],projectId=api.project()?.id;
 if(!projectId)return;
 if(!/\.pptx$/i.test(file.name))return api.toast('Choose a .pptx file.');
 if(file.size>8*1024*1024)return api.toast('Use a file smaller than 8 MB.');
 const request=++operation;
 busy=true;loaded=null;mapping={};operationPanel=null;api.render();
 const panel=document.querySelector('#template-status');operationPanel=panel;
 const owned=()=>request===operation&&owner===projectId&&api.project()?.id===projectId;
 const visible=()=>owned()&&panel?.isConnected&&document.querySelector('#template-status')===panel;
 try{
  await api.loadScript('/vendor/jszip.min.js');
  const result=await readTemplate(new Uint8Array(await file.arrayBuffer()),window.JSZip);
  if(!owned())return;
  loaded=result;filename=file.name;
  if(visible())api.toast('Template loaded. Choose the text boxes to fill.');
 }catch(error){if(visible())api.toast(error.message);}
 finally{
  if(request===operation)busy=false;
  if(visible())api.render();
 }
});
document.addEventListener('click',async event=>{
 if(!event.target.closest('[data-fill-template]')||!loaded||busy)return;
 const active=api.project();if(!active||owner!==active.id)return;
 // Freeze all inputs before the asynchronous ZIP work. Later edits must not be
 // mixed into a file that the team approved with an earlier mapping.
 const project=structuredClone(active),template=loaded,slots={...mapping},name=filename;
 const signature=projectSignature(active),mappingSignature=JSON.stringify(slots),request=++operation;
 busy=true;operationPanel=null;api.render();
 const panel=document.querySelector('#template-status');operationPanel=panel;
 const owned=()=>request===operation&&owner===project.id&&api.project()?.id===project.id;
 const visible=()=>owned()&&panel?.isConnected&&document.querySelector('#template-status')===panel;
 try{
  const result=await fillTemplate(template,slots,project);
  if(!owned())return;
  if(projectSignature(api.project())!==signature||JSON.stringify(mapping)!==mappingSignature){
   if(visible())api.toast('Your project or mapping changed while the template was filling. Download again to use your latest edits.');
   return;
  }
  api.download(result.blob,name.replace(/\.pptx$/i,'')+'-filled-draft.pptx');
  if(visible())api.toast(result.changed+' text boxes filled. Open the file and check the layout.');
 }catch(error){if(visible())api.toast(error.message);}
 finally{
  if(request===operation)busy=false;
  if(visible())api.render();
 }
});
