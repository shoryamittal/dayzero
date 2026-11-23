"""Offline acceptance checks, including provider contracts and model training."""
import json
import os
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
import app, providers, research
from manage import sync_fonts, sync_themes
from ranking import train, constraints
from store import init, connection, rows

class SystemTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        env=patch.dict(os.environ,{'PPT_DB':str(Path(self.temp.name)/'test.sqlite'),'PPT_BACKEND_TOKEN':'test-secret','OPENAI_API_KEY':''})
        env.start();self.addCleanup(env.stop)
        init()
        self.c=TestClient(app.app,headers={'Authorization':'Bearer test-secret','X-Workspace':'test-workspace'})
        self.addCleanup(self.c.close)
    def resolve(self,name='Case Buster 2.0',org='IETE SPIT',stage='Round 1',year=2026):
        r=self.c.post('/competitions/resolve',json=dict(name=name,organizer=org,round=stage,year=year))
        self.assertEqual(r.status_code,200);return r.json()
    def rec(self,profile,**other):
        r=self.c.post('/recommendations',json=dict(edition_id=profile['edition']['id'],**other))
        self.assertEqual(r.status_code,200,r.text);return r.json()
    def test_seed(self):
        init()
        with connection() as db:
            self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0],'ok')
            self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(),[])
            for table,count in [('reference_decks',22),('deck_recipes',30),('palettes',28),('layouts',24)]:
                self.assertEqual(db.execute('SELECT COUNT(*) FROM '+table).fetchone()[0],count)
    def test_round_and_isolation(self):
        e=self.resolve();opts=self.rec(e,palette_preference='dark')['options']
        self.assertTrue(opts)
        self.assertTrue(all(o['why']['counted_slides']==3 and o['template']=='short-case' for o in opts))
        self.assertTrue(opts[0]['why']['matches_palette_preference'])
        self.assertFalse(self.resolve(year=2027)['rules'])
        self.assertFalse(self.resolve(org='Different organizer')['rules'])
    def test_template_and_constraints(self):
        e=self.resolve('SIH','DSCE','internal round')
        self.assertEqual(self.rec(e)['status'],'use_organizer_template')
        for claims,status in [([('exact_slides','3'),('min_slides','5')],'resolve_conflicting_slide_rules'),([('ai_policy','prohibited')],'ai_use_prohibited'),([('design_requirement','Only organizer fonts')],'map_organizer_requirements')]:
            self.assertEqual(constraints([dict(kind=k,value=v) for k,v in claims])[0],status)
    def test_prior_references(self):
        e=self.resolve('CFA Research Challenge','CFA Institute','global final',2025)
        self.assertTrue(e['winner_references'])
        self.assertTrue(all(w['year']<=2025 for w in e['winner_references']))
        self.assertEqual(e['winner_references'][0]['edition_match'],'requested_edition')
        self.assertEqual(self.rec(e,topic='equity investment valuation')['options'][0]['template'],'equity')
    def test_unavailable_font(self):
        self.assertEqual(self.rec(self.resolve(),available_fonts=['missing'])['status'],'no_compatible_bundle')
    def test_feedback(self):
        v=self.rec(self.resolve());body={'impression_id':v['impression_id'],'option_id':v['options'][0]['id']}
        self.assertEqual(self.c.post('/preferences',json=body,headers={'X-Workspace':'different'}).status_code,404)
        self.assertEqual(self.c.post('/preferences',json=body).status_code,200)
        self.assertEqual(self.c.post('/preferences',json=body).status_code,200)
        self.assertEqual(self.c.post('/preferences',json=body|{'option_id':v['options'][1]['id']}).status_code,409)
        with connection() as db:self.assertEqual(train(db)['status'],'collecting_feedback')
    def test_cache_and_failover(self):
        with patch('research.discover',return_value=[]) as d:
            self.assertEqual(self.resolve()['lookup_status'],'no_matching_public_evidence')
            self.assertEqual(self.resolve()['lookup_status'],'cached');self.assertEqual(d.call_count,1)
        with connection() as db:db.execute('UPDATE snapshots SET checked=0')
        self.assertEqual(self.resolve()['lookup_status'],'stale')
    def test_evidence_filter(self):
        e=research.resolve('CFA Research Challenge','CFA Institute',2026,'Global final')
        url='https://www.cfainstitute.org/example'
        example=dict(kind='winner',value='Fixture',source=url,event=e['name'],organizer=e['organizer'],year=2025,round=e['round'],deck_url='https://unconsulted.example/no.pdf',media='slides')
        output={'output':[{'action':{'sources':[{'url':url}]}},{'content':[{'type':'output_text','text':json.dumps({'claims':[example,example|{'round':'unrelated'},example|{'source':'https://fabricated.example/page'},example|{'kind':'exact_slides','value':'8'}]})}]}]}
        with patch.dict(os.environ,{'OPENAI_API_KEY':'fixture'}),patch('providers.jsoncall',return_value=output):
            out=providers.discover(e)
        self.assertEqual(len(out),1);self.assertEqual(out[0]['media'],'result_only');self.assertIsNone(out[0]['deck_url']);self.assertEqual(out[0]['status'],'organizer_sourced')
    def test_identity_cache(self):
        event=dict(name='Test Event',organizer='Example',year=2026,round='Final',source='https://example.org/final')
        with patch('app.identify',return_value=[event]) as discover,patch('research.discover',return_value=[]):
            for _ in range(2):
                self.assertEqual(self.c.post('/competitions/select',json={'name':'Test Event'}).json()['status'],'resolved')
            self.assertEqual(discover.call_count,1)
        with patch('app.identify',return_value=[event,event|{'round':'Qualifier'}]):
            self.assertEqual(self.c.post('/competitions/select',json={'name':'another'}).json()['status'],'choose_edition_and_round')
    def test_canva_version_scope(self):
        m=dict(template_id='fixture',recipe_id='short-case',palette_id='Atlantic',style_id='Briefing')
        hdr={'X-Canva-Access-Token':'fake'}
        with patch('app.canva_template',return_value={'id':'fixture','updated_at':10}):
            self.assertEqual(self.c.post('/integrations/canva/map-template',json=m,headers=hdr).status_code,200)
            body={'edition_id':self.resolve()['edition']['id'],'canva_template_ids':['fixture']}
            out=self.c.post('/recommendations',json=body,headers=hdr).json()
            self.assertEqual(out['options'][0]['provider'],'Canva')
            other=self.c.post('/recommendations',json=body,headers=hdr|{'X-Workspace':'other'}).json()
            self.assertFalse(any(o.get('provider')=='Canva' for o in other['options']))
        with patch('app.canva_template',return_value={'id':'fixture','updated_at':20}):
            out=self.c.post('/recommendations',json=body,headers=hdr).json()
            self.assertFalse(any(o.get('provider')=='Canva' for o in out['options']))
    def test_catalog_sync(self):
        family=dict(family='Example Sans',category='sans-serif',subsets=['devanagari'],variants=['regular'],version='v1')
        with connection() as db,patch('manage.google_fonts',return_value=[family]),patch('manage.jsoncall',return_value=[dict(name='test',type='dir',html_url='https://github.com/slidevjs/themes',sha='xyz')]):
            self.assertEqual(sync_fonts(db)['synced_font_families'],1)
            self.assertEqual(sync_themes(db)['theme_candidates'],1)
        opt=self.rec(self.resolve(),required_script='devanagari',available_fonts=['Example Sans'])['options'][0]
        self.assertEqual(opt['typography']['body_font'],'Example Sans')
    def test_auth(self):
        self.assertEqual(self.c.get('/catalog',headers={'Authorization':'Bearer wrong'}).status_code,401)
    def test_training(self):
        with connection() as db:
            for i in range(4):
                db.execute('INSERT INTO editions(id,name,organizer,year,round) VALUES(?,?,?,?,?)',(str(i),'Fixture','Organizer',2020+i,'Final'))
                for j in range(5):
                    a=dict(id='a',features=[0,1,0,0,0,0,0,0,0]);b=dict(id='b',features=[0]*9)
                    iid=f'{i}-{j}'
                    db.execute('INSERT INTO impressions VALUES(?,?,?,?,?)',(iid,'test',str(i),0,json.dumps([a,b])))
                    db.execute('INSERT INTO preferences VALUES(?,?,?)',(iid,'b',0))
            result=train(db);self.assertEqual(result['status'],'promoted');self.assertEqual(result['challenger_top1'],1)
if __name__=='__main__':unittest.main()
