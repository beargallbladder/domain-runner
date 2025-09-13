# Production Dockerfile for Public API Service
FROM python:3.11-slim AS production

# Security: Create non-root user
RUN groupadd -r apiuser && useradd -r -g apiuser apiuser

# Install system dependencies and security updates
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        postgresql-client \
    && apt-get upgrade -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

# Copy application code
COPY --chown=apiuser:apiuser . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8000
ENV ENVIRONMENT=production
ENV SERVICE_NAME=llm-pagerank-public-api
ENV LOG_LEVEL=INFO

# Security: Use non-root user
USER apiuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE 8000

# Production server with proper worker configuration
CMD ["gunicorn", "production_api:app", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "2", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info", \
     "--timeout", "120", \
     "--keepalive", "5", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "100", \
     "--preload"]