#!/bin/bash

# Run volatility tables migration

echo "🚀 Running volatility tables migration..."

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL or create a .env file with DATABASE_URL=..."
    exit 1
fi

# Run the migration
echo "📊 Creating volatility tracking tables..."
psql "$DATABASE_URL" < migrations/add_volatility_tables.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "New tables created:"
    echo "  - volatility_scores"
    echo "  - swarm_learning"
    echo "  - pattern_detections (if not exists)"
    echo "  - pattern_alerts (if not exists)"
    echo ""
    echo "Updated tables:"
    echo "  - domain_responses (added provider, tier, quality_score columns)"
else
    echo "❌ Migration failed!"
    exit 1
fi