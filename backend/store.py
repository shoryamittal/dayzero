"""A fresh runtime database starts from a read-only catalog snapshot."""
import colorsys
import hashlib
import json
import os
import re
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DDL = """
CREATE TABLE IF NOT EXISTS workspace_templates(workspace TEXT, template_id TEXT, recipe_id TEXT REFERENCES deck_recipes(id), palette_id TEXT REFERENCES palettes(id), style_id TEXT REFERENCES type_styles(id), updated_at INTEGER NOT NULL, PRIMARY KEY(workspace,template_id));
CREATE TABLE IF NOT EXISTS theme_leads(name TEXT PRIMARY KEY, source_url TEXT, tree_sha TEXT, intake_status TEXT);
CREATE TABLE IF NOT EXISTS identity_cache(query TEXT PRIMARY KEY, checked REAL, payload TEXT);
CREATE TABLE IF NOT EXISTS editions(
 id TEXT PRIMARY KEY, name TEXT NOT NULL, organizer TEXT NOT NULL, year INTEGER NOT NULL,
 round TEXT NOT NULL, domain TEXT, seed_rule_id TEXT, seed_competition TEXT, seed_track TEXT);
CREATE TABLE IF NOT EXISTS evidence_history(
 id TEXT PRIMARY KEY, edition_id TEXT NOT NULL REFERENCES editions(id), kind TEXT NOT NULL, source TEXT NOT NULL,
 payload TEXT NOT NULL, first_seen REAL NOT NULL, last_seen REAL NOT NULL);
CREATE TABLE IF NOT EXISTS snapshots(
 edition_id TEXT PRIMARY KEY REFERENCES editions(id), checked REAL NOT NULL, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS leases(edition_id TEXT PRIMARY KEY, owner TEXT NOT NULL, expires REAL NOT NULL);
CREATE TABLE IF NOT EXISTS fonts(family TEXT PRIMARY KEY, category TEXT, subsets TEXT, variants TEXT, version TEXT, provider TEXT, synced REAL);
CREATE TABLE IF NOT EXISTS impressions(id TEXT PRIMARY KEY, tenant TEXT NOT NULL, edition_id TEXT NOT NULL REFERENCES editions(id),
 created REAL NOT NULL, options TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS preferences(impression_id TEXT PRIMARY KEY REFERENCES impressions(id), chosen TEXT NOT NULL, recorded REAL NOT NULL);
CREATE TABLE IF NOT EXISTS model(id INTEGER PRIMARY KEY CHECK(id=1), weights TEXT, trained REAL, training_groups INTEGER, validation_groups INTEGER, metrics TEXT);
CREATE TABLE IF NOT EXISTS pack_tags(recipe_id TEXT PRIMARY KEY REFERENCES deck_recipes(id), tags TEXT NOT NULL, provenance TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS asset_rights(kind TEXT, asset_id TEXT, rights_record TEXT, PRIMARY KEY(kind,asset_id));
CREATE TABLE IF NOT EXISTS palette_origins(id TEXT PRIMARY KEY REFERENCES palettes(id), origin TEXT NOT NULL);
"""
def norm(value):
    return ' '.join(re.findall(r'[^\W_]+',value.casefold()))
def key(*values):
    return hashlib.sha256(json.dumps(values,ensure_ascii=False).encode()).hexdigest()[:32]
def luminance(h):
    v=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    return sum(w*(n/12.92 if n<=.04045 else ((n+.055)/1.055)**2.4) for w,n in zip((.2126,.7152,.0722),v))
def contrast(a,b):
    lo,hi=sorted((luminance(a),luminance(b)))
    return (hi+.05)/(lo+.05)
def dbpath():
    return Path(os.getenv('PPT_DB',ROOT/'runtime.sqlite'))
@contextmanager
def connection():
    db=sqlite3.connect(dbpath(),timeout=20)
    db.row_factory=sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    try:
        with db: yield db
    finally: db.close()
