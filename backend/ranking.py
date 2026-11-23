import json
import time
from collections import defaultdict
from itertools import product
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupKFold
from store import key, rows, luminance
from research import seed, get_snapshot

FEATURES=['semantic_fit','recipe_palette','recipe_font','contrast','palette_preference','font_preference','script_evidence','length_fit','language_match']
BASE=np.array([4.5,.40,.35,.15,1.3,1.25,.15,1.2,.2])
def constraints(rules):
    vals=defaultdict(set)
    for r in rules:
        vals[r['kind']].add(r['value'])
    def nums(k):return [int(x) for x in vals[k] if x.isascii() and x.isdigit()]
    exact=nums('exact_slides')
    lo=max([1,*nums('min_slides'),*exact])
    hi=min([500,*nums('max_slides'),*exact])
    if 'prohibited' in vals['ai_policy']:return 'ai_use_prohibited',lo,hi
    if 'restricted' in vals['ai_policy']:return 'check_ai_use_conditions',lo,hi
    if 'yes' in vals['required_template']:return 'use_organizer_template',lo,hi
    if vals['design_requirement'] or vals['required_sections']:return 'map_organizer_requirements',lo,hi
    if lo>hi:return 'resolve_conflicting_slide_rules',lo,hi
    return None,lo,hi
def rank(db,e,brief,private_templates=(),rules_override=None):
    snap=get_snapshot(db,e['id'])
    rules=seed(e)+(json.loads(snap['payload']) if snap else [])
    if rules_override is not None:
        rules=rules_override
    reason,lo,hi=constraints(rules)
    if reason:return {'status':reason,'options':[],'rules':[r for r in rules if r['kind']!='winner']}
    packs=rows(db,'SELECT d.*,t.tags FROM deck_recipes d JOIN pack_tags t ON d.id=t.recipe_id ORDER BY d.id')
    query=' '.join([e['name'],e['round'],brief.audience,brief.topic,' '.join(r['value'] for r in rules if r['kind']=='criteria')])
    docs=[p['audience']+' '+p['tags'] for p in packs]
    mat=TfidfVectorizer(strip_accents='unicode',ngram_range=(1,2)).fit_transform(docs+[query])
    similarities=(mat[:-1]@mat[-1].T).toarray().ravel()
    palettes=rows(db,'SELECT * FROM palettes WHERE min(text_contrast,accent_contrast,secondary_contrast)>=4.5 ORDER BY id')
    styles=rows(db,'SELECT * FROM type_styles ORDER BY id')
    # Allow only font families the host explicitly reports as available on its renderer.
    installed={s.casefold() for s in brief.available_fonts}
    google=rows(db,'SELECT * FROM fonts ORDER BY family')
    known={f['family'].casefold():set(json.loads(f['subsets'])) for f in google}
    for f in google:
        if f['family'].casefold() in installed:
            styles.append(dict(id='Google: '+f['family'],title_font=f['family'],body_font=f['family'],fallback='Arial',title_pt=34,body_pt=21,source_pt=14))
    active=db.execute('SELECT weights FROM model WHERE id=1').fetchone()
    weights=np.array(json.loads(active[0])) if active else BASE
    seq=defaultdict(list)
    for r in db.execute('SELECT * FROM recipe_slides ORDER BY sequence'):seq[r['recipe_id']].append(r['layout'])
    ranked=[]
    for p,sim in zip(packs,similarities):
        if p['rule_id'] and p['rule_id']!=e['seed_rule_id']:continue
        order=seq[p['id']]
        excludes_intro=any('intro' in r['value'].lower() or 'cover' in r['value'].lower() for r in rules if r['kind']=='exclusions')
        counted=sum(1 for layout in order if not (excludes_intro and layout=='cover'))
        if not lo<=counted<=hi:continue
        for pal,style in product(palettes,styles):
            if installed and any(style[k].casefold() not in installed for k in ('title_font','body_font')):continue
            if brief.required_script and not all(brief.required_script in known.get(style[k].casefold(),set()) for k in ('title_font','body_font')):continue
            mode='dark' if luminance(pal['background'])<.3 else 'light'
            stylefit=brief.font_preference.casefold() in {style[k].casefold() for k in ['id','title_font','body_font']} if brief.font_preference else False
            palettefit=brief.palette_preference.casefold() in (mode,pal['id'].casefold()) if brief.palette_preference else False
            x=[float(sim),int(pal['id']==p['palette']),int(style['id']==p['type_style']),min(1,pal['text_contrast']/18),float(palettefit),float(stylefit),float(style['body_font'].casefold() in known),float(p['rule_id'] is not None and p['rule_id']==e['seed_rule_id']),float(bool(brief.required_script))]
            score=float(np.dot(x,weights))
            ident=key(p['id'],pal['id'],style['id'])
            ranked.append((score,ident,{'id':ident,'template':p['id'],'slides':order,'palette':pal,'typography':style,'features':x,'why':{'audience_similarity':round(float(sim),3),'matches_palette_preference':bool(palettefit),'matches_font_preference':bool(stylefit),'counted_slides':counted,'total_slides':len(order)}}))
    # A mapped design has one reviewed recipe and fixed palette and typography.
    # It can be suggested only if that exact native combination passed every filter.
    by_combo={(o['template'],o['palette']['id'],o['typography']['id']):(s,o) for s,_,o in ranked}
    for private in private_templates:
        m=by_combo.get((private['recipe_id'],private['palette_id'],private['style_id']))
        if not m:continue
        score,opt=m
        ident=key('Canva',private['template_id'],opt['id'])
        clone=dict(opt,id=ident,provider='Canva',brand_template=private['metadata'])
        ranked.append((score,ident,clone))
    ranked.sort(key=lambda v:(-v[0],0 if v[2].get('provider')=='Canva' else 1,v[1]))
    top=[];seen=set()
    for score,_,opt in ranked:
        signature=(opt['template'],opt['palette']['id'])
        if signature in seen:continue
        seen.add(signature)
        top.append(opt)
        if len(top)==3:break
    return {'status':'suggested' if top else 'no_compatible_bundle','model':'feedback_ranker' if active else 'tfidf_baseline','rules_status':'partial_evidence' if any(r['kind']!='winner' for r in rules) else 'rules_unknown','last_live_check':snap['checked'] if snap else None,'options':top}
