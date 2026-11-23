"""Run the web workspace and the durable local worker on Render."""
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from store import init

def main():
    os.environ['PPT_ENABLE_EXTERNAL_APIS']='0'
    if not os.getenv('PPT_BACKEND_TOKEN'):
        raise SystemExit('Set PPT_BACKEND_TOKEN in the hosting environment.')
    init()
    root=Path(__file__).resolve().parent
    children=[]
    def stop(*args):raise KeyboardInterrupt
    signal.signal(signal.SIGTERM,stop)
    try:
        children.append(subprocess.Popen([sys.executable,'deck_worker.py'],cwd=root))
        children.append(subprocess.Popen([sys.executable,'-m','uvicorn','cloud_app:app','--host','0.0.0.0','--port',os.getenv('PORT','10000')],cwd=root))
        while all(c.poll() is None for c in children):time.sleep(.5)
        return next((c.returncode for c in children if c.poll() is not None),0)
    except KeyboardInterrupt:return 0
    finally:
        for c in children:
            if c.poll() is None:c.terminate()
        for c in children:
            try:c.wait(12)
            except subprocess.TimeoutExpired:c.kill();c.wait()
if __name__=='__main__':sys.exit(main())
