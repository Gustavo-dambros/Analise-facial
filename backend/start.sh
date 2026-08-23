#!/bin/bash
set -e

echo "=== FaceMax Backend Startup ==="

# Step 1: Run database initialization (migrations + schema sync)
echo "[1/2] Initializing database..."
python scripts/db_init.py
echo "  -> Database ready"

# Step 2: Start Uvicorn (producao: workers=2, uvloop, httptools)
echo "[2/2] Starting Uvicorn..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --loop uvloop --http httptools
