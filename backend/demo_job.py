"""Exercise the published HTTP API against the local server using the example brief."""
import argparse
import json
import os
import time
from pathlib import Path
import httpx
def run(url,folder):
    headers={'Authorization':'Bearer '+os.environ['PPT_BACKEND_TOKEN'],'X-Workspace':'offline-demo'}
    sample=json.loads((Path(__file__).parent/'examples/pilot-content.json').read_text())
    brief={'competition':{'name':'Case Buster 2.0','organizer':'IETE SPIT','year':2026,'round':'Round 1'},'topic':'Campus canteen lunch pilot','audience':'Case judges'}
    with httpx.Client(base_url=url,headers=headers,timeout=30,trust_env=False) as api:
        r=api.post('/decks',json=brief);r.raise_for_status();job=r.json();path='/decks/'+job['id']
        r=api.put(path+'/draft',json={'revision':job['revision'],'option_id':job['options'][0]['id'],'slides':sample['slides']});r.raise_for_status()
        r=api.post(path+'/generate',json={'revision':r.json()['revision']});r.raise_for_status()
        deadline=time.monotonic()+180
        while time.monotonic()<deadline:
            r=api.get(path);r.raise_for_status();job=r.json()
            if job['status']=='failed':raise RuntimeError(str(job['reason'])+' '+str(job['checks']))
            if job['status']=='ready':break
            time.sleep(.4)
        else:raise RuntimeError('Worker took more than 180 seconds.')
        folder.mkdir(parents=True,exist_ok=True)
        for kind,endpoint in job['downloads'].items():
            r=api.get(endpoint);r.raise_for_status()
            (folder/('campus-pilot.'+('html' if kind=='article' else kind))).write_bytes(r.content)
        (folder/'quality.json').write_text(json.dumps(job['checks'],indent=2))
        print(json.dumps({'status':job['status'],'job':job['id'],'checks':job['checks'],'external_api_cost_usd':job['external_api_cost_usd']},indent=2))
if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--url',default='http://127.0.0.1:8080')
    parser.add_argument('--out',type=Path,default=Path('demo-output'))
    args=parser.parse_args();run(args.url,args.out)
