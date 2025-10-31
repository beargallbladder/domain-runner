# Phase 5: Add all dependencies
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8080

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tini \
    libpq5 \
    gcc \
    g++ \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Phase 5: All dependencies from requirements.txt
RUN pip install --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    psycopg2-binary==2.9.9 \
    sqlalchemy==2.0.23 \
    python-dotenv==1.0.0 \
    pyyaml==6.0.1 \
    jsonschema==4.20.0 \
    urllib3==2.1.0 \
    certifi==2024.2.2 \
    requests==2.31.0 \
    httpx==0.25.2 \
    aiohttp==3.9.5 \
    click==8.1.7 \
    rich==13.7.0 \
    tqdm==4.66.1 \
    structlog==23.2.0 \
    prometheus-client==0.19.0 \
    openai==1.6.1 \
    anthropic==0.8.1 \
    cohere==4.40.0 \
    google-generativeai==0.3.2 \
    replicate==0.22.0 \
    together==1.0.1 \
    numpy==1.24.4 \
    pandas==2.1.4 \
    redis==5.0.1 \
    pytest==7.4.3 \
    pytest-asyncio==0.21.1

# Copy application files
COPY emergency_fix.py ./emergency_fix.py
COPY src ./src
COPY config ./config
COPY schemas ./schemas
COPY orchestrator.py ./orchestrator.py
COPY agents ./agents

# Copy .env.example as fallback
COPY .env.example ./.env.example

# Create runtime directories
RUN mkdir -p artifacts logs

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/healthz || exit 1

# Phase 4: Try running real API service with fallback to emergency fix
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "uvicorn src.api_service:app --host 0.0.0.0 --port ${PORT:-8080} || python emergency_fix.py"]