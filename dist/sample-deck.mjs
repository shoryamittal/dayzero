const cobalt = '183AF0';
const ink = '121945';
const coral = 'FF694F';
const cream = 'FFFAEF';
const yellow = 'F1FF4D';
const muted = '38457B';
const pale = 'E0E8FF';
const line = 'A5B2E8';
const blueLine = '90A5FF';

const chapters = ['THE OPPORTUNITY','THE PRODUCT','THE WORKFLOW','THE PROTOTYPE','THE PILOT','THE DECISION'];

export function sampleDesign(project, _slide, index) {
  const dark = [0, 2].includes(index);
  const foreground = dark ? cream : ink;
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
    photo('/before-close-cover.png','AI-generated concept photograph of a reusable bowl of food',528,0,432,540);
    box(0,0,11,540,yellow);
    label('CAMPUS FOOD RECOVERY',46,43,425,yellow);
    serif(project.name.replace(' ','\n'),43,92,472,235,93);
    box(46,338,91,5,yellow);
    serif('Unsold meals, reserved for pickup',44,367,475,96,34,{italic:true,role:'body'});
    label('FICTIONAL PRODUCT PITCH',46,509,325);
    label('AI-GENERATED CONCEPT IMAGE',557,510,330,ink);
    return {background:cobalt,shapes,images,items,notes:speakerNotes[index]};
  }

  label(project.name.toUpperCase()+'  /  CAMPUS FOOD RECOVERY',48,27,530);
  label(chapters[index],741,27,171);
  box(48,57,864,1,dark ? blueLine : line);
  box(48,491,864,1,dark ? blueLine : line);
  label('FICTIONAL PRODUCT PITCH',48,508,400);
  label(folio,848,508,64);

  if (index===1) {
    serif('A reservation in two screens',47,77,865,79,53);
    copy('Staff list surplus portions. A student reserves a meal and shows their code at the counter.',48,174,262,118,23);
    photo('/before-close-listing.png','AI-generated concept photo of the meal in the example listing',48,297,228,171);
    label('AI-GENERATED CONCEPT IMAGE',48,473,281);
    box(345,171,260,290,cream);
    box(626,171,286,290,cobalt);
    box(345,171,260,4,coral);
    box(626,171,286,4,yellow);
    label('01  /  AVAILABLE TODAY',363,195,230);
    type('Veg lunch\nbowl',363,234,220,86,31,{bold:true});
    type('Counter pickup\n4:30–5:00 pm',363,327,220,52,16,{color:muted});
    box(363,396,224,41,yellow);
    type('Reserve a meal',375,405,201,27,17,{bold:true});
    label('02  /  CONFIRMED',646,195,238,yellow);
    type('Pickup code',646,239,232,32,20,{color:cream});
    type('BC–024',643,279,246,87,61,{color:cream,bold:true});
    box(646,379,247,1,blueLine);
    type('Show this code at the counter.',646,398,232,52,17,{color:cream});
  }

  if (index===2) {
    serif('From kitchen\nto counter',46,86,363,134,49);
    copy('One pickup window, three handoffs.',48,218,333,42,19);
    photo('/before-close-pickup.png','AI-generated concept photo of a phone and reserved meal at pickup',48,263,266,199.5);
    label('AI-GENERATED CONCEPT IMAGE',48,470,314);
    box(420,89,2,363,blueLine);
    const steps = [
      ['01','CANTEEN STAFF','List','Post the available portions and collection time.'],
      ['02','STUDENT','Reserve','Claim a portion and receive a pickup code.'],
      ['03','COUNTER STAFF','Collect','Check the code and mark the meal collected.']
    ];
    steps.forEach(([n,owner,title,detail],i)=>{
      const y=92+i*114;
      label(n,446,y+7,37,yellow);
      type(title,490,y,170,55,33,{bold:true});
      label(owner,491,y+55,170);
      copy(detail,681,y+12,218,80,19);
      box(445,y+92,467,1,blueLine);
    });
    label('UNCOLLECTED RESERVATIONS EXPIRE AT CLOSE',446,451,465,yellow);
  }

  if (index===3) {
    photo('/reloop-canteen-concept.png','AI-generated concept photograph of a canteen worker setting aside a meal',48,81,379,379);
    label('AI-GENERATED CONCEPT IMAGE',48,465,370);
    serif('The prototype\nshows the flow',459,85,454,127,50);
    box(459,232,453,2,ink);
    label('WHAT WE CAN DEMONSTRATE',459,250,450);
    copy('A clickable sequence for listing, reservation, and pickup.',459,283,448,69,23);
    label('WHAT A LIVE SHIFT WOULD TEST',459,370,450);
    copy('Can staff keep stock current, and will students arrive in time?',459,400,448,79,23);
  }

  if (index===4) {
    serif('A two-week field test',47,78,867,81,57);
    photo('/before-close-log.png','AI-generated concept photo of a staff member logging leftovers',672,156,237,316);
    label('AI-GENERATED CONCEPT IMAGE',672,475,238);
    box(48,163,594,103,cobalt);
    box(344,179,1,69,blueLine);
    label('WEEK 01  /  BASELINE',63,179,271,yellow);
    type('Log closing leftovers.',63,213,268,40,20,{color:cream,bold:true});
    label('WEEK 02  /  LIVE PICKUPS',362,179,266,yellow);
    type('Run a staffed pickup window.',362,213,269,40,20,{color:cream,bold:true});
    const measures = [
      ['Meal recovery','Portions collected / portions listed'],
      ['Missed pickups','Uncollected / reserved meals'],
      ['Staff time','Minutes spent on listings and handoffs']
    ];
    measures.forEach(([name,detail],i)=>{
      const y=292+i*55;
      box(48,y-9,594,1,line);
      type(name,48,y,202,38,20,{bold:true});
      copy(detail,252,y,384,40,18);
    });
    label('PROPOSED PILOT  /  RESULTS PENDING',48,467,862);
  }

  if (index===5) {
    serif('Approve a pilot\nat one canteen',47,106,570,172,62);
    copy('Review meal recovery, missed pickups, and staff time with the canteen lead at the end of week two.',50,308,500,109,24);
    box(620,109,2,316,ink);
    label('THREE THINGS TO AGREE',645,118,266,ink);
    const needs = ['Name a canteen lead','Set a pickup window','Book a results review'];
    needs.forEach((need,i)=>{
      const y=166+i*79;
      box(645,y-9,265,1,'AC392A');
      label(String(i+1).padStart(2,'0'),646,y+4,36,ink);
      type(need,686,y+2,223,61,24,{bold:true});
    });
    box(49,430,534,1,'AC392A');
    label('01 CANTEEN',49,448,139,ink);
    label('02 WEEKS',214,448,139,ink);
    label('01 REVIEW',374,448,139,ink);
  }

  const background = dark ? cobalt : index===5 ? coral : index===1 ? 'FBE6DF' : index===3 ? 'F8FFCF' : cream;
  return {background,shapes,images,items,notes:speakerNotes[index]};
}

const speakerNotes = [
  'Open at the end of a canteen day. Before Close tests whether a short pickup window can get unsold meals to students. The cover is a concept image.',
  'Walk through the meal listing and confirmation. The student shows the code at the counter. The screen, pickup time, and code are illustrative.',
  'Follow one meal through listing, reservation, and collection. At closing, uncollected reservations expire. Ask who should update availability during a rush.',
  'Show the clickable prototype. It demonstrates the screen sequence. The pilot needs to establish whether the handoff works during a real closing shift. The image is a concept illustration.',
  'Log closing leftovers during the first week. In week two, run a staffed pickup window and track collections, missed pickups, and staff time. Review the numbers alongside staff observations.',
  'Ask for approval to test at one canteen, a named lead, and a review date. At the review, use the results and staff feedback to decide whether to continue, adjust, or stop.'
];
