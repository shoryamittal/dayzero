"""Integration API. Run behind the website's authenticated backend."""
import json
import sqlite3
import os
import secrets
import time
from uuid import uuid4
from fastapi import Depends, FastAPI, Header, HTTPException, Response
from pydantic import BaseModel, Field, field_validator
from providers import canva, canva_template, identify, LookupFailure
from ranking import rank
from research import resolve, lookup, series
from store import connection, norm, rows, key

def backend(authorization: str=Header(default='')):
    token=os.getenv('PPT_BACKEND_TOKEN','')
    if not token or not secrets.compare_digest(authorization.encode(),('Bearer '+token).encode()):
        raise HTTPException(401,'A server-side service token is required.')
def tenant(x_workspace: str=Header(min_length=1,max_length=128)):
    return x_workspace

app=FastAPI(title='PPTGenerator catalog and matching',version='4.0',dependencies=[Depends(backend)])
class Select(BaseModel):
    name: str=Field(min_length=2,max_length=160)
    year: int|None=Field(default=None,ge=1990,le=2100)
class Edition(Select):
    organizer: str=Field(min_length=1,max_length=160)
    year: int=Field(ge=1990,le=2100)
    round: str=Field(min_length=1,max_length=160)
    @field_validator('name','organizer','round')
    @classmethod
    def nonblank(cls,v):
        if not norm(v):raise ValueError('Use a name with letters or digits')
        return v.strip()
class Brief(BaseModel):
    edition_id: str=Field(min_length=32,max_length=32)
    audience: str=Field(default='',max_length=300)
    topic: str=Field(default='',max_length=1200)
    palette_preference: str=Field(default='',max_length=80)
    font_preference: str=Field(default='',max_length=100)
    canva_template_ids: list[str]=Field(default_factory=list,max_length=5)
    required_script: str=Field(default='',max_length=40)
    available_fonts: list[str]=Field(default_factory=list,max_length=120)
class Choice(BaseModel):
    impression_id: str=Field(max_length=40)
    option_id: str=Field(max_length=64)
@app.post('/competitions/select')
def select(value:Select):
    """The picker sends a name; unambiguous selections proceed to research."""
    if not norm(value.name):raise HTTPException(422,'Enter a competition name.')
    cachekey=key(norm(value.name),value.year)
    with connection() as db:
        cached=db.execute('SELECT * FROM identity_cache WHERE query=?',(cachekey,)).fetchone()
    try:
        if cached and time.time()-cached['checked'] < (86400 if json.loads(cached['payload']) else 1800):
            found=json.loads(cached['payload'])
        else:
            found=identify(value.name,value.year)
            with connection() as db:
                db.execute('INSERT OR REPLACE INTO identity_cache VALUES(?,?,?)',(cachekey,time.time(),json.dumps(found)))
    except LookupFailure as ex:
        # These are explicitly dated examples; never label a cached year as current.
        found=[]
        with connection() as db:
            for title,org,aliases,_,stage,_,rule,comp in series:
                if norm(value.name) not in map(norm,[title,*aliases]):continue
                if rule:
                    rr=rows(db,'SELECT edition AS year,source FROM round_rules WHERE id=?',(rule,))
                else:
                    rr=rows(db,'SELECT max(edition) AS year,result_source AS source FROM reference_decks WHERE competition=? AND track=? AND (? IS NULL OR edition=?) GROUP BY result_source',(comp,stage,value.year,value.year))
                found.extend(dict(name=title,organizer=org,round=stage,**r) for r in rr if r['year'] and (not value.year or r['year']==value.year))
        return {'status':'select_cached_edition' if found else 'need_event_details','matches':found,'message':str(ex)}
    if len(found)==1:
        m=found[0]
        return {'status':'resolved','identity_source':m['source'],'profile':lookup(resolve(m['name'],m['organizer'],m['year'],m['round']))}
    return {'status':'choose_edition_and_round' if found else 'need_event_details','matches':found}
@app.post('/competitions/resolve')
def profile(value:Edition):
    return lookup(resolve(value.name,value.organizer,value.year,value.round))
