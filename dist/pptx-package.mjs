export async function repairSlideMasters(original, zipLibrary) {
 const zip=await zipLibrary.loadAsync(await original.arrayBuffer());
 const manifest=await zip.file('[Content_Types].xml').async('string');
 // The bundled exporter lists one slide-master override per slide, even when they share a master.
 const repaired=manifest.replace(/<Override PartName="\/(ppt\/slideMasters\/slideMaster\d+\.xml)" ContentType="[^"]+"\/>/g,
  (entry,part)=>zip.file(part)?entry:'');
 if(repaired===manifest)return original;
 zip.file('[Content_Types].xml',repaired);
 return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',compression:'DEFLATE'});
}
