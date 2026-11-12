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

  if (index===5) {
    box(0,0,354,540,cobalt);
    label(project.name.toUpperCase()+'  /  PROPOSED PILOT',43,29,282,cream);
    box(43,65,268,1,blueLine);
    serif('01',40,95,144,122,91,{color:cream,role:'label'});
    type('CANTEEN',178,165,126,28,19,{color:yellow,bold:true});
    box(43,228,268,1,blueLine);
    serif('02',40,240,144,122,91,{color:cream,role:'label'});
    type('WEEKS',178,310,126,28,19,{color:yellow,bold:true});
    label('ONE STAFFED PICKUP WINDOW',43,416,271,cream);
    label('FICTIONAL PRODUCT PITCH',43,508,269,cream);

    label('DECISION REQUEST',397,29,516,ink);
    box(397,65,516,1,'AC392A');
    serif('Approve the pilot',396,88,517,80,57);
    label('TO START',398,179,515,ink);
    const decisions=['Name the canteen lead','Set the pickup window','Book the results review'];
    decisions.forEach((decision,i)=>{
      const y=211+i*55;
      box(398,y+2,32,28,cream);
      type(String(i+1).padStart(2,'0'),405,y+8,22,16,12,{color:ink,bold:true});
      type(decision,447,y,459,40,24,{color:ink,bold:true});
      box(398,y+40,515,1,'AC392A');
    });
    box(397,393,516,90,yellow);
    label('WEEK TWO REVIEW',412,407,484,ink);
    type('Meals collected, missed pickups, and staff time',412,437,483,35,19,{color:ink,bold:true});
    label(folio,850,508,63,ink);
    return {background:coral,shapes,images,items,notes:speakerNotes[index]};
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
    serif('A meal’s path to pickup',46,76,868,73,53);
    photo('/before-close-pickup.png','AI-generated concept photo of a phone and reserved meal at pickup',48,154,416,312);
    label('AI-GENERATED CONCEPT IMAGE',48,474,416);
    const steps = [
      ['01','CANTEEN STAFF','List','Post portions and set the pickup window.'],
      ['02','STUDENT','Reserve','Choose a meal and receive a pickup code.'],
      ['03','COUNTER STAFF','Collect','Check the code and mark the meal collected.']
    ];
    steps.forEach(([number,owner,title,detail],i)=>{
      const y=158+i*94;
      label(number,488,y+5,36,yellow);
      type(title,528,y,207,38,30,{bold:true});
      label(owner,745,y+9,166);
      copy(detail,529,y+42,383,42,18);
      box(488,y+83,424,1,blueLine);
    });
    label('UNCOLLECTED RESERVATIONS EXPIRE AT CLOSE',488,449,425,yellow);
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
    serif('What changes at closing?',47,76,867,74,54);
    photo('/before-close-log.png','AI-generated concept photo of a staff member logging leftovers',654,148,237,316);
    label('AI-GENERATED CONCEPT IMAGE',654,471,258);
    box(48,149,584,103,cobalt);
    box(340,168,1,66,blueLine);
    label('WEEK 01  /  BASELINE',63,164,263,yellow);
    type('Count leftovers at close.',63,198,259,41,20,{color:cream,bold:true});
    label('WEEK 02  /  LIVE PICKUPS',355,164,262,yellow);
    type('Repeat the count after pickup.',355,198,258,44,19,{color:cream,bold:true});
    const measures = [
      ['Leftovers at close','Compare closing counts across both weeks'],
      ['Meal recovery','Collected portions out of portions listed'],
      ['Missed pickups','Uncollected reservations out of bookings'],
      ['Staff time','Minutes spent listing and handing out meals']
    ];
    measures.forEach(([name,detail],i)=>{
      const y=273+i*47;
      box(48,y-7,584,1,line);
      type(name,48,y,184,31,18,{bold:true});
      copy(detail,231,y,401,35,17);
    });
    label('PROPOSED PILOT  /  RESULTS PENDING',48,467,584);
  }

  const background = dark ? cobalt : index===1 ? 'FBE6DF' : index===3 ? 'F8FFCF' : cream;
  return {background,shapes,images,items,notes:speakerNotes[index]};
}

const speakerNotes = [
  'Open at the end of a canteen day. Before Close tests whether a short pickup window can get unsold meals to students. The cover is a concept image.',
  'Walk through the meal listing and confirmation. The student shows the code at the counter. The screen, pickup time, and code are illustrative.',
  'Follow one meal through listing, reservation, and collection. At closing, uncollected reservations expire. Ask who should update availability during a rush.',
  'Show the clickable prototype. It demonstrates the screen sequence. The pilot needs to establish whether the handoff works during a real closing shift. The image is a concept illustration.',
  'Count leftover portions at closing in week one. Keep counting in week two while running the staffed pickup window. Track meal recovery, missed pickups, and staff time. Compare the closing counts alongside staff observations.',
  'Ask for approval to test at one canteen, a named lead, and a review date. At the review, use the results and staff feedback to decide whether to continue, adjust, or stop.'
];
