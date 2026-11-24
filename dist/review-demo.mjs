// Fictional, deliberately imperfect data, fed through the same checks as uploads.
const content=[
 ['CampusLoop','A second life for campus essentials. Students list furniture and books for local pickup.'],
 ['The problem','Students buy essentials again every semester. We reduce campus waste by 80%.'],
 ['How it works','List an item. Reserve it. Meet at a staffed campus pickup point. Our revolutionary platform makes the handoff seamless.'],
 ['Our next experiment','We plan to test the prototype with 12 students. Record completed pickups, no-shows and minutes to arrange each exchange. TODO: confirm the pilot owner.']
];
export const demoSlides=content.map(([title,text],i)=>({index:i+1,title,paragraphs:[title,text],text:title+' '+text,count:(title+' '+text).split(/\s+/).length,runs:[{text:title,font:'Aptos Display',size:32},{text,font:'Aptos',size:i===2?14:22}],pictures:0,missingAlt:0,hidden:false,outside:[]}));
export const demoRules='Maximum 6 slides\nMinimum font size 18 pt\nShow evidence of user testing';
