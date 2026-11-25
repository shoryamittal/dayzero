export const presentationFormats = ['pptx','pptm','ppsx','ppsm','potx','potm'];
export function validatePresentationFile(file) {
 if (!file || typeof file.name !== 'string') throw Error('Choose a PowerPoint presentation to review.');
 const extension=file.name.split('.').pop().toLowerCase();
 if (['ppt','pps','pot'].includes(extension)) throw Error('This is an older PowerPoint format. Open it in PowerPoint, choose Save As → PowerPoint Presentation (.pptx), then upload that copy. Renaming the extension will not convert it.');
 if (!presentationFormats.includes(extension)) throw Error('Choose a PPTX, PPTM, PPSX, PPSM, POTX or POTM presentation. For PDF or other formats, export a PowerPoint copy first.');
 if (file.size > 8*1024*1024) throw Error('This presentation is larger than 8 MB. Compress its images in PowerPoint and try again.');
 return extension;
}
