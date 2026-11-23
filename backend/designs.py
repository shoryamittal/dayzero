"""Original presentation design systems. All measurements are in inches on a 13.333 × 7.5 slide."""
import html
import json
from pathlib import Path
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_AUTO_SIZE
from pptx.util import Inches, Pt
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE
from pptx.enum.dml import MSO_THEME_COLOR
import textwrap

W,H=13.333333,7.5
SYSTEMS={
 'folio':('Folio','Editorial','Linen','Academic narratives and research with a margin for the main claim.'),
 'brief':('Executive Brief','Briefing','Atlantic','A compact brief with a prominent decision and supporting columns.'),
 'stage':('Main Stage','Stage','Cobalt night','High-contrast keynote with a large title and short supporting points.'),
 'journal':('Research Journal','Editorial','Conifer','A journal heading with horizontal rows for findings and methods.'),
 'ledger':('Ledger','Technical','Slate','A narrow label column for valuations, measures and evidence.'),
 'exhibit':('Exhibit','Technical','Glacier','A full-width exhibit with aligned evidence panels.'),
 'signal':('Signal','Stage','Deep teal','A bold side panel anchors the thesis or product promise.'),
 'field':('Field Notes','Briefing','Ink and clay','A margin for the question, alongside field observations.'),
 'band':('Color Block','Stage','Cherry','A colored headline band for short statements and campaign decks.'),
 'outline':('Outline','Editorial','Aubergine','Light frames and open spacing for a structured oral presentation.')}
def blend(a,b,t):
    return '#'+''.join('%02x'%round(int(a[i:i+2],16)*(1-t)+int(b[i:i+2],16)*t) for i in (1,3,5))
def grid(x,y,w,h,n,direction):
    gap=.26
    if direction=='rows':
        hh=(h-(n-1)*gap)/n
        return [(x,y+i*(hh+gap),w,hh) for i in range(n)]
    ww=(w-(n-1)*gap)/n
    return [(x+i*(ww+gap),y,ww,h) for i in range(n)]
