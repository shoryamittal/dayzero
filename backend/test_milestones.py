import os,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from app import app
from store import init,connection
from research import resolve,seed
from competition_catalog import source_status

class CompetitionTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.env=patch.dict(os.environ,PPT_DB=str(Path(self.tmp.name)/'db.sqlite'),PPT_BACKEND_TOKEN='fixture',PPT_ENABLE_EXTERNAL_APIS='0')
        self.env.start();self.addCleanup(self.env.stop);init()
        self.client=TestClient(app,headers={'Authorization':'Bearer fixture','X-Workspace':'test'})
        self.addCleanup(self.client.close)
    def test_source_catalog_and_manual_correction(self):
        data=self.client.get('/competitions/catalog?q=Case Buster').json()
        self.assertEqual(len(data['records']),2)
        one=data['records'][0]
        self.assertEqual(one['registration'],'closed')
        self.assertEqual(one['sources'][0]['checked_on'],'2026-11-24')
        self.assertEqual(source_status(one)['status'],'reviewed_source_record')
        self.assertEqual(source_status(one|{'year':2027})['status'],'manual_unverified')
        self.assertEqual(source_status(one|{'track':'AI'})['status'],'manual_unverified')
    def test_tracks_are_isolated(self):
        normal=resolve('Case Buster 2.0','IETE SPIT',2026,'Round 1')
        other=resolve('Case Buster 2.0','IETE SPIT',2026,'Round 1','unverified track')
        self.assertNotEqual(normal['id'],other['id'])
        self.assertTrue(seed(normal));self.assertFalse(seed(other))
        invitational=resolve('CBS Case Competition','CBS Case Competition',2026,'Invitational','Invitational')
        glob=resolve('CBS Case Competition','CBS Case Competition',2026,'GLOBAL','GLOBAL')
        self.assertNotEqual(invitational['id'],glob['id'])
        self.assertTrue(seed(invitational));self.assertTrue(seed(glob))
    def test_job_keeps_selection_provenance(self):
        c={'name':'Case Buster 2.0','organizer':'IETE SPIT','year':2026,'round':'Round 2','track':''}
        j=self.client.post('/decks',json={'competition':c,'topic':'Student pilot','audience':'Judges'}).json()
        self.assertEqual(j['profile']['verification']['record_id'],'case-buster-2026-final')
        self.assertEqual(j['profile']['edition']['round'],'Round 2')
        self.assertEqual(j['profile']['rules'],[])
        self.assertTrue(j['options'])