@app.get('/catalog')
def catalog():
    with connection() as db:
        return {k:rows(db,'SELECT * FROM '+k) for k in ('deck_recipes','recipe_slides','layouts','geometry','palettes','type_styles','pack_tags','palette_origins')}
@app.post('/recommendations')
def recommend(value:Brief,workspace:str=Depends(tenant),x_canva_access_token:str|None=Header(default=None,max_length=8192)):
    private=[]
    if value.canva_template_ids and not x_canva_access_token:
        raise HTTPException(422,'A connected Canva account is needed for the selected private templates.')
    for tid in dict.fromkeys(value.canva_template_ids):
        with connection() as db:
            mapping=db.execute('SELECT * FROM workspace_templates WHERE workspace=? AND template_id=?',(workspace,tid)).fetchone()
        if not mapping:continue
        try:meta=canva_template(x_canva_access_token,tid)
        except LookupFailure as ex:raise HTTPException(502,str(ex))
        if meta['updated_at']==mapping['updated_at']:
            private.append(dict(mapping)|{'metadata':meta})
    with connection() as db:
        e=db.execute('SELECT * FROM editions WHERE id=?',(value.edition_id,)).fetchone()
        if not e:raise HTTPException(404,'Resolve this edition first.')
        result=rank(db,dict(e),value,private)
        if result['options']:
            from catalog_api import attach_design
            for n,opt in enumerate(result['options']):
                if opt.get('provider')!='Canva':attach_design(opt,n)
            ident=uuid4().hex
            choices=[{'id':o['id'],'features':o.pop('features')} for o in result['options']]
            db.execute('INSERT INTO impressions VALUES(?,?,?,?,?)',(ident,workspace,value.edition_id,time.time(),json.dumps(choices)))
            result['impression_id']=ident
        return result
@app.post('/preferences')
def feedback(value:Choice,workspace:str=Depends(tenant)):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        r=db.execute('SELECT options FROM impressions WHERE tenant=? AND id=?',(workspace,value.impression_id)).fetchone()
        if not r:raise HTTPException(404,'Unknown impression.')
        ids=[o['id'] for o in json.loads(r[0])]
        if value.option_id not in ids or len(ids)<2:raise HTTPException(422,'Choose between displayed alternatives.')
        earlier=db.execute('SELECT chosen FROM preferences WHERE impression_id=?',(value.impression_id,)).fetchone()
        if earlier and earlier[0]!=value.option_id:raise HTTPException(409,'A preference was already recorded.')
        db.execute('INSERT OR IGNORE INTO preferences VALUES(?,?,?)',(value.impression_id,value.option_id,time.time()))
    return {'saved':True}
@app.get('/integrations/canva/brand-templates')
def private_templates(response:Response,continuation:str|None=None,x_canva_access_token:str=Header(min_length=1,max_length=8192)):
    response.headers['Cache-Control']='private, no-store'
    try:return canva(x_canva_access_token,continuation)
    except LookupFailure as ex:raise HTTPException(502,str(ex))


class Mapping(BaseModel):
    template_id:str=Field(pattern='^[a-zA-Z0-9_-]{1,160}$')
    recipe_id:str=Field(max_length=100)
    palette_id:str=Field(max_length=100)
    style_id:str=Field(max_length=100)
@app.post('/integrations/canva/map-template')
def map_reviewed_template(value:Mapping,workspace:str=Depends(tenant),x_canva_access_token:str=Header(min_length=1,max_length=8192)):
    """Called after the workspace curator reviews the actual design against catalog IDs."""
    try:meta=canva_template(x_canva_access_token,value.template_id)
    except LookupFailure as ex:raise HTTPException(502,str(ex))
    try:
        with connection() as db:
            db.execute('INSERT OR REPLACE INTO workspace_templates VALUES(?,?,?,?,?,?)',(workspace,value.template_id,value.recipe_id,value.palette_id,value.style_id,meta['updated_at']))
    except sqlite3.IntegrityError:raise HTTPException(422,'Use existing recipe, palette and type style IDs.')
    return {'saved':True,'scope':'workspace'}


from catalog_api import router as catalog_router, cost_context
app.middleware('http')(cost_context)
app.include_router(catalog_router)

from deck_jobs import router as jobs_router
app.include_router(jobs_router)
