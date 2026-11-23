# Audience, purpose, design defaults and narrative sequence for each optional brief.
EXTRA=[
('grant','Grant reviewers','grant funding research proposal impact evaluation budget','Conifer','Editorial','cover diagnosis thesis test roadmap economics metrics ask'),
('procurement','Procurement committee','procurement vendor selection tender comparative cost evaluation','Atlantic','Briefing','decision customer options economics risk roadmap ask'),
('policy-evaluation','Public programme evaluators','program evaluation counterfactual public policy evidence impact','Glacier','Technical','cover diagnosis metrics test analysis risk recommend sources'),
('investor-update','Existing investors','quarterly investor update growth retention runway milestone','Slate','Briefing','decision adoption economics trend risk roadmap ask'),
('product-launch','Launch steering committee','launch readiness release positioning product commercial rollout','Cherry','Stage','cover customer demo competition business roadmap metrics ask'),
('incident','Reliability review team','incident postmortem reliability service recovery timeline','Slate','Technical','decision diagnosis trend architecture risk roadmap metrics'),
('design-review','Design critique panel','interaction design prototype usability accessibility user testing','Aubergine','Editorial','cover customer diagnosis demo test options recommend'),
('research-poster-talk','Scientific conference audience','conference oral talk experiment findings replication limits','Glacier','Technical','cover thesis architecture test analysis risk sources'),
('clinical-operations','Healthcare operations jury','healthcare workflow capacity patient experience operational pilot','Conifer','Briefing','decision customer diagnosis options feasibility roadmap metrics'),
('energy-transition','Energy planning committee','energy transition utility capital infrastructure scenario','Deep teal','Technical','cover market options economics risk roadmap metrics ask'),
('retail-category','Retail category managers','retail assortment pricing category merchandising customer demand','Ink and clay','Briefing','decision customer trend competition economics recommend metrics'),
('data-story','Analytics stakeholders','data analysis business intelligence dashboard anomaly insight','Atlantic','Technical','cover diagnosis trend analysis metrics recommend sources'),
('architecture-review','Engineering review board','software architecture system scalability design tradeoffs','Cobalt night','Technical','decision architecture options test risk roadmap ask'),
('brand-reposition','Brand leadership','brand repositioning perception message identity channels','Cherry','Editorial','cover customer diagnosis competition options recommend roadmap'),
('class-lesson','Learners and instructors','lesson learning instruction example exercise teaching','Linen','Editorial','cover customer diagnosis demo test analysis sources'),
('nonprofit','Community partners','nonprofit charity fundraising partnership beneficiaries outcomes','Conifer','Stage','cover customer diagnosis adoption metrics roadmap ask'),
('pilot-proposal','Pilot sponsors','pilot experiment validation success criteria rollout resources','Glacier','Briefing','decision diagnosis test feasibility economics risk ask'),
('strategy-offsite','Leadership offsite','leadership planning prioritization objectives organizational alignment','Aubergine','Briefing','decision trend options recommend roadmap metrics ask')]
def install(db):
    for tag,a,keywords,p,t,seq in EXTRA:
        db.execute('INSERT OR IGNORE INTO deck_recipes VALUES(?,?,?,?,NULL,?)',(tag,a,p,t,'Original v3 sequence'))
        db.execute('INSERT OR IGNORE INTO pack_tags VALUES(?,?,?)',(tag,keywords,'Original v3'))
        db.executemany('INSERT OR IGNORE INTO recipe_slides VALUES(?,?,?)',[(tag,i,n) for i,n in enumerate(seq.split(),1)])
