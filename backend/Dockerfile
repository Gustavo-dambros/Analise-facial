# ============================================================
# Dockerfile - FaceMax Backend (FastAPI + Uvicorn)
# ============================================================
# Multi-stage build: dependencies + production runtime
#
# Build:
#   docker build -t facemax-backend .
#
# Run:
#   docker run -d -p 8000:8000 --env-file .env facemax-backend
# ============================================================

# --- Estagio 1: Instalacao de dependencias ---
FROM python:3.12-slim AS deps

WORKDIR /app

# Dependencias de sistema para OpenCV e MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1-mesa-glx \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python (cache de camadas)
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --- Estagio 2: Runtime de producao ---
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copiar dependencias instaladas
COPY --from=deps /install /usr/local

# Copiar codigo-fonte
COPY . .

# Criar usuario nao-root
RUN groupadd -r facemax && useradd -r -g facemax -d /app -s /sbin/nologin facemax \
    && chown -R facemax:facemax /app

USER facemax

# Porta do Uvicorn
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health')" || exit 1

# Ensure start.sh is executable
RUN chmod +x /app/start.sh

# Iniciar Uvicorn (producao: workers=2, sem reload)
# start.sh roda db_init.py (migracoes + sync de schema) antes do uvicorn
CMD ["/app/start.sh"]
