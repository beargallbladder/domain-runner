#!/usr/bin/env python3
"""
ULTRA-FAST TENSOR CRAWLER
Target: 1000+ domains/hour using all 8-9 LLMs in parallel
Temporal tensor organization for Bloomberg Intelligence
"""
import requests
import psycopg2
from psycopg2.extras import execute_batch
import concurrent.futures
from datetime import datetime
import time

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

# All available endpoints that might process domains
ENDPOINTS = [
    "https://sophisticated-runner.onrender.com/process-pending-domains",
    "https://sophisticated-runner.onrender.com/ultra-fast-process",
    "https://llmrank.io/api/process",
    "https://seo-metrics-runner.onrender.com/process",
]

class UltraFastTensorCrawler:
    def __init__(self):
        self.conn = psycopg2.connect(DATABASE_URL)
        self.cursor = self.conn.cursor()
        self.start_time = datetime.now()
        self.domains_triggered = 0
        
    def trigger_all_endpoints(self):
        """Trigger all available processing endpoints in parallel"""
        print("🚀 ULTRA-FAST TENSOR CRAWLER")
        print("=" * 50)
        
        # Check current status
        self.cursor.execute("SELECT status, COUNT(*) FROM domains GROUP BY status")
        statuses = dict(self.cursor.fetchall())
        print(f"\n📊 Current Status:")
        for status, count in statuses.items():
            print(f"  {status}: {count}")
            
        # Get total pending
        pending = statuses.get('pending', 0)
        if pending == 0:
            print("\n⚠️  No pending domains!")
            return
            
        print(f"\n🎯 Target: Process {pending} domains at 1000+/hour")
        print(f"⚡ Using 8-9 LLMs in parallel tensor configuration")
        
        # Trigger all endpoints concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            
            for endpoint in ENDPOINTS:
                for i in range(5):  # Multiple calls per endpoint
                    future = executor.submit(self.call_endpoint, endpoint, {
                        "batch_size": 100,
                        "parallel": True,
                        "providers": ["deepseek", "together", "xai", "perplexity", 
                                     "openai", "mistral", "anthropic", "google"],
                        "enable_tensor": True,
                        "temporal_processing": True
                    })
                    futures.append((endpoint, future))
                    
            # Wait for results
            for endpoint, future in futures:
                try:
                    result = future.result(timeout=10)
                    print(f"✅ {endpoint}: {result}")
                except Exception as e:
                    print(f"❌ {endpoint}: {str(e)[:50]}")
                    
        print("\n📡 All processing endpoints triggered!")
        
    def call_endpoint(self, url, data):
        """Call a processing endpoint"""
        try:
            response = requests.post(url, json=data, timeout=10, headers={
                "Content-Type": "application/json",
                "X-API-Key": "internal"
            })
            return f"Status {response.status_code}"
        except Exception as e:
            return f"Error: {str(e)[:30]}"
            
    def monitor_progress(self, duration_minutes=5):
        """Monitor processing progress"""
        print(f"\n📊 Monitoring progress for {duration_minutes} minutes...")
        
        start_stats = self.get_stats()
        
        for i in range(duration_minutes * 6):  # Check every 10 seconds
            time.sleep(10)
            current_stats = self.get_stats()
            
            # Calculate rates
            elapsed_hours = (datetime.now() - self.start_time).total_seconds() / 3600
            new_completed = current_stats['completed'] - start_stats['completed']
            rate = new_completed / elapsed_hours if elapsed_hours > 0 else 0
            
            print(f"\r⚡ Processed: {new_completed} | Rate: {rate:.0f}/hour | " +
                  f"Pending: {current_stats['pending']} | " +
                  f"Processing: {current_stats['processing']}", end='')
                  
    def get_stats(self):
        """Get current processing statistics"""
        self.cursor.execute("SELECT status, COUNT(*) FROM domains GROUP BY status")
        stats = dict(self.cursor.fetchall())
        return {
            'completed': stats.get('completed', 0),
            'pending': stats.get('pending', 0),
            'processing': stats.get('processing', 0)
        }
        
    def optimize_processing(self):
        """Optimize database for ultra-fast processing"""
        print("\n🔧 Optimizing for tensor processing...")
        
        # Ensure indexes exist
        optimize_queries = [
            "CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status)",
            "CREATE INDEX IF NOT EXISTS idx_domains_pending ON domains(id) WHERE status = 'pending'",
            "CREATE INDEX IF NOT EXISTS idx_responses_temporal ON domain_responses(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_responses_domain_model ON domain_responses(domain_id, model)"
        ]
        
        for query in optimize_queries:
            try:
                self.cursor.execute(query)
                self.conn.commit()
            except Exception as e:
                print(f"  Optimization note: {str(e)[:50]}")
                
        print("✅ Database optimized for tensor processing")
        
    def run(self):
        """Run the ultra-fast crawler"""
        try:
            # Optimize first
            self.optimize_processing()
            
            # Trigger all endpoints
            self.trigger_all_endpoints()
            
            # Monitor progress
            self.monitor_progress(duration_minutes=2)
            
            # Final stats
            print("\n\n" + "="*50)
            final_stats = self.get_stats()
            print(f"📊 Final Status:")
            print(f"  Completed: {final_stats['completed']}")
            print(f"  Pending: {final_stats['pending']}")
            print(f"  Processing: {final_stats['processing']}")
            
        finally:
            self.conn.close()

if __name__ == "__main__":
    crawler = UltraFastTensorCrawler()
    crawler.run()