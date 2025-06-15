#!/bin/bash

# Ensure script fails on any error
set -e

# Configuration
APP_NAME="raw-capture-runner"
BACKUP_DIR="./backups"

# Create necessary directories
mkdir -p "$BACKUP_DIR"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOL
NODE_ENV=production
OPENAI_API_KEY=your_api_key_here
EOL
    echo "Please edit .env file and add your OpenAI API key"
    exit 1
fi

# Build and deploy
echo "Building and deploying $APP_NAME..."

# Stop existing containers
docker-compose down || true

# Build new images
docker-compose build

# Start services
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check service health
echo "Checking service health..."
docker-compose ps

# Show logs
echo "Recent logs:"
docker-compose logs --tail=100

echo "Deployment complete! Dashboard available at http://localhost:3000"
echo "Monitor the logs with: docker-compose logs -f" 