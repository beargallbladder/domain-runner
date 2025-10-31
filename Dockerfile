# Minimal emergency deployment
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

# Minimal system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tini \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Install only essential Python packages
RUN pip install --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    psycopg2-binary==2.9.9 \
    python-dotenv==1.0.0

# Copy emergency fix
COPY emergency_fix.py ./emergency_fix.py

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/healthz || exit 1

# Run emergency fix service
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "emergency_fix.py"]