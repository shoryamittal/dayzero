import {normalizePDFText, questions, slides, themes, wrapText} from './engine.mjs?v=ai-1.0';

const WIDTH = 960;
const HEIGHT = 540;
const INSET = 54;
const PAPER = 'F7F3EA';
const INK = '25222B';

const layouts = {
  problem: {title: [54, 126, 675, 98, 84], body: [58, 248, 670, 220, 31], mark: [740, 124, 166, 174, 144]},
  solution: {title: [54, 108, 826, 92, 75], body: [74, 249, 790, 214, 32], band: [54, 222, 852, 251]},
  approach: {title: [54, 128, 270, 78, 49], body: [378, 128, 522, 340, 30], rule: [342, 126, 2, 330]},
  proof: {title: [54, 100, 852, 76, 64], body: [57, 212, 835, 250, 29], rule: [54, 188, 852, 2]},
  impact: {title: [54, 272, 370, 93, 75], body: [444, 142, 454, 315, 30], mark: [55, 109, 252, 169, 132]},
  ask: {title: [100, 120, 760, 106, 86], body: [115, 255, 730, 198, 34], rule: [415, 234, 130, 3], align: 'center'}
};
const compact = {
  title: [54, 82, 852, 59, 49],
  body: [57, 160, 846, 316, 22],
  rule: [54, 148, 852, 2]
};

function mix(base, other, amount) {
  return [0, 2, 4].map(offset => {
    const a = parseInt(base.slice(offset, offset + 2), 16);
    const b = parseInt(other.slice(offset, offset + 2), 16);
    return Math.round(a + (b - a) * amount).toString(16).padStart(2, '0');
  }).join('').toUpperCase();
}

function text(value, box, color, {bold = false, align = 'left', role = ''} = {}) {
  const [x, y, width, height, size] = box;
  return {value, x, y, width, height, size, color, bold, align, role};
}