def scene(system,pal,typ,layout,idx,total,filled=None):
    filled=filled or {}
    bg,ink,accent,muted=[pal[k] for k in ('background','text','accent','secondary')]
    faint=blend(bg,accent,.10)
    light=blend(bg,accent,.05)
    shapes=[]
    def rect(x,y,w,h,c):shapes.append(('rect',(x,y,w,h),c))
    def label(x,y,w,h,value,size,c,font,bold=False):shapes.append(('text',(x,y,w,h),str(value),size,c,font,bold))
    rect(0,0,W,H,bg)
    title=filled.get('title') or layout['purpose']
    inputs=json.loads(layout['inputs_json'])
    body=filled.get('blocks')
    if body is None:body=[{} for _ in inputs]
    if len(body)!=len(inputs):raise ValueError(f"{layout['id']} needs {len(inputs)} blocks")
    head=typ['title_font'];bodyfont=typ['body_font']
    tag=filled.get('section',layout['id'].replace('_',' ').title())
    tagbox=(.65,.28,11,.35);headline=(.65,.78,12.0,1.24)
    bodybox=(.65,2.36,12.02,4.02);direction='columns'
    headcolor=ink;tagcolor=muted
    if system=='folio':
        rect(.65,.69,1.20,.07,accent);headline=(.65,.95,11.95,1.15)
        bodybox=(.65,2.45,11.95,3.82)
    elif system in ('signal','field'):
        side=4.35 if system=='signal' else 4.85
        rect(0,0,side,6.80,accent if system=='signal' else faint)
        headline=(.55,1.10,side-1.0,4.4);tagbox=(.55,.43,side-.95,.38)
        if system=='signal':headcolor=tagcolor=bg
        bodybox=(side+.42,.78,W-side-1.0,5.59);direction='rows'
    elif system=='ledger':
        rect(.64,2.00,12,.04,accent);bodybox=(.65,2.18,12,4.35);direction='rows'
    elif system=='journal':
        rect(.67,.63,12,.025,muted);bodybox=(.65,2.30,12.0,4.10);direction='rows'
    elif system=='band':
        rect(0,0,W,2.24,accent);headcolor=tagcolor=bg
        bodybox=(.65,2.82,12.02,3.44)
    elif system=='stage':
        rect(.6,.45,.12,1.47,accent);tagbox=(.95,.35,11.5,.34);headline=(.95,.86,11.6,1.34)
        bodybox=(.95,2.69,11.55,3.57)
    elif system=='exhibit':
        rect(0,0,W,.14,accent);bodybox=(.65,2.08,12.0,4.34)
    elif system=='brief':
        rect(.65,.71,12.03,.035,accent);bodybox=(.65,2.27,12.02,4.13)
    elif system=='outline':
        rect(.4,.22,.045,6.45,accent);bodybox=(.76,2.25,11.92,4.16)
    else:raise ValueError('Unknown design system')
    label(*tagbox,tag,13,tagcolor,bodyfont,True)
    label(*headline,title,min(typ['title_pt']+2,40),headcolor,head,True)
    for j,(box,slot,block) in enumerate(zip(grid(*bodybox,len(inputs),direction),inputs,body)):
        x,y,w,h=box
        if not isinstance(block,dict):raise ValueError('Each content block needs a JSON object')
        if system in ('exhibit','band','stage','outline'):
            rect(x,y,w,h,faint if system!='outline' else light)
            rect(x,y,w,.045,accent)
        elif system in ('ledger','journal','signal','field'):rect(x,y,w,.022,muted)
        else:rect(x,y,.065,h,accent if j==0 else faint)
        pad=.17;bx=x+pad;bw=w-2*pad
        ll=block.get('label') or slot.capitalize()
        # Compact horizontal rows devote their left third to labels.
        row=direction=='rows' and h<2.2
        labelbox=(bx,y+.14,bw*.29,h-.23) if row else (bx,y+.18,bw,min(.72,h*.33))
        label(*labelbox,ll,14 if row else 17,accent,bodyfont,True)
        bx,by,bw,bh=(x+w*.34,y+.10,w*.63,h-.20) if row else (bx,y+min(.91,h*.40),bw,max(.28,h-min(.91,h*.40)-.15))
        content=(bx,by,bw,bh)
        if block.get('chart'):shapes.append(('chart',content,block['chart']))
        elif block.get('table'):shapes.append(('table',content,block['table']))
        elif block.get('photo'):shapes.append(('photo',content,block['photo']))
        elif block.get('icon'):shapes.append(('icon',content,block['icon'],accent))
        else:
            value=block.get('text','[Add your evidence here]' if j==0 else '[Add supporting detail]')
            label(*content,value,min(typ['body_pt'],22),ink,bodyfont)
    rect(.65,6.84,12,.02,faint)
    label(.66,6.98,11.15,.29,filled.get('source') or ('Evidence · '+layout['evidence_requirement']),11,muted,bodyfont)
    label(12.02,6.95,.7,.34,str(idx+1)+' / '+str(total),11,muted,bodyfont)
    return shapes

def family_data(db,recipe):
    result=db.execute('SELECT l.* FROM recipe_slides r JOIN layouts l ON l.id=r.layout WHERE r.recipe_id=? ORDER BY sequence',(recipe,)).fetchall()
    if not result:raise ValueError('Unknown sequence')
    return [dict(r) for r in result]
def rgb(c):return RGBColor.from_string(c.lstrip('#'))
def emu(box):return [Inches(n) for n in box]
def svg_icon(db,name,color):
    r=db.execute('SELECT svg_path,units,ascent FROM icon_index WHERE id=?',(name,)).fetchone()
    if not r:raise ValueError('Unknown icon')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s"><path fill="%s" transform="translate(0 %s) scale(1 -1)" d="%s"/></svg>'%(r['units'],r['units'],color,r['ascent'],r['svg_path'])).encode()
