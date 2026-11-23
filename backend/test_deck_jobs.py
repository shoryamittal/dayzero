import io
import json
import os
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from pptx import Presentation
from app import app
import deck_worker
from deck_quality import RenderProblem
from providers import jsoncall, LookupFailure
from store import connection, init
from deck_jobs import arrange_notes
from designs import family_data

class JobTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        env=patch.dict(os.environ,{'PPT_DB':str(Path(self.temp.name)/'jobs.db'),'PPT_BACKEND_TOKEN':'fixture','PPT_ENABLE_EXTERNAL_APIS':'0'})
        env.start();self.addCleanup(env.stop)
        init()
        self.api=TestClient(app,headers={'Authorization':'Bearer fixture','X-Workspace':'one'})
        self.addCleanup(self.api.close)
        self.brief=dict(competition=dict(name='Case Buster 2.0',organizer='IETE SPIT',year=2026,round='Round 1'),topic='Queues',audience='Student judges')
        self.slides=json.loads((Path(__file__).parent/'examples/pilot-content.json').read_text())['slides']
    def new(self,**extra):
        r=self.api.post('/decks',json=self.brief|extra)
        self.assertEqual(r.status_code,201,r.text);return r.json()
    def choose(self,j,body=None):
        data={'revision':j['revision'],'option_id':j['options'][0]['id']}
        if body is not None:data['slides']=body
        r=self.api.put('/decks/'+j['id']+'/draft',json=data)
        self.assertEqual(r.status_code,200,r.text);return r.json()
    def submit(self,j):
        return self.api.post('/decks/'+j['id']+'/generate',json={'revision':j['revision']})
    def get(self,j):
        return self.api.get('/decks/'+j['id']).json()
    def test_offline_export_and_ready_idempotence(self):
        j=self.choose(self.new(),self.slides);link='/decks/'+j['id']
        with patch('httpx.request',side_effect=AssertionError('External network attempted')):
            self.assertEqual(self.submit(j).json()['status'],'queued')
            self.assertEqual(self.submit(j).json()['status'],'queued')
            self.assertTrue(deck_worker.process_one());self.assertFalse(deck_worker.process_one())
        fresh=self.get(j)
        self.assertEqual(fresh['status'],'ready',fresh);self.assertFalse(fresh['checks']['issues'])
        self.assertEqual(self.submit(j).json()['status'],'ready')
        deck=Presentation(io.BytesIO(self.api.get(link+'/files/pptx').content))
        self.assertEqual(len(deck.slides),3)
        self.assertTrue(self.api.get(link+'/files/pdf').content.startswith(b'%PDF'))
        self.assertIn('lunch queue',self.api.get(link+'/files/article').text.lower())
        self.choose(fresh,self.slides)
        self.assertEqual(self.api.get(link+'/files/pptx').status_code,409)
    def test_workspace_permissions(self):
        j=self.new();link='/decks/'+j['id'];h={'X-Workspace':'two'}
        self.assertEqual(self.api.get(link,headers=h).status_code,404)
        self.assertEqual(self.api.get(link+'/files/pdf',headers=h).status_code,404)
        self.assertEqual(self.api.post(link+'/generate',headers=h,json={'revision':1}).status_code,404)
    def test_retry_key_and_revision(self):
        headers={'Idempotency-Key':'same'}
        a=self.api.post('/decks',json=self.brief,headers=headers).json()
        b=self.api.post('/decks',json=self.brief,headers=headers).json()
        self.assertEqual(a['id'],b['id'])
        self.assertEqual(self.api.post('/decks',json=self.brief|{'topic':'other'},headers=headers).status_code,409)
        self.choose(a,self.slides);self.assertEqual(self.submit(a).status_code,409)
    def test_rules_and_offline_unknown(self):
        j=self.new(competition=dict(name='SIH',organizer='DSCE',year=2026,round='internal round'))
        self.assertEqual(j['reason'],'use_organizer_template');self.assertFalse(j['options'])
        r=self.new(competition=dict(name='Local event',organizer='College',year=2026,round='Final'))
        self.assertEqual(r['competition_rules_status'],'unknown');self.assertTrue(r['options'])
        contradictory=self.new(supplied_rules=[dict(kind='max_slides',value='2',source='Round brief')])
        self.assertEqual(contradictory['reason'],'resolve_conflicting_slide_rules')
    def test_changed_rules(self):
        j=self.choose(self.new(),self.slides)
        with connection() as db:
            claim={'kind':'required_template','value':'yes','source':'new organizer brief','year':2026}
            db.execute('INSERT INTO snapshots VALUES(?,?,?)',(j['profile']['edition']['id'],time.time(),json.dumps([claim])))
        self.assertEqual(self.submit(j).status_code,422)
        self.assertEqual(self.get(j)['status'],'review')
    def test_recovery_and_saved_draft(self):
        j=self.choose(self.new(),self.slides);self.submit(j)
        claimed=deck_worker.claim();self.assertIsNotNone(claimed);self.assertIsNone(deck_worker.claim())
        with connection() as db:db.execute('UPDATE deck_jobs SET lease_until=0')
        with patch('deck_worker.inspect_render',side_effect=RenderProblem('Synthetic failed check',{'issues':['example']})):
            deck_worker.process_one()
        f=self.get(j);self.assertEqual(f['attempts'],2);self.assertEqual(f['status'],'failed')
        self.assertEqual(f['slides'],j['slides'])
        self.assertEqual(self.submit(f).json()['status'],'queued')
    def test_missing_evidence(self):
        j=self.choose(self.new(notes=['Observed wait was twelve minutes.']))
        self.assertEqual(self.submit(j).status_code,422)
        self.assertEqual(sum(b['text']=='Observed wait was twelve minutes.' for s in j['slides'] for b in s['blocks']),1)
    def test_provider_gate(self):
        with patch('httpx.request') as request:
            with self.assertRaises(LookupFailure):jsoncall('GET','https://example.org')
            request.assert_not_called()
    def test_real_overflow_withholds_download(self):
        import deck_quality
        from pptx.util import Inches,Pt
        deck=Presentation();page=deck.slides.add_slide(deck.slide_layouts[6])
        b=page.shapes.add_textbox(Inches(1), Inches(1), Inches(1), Inches(.3))
        b.text_frame.word_wrap=False
        p=b.text_frame.paragraphs[0];p.text='A very long unwrapped sentence should exceed this deliberately narrow box.';p.font.size=Pt(28)
        buf=io.BytesIO();deck.save(buf)
        with self.assertRaises(RenderProblem) as caught:deck_quality.inspect_render(buf.getvalue(),1)
        self.assertTrue(caught.exception.report['issues'])
