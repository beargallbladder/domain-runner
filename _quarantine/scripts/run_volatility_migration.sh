#!/bin/bash

# Script to run volatility scoring migration
# This creates all necessary tables for the volatility scoring system

echo "Running volatility scoring migration..."

# Database connection from environment or use the production connection string
DATABASE_URL="${DATABASE_URL:-postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db}"

# Run the migration
psql "$DATABASE_URL" -f ../migrations/004_volatility_scoring_tables.sql

if [ $? -eq 0 ]; then
    echo "Migration completed successfully!"
    
    # Verify tables were created
    echo -e "\nVerifying tables..."
    psql "$DATABASE_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('volatility_scores', 'swarm_learning', 'memory_tensors', 'weekly_intelligence', 'category_volatility', 'brandsentiment_sync') ORDER BY tablename;"
    
    # Check if columns were added to domain_responses
    echo -e "\nVerifying domain_responses columns..."
    psql "$DATABASE_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'domain_responses' AND column_name IN ('memory_score', 'sentiment_score', 'detail_score', 'computed_at') ORDER BY column_name;"
    
else
    echo "Migration failed!"
    exit 1
fi