def train(db):
    # One choice contributes comparisons only against alternatives actually displayed.
    events=rows(db,'SELECT editions.name,editions.organizer,editions.year,options,chosen FROM impressions JOIN preferences ON impressions.id=preferences.impression_id JOIN editions ON editions.id=impressions.edition_id ORDER BY impressions.created')
    event_groups=[key(ev['name'].casefold(),ev['organizer'].casefold(),ev['year']) for ev in events]
    groups=sorted(set(event_groups))
    if len(events)<20 or len(groups)<4:return {'status':'collecting_feedback','choices':len(events),'editions':len(groups),'minimum_choices':20,'minimum_editions':4}
    def xy(data):
        x=[];y=[]
        for ev in data:
            options=json.loads(ev['options'])
            picked=np.array(next(o['features'] for o in options if o['id']==ev['chosen']))
            for o in options:
                if o['id']==ev['chosen']:continue
                diff=picked-np.array(o['features']);x.extend([diff,-diff]);y.extend([1,0])
        return np.array(x),np.array(y)
    def fit(data):
        x,y=xy(data)
        return LogisticRegression(fit_intercept=False,C=.5,max_iter=300).fit(x,y).coef_[0]
    def hit(ev,w):
        ops=json.loads(ev['options'])
        scores=np.array([np.dot(w,o['features']) for o in ops])
        winners=np.flatnonzero(np.isclose(scores,scores.max(),rtol=0,atol=1e-10))
        return sum(ops[i]['id']==ev['chosen'] for i in winners)/len(winners)
    base=[];learned=[]
    for tr,va in GroupKFold(n_splits=min(5,len(groups))).split(events,groups=event_groups):
        weights=BASE+fit([events[i] for i in tr])
        base.extend(hit(events[i],BASE) for i in va);learned.extend(hit(events[i],weights) for i in va)
    metrics={'choices':len(events),'competition_editions':len(groups),'baseline_top1':float(np.mean(base)),'challenger_top1':float(np.mean(learned)),'validation':'held-out editions; accuracy among shown options, fractional ties'}
    if metrics['challenger_top1']<=metrics['baseline_top1']:
        return {'status':'challenger_not_promoted',**metrics}
    w=(BASE+fit(events)).tolist()
    db.execute('INSERT OR REPLACE INTO model VALUES(1,?,?,?,?,?)',(json.dumps(w),time.time(),len(groups),len(groups),json.dumps(metrics)))
    return {'status':'promoted',**metrics}
