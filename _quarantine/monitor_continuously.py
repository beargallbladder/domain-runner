#!/usr/bin/env python3
"""
Monitor deployment continuously until services are up
"""

import requests
import time
import psycopg2
from datetime import datetime

print("🔄 CONTINUOUS DEPLOYMENT MONITOR")
print("=" * 60)
print("Will check every 30 seconds until services are up and 11 LLMs work")

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

check = 0
while True:
    check += 1
    print(f"\n⏰ Check #{check} at {datetime.now().strftime('%H:%M:%S')}")
    
    # Check services
    services_up = True
    for name, url in [
        ('sophisticated-runner', 'https://sophisticated-runner.onrender.com/health'),
        ('domain-processor-v2', 'https://domain-processor-v2.onrender.com/health')
    ]:
        try:
            r = requests.get(url, timeout=5)
            print(f"{name}: {r.status_code}")
            if r.status_code != 200:
                services_up = False
        except:
            print(f"{name}: DOWN")
            services_up = False
    
    if services_up:
        print("\n✅ Services are UP! Testing 11 LLMs...")
        
        # Reset test domain
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("UPDATE domains SET status = 'pending' WHERE domain = 'test-11-final.com' RETURNING id")
        result = cur.fetchone()
        conn.commit()
        
        if result:
            # Trigger processing
            print("Triggering processing...")
            try:
                resp = requests.post(
                    'https://sophisticated-runner.onrender.com/api/process-domains-synchronized',
                    json={'limit': 1},
                    timeout=30
                )
                print(f"Response: {resp.status_code}")
            except Exception as e:
                print(f"Error: {e}")
            
            # Wait and check results
            time.sleep(60)
            
            cur.execute("""
                SELECT model, COUNT(*) 
                FROM domain_responses 
                WHERE created_at > NOW() - INTERVAL '2 minutes'
                GROUP BY model
                ORDER BY model
            """)
            
            results = cur.fetchall()
            active = [r[0] for r in results]
            
            print(f"\nActive LLMs: {len(active)}/11")
            for model, count in results:
                print(f"  {model}: {count} responses")
            
            if len(active) >= 11:
                print("\n🎉 ALL 11 LLMS WORKING! 🎉")
                break
        
        cur.close()
        conn.close()
    
    time.sleep(30)