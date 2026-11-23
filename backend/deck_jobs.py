"""Local competition-to-deck orchestration. SQLite commits each state transition."""
import hashlib
import json
import math
import time
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException, Response
from pydantic import BaseModel, Field, StringConstraints, model_validator
from typing_extensions import Annotated
from sklearn.feature_extraction.text import TfidfVectorizer

from catalog_api import Slide, attach_design
from designs import family_data
from ranking import constraints, rank
from research import combined, get_snapshot, resolve
from store import connection

router=APIRouter(prefix='/decks',tags=['Offline deck generation'])
Name=Annotated[str,StringConstraints(strip_whitespace=True,min_length=1,max_length=160)]
Workspace=Annotated[str,Header(alias='X-Workspace',min_length=1,max_length=128)]
class Competition(BaseModel):
    name:Name
    organizer:Name
    year:int=Field(ge=1990,le=2100)
    round:Name
class SuppliedRule(BaseModel):
    kind:Literal['exact_slides','min_slides','max_slides','required_template','exclusions','ai_policy','criteria','required_sections','design_requirement','format','duration','anonymity']
    value:Annotated[str,StringConstraints(strip_whitespace=True,min_length=1,max_length=900)]
    source:Annotated[str,StringConstraints(strip_whitespace=True,min_length=1,max_length=500)]
    @model_validator(mode='after')
    def validate_rule(self):
        if self.kind in ('exact_slides','min_slides','max_slides') and (not self.value.isascii() or not self.value.isdigit() or not 1<=int(self.value)<=500):
            raise ValueError('Provide an integer slide count between 1 and 500.')
        if self.kind=='required_template' and self.value not in ('yes','no'):
            raise ValueError('Use yes or no for a mandatory template.')
        if self.kind=='ai_policy' and self.value not in ('prohibited','restricted','permitted','unspecified'):
            raise ValueError('Choose a supported AI policy.')
        return self
class LocalBrief(BaseModel):
    competition:Competition
    topic:Name
    audience:Name
    supplied_rules:list[SuppliedRule]=Field(default_factory=list,max_length=40)
    notes:list[Annotated[str,StringConstraints(strip_whitespace=True,min_length=1,max_length=900)]]=Field(default_factory=list,max_length=100)
    palette_preference:str=Field('',max_length=80)
    font_preference:str=Field('',max_length=100)
    required_script:str=Field('',max_length=40)
    available_fonts:list[Name]=Field(default_factory=list,max_length=120)
class Edit(BaseModel):
    revision:int=Field(ge=1)
    option_id:str=Field(min_length=1,max_length=100)
    slides:list[Slide]|None=Field(None,min_length=1,max_length=70)
class Revision(BaseModel):
    revision:int=Field(ge=1)
def encode(data):
    return json.dumps(data,sort_keys=True,ensure_ascii=False,separators=(',',':'))
def job(db,id,workspace):
    row=db.execute('SELECT * FROM deck_jobs WHERE id=? AND workspace=?',(id,workspace)).fetchone()
    if row is None:raise HTTPException(404,'Deck job not found.')
    return row
def local_profile(db,e,supplied=()):
    profile=combined(e,'local_snapshot',get_snapshot(db,e['id']))
    profile['rules'].extend(dict(r,status='user_supplied') for r in supplied)
    return profile
def option_for(j,option_id):
    option=next((opt for opt in json.loads(j['options']) if opt['id']==option_id),None)
    if not option:raise HTTPException(422,'Choose a design returned for this job.')
    return option
def state(j):
    profile=json.loads(j['profile'])
    return dict(id=j['id'],revision=j['revision'],status=j['status'],reason=j['reason'],
                profile=profile,competition_rules_status='partial' if profile['rules'] else 'unknown',
                topic=json.loads(j['brief'])['topic'],options=json.loads(j['options']),selected=j['selected'],
                slides=json.loads(j['slides']) if j['slides'] else None,
                checks=json.loads(j['qa']) if j['qa'] else None,attempts=j['attempts'],
                external_api_cost_usd=0,
                downloads={ext:f"/decks/{j['id']}/files/{ext}" for ext in ('pptx','pdf','article')} if j['status']=='ready' else {})
