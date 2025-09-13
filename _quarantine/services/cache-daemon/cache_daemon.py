#!/usr/bin/env python3
"""
Cache Daemon Service - Runs continuous cache updates
"""

import os
import sys
import time
import signal
import logging
import subprocess
from datetime import datetime
import psycopg2

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from cache_scheduler import CacheScheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/Users/samkim/domain-runner/cache_daemon.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

class CacheDaemon:
    def __init__(self):
        self.running = True
        self.scheduler = CacheScheduler()
        signal.signal(signal.SIGINT, self.handle_shutdown)
        signal.signal(signal.SIGTERM, self.handle_shutdown)
    
    def handle_shutdown(self, signum, frame):
        """Handle graceful shutdown"""
        logging.info("Received shutdown signal, stopping daemon...")
        self.running = False
    
    def check_stale_count(self):
        """Check how many domains need refresh"""
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(*)
            FROM public_domain_cache
            WHERE updated_at < NOW() - INTERVAL '24 hours'
        """)
        
        count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        return count
    
    def run_immediate_refresh(self):
        """Run immediate refresh for all stale domains"""
        logging.info("Starting immediate cache refresh for all stale domains...")
        
        stale_count = self.check_stale_count()
        if stale_count == 0:
            logging.info("No stale domains found")
            return
        
        logging.info(f"Found {stale_count} stale domains to refresh")
        
        # Run in batches until all are fresh
        batch_num = 1
        while stale_count > 0 and self.running:
            logging.info(f"Running batch {batch_num}, {stale_count} domains remaining...")
            
            # Run cache updater
            process = subprocess.Popen(
                ['python3', '/Users/samkim/domain-runner/cache_updater.py', 
                 '--mode', 'full', '--batch-size', '200'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for completion or interruption
            while process.poll() is None and self.running:
                time.sleep(1)
            
            if not self.running:
                process.terminate()
                break
            
            stdout, stderr = process.communicate()
            
            if process.returncode != 0:
                logging.error(f"Cache updater failed: {stderr}")
                break
            
            # Check remaining
            new_stale_count = self.check_stale_count()
            if new_stale_count >= stale_count:
                logging.warning("No progress made, stopping")
                break
            
            stale_count = new_stale_count
            batch_num += 1
            
            # Small delay between batches
            time.sleep(2)
        
        if stale_count == 0:
            logging.info("✅ All domains refreshed successfully!")
        else:
            logging.info(f"⚠️  Refresh stopped with {stale_count} domains remaining")
    
    def run(self):
        """Main daemon loop"""
        logging.info("=== CACHE DAEMON STARTED ===")
        logging.info(f"PID: {os.getpid()}")
        
        # First, run immediate refresh
        self.run_immediate_refresh()
        
        if not self.running:
            return
        
        # Then start the scheduler for ongoing updates
        logging.info("Starting scheduled cache updates...")
        
        # Run scheduler in test mode (single update cycle)
        while self.running:
            try:
                # Run incremental update
                self.scheduler.run_incremental_update()
                
                # Run high volatility update
                self.scheduler.update_high_volatility_domains()
                
                # Generate health report
                self.scheduler.generate_health_report()
                
                # Sleep for 4 hours
                for _ in range(4 * 60 * 60):  # 4 hours in seconds
                    if not self.running:
                        break
                    time.sleep(1)
                
            except Exception as e:
                logging.error(f"Error in daemon loop: {e}")
                time.sleep(60)  # Wait a minute before retrying
        
        logging.info("=== CACHE DAEMON STOPPED ===")


def main():
    """Main entry point"""
    # Check if daemon is already running
    pid_file = '/Users/samkim/domain-runner/cache_daemon.pid'
    
    if os.path.exists(pid_file):
        with open(pid_file, 'r') as f:
            old_pid = int(f.read().strip())
        
        # Check if process is still running
        try:
            os.kill(old_pid, 0)
            print(f"Cache daemon is already running (PID: {old_pid})")
            sys.exit(1)
        except OSError:
            # Process doesn't exist, remove stale PID file
            os.remove(pid_file)
    
    # Write PID file
    with open(pid_file, 'w') as f:
        f.write(str(os.getpid()))
    
    try:
        daemon = CacheDaemon()
        daemon.run()
    finally:
        # Clean up PID file
        if os.path.exists(pid_file):
            os.remove(pid_file)


if __name__ == "__main__":
    main()