#!/usr/bin/env bash
set -euo pipefail
cp -n .env.example .env || true
python3 -m venv .venv
. .venv/bin/activate
pip install -U pip wheel
pip install -r requirements.txt
psql "$DATABASE_URL" -f migrations/20250913_core_tables.sql || true
echo "Bootstrap complete. Edit .env to add keys, then: make run.pipeline.demo"