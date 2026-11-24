export function projectBriefHandoff(project) {
 const notes=[];
 for(const key of ['problem','solution','approach','proof','impact','ask']) {
  const text=String(project[key]||'').trim();
  for(let offset=0;offset<text.length;offset+=900)notes.push(text.slice(offset,offset+900));
 }
 for(const extra of [project.rules,...Object.values(project.notes||{})]) {
  const text=String(extra||'').trim();
  for(let offset=0;offset<text.length;offset+=900)notes.push(text.slice(offset,offset+900));
 }
 for(const evidence of project.evidence||[]) {
  const text=JSON.stringify(evidence);
  for(let offset=0;offset<text.length;offset+=900)notes.push(text.slice(offset,offset+900));
 }
 if(notes.length>100)throw Error('This brief exceeds the server limit. Export a backup and shorten the brief before continuing.');
 return {version:1,form:{name:project.event||'',organizer:'',year:String(new Date().getFullYear()),round:'',track:'',topic:project.name||'',audience:'Competition jury',notes:notes.join('\n'),'supplied-rules':''}};
}