@router.post('',status_code=201)
def create(value:LocalBrief,x_workspace:Workspace,idempotency_key:Annotated[str|None,Header(max_length=160)]=None):
    brief=encode(value.model_dump());fingerprint=hashlib.sha256(brief.encode()).hexdigest()
    e=resolve(value.competition.name,value.competition.organizer,value.competition.year,value.competition.round)
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        if idempotency_key:
            prior=db.execute('SELECT * FROM deck_jobs WHERE workspace=? AND request_key=?',(x_workspace,idempotency_key)).fetchone()
            if prior:
                if prior['request_hash']!=fingerprint:raise HTTPException(409,'This request key already belongs to another brief.')
                return state(prior)
        profile=local_profile(db,e,[r.model_dump() for r in value.supplied_rules])
        ranked=rank(db,e,value,rules_override=profile['rules'])
        options=ranked['options']
        for i,opt in enumerate(options):
            opt.pop('features',None);attach_design(opt,i)
        status='choose_design' if options else 'blocked'
        jid=uuid4().hex;now=time.time()
        db.execute('INSERT INTO deck_jobs(id,workspace,request_key,request_hash,edition_id,brief,profile,options,status,reason,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
                   (jid,x_workspace,idempotency_key or None,fingerprint,e['id'],brief,encode(profile),encode(options),status,None if options else ranked['status'],now,now))
        return state(job(db,jid,x_workspace))
@router.get('/{jid}')
def read_job(jid:str,x_workspace:Workspace):
    with connection() as db:return state(job(db,jid,x_workspace))

def arrange_notes(layouts,notes):
    """Copy original notes into matching slots. Empty slots remain editable."""
    slots=[(i,label) for i,l in enumerate(layouts) for label in json.loads(l['inputs_json'])]
    assigned={}
    if notes:
        queries=[layouts[i]['purpose']+' '+label for i,label in slots]
        matrix=TfidfVectorizer(analyzer='char_wb',ngram_range=(2,4)).fit_transform(queries+notes)
        scores=(matrix[:len(slots)]@matrix[len(slots):].T).toarray()
        used=set()
        for score,slot,n in sorted(((-scores[s,n],s,n) for s in range(len(slots)) for n in range(len(notes)))):
            if slot not in assigned and n not in used:
                assigned[slot]=notes[n];used.add(n)
    slides=[];offset=0
    for l in layouts:
        labels=json.loads(l['inputs_json'])
        slides.append(dict(title=l['purpose'],section=l['id'].title(),source='User-supplied brief',
                           blocks=[dict(label=label,text=assigned.get(offset+i,'')) for i,label in enumerate(labels)]))
        offset+=len(labels)
    return slides

def validate_content(db,option,slides,complete):
    layouts=family_data(db,option['template'])
    if [l['id'] for l in layouts]!=option['slides']:raise ValueError('The catalog sequence changed. Create a fresh job.')
    if len(layouts)!=len(slides):raise ValueError('Slide count differs from the approved sequence.')
    for i,(layout,s) in enumerate(zip(layouts,slides),1):
        if len(s['blocks'])!=len(json.loads(layout['inputs_json'])):raise ValueError(f'Slide {i} has an incorrect number of content blocks.')
        if complete and not s['title'].strip():raise ValueError(f'Slide {i} needs a title.')
        for b in s['blocks']:
            if b.get('pexels_id'):raise ValueError('Choose a local icon, chart, table or text while providers are offline.')
            if b.get('icon') and not db.execute('SELECT 1 FROM icon_index WHERE id=?',(b['icon'],)).fetchone():raise ValueError(f'Unknown icon on slide {i}.')
            if 'chart' in b and any(not math.isfinite(v) for series in b['chart']['series'].values() for v in series):raise ValueError('Chart values must be finite.')
            if complete and not (b.get('text','').strip() or b.get('icon') or b.get('chart') or b.get('table')):
                raise ValueError(f'Slide {i} needs content for every slot.')
