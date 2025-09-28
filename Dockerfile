# Simple and reliable Python base
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8080

WORKDIR /app

# OS deps for Python packages and PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    tini \
    gcc \
    g++ \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src ./src
COPY orchestrator.py ./orchestrator.py
COPY orchestrator_demo.py ./orchestrator_demo.py
COPY agents ./agents
COPY services ./services
COPY config ./config
COPY schemas ./schemas

# Copy .env.example as fallback
COPY .env.example ./.env.example

# Create directories for artifacts and logs
RUN mkdir -p artifacts logs

EXPOSE 8080

# Health check for web service
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/healthz || exit 1

# Copy emergency fix
COPY emergency_fix.py ./emergency_fix.py

# Default command: web service (with fallback to emergency fix)
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "python emergency_fix.py || uvicorn src.api_service:app --host 0.0.0.0 --port ${PORT:-8080}"]