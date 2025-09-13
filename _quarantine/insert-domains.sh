#!/bin/bash

# Insert domains from domains.txt into the database
DATABASE_URL="postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

echo "🚀 Inserting domains into database..."
echo "===================================="

# Count domains
TOTAL_DOMAINS=$(wc -l < domains.txt)
echo "Found $TOTAL_DOMAINS domains in domains.txt"

# Create SQL file
echo "Creating SQL insert statements..."
cat > insert_domains.sql << 'EOF'
-- Insert domains batch
BEGIN;

-- Clear any test domains first (optional)
-- DELETE FROM domains WHERE domain LIKE 'test-%';

-- Insert all domains as pending
INSERT INTO domains (domain, status) VALUES
EOF

# Add each domain
first=true
while IFS= read -r domain; do
    if [ -n "$domain" ]; then
        if [ "$first" = true ]; then
            echo "('$domain', 'pending')" >> insert_domains.sql
            first=false
        else
            echo ",('$domain', 'pending')" >> insert_domains.sql
        fi
    fi
done < domains.txt

# Close the SQL
echo "ON CONFLICT (domain) DO UPDATE SET status = 'pending';" >> insert_domains.sql
echo "COMMIT;" >> insert_domains.sql

echo "SQL file created with $TOTAL_DOMAINS domains"

# Execute the SQL
echo ""
echo "Inserting domains into database..."
PGPASSWORD=wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5 psql "$DATABASE_URL" -f insert_domains.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully inserted domains!"
    
    # Check pending count
    echo ""
    echo "Verifying insertion..."
    curl -s https://domain-runner.onrender.com/api/pending-count | jq '.'
else
    echo "❌ Failed to insert domains"
fi

# Cleanup
rm -f insert_domains.sql

echo ""
echo "===================================="
echo "Domains are ready for processing!"
echo "The service will start processing them automatically every 30 seconds."