def check_revision(j,r):
    if j['revision']!=r:raise HTTPException(409,'This draft changed. Read its latest revision.')
@router.put('/{jid}/draft')
def edit(jid:str,value:Edit,x_workspace:Workspace):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        j=job(db,jid,x_workspace);check_revision(j,value.revision)
        if j['status'] in ('blocked','queued','rendering'):raise HTTPException(409,'The current state does not allow edits.')
        opt=option_for(j,value.option_id)
        if value.slides is not None:slides=[s.model_dump(exclude_none=True) for s in value.slides]
        elif j['slides'] and option_for(j,j['selected'])['slides']==opt['slides']:slides=json.loads(j['slides'])
        else:slides=arrange_notes(family_data(db,opt['template']),json.loads(j['brief'])['notes'])
        try:validate_content(db,opt,slides,False)
        except ValueError as e:raise HTTPException(422,str(e))
        db.execute("UPDATE deck_jobs SET status='review',revision=revision+1,slides=?,selected=?,qa=NULL,reason=NULL,attempts=0,updated=? WHERE id=?",(encode(slides),opt['id'],time.time(),jid))
        db.execute('DELETE FROM deck_files WHERE job_id=?',(jid,))
        return state(job(db,jid,x_workspace))
def check_rules(db,j,option):
    e=dict(db.execute('SELECT * FROM editions WHERE id=?',(j['edition_id'],)).fetchone())
    frozen=json.loads(j['profile'])['rules']; latest=local_profile(db,e,json.loads(j['brief']).get('supplied_rules',[]))['rules']
    for claims in (frozen,latest):
        reason,lo,hi=constraints(claims)
        if reason:raise ValueError(reason)
        excluded=any(r['kind']=='exclusions' and ('intro' in r['value'].lower() or 'cover' in r['value'].lower()) for r in claims)
        cnt=sum(1 for layout in option['slides'] if not(excluded and layout=='cover'))
        if not lo<=cnt<=hi:raise ValueError('The design exceeds the current slide-count rule.')
    def meaning(claims):return sorted((x['kind'],x['value']) for x in claims)
    if meaning(latest)!=meaning(frozen):raise ValueError('Competition rules changed after review. Create a fresh job.')
@router.post('/{jid}/generate',status_code=202)
def generate(jid:str,value:Revision,x_workspace:Workspace):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        j=job(db,jid,x_workspace);check_revision(j,value.revision)
        if j['status'] in ('queued','rendering','ready'):return state(j)
        if j['status'] not in ('review','failed'):raise HTTPException(409,'Select and review a draft first.')
        opt=option_for(j,j['selected'])
        try:
            check_rules(db,j,opt);validate_content(db,opt,json.loads(j['slides']),True)
        except ValueError as e:raise HTTPException(422,str(e))
        db.execute("UPDATE deck_jobs SET status='queued',reason=NULL,qa=NULL,attempts=0,updated=? WHERE id=?",(time.time(),jid))
        return state(job(db,jid,x_workspace))
@router.get('/{jid}/files/{kind}')
def download(jid:str,kind:Literal['pptx','pdf','article'],x_workspace:Workspace):
    with connection() as db:
        j=job(db,jid,x_workspace)
        if j['status']!='ready':raise HTTPException(409,'The reviewed export is not ready.')
        data=db.execute(f'SELECT {kind} FROM deck_files WHERE job_id=? AND revision=?',(jid,j['revision'])).fetchone()
        if data is None:raise HTTPException(409,'The requested revision is unavailable.')
    ext,mime={'pptx':('pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation'),'pdf':('pdf','application/pdf'),'article':('html','text/html')}[kind]
    return Response(data[0],media_type=mime,headers={'Content-Disposition':f'attachment; filename="deck-{jid}.{ext}"','Cache-Control':'private, no-store'})
