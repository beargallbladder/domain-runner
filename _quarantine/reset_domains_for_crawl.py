#!/usr/bin/env python3
"""Reset domains from processing to pending for full crawl"""

import psycopg2
from datetime import datetime

DB_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

print("🔄 RESETTING DOMAINS FOR FULL CRAWL")
print("=" * 60)

try:
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # Check current status
    print("\nCurrent domain status:")
    cur.execute("""
        SELECT status, COUNT(*) 
        FROM domains 
        GROUP BY status
        ORDER BY COUNT(*) DESC
    """)
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]} domains")
    
    # Reset processing domains to pending
    print("\nResetting 'processing' domains to 'pending'...")
    cur.execute("""
        UPDATE domains 
        SET status = 'pending', 
            updated_at = NOW()
        WHERE status = 'processing'
        RETURNING id
    """)
    
    reset_count = cur.rowcount
    conn.commit()
    
    print(f"✅ Reset {reset_count} domains to pending status")
    
    # Verify new status
    print("\nNew domain status:")
    cur.execute("""
        SELECT status, COUNT(*) 
        FROM domains 
        GROUP BY status
        ORDER BY COUNT(*) DESC
    """)
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]} domains")
    
    # Check if we need to add missing providers
    print("\n\nChecking for domains missing LLM coverage...")
    cur.execute("""
        SELECT d.domain, COUNT(DISTINCT dr.model) as llm_count
        FROM domains d
        LEFT JOIN domain_responses dr ON d.id = dr.domain_id
        WHERE d.status = 'pending'
        GROUP BY d.id, d.domain
        HAVING COUNT(DISTINCT dr.model) < 11
        LIMIT 10
    """)
    
    missing_coverage = cur.fetchall()
    if missing_coverage:
        print(f"Found {len(missing_coverage)} domains with incomplete LLM coverage")
        for row in missing_coverage[:5]:
            print(f"  {row[0]}: {row[1]}/11 LLMs")
    
    cur.close()
    conn.close()
    
    print("\n✅ DOMAINS READY FOR CRAWL!")
    print("Now trigger the crawl via the API or service")
    
except Exception as e:
    print(f"❌ Error: {e}")