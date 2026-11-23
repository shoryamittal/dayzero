# Render web workspace

Build the Dockerfile at backend/Dockerfile with repository-root build context. Start uses the Docker CMD. Configure PPT_BACKEND_TOKEN as a private service environment variable. The owner enters that token in the web workspace. Keep this preview restricted to the owner until end-user authentication is connected.

The root path serves the workspace, /catalog/ serves the offline template gallery, /health returns readiness, and /backend mounts the authenticated v4 API. Each browser tab gets a workspace identifier. Drafts are held in SQLite at /tmp/pitchviva.sqlite by default. On a free service, download all exports before a restart or redeploy. A paid persistent volume or managed database is needed for durable hosted jobs.

Set OPENBLAS_NUM_THREADS=1 and OMP_NUM_THREADS=1 on small instances. The Dockerfile supplies them, along with the local render dependencies. This owner preview launches one worker with its HTTP process. Cloud research, text generation and stock API calls remain disabled.
