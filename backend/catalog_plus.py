import json
import re
from itertools import product
from pathlib import Path
import sqlite3
from designs import SYSTEMS

ROOT=Path(__file__).resolve().parent
DDL="""
CREATE TABLE IF NOT EXISTS font_discovery(
 id TEXT PRIMARY KEY, published TEXT NOT NULL, source_url TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS font_details(id TEXT PRIMARY KEY, checked REAL NOT NULL,metadata TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS icon_index(
 id TEXT PRIMARY KEY, codepoint INTEGER NOT NULL, svg_path TEXT NOT NULL, units INTEGER NOT NULL, ascent INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS design_systems(id TEXT PRIMARY KEY,title TEXT NOT NULL,typography TEXT NOT NULL,palette TEXT NOT NULL,description TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS usage_events(request_id TEXT PRIMARY KEY, workspace TEXT NOT NULL,job TEXT NOT NULL,provider TEXT NOT NULL,model TEXT NOT NULL,
 input_tokens INTEGER,cached_tokens INTEGER,output_tokens INTEGER,search_calls INTEGER,estimated_usd REAL,rate_card TEXT NOT NULL,created REAL NOT NULL);
CREATE INDEX IF NOT EXISTS usage_job ON usage_events(workspace,job);
CREATE VIEW IF NOT EXISTS template_variants AS SELECT r.id AS recipe,s.id AS system,p.id AS palette,t.id AS typography
 FROM deck_recipes r CROSS JOIN design_systems s CROSS JOIN palettes p CROSS JOIN type_styles t;
"""
def initialize(db):
    db.executescript(DDL)
    db.executemany('INSERT OR IGNORE INTO design_systems VALUES(?,?,?,?,?)',[(k,*v) for k,v in SYSTEMS.items()])
    # Required when upgrading an existing v2 working database.
    seed=ROOT/'catalog.sqlite'
    if Path(db.execute('PRAGMA database_list').fetchone()[2]).resolve()!=seed.resolve():
        db.execute('ATTACH DATABASE ? AS shipped',(str(seed),))
        for table in ['font_discovery','icon_index']:
            db.execute(f'INSERT OR IGNORE INTO {table} SELECT * FROM shipped.{table}')
def get_style(db,t):
    p=db.execute('SELECT * FROM type_styles WHERE id=?',(t,)).fetchone()
    if p:return dict(p)
    if t.startswith('Google: '):
        r=db.execute('SELECT family FROM fonts WHERE family=?',(t[8:],)).fetchone()
        if r:return dict(id=t,title_font=r[0],body_font=r[0],fallback='Arial',title_pt=34,body_pt=21,source_pt=14)
    raise ValueError('Unknown typography')
def selection(db,recipe,system,palette,style):
    if system not in SYSTEMS:raise ValueError('Unknown design system')
    p=db.execute('SELECT * FROM palettes WHERE id=?',(palette,)).fetchone()
    if not p:raise ValueError('Unknown palette')
    return recipe,system,dict(p),get_style(db,style)
