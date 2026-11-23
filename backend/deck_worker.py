"""Durable local render queue. Run as a process alongside the HTTP service."""
import json
import logging
import time
from uuid import uuid4
from catalog_api import article,Export
from catalog_plus import selection
from deck_jobs import check_rules,encode,option_for,validate_content
from deck_quality import fonts_for,inspect_render,RenderProblem
from designs import render
from store import connection

LEASE_SECONDS=300
MAX_ATTEMPTS=3
def claim():
    now=time.time()
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        db.execute("UPDATE deck_jobs SET status='failed',reason='Worker interrupted repeatedly. Retry the saved revision.',lease_token=NULL,lease_until=NULL WHERE status='rendering' AND lease_until<? AND attempts>=?",(now,MAX_ATTEMPTS))
        j=db.execute("SELECT * FROM deck_jobs WHERE status='queued' OR (status='rendering' AND lease_until<? AND attempts<?) ORDER BY updated LIMIT 1",(now,MAX_ATTEMPTS)).fetchone()
        if j is None:return None
        token=uuid4().hex
        db.execute("UPDATE deck_jobs SET status='rendering',lease_token=?,lease_until=?,attempts=attempts+1,updated=? WHERE id=?",(token,now+LEASE_SECONDS,now,j['id']))
        return dict(j),token
def process_one():
    task=claim()
    if task is None:return False
    j,token=task
    try:
        opt=option_for(j,j['selected']);design=opt['design'];slides=json.loads(j['slides'])
        with connection() as db:
            check_rules(db,j,opt);validate_content(db,opt,slides,True)
            recipe,system,pal,style=selection(db,design['recipe'],design['system'],design['palette'],design['typography'])
            local,substitutions=fonts_for(style)
            binary=render(db,recipe,system,pal,local,content=slides)
        preview,report=inspect_render(binary,len(slides))
        report['font_substitutions']=substitutions
        reading=article(Export.model_validate(dict(design,slides=slides))).body
        with connection() as db:
            db.execute('BEGIN IMMEDIATE')
            if not db.execute("SELECT 1 FROM deck_jobs WHERE id=? AND lease_token=? AND revision=?",(j['id'],token,j['revision'])).fetchone():return True
            check_rules(db,j,opt)
            db.execute('INSERT OR REPLACE INTO deck_files VALUES(?,?,?,?,?)',(j['id'],j['revision'],binary,preview,reading))
            db.execute("UPDATE deck_jobs SET status='ready',lease_token=NULL,lease_until=NULL,reason=NULL,qa=?,updated=? WHERE id=?",(encode(report),time.time(),j['id']))
    except Exception as exc:
        known=isinstance(exc,(ValueError,RenderProblem))
        if not known:logging.exception('Render failed for job %s',j['id'])
        report=exc.report if isinstance(exc,RenderProblem) else {}
        with connection() as db:
            db.execute("UPDATE deck_jobs SET status='failed',reason=?,qa=?,lease_token=NULL,lease_until=NULL,updated=? WHERE id=? AND lease_token=?",
                       (str(exc) if known else 'Local rendering failed. Retry the saved revision.',encode(report),time.time(),j['id'],token))
    return True
def run():
    while True:
        if not process_one():time.sleep(.5)
if __name__=='__main__':run()
