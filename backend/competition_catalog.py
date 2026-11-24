"""Reviewed public source records. Selection does not imply open registration."""
from fastapi import APIRouter,Query
from store import norm
CHECKED='2026-11-24'
CASE='https://unstop.com/competitions/case-buster-20-a-case-study-competition-sardar-patel-institute-of-technology-spit-mumbai-1664806/amp'
CBS='https://www.casecompetition.com/library/'
CFA='https://www.cfainstitute.org/insights/events/research-challenge/past-champions'
SIH='https://sih.dsce.in/sih'
RECORDS=[
 dict(id='case-buster-2026-r1',name='Case Buster 2.0',organizer='IETE SPIT',year=2026,round='Round 1',track='',registration='closed',coverage='Round identity and three content slides, excluding introduction and thank-you.',sources=[dict(url=CASE,kind='organizer_listing',checked_on=CHECKED,verified_fields=['name','organizer','year','round','slide_count'])]),
 dict(id='case-buster-2026-final',name='Case Buster 2.0',organizer='IETE SPIT',year=2026,round='Round 2',track='',registration='closed',coverage='Final presentation round. Its slide limit has not been established.',sources=[dict(url=CASE,kind='organizer_listing',checked_on=CHECKED,verified_fields=['name','organizer','year','round'])]),
 dict(id='sih-dsce-2026',name='Smart India Hackathon',organizer='DSCE',year=2026,round='Campus internal round',track='',registration='not_verified',coverage='DSCE campus scope and mandatory presentation template. Track and current registration status require confirmation.',sources=[dict(url=SIH,kind='campus_organizer',checked_on=CHECKED,verified_fields=['name','organizer','year','round','required_template'])]),
 dict(id='cbs-invitational-2026',name='CBS Case Competition',organizer='CBS Case Competition',year=2026,round='Invitational',track='Invitational',registration='historical_reference',coverage='2026 Invitational case and ranked decks. Current submission rules have not been established.',sources=[dict(url=CBS,kind='organizer_archive',checked_on=CHECKED,verified_fields=['name','organizer','year','track'])]),
 dict(id='cbs-global-2025',name='CBS Case Competition',organizer='CBS Case Competition',year=2025,round='GLOBAL',track='GLOBAL',registration='historical_reference',coverage='2025 GLOBAL case and ranked decks. Current submission rules have not been established.',sources=[dict(url=CBS,kind='organizer_archive',checked_on=CHECKED,verified_fields=['name','organizer','year','track'])]),
 dict(id='cfa-global-2026',name='CFA Institute Research Challenge',organizer='CFA Institute',year=2026,round='Global final',track='',registration='historical_reference',coverage='2026 global winning team and presentation. Current submission rules and a separate track have not been established.',sources=[dict(url=CFA,kind='organizer_archive',checked_on=CHECKED,verified_fields=['name','organizer','year','round'])])
]
def match_record(competition):
    fields=('name','organizer','year','round','track')
    return next((r for r in RECORDS if all((norm(str(r[k]))==norm(str(competition.get(k,'')))) for k in fields)),None)
def source_status(competition):
    record=match_record(competition)
    if record:return dict(status='reviewed_source_record',record_id=record['id'],registration=record['registration'],coverage=record['coverage'],sources=record['sources'])
    return dict(status='manual_unverified',registration='not_verified',coverage='User-entered identity. Verify the organizer brief and any supplied rules.',sources=[])
router=APIRouter()
@router.get('/competitions/catalog')
def catalog(q:str=Query('',max_length=200)):
    return {'records':[r for r in RECORDS if norm(q) in norm(' '.join(str(r[k]) for k in ('name','organizer','year','round','track')))],'checked_on':CHECKED,'live_search_enabled':False}
