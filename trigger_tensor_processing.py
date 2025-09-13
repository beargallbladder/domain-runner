#!/usr/bin/env python3
"""
TENSOR ULTRA-FAST DOMAIN PROCESSING
Processes 3,183 domains at 1000+ domains/hour using all 8 LLM providers
"""
import requests
import time
import psycopg2
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

class TensorDomainProcessor:
    def __init__(self):
        self.conn = psycopg2.connect(DATABASE_URL)
        self.cursor = self.conn.cursor()
        self.start_time = datetime.now()
        
    def get_status(self):
        """Get current processing status"""
        self.cursor.execute("SELECT status, COUNT(*) FROM domains GROUP BY status")
        return dict(self.cursor.fetchall())
    
    def trigger_tensor_processing(self):
        """Trigger the tensor processing endpoint"""
        print("🚀 TENSOR ULTRA-FAST DOMAIN PROCESSING")
        print("=" * 60)
        
        # Get initial status
        initial_status = self.get_status()
        pending = initial_status.get('pending', 0)
        completed = initial_status.get('completed', 0)
        
        print(f"\n📊 Initial Status:")
        print(f"  Pending: {pending}")
        print(f"  Completed: {completed}")
        print(f"  Processing: {initial_status.get('processing', 0)}")
        
        if pending == 0:
            print("\n✅ All domains already processed!")
            return
        
        print(f"\n🎯 Target: Process {pending} domains at 1000+ domains/hour")
        print(f"⚡ Using 8 LLM providers × 3 prompts = 24 parallel calls per domain")
        print(f"🧠 50 domains processed simultaneously\n")
        
        # Trigger tensor processing
        endpoints = [
            "https://sophisticated-runner.onrender.com/tensor-process",
            "https://sophisticated-runner.onrender.com/process-pending-domains",
            "https://sophisticated-runner.onrender.com/ultra-fast-process"
        ]
        
        batch_size = 200  # Process 200 domains at a time
        parallel_workers = 50  # 50 simultaneous domain processors
        
        print("🔄 Starting tensor processing loops...")
        
        # Launch multiple parallel processing sessions
        for i in range(5):  # Start 5 parallel sessions
            for endpoint in endpoints:
                try:
                    response = requests.post(
                        endpoint,
                        json={
                            "batch_size": batch_size,
                            "parallel_workers": parallel_workers,
                            "enable_tensor": True,
                            "providers": ["deepseek", "together", "xai", "perplexity", "openai", "mistral", "anthropic", "google"]
                        },
                        timeout=10
                    )
                    print(f"✅ Session {i+1}: {endpoint} - {response.status_code}")
                except Exception as e:
                    print(f"❌ Session {i+1}: {endpoint} - {str(e)[:50]}")
            
            time.sleep(1)  # Small delay between sessions
        
        print("\n📊 Monitoring progress...")
        self.monitor_progress()
        
    def monitor_progress(self, duration_minutes=10):
        """Monitor processing progress"""
        start_stats = self.get_status()
        start_completed = start_stats.get('completed', 0)
        
        print(f"\nMonitoring for {duration_minutes} minutes...\n")
        
        for minute in range(duration_minutes):
            time.sleep(60)  # Wait 1 minute
            
            current_stats = self.get_status()
            current_completed = current_stats.get('completed', 0)
            current_pending = current_stats.get('pending', 0)
            current_processing = current_stats.get('processing', 0)
            
            # Calculate rate
            new_completed = current_completed - start_completed
            elapsed_hours = (datetime.now() - self.start_time).total_seconds() / 3600
            rate = new_completed / elapsed_hours if elapsed_hours > 0 else 0
            
            # Estimate time remaining
            eta_hours = current_pending / rate if rate > 0 else 999
            
            print(f"⏱️  Minute {minute + 1}:")
            print(f"   Processed: {new_completed} domains")
            print(f"   Rate: {rate:.0f} domains/hour")
            print(f"   Pending: {current_pending}")
            print(f"   Processing: {current_processing}")
            print(f"   ETA: {eta_hours:.1f} hours")
            print(f"   Efficiency: {(rate/1000)*100:.1f}% of target\n")
            
            # Check LLM activity
            self.cursor.execute("""
                SELECT model, COUNT(*) as count
                FROM domain_responses
                WHERE created_at > NOW() - INTERVAL '5 minutes'
                GROUP BY model
                ORDER BY count DESC
            """)
            
            active_models = self.cursor.fetchall()
            if active_models:
                print("   🤖 Active LLMs:")
                for model, count in active_models[:8]:
                    print(f"      {model}: {count}")
                print()
            
            # If all done, exit early
            if current_pending == 0:
                print("🎉 ALL DOMAINS PROCESSED!")
                break
                
    def run(self):
        """Run the tensor processor"""
        try:
            self.trigger_tensor_processing()
            
            # Final report
            final_stats = self.get_status()
            print("\n" + "=" * 60)
            print("📊 FINAL REPORT:")
            print(f"  Completed: {final_stats.get('completed', 0)}")
            print(f"  Pending: {final_stats.get('pending', 0)}")
            print(f"  Failed: {final_stats.get('failed', 0)}")
            
            # Get total responses
            self.cursor.execute("SELECT COUNT(*) FROM domain_responses")
            total_responses = self.cursor.fetchone()[0]
            print(f"  Total LLM Responses: {total_responses}")
            
        finally:
            self.conn.close()

if __name__ == "__main__":
    processor = TensorDomainProcessor()
    processor.run()