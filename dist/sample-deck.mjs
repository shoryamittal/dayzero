const plum = '211527';
const lilac = 'EBE2F3';
const cream = 'FFF9F0';
const lime = 'DFFF72';
const muted = '654D70';
const pale = 'CCB8D6';
const line = 'CDBDD5';

const chapters = ['THE OPPORTUNITY','THE PRODUCT','THE WORKFLOW','THE PROTOTYPE','THE PILOT','THE DECISION'];

export function sampleDesign(_project, _slide, index) {
  const dark = [0, 2].includes(index);
  const foreground = dark ? cream : plum;
  const secondary = dark ? pale : muted;
  const items = [];
  const shapes = [];
  const images = [];
  const box = (x,y,w,h,color) => shapes.push({box:[x,y,w,h],color});
  const type = (value,x,y,width,height,size,options={}) =>
    items.push({value,x,y,width,height,size,color:foreground,bold:false,align:'left',...options});
  const serif = (value,x,y,w,h,size,options={}) =>
    type(value,x,y,w,h,size,{fontFace:'Georgia',role:'title',...options});
  const label = (value,x,y,w=300,color=secondary) => type(value,x,y,w,23,13,{color,bold:true});
  const copy = (value,x,y,w,h=80,size=23) => type(value,x,y,w,h,size,{role:'body'});
  const photo = (src,alt,x,y,w,h) => images.push({src,alt,box:[x,y,w,h]});
  const folio = String(index+1).padStart(2,'0')+' / 06';

  if (index===0) {
    photo('/reloop-studio-cover.png','AI-generated concept photograph of a reusable bowl of food',528,0,432,540);
    box(0,0,11,540,lime);
    label('CAMPUS FOOD RECOVERY',46,43,425,lime);
    serif('ReLoop',43,102,467,140,106);
    box(46,253,75,4,lime);
    serif('Unsold meals,\nreserved for pickup',44,278,475,123,43,{italic:true,role:'body'});
    copy('A proposed canteen pilot',46,439,460,42,22);
    label('FICTIONAL PRODUCT PITCH',46,509,325);
    label('AI-GENERATED CONCEPT IMAGE',557,510,330,cream);
    return {background:plum,shapes,images,items,notes:speakerNotes[index]};
  }

  label('RELOOP  /  CAMPUS FOOD RECOVERY',48,27,530);
  label(chapters[index],741,27,171);
  box(48,57,864,1,dark ? '725B7D' : line);
  box(48,491,864,1,dark ? '725B7D' : line);
  label('FICTIONAL PRODUCT PITCH',48,508,400);
  label(folio,848,508,64);

  if (index===1) {
    serif('A reservation in two screens',47,77,865,79,53);
    copy('Staff list surplus portions. A student reserves a meal and shows their code at the counter.',48,209,262,160,25);
    label('ILLUSTRATIVE PROTOTYPE',48,427,275);
    box(345,171,260,290,cream);
    box(626,171,286,290,plum);
    box(345,171,260,4,lime);
    box(626,171,286,4,lime);
    label('01  /  AVAILABLE TODAY',363,195,230);
    type('Veg lunch\nbowl',363,234,220,86,31,{bold:true});
    type('Counter pickup\n4:30–5:00 pm',363,327,220,52,16,{color:muted});
    box(363,396,224,41,lime);
    type('Reserve a meal',375,405,201,27,17,{bold:true});
    label('02  /  CONFIRMED',646,195,238,lime);
    type('Pickup code',646,239,232,32,20,{color:cream});
    type('RL–024',643,279,246,87,61,{color:cream,bold:true});
    box(646,379,247,1,'725B7D');
    type('Show this code at the counter.',646,398,232,52,17,{color:cream});
  }

  if (index===2) {
    serif('From kitchen\nto counter',46,111,363,143,53);
    copy('A single pickup window. Three people with a clear next step.',48,301,322,110,23);
    box(420,89,2,363,'725B7D');
    const steps = [
      ['01','CANTEEN STAFF','List','Post the available portions and collection time.'],
      ['02','STUDENT','Reserve','Claim a portion and receive a pickup code.'],
      ['03','COUNTER STAFF','Collect','Check the code and mark the meal collected.']
    ];
    steps.forEach(([n,owner,title,detail],i)=>{
      const y=92+i*114;
      label(n,446,y+7,37,lime);
      type(title,490,y,170,55,33,{bold:true});
      label(owner,491,y+55,170);
      copy(detail,681,y+12,218,80,19);
      box(445,y+92,467,1,'725B7D');
    });
    label('UNCOLLECTED RESERVATIONS EXPIRE AT CLOSE',446,451,465,lime);
  }

  if (index===3) {
    photo('/reloop-canteen-concept.png','AI-generated concept photograph of a canteen worker setting aside a meal',48,81,379,379);
    label('AI-GENERATED CONCEPT IMAGE',48,465,370);
    serif('The prototype\nshows the flow',459,85,454,127,50);
    box(459,232,453,2,plum);
    label('WHAT WE CAN DEMONSTRATE',459,250,450);
    copy('A clickable sequence for listing, reservation, and pickup.',459,283,448,69,23);
    label('WHAT A LIVE SHIFT WOULD TEST',459,370,450);
    copy('Can staff keep stock current, and will students arrive in time?',459,400,448,79,23);
  }

  if (index===4) {
    serif('A two-week field test',47,78,867,81,57);
    box(48,175,864,100,plum);
    box(480,188,1,71,'725B7D');
    label('WEEK 01  /  BASELINE',65,190,402,lime);
    type('Log leftovers at closing.',65,222,399,40,25,{color:cream,bold:true});
    label('WEEK 02  /  LIVE PICKUPS',503,190,386,lime);
    type('Run a staffed pickup window.',503,222,388,40,24,{color:cream,bold:true});
    const measures = [
      ['Meal recovery','Collected portions out of portions listed'],
      ['Missed pickups','Uncollected reservations out of reservations made'],
      ['Staff time','Minutes spent listing and handing over meals']
    ];
    measures.forEach(([name,detail],i)=>{
      const y=305+i*52;
      box(48,y-9,864,1,line);
      type(name,48,y,246,40,21,{bold:true});
      copy(detail,303,y,606,37,20);
    });
    label('PROPOSED PILOT  /  RESULTS PENDING',48,467,862);
  }

  if (index===5) {
    serif('Approve a pilot\nat one canteen',47,106,570,172,62);
    copy('Review meal recovery, missed pickups, and staff time with the canteen lead at the end of week two.',50,308,500,109,24);
    box(620,109,2,316,plum);
    label('THREE THINGS TO AGREE',645,118,266,plum);
    const needs = ['Name a canteen lead','Set a pickup window','Book a results review'];
    needs.forEach((need,i)=>{
      const y=166+i*79;
      box(645,y-9,265,1,'83924B');
      label(String(i+1).padStart(2,'0'),646,y+4,36,plum);
      type(need,686,y+2,223,61,24,{bold:true});
    });
    label('AFTER THE REVIEW  /  CONTINUE, ADJUST, OR STOP',49,447,858,plum);
  }

  const background = dark ? plum : index===5 ? lime : index===1 ? lilac : cream;
  return {background,shapes,images,items,notes:speakerNotes[index]};
}

const speakerNotes = [
  'Open at the end of a canteen day. ReLoop tests whether a short pickup window can get unsold meals to students. The cover is a concept image.',
  'Walk through the meal listing and confirmation. The student shows the code at the counter. The screen, pickup time, and code are illustrative.',
  'Follow one meal through listing, reservation, and collection. At closing, uncollected reservations expire. Ask who should update availability during a rush.',
  'Show the clickable prototype. It demonstrates the screen sequence. The pilot needs to establish whether the handoff works during a real closing shift. The image is a concept illustration.',
  'Log closing leftovers during the first week. In week two, run a staffed pickup window and track collections, missed pickups, and staff time. Review the numbers alongside staff observations.',
  'Ask for approval to test at one canteen, a named lead, and a review date. At the review, use the results and staff feedback to decide whether to continue, adjust, or stop.'
];
