"""Operator commands run on the server, outside the public API."""
import argparse
import json
import time
from pathlib import Path
from ranking import train
from providers import google_fonts, jsoncall, safe_url
from store import init, connection, contrast
from pydantic import BaseModel, Field, model_validator

class Pack(BaseModel):
    id: str=Field(pattern='^[a-z][a-z0-9_-]{1,60}$')
    audience: str=Field(min_length=3,max_length=200)
    tags: str=Field(min_length=3,max_length=600)
    layouts: list[str]=Field(min_length=2,max_length=70)
    palette: str
    type_style: str
    creator: str=Field(min_length=2,max_length=180)
    rights_record: str=Field(min_length=3,max_length=500)
    commercial_output_allowed: bool
    @model_validator(mode='after')
    def permission(self):
        if not self.commercial_output_allowed:raise ValueError('Only import packs approved for generated commercial output.')
        return self
class Palette(BaseModel):
    id:str=Field(min_length=2,max_length=100)
    background:str=Field(pattern='^#[A-Fa-f0-9]{6}$')
    text:str=Field(pattern='^#[A-Fa-f0-9]{6}$')
    accent:str=Field(pattern='^#[A-Fa-f0-9]{6}$')
    secondary:str=Field(pattern='^#[A-Fa-f0-9]{6}$')
    rights_record:str=Field(min_length=3,max_length=500)
    commercial_output_allowed:bool
class Layout(BaseModel):
    id:str=Field(pattern='^[a-z][a-z0-9_-]{1,60}$')
    purpose:str=Field(min_length=2,max_length=180)
    inputs:list[str]=Field(min_length=1,max_length=16)
    body_rects:list[tuple[float,float,float,float]]
    title_rect:tuple[float,float,float,float]
    source_rect:tuple[float,float,float,float]
    evidence_requirement:str=Field(min_length=2,max_length=400)
    rights_record:str=Field(min_length=3,max_length=500)
    commercial_output_allowed:bool
    @model_validator(mode='after')
    def validate_slots(self):
        if not self.commercial_output_allowed or len(self.inputs)!=len(self.body_rects):
            raise ValueError('Each input needs one body rectangle and approved rights.')
        for x,y,w,h in [*self.body_rects,self.title_rect,self.source_rect]:
            if not (0<=x<1 and 0<=y<1 and w>0 and h>0 and x+w<=1.000001 and y+h<=1.000001):
                raise ValueError('Place all zones inside the slide.')
        return self

class Typography(BaseModel):
    id:str=Field(min_length=2,max_length=80)
    title_font:str=Field(min_length=1,max_length=100)
    body_font:str=Field(min_length=1,max_length=100)
    fallback:str=Field(min_length=1,max_length=100)
    title_pt:int=Field(ge=16,le=120)
    body_pt:int=Field(ge=12,le=80)
    source_pt:int=Field(ge=8,le=50)
    rights_record:str=Field(min_length=3,max_length=500)
    commercial_output_allowed:bool
def sync_fonts(db):
    fonts=google_fonts();incoming=[]
    for f in fonts:
        if not isinstance(f.get('family'),str) or not f.get('subsets') or not f.get('variants'):continue
        incoming.append((f['family'],f.get('category'),json.dumps(f['subsets']),json.dumps(f['variants']),f.get('version'),'Google Fonts',time.time()))
    if not incoming:raise ValueError('No usable font families returned')
    db.execute("DELETE FROM fonts WHERE provider='Google Fonts'")
    db.executemany('INSERT OR REPLACE INTO fonts VALUES(?,?,?,?,?,?,?)',incoming)
    return {'synced_font_families':len(incoming)}
def sync_themes(db):
    url='https://api.github.com/repos/slidevjs/themes/contents/packages'
    listing=jsoncall('GET',url,headers={'Accept':'application/vnd.github+json','User-Agent':'PPTGenerator-Catalog'})
    if not isinstance(listing,list):raise ValueError('Unexpected theme directory')
    items=[(a['name'],a['html_url'],a['sha'],'Slidev theme code; review assets, license and PPTX adaptation') for a in listing if a.get('type')=='dir' and safe_url(a.get('html_url'))]
    if not items:raise ValueError('Theme directory is empty')
    db.execute('DELETE FROM theme_leads')
    db.executemany('INSERT INTO theme_leads VALUES(?,?,?,?)',items)
    return {'theme_candidates':len(items)}
def main():
    p=argparse.ArgumentParser()
    p.add_argument('action',choices=['init','sync-fonts','sync-theme-leads','train','import-pack','import-palette','import-layout','import-typography'])
    p.add_argument('file',nargs='?')
    args=p.parse_args()
    if args.action=='init':
        init();print('Catalog ready.');return
    with connection() as db:
        if args.action=='sync-fonts':result=sync_fonts(db)
        elif args.action=='sync-theme-leads':result=sync_themes(db)
        elif args.action=='train':result=train(db)
        else:
            if not args.file:p.error('Provide a JSON file')
            data=Path(args.file).read_text()
            if args.action=='import-layout':
                item=Layout.model_validate_json(data)
                geo='designer-'+item.id
                db.execute('INSERT INTO geometry VALUES(?,?,?,?,?)',(geo,'16:9 normalized coordinates [x,y,width,height]',json.dumps(item.body_rects),json.dumps(item.title_rect),json.dumps(item.source_rect)))
                db.execute('INSERT INTO layouts VALUES(?,?,?,?,?)',(item.id,item.purpose,geo,json.dumps(item.inputs),item.evidence_requirement))
                db.execute('INSERT INTO asset_rights VALUES(?,?,?)',('layout',item.id,item.rights_record))
                result={'added_layout':item.id}
            elif args.action=='import-typography':
                item=Typography.model_validate_json(data)
                if not item.commercial_output_allowed:raise ValueError('Approved output rights required.')
                db.execute('INSERT INTO type_styles VALUES(?,?,?,?,?,?,?)',(item.id,item.title_font,item.body_font,item.fallback,item.title_pt,item.body_pt,item.source_pt))
                db.execute('INSERT INTO asset_rights VALUES(?,?,?)',('typography',item.id,item.rights_record))
                result={'added_type_style':item.id}
            elif args.action=='import-palette':
                pal=Palette.model_validate_json(data)
                ratios=[contrast(pal.background,color) for color in [pal.text,pal.accent,pal.secondary]]
                if not pal.commercial_output_allowed or min(ratios)<4.5:raise ValueError('This palette needs approved rights and sufficient text contrast.')
                db.execute('INSERT INTO palettes VALUES(?,?,?,?,?,?,?,?)',(pal.id,pal.background,pal.text,pal.accent,pal.secondary,*ratios))
                db.execute('INSERT INTO palette_origins VALUES(?,?)',(pal.id,pal.rights_record))
                result={'added_palette':pal.id}
            else:
                obj=Pack.model_validate_json(data)
                origin=f'{obj.creator} | {obj.rights_record}'
                db.execute('INSERT INTO deck_recipes VALUES(?,?,?,?,NULL,?)',(obj.id,obj.audience,obj.palette,obj.type_style,origin))
                db.execute('INSERT INTO pack_tags VALUES(?,?,?)',(obj.id,obj.tags,origin))
                db.executemany('INSERT INTO recipe_slides VALUES(?,?,?)',[(obj.id,i,l) for i,l in enumerate(obj.layouts,1)])
                result={'added_pack':obj.id}
    print(json.dumps(result,indent=2))
if __name__=='__main__':main()
