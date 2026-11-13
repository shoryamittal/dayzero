const ink = '211524';
const paper = 'FFF1DC';
const muted = '6C515B';
const plum = '342039';
const orchid = 'EBD7ED';
const flame = 'FF754A';
const ruled = 'D1B8B2';
const nightRule = '694E69';

export const sampleChapters = ['Opening', 'Product', 'Workflow', 'Handoff', 'Pilot', 'Decision'];

const notes = [
  'Picture a canteen just before closing. The meal in the image represents an unsold portion. Before Close would let a student reserve it for pickup at the same counter. This is a fictional pitch with an AI-generated opening image.',
  'Walk through the student flow. They see the meal and pickup window, reserve a portion, then receive a code. Show how the code connects the student reservation to the counter handoff. The listing, photograph, time, and code are illustrative.',
  'Walk through one illustrative shift. Staff list only portions cleared under the canteen’s existing process, with a firm pickup deadline. Students book a portion and show a code when they arrive. Staff verify the code, record collection, and let uncollected bookings expire at close.',
  'The prototype demonstrates listing, reservation, and collection. In the live pilot, observe how staff update stock during a rush and how often students arrive before close. The handoff photo is an AI-generated illustration.',
  'Compare leftovers per closing shift for the same weekdays before and during the pilot. Use the same counting method in both weeks. During live pickups, also record collections as a share of listed portions, no-shows as a share of reservations, and staff minutes per shift. No outcomes have been measured yet.',
  'Ask the campus dining manager to approve one canteen for two weeks, designate a lead, and agree on a staffed pickup window and review date. Before launch, agree what improvement and workload the canteen would consider acceptable. At review, decide whether to repeat, adjust, or stop.'
];

