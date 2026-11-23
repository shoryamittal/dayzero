import io,json,os,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from pptx import Presentation
import app,catalog_api
from costs import Quote,estimate,record,JOB
from store import connection,init
class CatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory()
        cls.env=patch.dict(os.environ,{'PPT_DB':str(Path(cls.tmp.name)/'runtime.db'),'PPT_BACKEND_TOKEN':'fixture'})
        cls.env.start();init()
        cls.c=TestClient(app.app,headers={'Authorization':'Bearer fixture','X-Workspace':'A','X-Job-ID':'demo'})
        cls.spec={'recipe':'short-case','system':'ledger','palette':'Atlantic','typography':'Briefing'}
    @classmethod
    def tearDownClass(cls):
        cls.c.close();cls.env.stop();cls.tmp.cleanup()
    def test_library(self):
        for kind,n in [('fonts',2103),('icons',2078),('templates',33600)]:
            r=self.c.get(f'/assets/{kind}?limit=2').json()
            self.assertEqual((r['total'],len(r['items'])),(n,2))
        self.assertIn('<path',self.c.get('/icons/alarm.svg').text)
    def test_render(self):
        data=self.c.post('/export/pptx',json=self.spec)
        self.assertEqual(len(Presentation(io.BytesIO(data.content)).slides),3)
    def test_structured(self):
        raw=[{'title':'Evidence <test>','blocks':[{'chart':{'labels':['A','B'],'series':{'test':[3,4]}}},{'icon':'alarm'}]},
             {'title':'Choose','blocks':[{'table':[['A','B'],['x','y']]},{'text':'Supported'}]},
             {'title':'Pilot','blocks':[{'text':'Timing'},{'text':'Owner'},{'text':'Metric'}]}]
        payload=self.spec|{'slides':raw}
        resp=self.c.post('/export/pptx',json=payload)
        self.assertEqual(resp.status_code,200,resp.text[:100] if resp.status_code!=200 else '')
        deck=Presentation(io.BytesIO(resp.content))
        self.assertTrue(any(s.has_chart for s in deck.slides[0].shapes))
        self.assertTrue(any(s.has_table for s in deck.slides[1].shapes))
        article=self.c.post('/export/article',json=payload)
        self.assertIn('&lt;test&gt;',article.text);self.assertIn('<table>',article.text)
        raw.pop()
        self.assertEqual(self.c.post('/export/pptx',json=payload).status_code,422)
    def test_costs(self):
        self.assertEqual(estimate(Quote())['api_usd'],.018)
        self.assertAlmostEqual(estimate(Quote(input_tokens=16000,output_tokens=3000,web_search_calls=2))['api_inr'],4.335)
        self.assertEqual(self.c.post('/cost/estimate',json={'image_count':3}).status_code,422)
    def test_usage_event(self):
        t=JOB.set(('A','record'));r={'id':'resp-1','model':'gpt-6.1-terra','usage':{'input_tokens':16000,'output_tokens':3000},'output':[{'type':'web_search_call'}]*2}
        try:record(r,'gpt-6.1-terra');record(r,'gpt-6.1-terra')
        finally:JOB.reset(t)
        out=self.c.get('/cost/jobs/record').json()
        self.assertEqual(len(out['events']),1);self.assertAlmostEqual(out['estimated_known_usd'],.051)
        self.assertFalse(self.c.get('/cost/jobs/record',headers={'X-Workspace':'B'}).json()['events'])
    def test_font_cache(self):
        with patch('catalog_api.jsoncall',return_value={'id':'inter','family':'Inter','subsets':['latin'],'license':'OFL'}) as provider:
            for _ in range(2):self.assertEqual(self.c.get('/fonts/inter').json()['family'],'Inter')
            self.assertEqual(provider.call_count,1)

    def test_draft_and_photo_discovery(self):
        example=json.loads((Path(__file__).parent/'examples/pilot-content.json').read_text())
        result={'id':'draft-test','output':[{'content':[{'type':'output_text','text':json.dumps({'slides':example['slides']})}]}]}
        # Live text generation contract produces text blocks only.
        for slide in example['slides']:
            for block in slide['blocks']:
                block.pop('chart',None)
                block.setdefault('text','User-supplied notes')
        result['output'][0]['content'][0]['text']=json.dumps({'slides':example['slides']})
        with patch.dict(os.environ,{'OPENAI_API_KEY':'fake','PEXELS_API_KEY':'fake'}),patch('catalog_api.jsoncall',return_value=result):
            data=self.c.post('/draft/slides',json={'recipe':'short-case','topic':'Queues','audience':'Jury','evidence':'Supplied pilot data.'})
            self.assertEqual(data.status_code,200)
            self.assertEqual(len(data.json()['slides']),3)
        meta={'photos':[{'id':7,'alt':'Workshop','url':'https://www.pexels.com/photo/7/','src':{'medium':'https://images.pexels.com/a','large':'https://images.pexels.com/b'},'photographer':'Sample','photographer_url':'https://www.pexels.com/@sample/'}]}
        with patch.dict(os.environ,{'PEXELS_API_KEY':'fake'}),patch('catalog_api.jsoncall',return_value=meta):
            self.assertEqual(self.c.get('/photos/search?q=workshop').json()[0]['author'],'Sample')
