from pathlib import Path
from fastapi import FastAPI,Response
from fastapi.responses import FileResponse
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
app.mount('/catalog',StaticFiles(directory=ROOT/'gallery',html=True),name='catalog')
