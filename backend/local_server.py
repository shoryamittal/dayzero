"""Start the API and local worker together. No provider credentials needed."""
import os
import secrets
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path
from store import init
def main():
    root=Path(__file__).resolve().parent
    for name in ('soffice','pdftotext','fc-match'):
        if not shutil.which(name):raise SystemExit(f'Install {name} before starting. See BACKEND.md.')
    os.environ['PPT_ENABLE_EXTERNAL_APIS']='0'
    if not os.getenv('PPT_BACKEND_TOKEN'):
        token=secrets.token_urlsafe(32)
        os.environ['PPT_BACKEND_TOKEN']=token
        print('Local session token (use as Bearer token): '+token,flush=True)
    init()
    port=os.getenv('PPT_PORT','8080')
    children=[]
    def stop(*_):raise KeyboardInterrupt
    signal.signal(signal.SIGTERM,stop)
    try:
        children.append(subprocess.Popen([sys.executable,str(root/'deck_worker.py')],cwd=root))
        children.append(subprocess.Popen([sys.executable,'-m','uvicorn','app:app','--host',os.getenv('PPT_BIND','127.0.0.1'),'--port',port],cwd=root))
        while all(p.poll() is None for p in children):time.sleep(.5)
        return next((p.returncode for p in children if p.poll() is not None),0)
    except KeyboardInterrupt:return 0
    finally:
        for p in children:
            if p.poll() is None:p.terminate()
        for p in children:
            try:p.wait(10)
            except subprocess.TimeoutExpired:p.kill();p.wait()
if __name__=='__main__':sys.exit(main())
