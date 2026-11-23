import os
from pathlib import Path
from urllib.parse import urlsplit
import httpx
from providers import jsoncall, LookupFailure

def load_photos(slides, folder):
    seen={}
    for slide in slides:
        credits=[]
        for block in slide.get('blocks',[]):
            ident=block.pop('pexels_id',None)
            if not ident:continue
            if ident not in seen:
                key=os.getenv('PEXELS_API_KEY')
                if not key:raise LookupFailure('A Pexels key is required for photo export.')
                m=jsoncall('GET',f'https://api.pexels.com/v1/photos/{ident}',headers={'Authorization':key})
                src=m.get('src',{}).get('large','')
                if m.get('id')!=ident or urlsplit(src).scheme!='https' or urlsplit(src).netloc!='images.pexels.com':
                    raise LookupFailure('Unexpected Pexels photo location.')
                name=f'{ident}.jpg';target=Path(folder)/name
                try:
                    with httpx.stream('GET',src,timeout=20,follow_redirects=False) as r:
                        r.raise_for_status()
                        with target.open('wb') as out:
                            for chunk in r.iter_bytes():
                                if out.tell()+len(chunk)>8_000_000:raise LookupFailure('Photo exceeds size limit.')
                                out.write(chunk)
                except httpx.HTTPError as exc:raise LookupFailure('Photo unavailable.') from exc
                seen[ident]=(name,'Photo by '+m['photographer']+' on Pexels · '+m['url'])
            block['photo'],credit=seen[ident]
            if credit not in credits:credits.append(credit)
        if credits:slide['source']=' | '.join(filter(None,[slide.get('source'),*credits]))
