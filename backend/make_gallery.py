"""Build the offline gallery and 300 editable PowerPoint files using the shipped catalog."""
import html,json,re,sqlite3,csv
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from designs import SYSTEMS,render,scene,family_data,W,H
from store import catalog_connection
ROOT=Path(__file__).resolve().parent
def preview(shapes,destination):
    scale=76
    im=Image.new('RGB',(round(W*scale),round(H*scale)),'white');draw=ImageDraw.Draw(im)
    for k,(x,y,w,h),*args in shapes:
        x,y,w,h=[v*scale for v in (x,y,w,h)]
        if k=='rect':draw.rectangle([x,y,x+w-1,y+h-1],fill=args[0]);continue
        if k!='text':continue
        s,pt,c,font,bold=args
        fname=('DejaVuSerif' if font=='Georgia' else 'DejaVuSans')+('-Bold' if bold else '')+'.ttf'
        size=round(pt*scale/72)
        while size>=8:
            f=ImageFont.truetype(fname,size)
            lines=['']
            for word in s.split():
                trial=(lines[-1]+' '+word).strip()
                if lines[-1] and draw.textlength(trial,font=f)>w:lines.append(word)
                else:lines[-1]=trial
            if len(lines)*size*1.23<=h:break
            size-=1
        for i,line in enumerate(lines):draw.text((x,y+i*size*1.22),line,font=f,fill=c)
    im.save(destination,'WEBP',quality=85)
def build():
    # Supports the compressed catalog in a fresh checkout as well as Docker.
    with catalog_connection() as db:
        return build_from_catalog(db)

def build_from_catalog(db):
    db.row_factory=sqlite3.Row
    out=ROOT/'gallery';out.mkdir(exist_ok=True);(out/'decks').mkdir(exist_ok=True);(out/'previews').mkdir(exist_ok=True)
    manifest=[]
    for r in db.execute('SELECT * FROM deck_recipes ORDER BY id'):
        layouts=family_data(db,r['id'])
        for system,(name,t,p,desc) in SYSTEMS.items():
            pal=dict(db.execute('SELECT * FROM palettes WHERE id=?',(p,)).fetchone())
            typo=dict(db.execute('SELECT * FROM type_styles WHERE id=?',(t,)).fetchone())
            stem=r['id']+'--'+system
            (out/'decks'/(stem+'.pptx')).write_bytes(render(db,r['id'],system,pal,typo))
            loc=1 if layouts[0]['id']=='cover' else 0
            preview(scene(system,pal,typo,layouts[loc],loc,len(layouts)),out/'previews'/(stem+'.webp'))
            manifest.append(dict(recipe=r['id'],audience=r['audience'],system=system,name=name,palette=p,typography=t,slide_count=len(layouts),file='decks/'+stem+'.pptx',preview='previews/'+stem+'.webp'))
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=1))
    cards=[]
    for m in manifest:
        cssclass=html.escape(m['recipe'])
        cards.append(f"""<article data-recipe="{cssclass}" data-system="{m['system']}"><img loading="lazy" src="{m['preview']}" alt="Slide preview"><div><small>{html.escape(m['audience'])}</small><h2>{m['name']}</h2><p>{m['slide_count']} slides · {m['palette']} · {m['typography']}</p><a href="{m['file']}" download>Download PowerPoint</a></div></article>""")
    def options(key):return ''.join('<option>'+html.escape(x)+'</option>' for x in sorted(set(m[key] for m in manifest)))
    (out/'index.html').write_text("""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PowerPoint template catalog</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f2ec;color:#1f302e;font:16px/1.45 Arial,sans-serif}main{max-width:1280px;padding:4vh 4vw;margin:auto}h1{font:clamp(40px,6vw,76px)/1.09 Georgia,serif;margin:.3em 0}header{max-width:790px}label{display:inline-block;margin:12px 14px 18px 0}select{padding:8px;background:white}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,315px),1fr));gap:20px}article{background:white;border:1px solid #d5d6cc}article img{width:100%;display:block;aspect-ratio:16/9}article div{padding:16px 18px 20px}h2{font:28px Georgia,serif;margin:6px 0}p{margin:.4em 0 1em}a{color:#14584b;font-weight:bold}article[hidden]{display:none}</style><main><header><h1>PowerPoint template catalog</h1><p>Browse editable decks by audience and visual style. Each preview shows one slide from the downloadable file.</p></header><label>Deck sequence <select id="recipe"><option value="">All sequences</option>"""+options('recipe')+"""</select></label><label>Design system <select id="system"><option value="">All styles</option>"""+options('system')+"""</select></label><span id="count" aria-live="polite"></span><section>"""+''.join(cards)+"""</section></main><script>const filters=['recipe','system'].map(k=>document.getElementById(k));function apply(){let count=0;document.querySelectorAll('article').forEach(card=>{card.hidden=filters.some(s=>s.value && card.dataset[s.id]!==s.value);if(!card.hidden)count++});document.getElementById('count').textContent=count+' decks'}filters.forEach(s=>s.onchange=apply);apply()</script></html>""")
    print(len(manifest),'ready-made decks')
if __name__=='__main__':build()
