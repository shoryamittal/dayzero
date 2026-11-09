const ink = '132A24';
const dark = '102821';
const paper = 'F4F2E8';
const white = 'FFFDF4';
const lime = 'D8F46B';
const mint = 'A7C7AD';
const muted = '446158';
const line = 'B8C8B8';

export function sampleDesign(_project, _slide, index) {
  const isDark = [0, 2, 5].includes(index);
  const foreground = isDark ? white : ink;
  const secondary = isDark ? mint : muted;
  const items = [];
  const shapes = [];
  const images = [];
  const box = (x,y,w,h,color) => shapes.push({box:[x,y,w,h],color});
  const type = (value,x,y,width,height,size,{color=foreground,bold=false,role=''}={}) =>
    items.push({value,x,y,width,height,size,color,bold,align:'left',role});
  const heading = (value,width=860,size=50) => type(value,48,97,width,128,size,{bold:true,role:'title'});
  const label = (value,x,y,width=300,color=secondary) => type(value,x,y,width,25,13,{color,bold:true});
  const copy = (value,x,y,width,height=80,size=23) => type(value,x,y,width,height,size,{role:'body'});
  const chapters = ['THE OPPORTUNITY','THE PRODUCT','THE WORKFLOW','THE PROTOTYPE','THE PILOT','THE ASK'];

  label('RELOOP  /  CAMPUS FOOD RECOVERY',48,28,500);
  label(chapters[index],671,28,244);
  box(48,65,864,1,isDark ? '537060' : line);
  box(48,493,864,1,isDark ? '537060' : line);
  label('FICTIONAL PRODUCT PITCH',48,509,420);
  label(String(index+1).padStart(2,'0')+' / 06',848,509,64);

  if (index===0) {
    type('ReLoop',48,104,460,102,82,{bold:true,role:'title'});
    box(50,221,75,4,lime);
    type('A second chance\nfor unsold meals',48,250,502,116,47,{bold:true});
    copy('A campus canteen pilot for reserving and collecting surplus food before closing.',50,394,482,77,23);
    images.push({
      src:'/reloop-handoff.png',
      alt:'Concept image of a canteen worker handing a lunch bowl to a student',
      box:[595,78,317,396]
    });
    label('AI-GENERATED CONCEPT IMAGE',595,477,317,mint);
  }
  if (index===1) {
    heading('Reserve a meal.\nCollect before close.',532,51);
    copy('Staff list unsold portions. Students reserve a meal and show their code at the counter.',50,243,470,107,25);
    box(50,381,455,1,line);
    label('CANTEEN STAFF',50,398,196);
    label('STUDENTS',270,398,205);
    type('Set stock and pickup time',50,428,201,52,18,{bold:true});
    type('Reserve and collect',270,428,201,52,18,{bold:true});
    box(568,91,344,375,dark);
    label('RELOOP  /  PROTOTYPE',590,111,292,mint);
    box(588,145,304,132,white);
    label('AVAILABLE TODAY',606,159,246,muted);
    type('Veg lunch bowl',606,188,255,45,28,{color:ink,bold:true});
    type('Pickup at the counter · 4:30–5:00 pm',606,236,265,27,15,{color:ink});
    box(588,292,304,149,lime);
    label('RESERVATION CONFIRMED',606,307,264,ink);
    type('RL–024',606,334,248,58,42,{color:ink,bold:true});
    type('Show this code at pickup',606,403,254,27,17,{color:ink});
  }
  if (index===2) {
    heading('From listing to pickup');
    const steps = [
      ['01','List','Staff set the quantity and a collection window.'],
      ['02','Reserve','A student picks a meal and gets a pickup code.'],
      ['03','Collect','Staff check the code at the counter.']
    ];
    steps.forEach(([n,title,detail],i)=>{
      const x=48+i*296;
      box(x,220,272,2,'789681');
      label(n,x,243,120,lime);
      type(title,x,277,260,54,37,{bold:true});
      copy(detail,x,348,252,108,23);
    });
  }
  if (index===3) {
    heading('The prototype covers\nthe pickup flow',860,53);
    box(48,261,864,1,line);
    box(480,279,1,166,line);
    label('DEMONSTRATED IN THE PROTOTYPE',48,284,405);
    copy('A clickable flow for listing, reservation and code-based pickup.',48,322,385,112,25);
    label('QUESTIONS FOR THE PILOT',515,284,390);
    copy('Will staff keep listings current? Will students collect what they reserve?',515,322,383,120,25);
  }
  if (index===4) {
    heading('What the pilot will measure');
    label('MEASURE',48,213,290);
    label('HOW WE’LL TRACK IT',374,213,496);
    const rows=[
      ['Meals collected','Compare pickup records with portions listed.'],
      ['Missed pickups','Count reservations that expire uncollected.'],
      ['Staff workload','Record the time spent posting and handing over meals.']
    ];
    rows.forEach(([metric,method],i)=>{
      const y=254+i*68;
      box(48,y-12,864,1,line);
      type(metric,48,y,301,51,24,{bold:true});
      copy(method,374,y,522,54,21);
    });
    label('PROPOSED MEASURES  /  BASELINE AND RESULTS PENDING',48,463,864);
  }
  if (index===5) {
    heading('Approval for a\none-canteen pilot',605,57);
    copy('Start with one staffed pickup window. Review collection and staff workload before expanding.',50,268,490,145,27);
    box(600,105,312,326,lime);
    label('WHAT WE NEED',624,130,244,ink);
    type('A canteen lead',624,185,253,52,27,{color:ink,bold:true});
    box(624,246,260,1,'859844');
    type('An agreed pickup window',624,266,251,68,27,{color:ink,bold:true});
    box(624,342,260,1,'859844');
    type('A short review after the pilot',624,362,258,66,22,{color:ink,bold:true});
  }

  return {background:isDark ? dark : paper, shapes, images, items};
}
