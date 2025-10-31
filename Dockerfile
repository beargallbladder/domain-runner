# Phase 2: Add core dependencies
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

# Phase 2: Core dependencies (database, web framework, utilities)
RUN pip install --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    psycopg2-binary==2.9.9 \
    sqlalchemy==2.0.23 \
    python-dotenv==1.0.0 \
    pyyaml==6.0.1 \
    jsonschema==4.20.0 \
    requests==2.31.0 \
    httpx==0.25.2 \
    click==8.1.7 \
    rich==13.7.0

# Copy application files
COPY emergency_fix.py ./emergency_fix.py
COPY src ./src
COPY config ./config
COPY schemas ./schemas

# Create runtime directories
RUN mkdir -p artifacts logs

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/healthz || exit 1

# Run emergency fix (will switch to full app in later phases)
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "emergency_fix.py"]