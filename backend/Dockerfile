FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-impress poppler-utils fontconfig fonts-liberation fonts-noto-core fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
RUN gzip -d catalog.sqlite.gz && python make_gallery.py
ENV PPT_ENABLE_EXTERNAL_APIS=0 PYTHONUNBUFFERED=1 OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 PPT_DB=/tmp/pitchviva.sqlite
RUN useradd --create-home renderer && chown -R renderer:renderer /app
USER renderer
CMD ["python", "cloud_server.py"]
