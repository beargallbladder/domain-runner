#!/usr/bin/env python3
"""
TENSOR INTEGRITY MONITOR - Continuously monitor all 11 LLMs
Alerts when any LLM fails, ensuring tensor synchronization
"""

import psycopg2
import time
import json
from datetime import datetime, timedelta
import requests
import sys

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

REQUIRED_PROVIDERS = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
                      'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']

class TensorIntegrityMonitor:
    def __init__(self):
        self.last_alert_time = {}
        self.alert_cooldown = 300  # 5 minutes between alerts for same provider
        
    def check_provider_health(self, cursor, time_window_hours=1):
        """Check which providers have responded in the last hour"""
        cursor.execute("""
            SELECT DISTINCT
                CASE 
                    WHEN model ILIKE '%openai%' OR model ILIKE '%gpt%' THEN 'openai'
                    WHEN model ILIKE '%anthropic%' OR model ILIKE '%claude%' THEN 'anthropic'
                    WHEN model ILIKE '%deepseek%' THEN 'deepseek'
                    WHEN model ILIKE '%mistral%' THEN 'mistral'
                    WHEN model ILIKE '%xai%' OR model ILIKE '%grok%' THEN 'xai'
                    WHEN model ILIKE '%together%' OR (model ILIKE '%llama%' AND model NOT ILIKE '%perplexity%') THEN 'together'
                    WHEN model ILIKE '%perplexity%' OR model ILIKE '%sonar%' THEN 'perplexity'
                    WHEN model ILIKE '%google%' OR model ILIKE '%gemini%' THEN 'google'
                    WHEN model ILIKE '%cohere%' OR model ILIKE '%command%' THEN 'cohere'
                    WHEN model ILIKE '%ai21%' OR model ILIKE '%j2%' THEN 'ai21'
                    WHEN model ILIKE '%groq%' OR (model ILIKE '%mixtral%' AND model NOT ILIKE '%together%') THEN 'groq'
                    ELSE LOWER(SPLIT_PART(model, '/', 1))
                END as provider,
                COUNT(*) as responses,
                MAX(created_at) as last_response
            FROM domain_responses
            WHERE created_at > NOW() - INTERVAL '%s hours'
            GROUP BY provider
        """, (time_window_hours,))
        
        results = cursor.fetchall()
        active_providers = {}
        
        for provider, count, last_response in results:
            if provider in REQUIRED_PROVIDERS:
                active_providers[provider] = {
                    'count': count,
                    'last_response': last_response
                }
        
        return active_providers
    
    def check_tensor_integrity(self, cursor):
        """Check overall tensor synchronization health"""
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT domain_id) as domains_processed,
                COUNT(*) as total_responses,
                COUNT(DISTINCT batch_id) as unique_batches
            FROM domain_responses
            WHERE created_at > NOW() - INTERVAL '1 hour'
        """)
        
        domains, responses, batches = cursor.fetchone()
        
        # Check batch coordination
        cursor.execute("""
            SELECT COUNT(*) 
            FROM batch_coordination_log
            WHERE start_time > NOW() - INTERVAL '1 hour'
            AND coordination_complete = true
            AND ARRAY_LENGTH(completed_llms, 1) >= 11
        """)
        
        full_tensor_batches = cursor.fetchone()[0]
        
        return {
            'domains_processed': domains,
            'total_responses': responses,
            'unique_batches': batches,
            'full_tensor_batches': full_tensor_batches
        }
    
    def send_alert(self, provider, issue):
        """Send alert for provider issues"""
        current_time = time.time()
        last_alert = self.last_alert_time.get(provider, 0)
        
        if current_time - last_alert > self.alert_cooldown:
            print(f"🚨 ALERT: {provider} - {issue}")
            self.last_alert_time[provider] = current_time
            
            # Here you could add:
            # - Slack webhook
            # - Email notification
            # - PagerDuty alert
            # - SMS via Twilio
            
    def monitor_loop(self):
        """Main monitoring loop"""
        print("🧮 TENSOR INTEGRITY MONITOR STARTED")
        print("=" * 60)
        print(f"Required providers: {', '.join(REQUIRED_PROVIDERS)}")
        print(f"Monitoring interval: 60 seconds")
        print(f"Alert cooldown: {self.alert_cooldown} seconds")
        print()
        
        while True:
            try:
                conn = psycopg2.connect(DATABASE_URL)
                cursor = conn.cursor()
                
                # Check provider health
                active_providers = self.check_provider_health(cursor)
                missing_providers = set(REQUIRED_PROVIDERS) - set(active_providers.keys())
                
                # Check tensor integrity
                tensor_stats = self.check_tensor_integrity(cursor)
                
                # Display status
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                print(f"\n[{timestamp}] TENSOR STATUS")
                print("-" * 40)
                
                # Provider status
                print(f"Active providers: {len(active_providers)}/11")
                if missing_providers:
                    print(f"❌ Missing: {sorted(missing_providers)}")
                    for provider in missing_providers:
                        self.send_alert(provider, "Provider not responding")
                else:
                    print("✅ All 11 providers active!")
                
                # Response counts
                for provider in sorted(REQUIRED_PROVIDERS):
                    if provider in active_providers:
                        data = active_providers[provider]
                        mins_ago = (datetime.now() - data['last_response']).total_seconds() / 60
                        status = "✅" if mins_ago < 60 else "⚠️"
                        print(f"  {status} {provider}: {data['count']} responses (last: {mins_ago:.1f}m ago)")
                    else:
                        print(f"  ❌ {provider}: NO RESPONSES")
                
                # Tensor integrity
                print(f"\nTensor Integrity:")
                print(f"  Domains processed: {tensor_stats['domains_processed']}")
                print(f"  Total responses: {tensor_stats['total_responses']}")
                print(f"  Full tensor batches: {tensor_stats['full_tensor_batches']}")
                
                if len(active_providers) < 11:
                    print(f"\n⚠️  TENSOR BROKEN: Only {len(active_providers)}/11 providers active")
                elif tensor_stats['full_tensor_batches'] == 0:
                    print(f"\n⚠️  WARNING: No full tensor batches in last hour")
                else:
                    print(f"\n✅ TENSOR HEALTHY: All systems operational")
                
                conn.close()
                
            except Exception as e:
                print(f"\n❌ Monitor error: {str(e)}")
            
            # Wait before next check
            time.sleep(60)

def main():
    """Run the monitor"""
    monitor = TensorIntegrityMonitor()
    
    try:
        monitor.monitor_loop()
    except KeyboardInterrupt:
        print("\n\n👋 Monitor stopped by user")
        sys.exit(0)

if __name__ == "__main__":
    main()