def init():
    # The install command runs before starting workers.
    p=dbpath()
    if p.resolve()==(ROOT/'catalog.sqlite').resolve():
        raise ValueError('Choose a separate runtime database')
    with connection() as db:
        if not db.execute("SELECT 1 FROM sqlite_master WHERE name='reference_decks'").fetchone():
            with sqlite3.connect(f'file:{ROOT}/catalog.sqlite?mode=ro',uri=True) as seed: seed.backup(db)
        db.execute('PRAGMA journal_mode=WAL')
        db.executescript(DDL)
        from job_schema import JOB_SCHEMA
        db.executescript(JOB_SCHEMA)
        from catalog_plus import initialize
        initialize(db)
        db.execute('INSERT OR IGNORE INTO palette_origins SELECT id, ? FROM palettes',('Original starter',))
        for name,hue in [('Sapphire',218),('Lagoon',186),('Fern',142),('Copper',21),('Iris',265),('Berry',325),('Ochre',44),('Olive',79)]:
            for mood,light in [('Paper',True),('Night',False)]:
                def tint(s,l):
                    rgb=colorsys.hls_to_rgb(hue/360,l,s)
                    return '#'+''.join(f'{round(c*255):02X}' for c in rgb)
                bg,fg,accent,secondary=[tint(s,l) for s,l in ([(.22,.975),(.27,.13),(.54,.27),(.19,.32)] if light else [(.25,.11),(.15,.95),(.58,.73),(.19,.74)])]
                ratios=[contrast(bg,c) for c in (fg,accent,secondary)]
                if min(ratios)<4.5: continue
                label=f'{name} {mood}'
                db.execute('INSERT OR IGNORE INTO palettes VALUES(?,?,?,?,?,?,?,?)',(label,bg,fg,accent,secondary,*map(lambda n:round(n,3),ratios)))
                db.execute('INSERT OR IGNORE INTO palette_origins VALUES(?,?)',(label,'Original HSL roles, checked against background'))
        new=[
          ('policy','Public policy jury','Atlantic','Briefing','diagnosis customer options recommend roadmap metrics risk','public policy government governance public services implementation'),
          ('impact','Social impact panel','Conifer','Editorial','cover customer diagnosis recommend test metrics roadmap ask','social impact sustainability climate community environment SDG'),
          ('science','Scientific research judges','Glacier','Technical','cover diagnosis architecture test analysis risk sources','science academic research experimental method hypothesis study'),
          ('marketing','Marketing and brand jury','Cherry','Stage','cover customer diagnosis competition recommend roadmap metrics','marketing FMCG brand consumer campaign growth'),
          ('product','Product management panel','Deep teal','Technical','cover customer diagnosis demo competition metrics roadmap','product management user experience design feature adoption'),
          ('operations','Operations case jury','Linen','Briefing','decision diagnosis trend options economics roadmap risk','operations supply chain logistics manufacturing capacity efficiency')]
        for k,a,p,t,order,tags in new:
            db.execute('INSERT OR IGNORE INTO deck_recipes VALUES (?,?,?,?,NULL,?)',(k,a,p,t,'Original v2 sequence'))
            db.executemany('INSERT OR IGNORE INTO recipe_slides VALUES(?,?,?)',[(k,i,l) for i,l in enumerate(order.split(),1)])
            db.execute('INSERT OR IGNORE INTO pack_tags VALUES(?,?,?)',(k,tags,'Original v2'))
        for k,tags in {'short-case':'business case diagnosis three slides concise feasibility','strategy':'business case strategy consulting competitive analysis implementation','venture':'startup pitch founder venture entrepreneurship traction funding business plan','equity':'finance equity CFA investment research valuation stock financial analysis','prototype':'hackathon engineering software innovation hack prototype demo technology','viva':'academic viva student university project defense dissertation'}.items():
            db.execute('INSERT OR IGNORE INTO pack_tags VALUES(?,?,?)',(k,tags,'Original starter'))
        from extended_recipes import install
        install(db)
def rows(db,sql,args=()):
    return [dict(r) for r in db.execute(sql,args)]