export function sampleDesign(project, _slide, index) {
  const backgrounds = [ink, plum, paper, orchid, ink, flame];
  const background = backgrounds[index];
  const dark = [0, 1, 4].includes(index);
  const foreground = dark ? paper : ink;
  const secondary = dark ? orchid : muted;
  const rule = dark ? nightRule : ruled;
  const items = [];
  const shapes = [];
  const images = [];

  const box = (x, y, w, h, color) => shapes.push({box:[x, y, w, h], color});
  const type = (value, x, y, width, height, size, options = {}) =>
    items.push({value, x, y, width, height, size, color:foreground, bold:false, align:'left', ...options});
  const title = (value, x, y, w, h, size, options = {}) =>
    type(value, x, y, w, h, size, {fontFace:'Georgia', role:'title', ...options});
  const label = (value, x, y, w, color = secondary, options = {}) =>
    type(value, x, y, w, 20, 13, {color, bold:true, ...options});
  const copy = (value, x, y, w, h, size = 22, options = {}) =>
    type(value, x, y, w, h, size, {role:'body', ...options});
  const photo = (src, alt, x, y, w, h) => images.push({src, alt, box:[x, y, w, h]});

  if (index === 0) {
    photo('/before-close-dusk.png', 'AI-generated concept image of an unsold meal at a campus canteen at dusk', 0, 0, 960, 540);
    label('CAMPUS FOOD RECOVERY', 49, 53, 360, flame);
    title(project.name.replace(' ', '\n'), 42, 100, 470, 228, 97);
    copy('Reserve an unsold meal\nbefore the canteen closes.', 49, 354, 432, 79, 27);
    label('FICTIONAL PITCH  /  CONCEPT IMAGERY', 49, 494, 426, orchid);
    return {background, shapes, images, items, notes:notes[index]};
  }

  const folio = String(index + 1).padStart(2, '0') + ' / 06';
  const footerColor = index === 5 ? ink : secondary;
  label(project.name.toUpperCase(), 48, 506, 190, footerColor);
  label(folio, 821, 506, 91, footerColor, {align:'right'});

  if (index === 1) {
    title('Reserve a meal', 46, 44, 541, 79, 60);
    copy('The student picks a portion, then gets a code for the counter.', 49, 131, 380, 77, 24);
    photo('/before-close-listing.png', 'AI-generated concept image of the illustrated vegetable and rice meal', 48, 225, 276, 207);
    label('AI-GENERATED CONCEPT IMAGE', 48, 445, 281);
    box(354, 228, 558, 204, paper);
    box(644, 228, 268, 204, flame);
    label('AVAILABLE TODAY', 376, 251, 244, muted);
    type('Veg rice bowl', 374, 286, 248, 53, 34, {color:ink, bold:true});
    type('Counter pickup · 4:30–5:00 pm', 376, 342, 246, 33, 17, {color:ink});
    box(376, 383, 246, 31, ink);
    label('RESERVE A PORTION', 391, 391, 212, paper);
    label('RESERVATION CONFIRMED', 666, 251, 227, ink);
    type('BC–024', 665, 280, 228, 78, 61, {color:ink, bold:true});
    box(666, 367, 223, 1, 'BD5438');
    type('Show this code at the counter.', 666, 382, 222, 40, 18, {color:ink});
    for (let y = 239; y < 420; y += 13) box(641, y, 6, 3, plum);
    label('ILLUSTRATIVE PICKUP TICKET', 666, 445, 227);
  }

  if (index === 2) {
    title('The closing shift', 46, 45, 868, 90, 65);
    copy('One staffed pickup window, with a firm cut-off.', 49, 137, 802, 40, 25);
    label('ILLUSTRATIVE SHIFT', 49, 198, 300);
    box(49, 249, 860, 2, ruled);
    const steps = [
      ['4:30', 'Staff list portions', 'Post available meals and the pickup deadline.'],
      ['4:43', 'A student reserves', 'One portion is held and the student gets a code.'],
      ['4:55', 'Staff record pickup', 'Check the code, hand over the meal, and mark it collected.']
    ];
    steps.forEach(([time, action, detail], i) => {
      const x = 48 + i * 290;
      type(time, x, 218, 118, 30, 23, {bold:true});
      box(x + 1, 245, 10, 10, ink);
      type(action, x, 275, 272, 37, 25, {bold:true});
      copy(detail, x, 324, 247, 86, 21);
    });
    box(48, 422, 864, 53, plum);
    label('5:00 PM  /  CLOSE', 65, 440, 156, flame);
    copy('Uncollected reservations expire.', 240, 435, 642, 29, 21, {color:paper});
  }

  if (index === 3) {
    photo('/before-close-handoff.png', 'AI-generated concept image of a student collecting a meal from canteen staff', 408, 56, 552, 368);
    title('At the\ncounter', 46, 63, 352, 149, 60);
    copy('The clickable prototype runs through listing, reservation, and collection.', 49, 229, 319, 93, 25);
    box(49, 343, 315, 1, 'AD89AE');
    label('QUESTIONS FOR THE LIVE SHIFT', 49, 364, 321, ink);
    copy('Can staff keep stock current?\nDo students arrive before close?', 49, 397, 330, 74, 20);
    label('AI-GENERATED CONCEPT IMAGE', 408, 442, 505, ink);
  }

  if (index === 4) {
    title('The pilot scorecard', 46, 43, 870, 83, 59);
    copy('Do fewer portions remain at close?', 49, 133, 850, 38, 25);
    box(48, 190, 864, 112, paper);
    box(48, 190, 432, 6, orchid);
    box(480, 190, 432, 6, flame);
    box(480, 209, 1, 72, ruled);
    label('WEEK 01  /  BASELINE', 69, 216, 382, muted);
    label('WEEK 02  /  LIVE PICKUPS', 503, 216, 382, muted);
    type('Count portions at close.', 69, 247, 383, 38, 24, {color:ink, bold:true});
    type('Repeat on the same weekdays.', 503, 247, 385, 38, 24, {color:ink, bold:true});
    label('ALSO TRACK DURING LIVE PICKUPS', 48, 328, 864, flame);
    const measures = [
      ['Recovery', 'Portions collected\n÷ portions listed'],
      ['No-shows', 'Uncollected bookings\n÷ all bookings'],
      ['Staff time', 'Pickup work in\nminutes per shift']
    ];
    measures.forEach(([name, detail], i) => {
      const x = 48 + i * 290;
      box(x, 362, 265, 1, rule);
      type(name, x, 374, 266, 37, 24, {bold:true});
      copy(detail, x, 418, 265, 60, 19, {color:orchid});
    });
  }

  if (index === 5) {
    box(48, 53, 435, 423, ink);
    label('DECISION REQUEST', 75, 81, 366, flame);
    title('Approve\nthe pilot', 71, 126, 384, 170, 65, {color:paper});
    box(75, 310, 380, 1, nightRule);
    copy('One canteen. Two weeks.\nOne staffed pickup window.', 75, 338, 369, 95, 26, {color:paper});

    label('BEFORE WEEK ONE', 527, 67, 385, ink);
    const actions = ['Name a canteen lead', 'Set the pickup window', 'Book the review date'];
    actions.forEach((action, i) => {
      const y = 114 + i * 61;
      box(527, y - 12, 385, 1, 'B94E36');
      type(action, 527, y, 382, 42, 26, {bold:true});
    });
    box(527, 312, 385, 164, paper);
    label('AT THE REVIEW', 548, 334, 339, ink);
    title('Repeat, adjust, or stop', 547, 366, 345, 44, 29);
    copy('Use the scorecard and staff feedback to make the call.', 548, 414, 333, 52, 18);
  }

  return {background, shapes, images, items, notes:notes[index]};
}