def render(db,recipe,system,pal,typ,content=None,photo_root=None):
    from io import BytesIO
    from PIL import Image,ImageOps
    ppt=Presentation();ppt.slide_width=Inches(W);ppt.slide_height=Inches(H)
    layouts=family_data(db,recipe)
    if content is not None and len(content)!=len(layouts):raise ValueError('Provide exactly one record per slide')
    for i,l in enumerate(layouts):
        slide=ppt.slides.add_slide(ppt.slide_layouts[6])
        for kind,b,*args in scene(system,pal,typ,l,i,len(layouts),content[i] if content is not None else None):
            pos=emu(b)
            if kind=='rect':
                s=slide.shapes.add_shape(MSO_SHAPE.RECTANGLE,*pos);s.fill.solid();s.fill.fore_color.rgb=rgb(args[0]);s.line.fill.background()
            elif kind=='text':
                val,pt,color,font,bold=args
                s=slide.shapes.add_textbox(*pos);tf=s.text_frame
                tf.margin_top=tf.margin_bottom=tf.margin_left=tf.margin_right=0;tf.word_wrap=True
                tf.auto_size=MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE
                p=tf.paragraphs[0];p.text=val;p.font.name=font;p.font.size=Pt(pt);p.font.bold=bold;p.font.color.rgb=rgb(color)
            elif kind=='table':
                data=args[0]
                if not data or not data[0] or any(len(row)!=len(data[0]) for row in data):raise ValueError('Expected a rectangular table')
                table=slide.shapes.add_table(len(data),len(data[0]),*pos).table
                for y,row in enumerate(data):
                    for x,v in enumerate(row):
                        c=table.cell(y,x);c.text=str(v);c.fill.solid();c.fill.fore_color.rgb=rgb(pal['accent'] if y==0 else pal['background'])
                        p=c.text_frame.paragraphs[0];p.font.name=typ['body_font'];p.font.size=Pt(13);p.font.color.rgb=rgb(pal['background'] if y==0 else pal['text'])
            elif kind=='chart':
                ch=args[0];data=CategoryChartData();data.categories=ch['labels']
                for name,values in ch['series'].items():
                    if len(values)!=len(ch['labels']):raise ValueError('Chart series length mismatch')
                    data.add_series(name,values)
                chart=slide.shapes.add_chart({'bar':XL_CHART_TYPE.COLUMN_CLUSTERED,'line':XL_CHART_TYPE.LINE}[ch.get('type','bar')],*pos,data).chart
                chart.has_legend=len(ch['series'])>1
                chart.font.size=Pt(12);chart.font.color.rgb=rgb(pal['text']);chart.font.name=typ['body_font']
                for j,series in enumerate(chart.series):
                    col=rgb(pal['accent'] if j%2==0 else pal['secondary'])
                    if ch.get('type')=='line':series.format.line.color.rgb=col
                    else:series.format.fill.solid();series.format.fill.fore_color.rgb=col
            elif kind in ('photo','icon'):
                if kind=='photo':
                    if photo_root is None:raise ValueError('Local photos require an explicit asset folder')
                    root=Path(photo_root).resolve();p=(root/args[0]).resolve()
                    if not p.is_relative_to(root):raise ValueError('Photo must be inside the asset folder')
                    with Image.open(p) as im:
                        im=ImageOps.fit(im.convert('RGB'),(max(1,round(b[2]*150)),max(1,round(b[3]*150))))
                        buf=BytesIO();im.save(buf,'PNG')
                else:
                    from PIL import ImageDraw,ImageFont
                    row=db.execute('SELECT codepoint FROM icon_index WHERE id=?',(args[0],)).fetchone()
                    if row is None:raise ValueError('Unknown icon')
                    im=Image.new('RGBA',(512,512));draw=ImageDraw.Draw(im)
                    font=ImageFont.truetype(str(Path(__file__).parent/'assets/bootstrap-icons.ttf'),440)
                    glyph=chr(row[0]);x0,y0,x1,y1=draw.textbbox((0,0),glyph,font=font)
                    draw.text(((512-x1-x0)/2,(512-y1-y0)/2),glyph,fill=args[1],font=font)
                    buf=BytesIO();im.save(buf,'PNG')
                    side=min(pos[2],pos[3]);pos=[int(pos[0]+(pos[2]-side)/2),pos[1],side,side]
                buf.seek(0);slide.shapes.add_picture(buf,*pos)
    out=BytesIO();ppt.save(out);return out.getvalue()
