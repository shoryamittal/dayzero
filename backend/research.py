import json
import time
import uuid
from providers import discover, LookupFailure
from store import connection, key, norm, rows

# Aliases apply only when organizer and round are compatible.
series=[
 ('Case Buster 2.0','IETE SPIT',['Case Buster 2.0 at SPIT'],['Round 1','elimination round'],'Round 1',None,'CB26R1',None),
 ('Smart India Hackathon','DSCE',['SIH','Smart India Hackathon at DSCE'],['campus internal round','internal round'],'Campus internal round','sih.dsce.in','SIH26DSCE',None),
 ('CFA Institute Research Challenge','CFA Institute',['CFA Research Challenge'],['global final','global finals'],'Global final','cfainstitute.org',None,'CFA Institute Research Challenge'),
 ('CBS Case Competition','CBS Case Competition',[],['invitational'],'Invitational','casecompetition.com',None,'CBS Case Competition'),
 ('CBS Case Competition','CBS Case Competition',[],['global'],'GLOBAL','casecompetition.com',None,'CBS Case Competition')]
def resolve(name,org,year,stage,competition_track=""):
    name,org,stage=[x.strip() for x in (name,org,stage)]
    competition_track=competition_track.strip()
    domain=rule=comp=track=None
    for title,host,aliases,stages,round_name,site,rule_id,ref in series:
        if norm(name) not in map(norm,[title,*aliases]) or norm(stage) not in map(norm,stages):continue
        if org and norm(org)!=norm(host):continue
        # A campus internal round needs an explicit campus identity.
        if host=='DSCE' and not org and 'dsce' not in norm(name).split():continue
        name,org,stage,domain=title,host,round_name,site
        rule=rule_id if year==2026 else None
        comp,track=ref,round_name if ref else None
        break
    eid=key(norm(name),norm(org),year,norm(stage),norm(competition_track)) if competition_track else key(norm(name),norm(org),year,norm(stage))
    with connection() as db:
        # An unrecognized track must not inherit another track's rules or references.
        supported={'Case Buster 2.0':{''},'Smart India Hackathon':{''},'CFA Institute Research Challenge':{''},'CBS Case Competition':{'',stage}}
        if norm(competition_track) not in {norm(value) for value in supported.get(name,{''})}:
            rule=comp=track=None
        db.execute('INSERT OR IGNORE INTO editions(id,name,organizer,year,round,domain,seed_rule_id,seed_competition,seed_track,competition_track) VALUES(?,?,?,?,?,?,?,?,?,?)',(eid,name,org,year,stage,domain,rule,comp,track,competition_track))
        return dict(db.execute('SELECT * FROM editions WHERE id=?',(eid,)).fetchone())
def seed(e):
    claims=[]
    def add(kind,v,source,year,**extra):
        claims.append(dict(kind=kind,value=str(v),source=source,event=e['name'],organizer=e['organizer'],year=year,round=e['round'],deck_url=None,media=None,status='curated_snapshot')|extra)
    with connection() as db:
        for rule in rows(db,'SELECT * FROM round_rules WHERE id=?',(e['seed_rule_id'],)):
            for field,kind in [('exact_content_slides','exact_slides'),('exclusions','exclusions'),('judging_criteria','criteria'),('required_template','required_template')]:
                if rule[field] is not None:add(kind,('yes' if rule[field] else 'no') if kind=='required_template' else rule[field],rule['source'],rule['edition'])
        for r in rows(db,'SELECT * FROM reference_decks WHERE competition=? AND track=? AND placement=1 AND edition<=? ORDER BY edition DESC',(e['seed_competition'],e['seed_track'],e['year'])):
            add('winner',r['case_or_team'],r['result_source'],r['edition'],deck_url=r['presentation_pdf'],media='slides',file_check=r['file_check'],label_type='case' if r['id'].startswith('CBS') else 'team')
    return claims
def combined(e,status,snap=None,error=None):
    items=seed(e)+(json.loads(snap['payload']) if snap else [])
    seen=set(); unique=[]
    for it in items:
        ident=(it['kind'],it['value'],it['source'],it['year'],it.get('deck_url'))
        if ident not in seen:unique.append(it);seen.add(ident)
    winners=[dict(i,edition_match='requested_edition' if i['year']==e['year'] else 'prior_edition') for i in unique if i['kind']=='winner']
    return {'edition':{k:e[k] for k in ('id','name','organizer','year','round','competition_track')},'lookup_status':status,'checked_at_unix':snap['checked'] if snap else None,'rules':[i for i in unique if i['kind']!='winner'],'winner_references':winners,'provider_message':error}
def get_snapshot(db,eid):
    return db.execute('SELECT * FROM snapshots WHERE edition_id=?',(eid,)).fetchone()
def lookup(e):
    now=time.time()
    owner=uuid.uuid4().hex
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        snap=get_snapshot(db,e['id'])
        if snap and now-snap['checked']<(86400 if json.loads(snap['payload']) else 1800):
            return combined(e,'cached',snap)
        db.execute('DELETE FROM leases WHERE expires<=?',(now,))
        acquired=db.execute('INSERT OR IGNORE INTO leases VALUES(?,?,?)',(e['id'],owner,now+180)).rowcount
    if not acquired:return combined(e,'refresh_in_progress',snap)
    try:
        evidence=discover(e)
        with connection() as db:
            db.execute('BEGIN IMMEDIATE')
            current=db.execute('SELECT owner FROM leases WHERE edition_id=?',(e['id'],)).fetchone()
            if current and current[0]==owner:
                checked=time.time()
                db.execute('INSERT OR REPLACE INTO snapshots VALUES(?,?,?)',(e['id'],checked,json.dumps(evidence)))
                for claim in evidence:
                    payload=json.dumps(claim,sort_keys=True,ensure_ascii=False)
                    db.execute('INSERT INTO evidence_history VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen',
                               (key(e['id'],payload),e['id'],claim['kind'],claim['source'],payload,checked,checked))
            fresh=get_snapshot(db,e['id'])
        return combined(e,'searched' if evidence else 'no_matching_public_evidence',fresh)
    except LookupFailure as err:return combined(e,'stale' if snap else 'offline',snap,str(err))
    finally:
        with connection() as db:db.execute('DELETE FROM leases WHERE edition_id=? AND owner=?',(e['id'],owner))
