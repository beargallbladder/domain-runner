#!/usr/bin/env python3
"""
Real-time monitoring for production crawl
"""
import psycopg2
import time
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def monitor_crawl():
    while True:
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            
            # Get current stats
            cur.execute('''
                SELECT 
                    COUNT(DISTINCT d.id) as total_domains,
                    COUNT(DISTINCT dr.domain_id) as domains_with_responses,
                    COUNT(dr.id) as total_responses,
                    COUNT(DISTINCT CASE 
                        WHEN response_count >= 3 THEN domain_id 
                    END) as fully_complete
                FROM domains d
                LEFT JOIN (
                    SELECT 
                        domain_id, 
                        COUNT(*) as response_count,
                        id
                    FROM domain_responses
                    WHERE prompt IS NOT NULL
                    GROUP BY domain_id, id
                ) dr ON d.id = dr.domain_id
            ''')
            
            total, with_responses, total_responses, fully_complete = cur.fetchone()
            
            # Get recent activity
            cur.execute('''
                SELECT COUNT(*) 
                FROM domain_responses 
                WHERE created_at > NOW() - INTERVAL '1 minute'
            ''')
            recent_count = cur.fetchone()[0]
            
            # Calculate progress
            completion_pct = (with_responses / total * 100) if total > 0 else 0
            full_completion_pct = (fully_complete / total * 100) if total > 0 else 0
            
            # Clear screen and show stats
            print('\033[2J\033[H')  # Clear screen
            print(f'🚀 PRODUCTION CRAWL MONITOR - {datetime.now().strftime("%H:%M:%S")}')
            print('=' * 60)
            print(f'📊 Progress: {with_responses:,}/{total:,} domains ({completion_pct:.1f}%)')
            print(f'✅ Fully Complete: {fully_complete:,} domains ({full_completion_pct:.1f}%)')
            print(f'📈 Total Responses: {total_responses:,}')
            print(f'⚡ Activity: {recent_count} responses/minute')
            print(f'⏳ Remaining: {total - with_responses:,} domains')
            
            # Estimate time remaining
            if recent_count > 0:
                domains_per_minute = recent_count / 3  # 3 responses per domain
                remaining_domains = total - with_responses
                minutes_remaining = remaining_domains / domains_per_minute if domains_per_minute > 0 else 0
                hours_remaining = minutes_remaining / 60
                print(f'⏰ ETA: {hours_remaining:.1f} hours ({int(minutes_remaining)} minutes)')
            
            # Show recent domains
            cur.execute('''
                SELECT d.domain, dr.prompt_type, dr.created_at
                FROM domain_responses dr
                JOIN domains d ON dr.domain_id = d.id
                WHERE dr.created_at > NOW() - INTERVAL '30 seconds'
                ORDER BY dr.created_at DESC
                LIMIT 5
            ''')
            
            recent = cur.fetchall()
            if recent:
                print(f'\n🔄 Recent Activity:')
                for domain, ptype, created in recent:
                    print(f'  {created.strftime("%H:%M:%S")} - {domain} ({ptype})')
            
            conn.close()
            
            # Check if complete
            if with_responses >= total:
                print(f'\n🎉 CRAWL COMPLETE! All {total:,} domains processed!')
                break
                
        except Exception as e:
            print(f'Monitor error: {str(e)}')
        
        time.sleep(5)  # Update every 5 seconds

if __name__ == "__main__":
    monitor_crawl()