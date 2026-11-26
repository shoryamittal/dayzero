from pathlib import Path
from fastapi import FastAPI,Response
from fastapi.responses import FileResponse,HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app import app as api
from store import connection
app=FastAPI(title='PitchViva workspace',docs_url=None,redoc_url=None,openapi_url=None)
ROOT=Path(__file__).parent
@app.get('/workspace.js')
def workspace_script():
    return FileResponse(ROOT/'web'/'workspace.js',media_type='text/javascript',headers={'Cache-Control':'no-store'})
@app.get('/health')
def health():
    with connection() as db:db.execute('SELECT 1 FROM deck_jobs LIMIT 1').fetchone()
    return {'status':'ready','external_apis':'disabled','version':'4.1'}
@app.get('/')
def home():
    return FileResponse(ROOT/'web'/'index.html',headers={'Cache-Control':'no-store'})
api.add_middleware(CORSMiddleware,allow_origins=['https://dayzero-pitch-studio.onrender.com'],allow_methods=['GET','POST','PUT'],allow_headers=['Authorization','Content-Type','X-Workspace','Idempotency-Key'])
app.mount('/backend',api)
if (ROOT/'gallery').is_dir():
    app.mount('/catalog',StaticFiles(directory=ROOT/'gallery',html=True),name='catalog')
else:
    @app.get('/catalog/',response_class=HTMLResponse,status_code=503)
    def gallery_setup():
        return '<!doctype html><html lang="en"><meta charset="utf-8"><title>Template gallery setup</title><main><h1>Template gallery is not generated yet</h1><p>Run <code>python make_gallery.py</code> in the backend directory to generate the bundled editable templates. No external APIs are needed.</p><p><a href="/">Return to the deck workspace</a></p></main></html>'
