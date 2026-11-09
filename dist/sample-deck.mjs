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
    heading('One reservation, three handoffs');
    const steps = [
      ['01','CANTEEN STAFF','List','Post the available portions and set a pickup window.'],
      ['02','STUDENT','Reserve','Claim one portion and receive a pickup code.'],
      ['03','COUNTER STAFF','Collect','Check the code and mark the meal collected.']
    ];
    box(48,226,864,2,'789681');
    steps.forEach(([n,owner,title,detail],i)=>{
      const x=48+i*296;
      box(x,213,38,28,lime);
      label(n,x+8,218,28,ink);
      label(owner,x,258,260);
      type(title,x,289,265,53,40,{bold:true});
      copy(detail,x,354,259,89,23);
    });
    label('AT CLOSE  /  UNCOLLECTED RESERVATIONS EXPIRE',48,463,864,mint);
  }
  if (index===3) {
    heading('What the prototype shows',860,54);
    box(48,207,864,1,line);
    box(479,229,1,175,line);
    label('SHOWN IN THE CLICKABLE DEMO',48,237,409);
    type('The screens connect',48,276,403,47,30,{bold:true});
    copy('Walk through listing a meal, reserving it, and checking its pickup code.',48,337,378,84,23);
    label('OPEN QUESTION FOR THE PILOT',513,237,387);
    type('Can it work at closing?',513,276,397,47,30,{bold:true});
    copy('Observe whether staff can keep stock current and students arrive in time.',513,337,380,84,23);
    box(48,431,864,47,'DDE7D4');
    type('Prototype only. Field usage and food recovery are still unmeasured.',64,445,822,25,17,{bold:true});
  }
  if (index===4) {
    heading('Two weeks to test the handoff',870,53);
    box(48,188,418,87,'DDE7D4');
    box(483,188,429,87,'DDE7D4');
    label('WEEK 01  /  BASELINE',62,200,379);
    type('Log leftover portions at closing.',62,232,375,31,20,{bold:true});
    label('WEEK 02  /  LIVE PICKUPS',498,200,394);
    type('Run one staffed pickup window daily.',498,232,393,31,20,{bold:true});
    const rows=[
      ['Recovery','Portions collected out of portions listed'],
      ['No-shows','Uncollected reservations out of reservations made'],
      ['Staff time','Minutes spent listing and handing over meals']
    ];
    rows.forEach(([metric,method],i)=>{
      const y=304+i*53;
      box(48,y-9,864,1,line);
      type(metric,48,y,242,37,21,{bold:true});
      copy(method,303,y,603,36,20);
    });
    label('PROPOSED PILOT  /  RESULTS PENDING',48,471,864);
  }
  if (index===5) {
    heading('Approve a trial at\none canteen',560,59);
    copy('At the end of week two, review recovery, missed pickups and staff time with the canteen lead.',50,267,489,116,25);
    box(50,423,472,2,mint);
    label('DECISION  /  CONTINUE, ADJUST, OR STOP',50,443,480,lime);
    box(589,105,323,333,lime);
    label('WHAT WE NEED TO START',612,129,283,ink);
    const needs=[
      ['01','Name a canteen lead'],
      ['02','Agree on a pickup window'],
      ['03','Set a date to review results']
    ];
    needs.forEach(([n,detail],i)=>{
      const y=177+i*81;
      box(612,y-10,276,1,'859844');
      label(n,612,y+9,37,ink);
      type(detail,659,y+4,221,62,25,{color:ink,bold:true});
    });
  }

  return {background:isDark ? dark : paper, shapes, images, items, notes:speakerNotes[index]};
}

const speakerNotes = [
  'Open at the end of a canteen day. ReLoop tests whether a short pickup window can get unsold meals to students. The cover shows the intended handoff as a concept image.',
  'Walk through the two sides. Staff list what is available. A student reserves a meal, receives a code, and shows it at the counter. The screen and code are illustrative.',
  'Follow one meal through listing, reservation, and collection. At closing, any uncollected reservation expires. Ask staff who should update availability during a rush.',
  'Show the clickable prototype. It demonstrates the screen sequence. The pilot needs to establish whether the handoff works during a real closing shift.',
  'Log closing leftovers during the first week. In week two, run a staffed pickup window and track collections, no-shows, and staff time. The comparison is an operational signal, not a causal estimate.',
  'Ask for approval to test at one canteen, a named lead, and a review date. At the review, use the results and staff feedback to decide whether to continue, adjust, or stop.'
];
