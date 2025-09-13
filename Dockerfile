FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY agents/ ./agents/
COPY config/ ./config/
COPY schemas/ ./schemas/
COPY orchestrator.py .
COPY orchestrator_demo.py .

# Create directories for artifacts and logs
RUN mkdir -p artifacts logs

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "from agents.database_connector.src.connector import DatabaseConnector; db = DatabaseConnector(); print(db.health_check())"

# Default command
CMD ["python3", "orchestrator.py"]