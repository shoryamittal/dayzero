"""Request and token estimates; provider billing records remain authoritative."""
from contextvars import ContextVar
from decimal import Decimal as D
import time
from pydantic import BaseModel,Field,model_validator
from store import connection

JOB=ContextVar('cost_job',default=('unassigned','unassigned'))
CARD='2026-11-23-standard-short'
MODEL='gpt-6.1-terra'
class Quote(BaseModel):
    input_tokens:int=Field(8000,ge=0,le=272000)
    cached_tokens:int=Field(0,ge=0)
    output_tokens:int=Field(2000,ge=0,le=128000)
    web_search_calls:int=Field(0,ge=0,le=100)
    image_count:int=Field(0,ge=0,le=150)
    image_unit_usd:D|None=Field(None,ge=0,allow_inf_nan=False)
    image_prompt_usd:D=Field(D(0),ge=0,allow_inf_nan=False)
    other_api_usd:D=Field(D(0),ge=0,allow_inf_nan=False)
    usd_inr:D=Field(D(85),gt=0,allow_inf_nan=False)
    hosting_per_deck_inr:D=Field(D(0),ge=0,allow_inf_nan=False)
    monthly_fixed_inr:D=Field(D(0),ge=0,allow_inf_nan=False)
    decks_per_month:int=Field(1000,ge=1)
    margin:D=Field(D('.70'),ge=0,lt=1,allow_inf_nan=False)
    payment_fee:D=Field(D(0),ge=0,lt=1,allow_inf_nan=False)
    @model_validator(mode='after')
    def valid(self):
        if self.cached_tokens>self.input_tokens:raise ValueError('Cached tokens must be included in input tokens.')
        if self.margin+self.payment_fee>=1:raise ValueError('Margin and payment fee must total less than 100%.')
        if self.image_count and self.image_unit_usd is None:raise ValueError('Enter the provider price for the requested image quality and size.')
        return self
def estimate(q):
    million=D(1000000)
    text=(q.input_tokens-q.cached_tokens+D('.05')*q.cached_tokens+5*q.output_tokens)/million
    web=D('.01')*q.web_search_calls
    images=q.image_count*(q.image_unit_usd or D(0))+q.image_prompt_usd
    api=text+web+images+q.other_api_usd
    unit=api*q.usd_inr+q.hosting_per_deck_inr+q.monthly_fixed_inr/q.decks_per_month
    return dict(rate_card=CARD,model=MODEL,text_usd=float(text),web_search_usd=float(web),image_usd=float(images),other_api_usd=float(q.other_api_usd),api_usd=float(api),api_inr=float(api*q.usd_inr),cost_per_deck_inr=float(unit),monthly_estimated_inr=float(unit*q.decks_per_month),indicative_pre_tax_price_inr=float(unit/(1-q.margin-q.payment_fee)))
def record(response,requested):
    ident=response.get('id')
    if not ident:return
    usage=response.get('usage') or {}
    i,o=usage.get('input_tokens'),usage.get('output_tokens')
    c=(usage.get('input_tokens_details') or {}).get('cached_tokens',0)
    n=sum(b.get('type')=='web_search_call' for b in response.get('output',[]))
    model=response.get('model',requested);usd=None
    if requested==MODEL and isinstance(i,int) and isinstance(o,int) and 0<=c<=i<=272000 and 0<=o<=128000 and n<=100:
        usd=estimate(Quote(input_tokens=i,cached_tokens=c,output_tokens=o,web_search_calls=n))['api_usd']
    workspace,job=JOB.get()
    with connection() as db:
        db.execute('INSERT OR IGNORE INTO usage_events VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',(ident,workspace,job,'OpenAI',model,i,c,o,n,usd,CARD,time.time()))
