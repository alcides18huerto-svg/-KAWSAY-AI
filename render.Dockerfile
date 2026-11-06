# DEMOSTRACIÓN SIN DATOS REALES. La base SQLite en Render Free es efímera.
FROM node:24-alpine AS web-build
WORKDIR /web
COPY teacher-web/package*.json ./
RUN npm ci --no-audit --no-fund
COPY teacher-web/ ./
# Simulador estático sin backend (opción Demo del login). Vite lo copia a dist/demo.
COPY index.html assets modules ./demo-src/
RUN npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONUTF8=1 PYTHONIOENCODING=utf-8 PIP_NO_CACHE_DIR=1
WORKDIR /srv
RUN addgroup --system kawsay && adduser --system --ingroup kawsay kawsay
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY scripts/demo_e2e.py ./scripts/demo_e2e.py
COPY --from=web-build /web/dist/ /srv/web-dist/
RUN mkdir -p /srv/data && chown -R kawsay:kawsay /srv
USER kawsay
ENV KAWSAY_SERVE_WEB_DIR=/srv/web-dist
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --retries=4 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.getenv(\"PORT\",\"10000\")}/health',timeout=4)"
CMD ["sh", "start.sh"]