function measureApprox(value, size) {
  return Array.from(value).reduce((width, character) => {
    if (/[\u0300-\u036f\u093a-\u094d]/u.test(character)) return width;
    if (/\s|[ilI1.,'’]/u.test(character)) return width + 0.29;
    if (/[WM@%]/u.test(character)) return width + 0.9;
    if (character.codePointAt(0) > 0x2ff) return width + 1;
    return width + 0.57;
  }, 0) * size;
}

function fit(item, measure = measureApprox, minimum = 6) {
  let size = item.size;
  let lines;
  for (; size >= minimum; size--) {
    lines = wrapText(item.value.replace(/\r\n?/g, '\n').replace(/\t/g, ' '), value => measure(value, size), item.width);
    if (lines.length * size * 1.22 <= item.height) return {size, lines, fits: true};
  }
  return {size: minimum, lines, fits: false};
}

export function slideDesign(project, slide, index) {
  const theme = themes[project.template] || themes.botanical;
  const light = ['solution', 'proof'].includes(slide.key);
  const background = light ? mix(PAPER, theme.bg, 0.08) : theme.bg;
  const foreground = light ? INK : theme.fg;
  const muted = light ? mix(INK, background, 0.29) : theme.muted;
  const accent = light ? mix(theme.bg, INK, 0.42) : theme.accent;
  const original = layouts[slide.key];
  const dense = slide.text.length > 430 || slide.text.split('\n').length > 7;
  const layout = dense ? compact : original;
  const ordinal = String(index + 1).padStart(2, '0');
  const sourceNotes = project.evidence?.filter(note => note.slide === slide.key).length || 0;
  const provenance = project.demo ? 'Fictional sample' : sourceNotes
    ? sourceNotes + (sourceNotes === 1 ? ' source note' : ' source notes') + ' supplied by you'
    : 'Draft for review';
  const shapes = [{box: [INSET, 488, 852, 1], color: mix(background, foreground, 0.3)}];
  if (layout.rule) shapes.push({box: layout.rule, color: accent});
  if (layout.band) shapes.push({box: layout.band, color: mix(background, theme.bg, 0.09)});
  const items = [
    text(project.name, [INSET, 30, 670, 35, 15], muted, {bold: true, role: 'name'}),
    text(ordinal + ' / 06', [745, 30, 161, 24, 15], muted, {align: 'right'}),
    text(slide.title, layout.title, foreground, {bold: true, align: layout.align, role: 'title'}),
    text(slide.text, layout.body, foreground, {align: layout.align, role: 'body'}),
    text(provenance, [INSET, 503, 745, 21, 12], muted)
  ];
  if (layout.mark) items.unshift(text(ordinal, layout.mark, mix(background, foreground, 0.22), {bold: true, role: 'mark'}));
  return {background, shapes, items};
}

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const bounds = (x, y, width, height) => 'left:'+x/WIDTH*100+'%;top:'+y/HEIGHT*100+'%;width:'+width/WIDTH*100+'%;height:'+height/HEIGHT*100+'%';

export function renderDeckSlide(project, index, designSlide = slideDesign) {
  const slide = slides(project)[index];
  const design = designSlide(project, slide, index);
  return `<article class="designed-slide" aria-label="${slide.title} slide" style="background:#${design.background}">
    ${design.shapes.map(({box,color}) => `<span aria-hidden="true" class="designed-slide-layer" style="${bounds(...box)};background:#${color}"></span>`).join('')}
    ${(design.images || []).map(({src,alt,box}) => `<img class="designed-slide-layer" src="${escape(src)}" alt="${escape(alt)}" style="${bounds(...box)};object-fit:cover">`).join('')}
    ${design.items.map(item => {
      const tag = item.role === 'title' ? 'h2' : item.role === 'body' ? 'p' : 'span';
      const font = fit(item).size;
      return `<${tag} class="designed-slide-layer designed-slide-${item.role || 'label'}" ${item.role==='mark'?'aria-hidden="true"':''} style="${bounds(item.x,item.y,item.width,item.height)};color:#${item.color};font-size:${font/WIDTH*100}cqw;font-weight:${item.bold?700:400};text-align:${item.align}">${escape(item.value)}</${tag}>`;
    }).join('')}
  </article>`;
}

async function imageData(src) {
  const response = await fetch(src);
  if (!response.ok) throw Error('Could not load the slide image.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let i=0; i<bytes.length; i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
  return 'data:image/png;base64,' + btoa(binary);
}

export async function makePowerPoint(project, PptxGenJS, designSlide = slideDesign) {
  const deck = new PptxGenJS();
  deck.defineLayout({name: 'Day-Zero Wide', width: WIDTH / 72, height: HEIGHT / 72});
  deck.layout = 'Day-Zero Wide';
  deck.author = '';
  deck.subject = project.demo ? 'Fictional sample pitch' : 'Pitch draft for review';
  deck.title = project.name;
  deck.lang = 'en-IN';
  for (const [index, slide] of slides(project).entries()) {
    const page = deck.addSlide();
    const design = designSlide(project, slide, index);
    page.background = {color: design.background};
    for (const {box:[x,y,width,height],color} of design.shapes) {
      page.addShape(deck.ShapeType.rect, {
        x:x/72, y:y/72, w:width/72, h:height/72,
        fill:{color}, line:{color, transparency:100}
      });
    }
    for (const {src, data, alt, box:[x,y,width,height]} of design.images || []) {
      const picture = data || await imageData(src);
      page.addImage({data:picture, altText:alt, x:x/72, y:y/72, w:width/72, h:height/72});
    }
    for (const item of design.items) {
      page.addText(item.value, {
        x:item.x/72, y:item.y/72, w:item.width/72, h:item.height/72,
        color:item.color, fontFace:'Arial', fontSize:fit(item).size, bold:item.bold,
        align:item.align, valign:'top', margin:0, fit:'shrink'
      });
    }
    page.addNotes(design.notes ? [design.notes] : [
      project.notes?.[slide.key] || '',
      ...(project.evidence || []).filter(note => note.slide === slide.key)
        .map(note => `Source note (student supplied): ${note.claim} | ${note.source}`),
      `Practice question: ${questions[index][1]}`, questions[index][2],
      'Draft. No AI jury has been run.'
    ]);
  }
  return deck.write({outputType:'blob'});
}

export async function makePDF(project, {PDFDocument, StandardFonts, rgb}) {
  const document = await PDFDocument.create();
  const fonts = {
    regular: await document.embedFont(StandardFonts.Helvetica),
    bold: await document.embedFont(StandardFonts.HelveticaBold)
  };
  const color = hex => rgb(...[0,2,4].map(offset => parseInt(hex.slice(offset,offset+2),16)/255));
  for (const [index, slide] of slides(project).entries()) {
    const design = slideDesign(project, slide, index);
    const page = document.addPage([WIDTH, HEIGHT]);
    page.drawRectangle({x:0, y:0, width:WIDTH, height:HEIGHT, color:color(design.background)});
    for (const {box:[x,y,width,height],color:fill} of design.shapes) {
      page.drawRectangle({x, y:HEIGHT-y-height, width, height, color:color(fill)});
    }
    for (const item of design.items) {
      const font = item.bold ? fonts.bold : fonts.regular;
      const measure = (value, size) => font.widthOfTextAtSize(value, size);
      const value = normalizePDFText(item.value);
      const {size, lines, fits} = fit({...item, value}, measure, 6);
      if (!fits) throw Error('Shorten the '+slide.title.toLowerCase()+' slide to fit the PDF, or edit the PowerPoint.');
      for (const [i, line] of lines.entries()) {
        const space = item.width - measure(line, size);
        const x = item.x + (item.align === 'right' ? space : item.align === 'center' ? space / 2 : 0);
        page.drawText(line, {x, y:HEIGHT-item.y-size*.9-i*size*1.22, size, font, color:color(item.color)});
      }
    }
  }
  return new Blob([await document.save()], {type:'application/pdf'});
}
