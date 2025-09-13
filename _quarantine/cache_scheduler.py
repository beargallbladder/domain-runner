#!/usr/bin/env python3
"""
Automated Cache Scheduler for public_domain_cache
Runs continuous cache updates to keep data fresh
"""

import schedule
import time
import subprocess
import logging
from datetime import datetime
import psycopg2
import os
import signal
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cache_scheduler.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

class CacheScheduler:
    def __init__(self):
        self.running = True
        signal.signal(signal.SIGINT, self.handle_shutdown)
        signal.signal(signal.SIGTERM, self.handle_shutdown)
        
    def handle_shutdown(self, signum, frame):
        """Handle graceful shutdown"""
        logging.info("Received shutdown signal. Stopping scheduler...")
        self.running = False
        sys.exit(0)
    
    def get_cache_stats(self):
        """Get current cache statistics"""
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN updated_at > NOW() - INTERVAL '1 hour' THEN 1 END) as fresh,
                    COUNT(CASE WHEN updated_at < NOW() - INTERVAL '24 hours' THEN 1 END) as stale
                FROM public_domain_cache
            """)
            
            stats = cursor.fetchone()
            cursor.close()
            conn.close()
            
            return {
                'total': stats[0],
                'fresh': stats[1],
                'stale': stats[2]
            }
        except Exception as e:
            logging.error(f"Error getting cache stats: {e}")
            return None
    
    def run_incremental_update(self):
        """Run incremental cache update"""
        logging.info("Starting scheduled incremental update...")
        
        stats_before = self.get_cache_stats()
        if stats_before:
            logging.info(f"Cache status before: Total={stats_before['total']}, Fresh={stats_before['fresh']}, Stale={stats_before['stale']}")
        
        try:
            # Run cache updater with smaller batch for incremental updates
            result = subprocess.run(
                ['python3', 'cache_updater.py', '--mode', 'incremental', '--batch-size', '25'],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout for incremental updates
            )
            
            if result.returncode == 0:
                logging.info("Incremental update completed successfully")
                
                stats_after = self.get_cache_stats()
                if stats_after and stats_before:
                    logging.info(f"Cache status after: Total={stats_after['total']}, Fresh={stats_after['fresh']}, Stale={stats_after['stale']}")
                    logging.info(f"Updated {stats_after['fresh'] - stats_before['fresh']} domains")
            else:
                logging.error(f"Incremental update failed: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            logging.warning("Incremental update timed out after 5 minutes")
        except Exception as e:
            logging.error(f"Error running incremental update: {e}")
    
    def run_full_update(self):
        """Run full cache update for stale domains"""
        logging.info("Starting scheduled full update...")
        
        stats = self.get_cache_stats()
        if stats and stats['stale'] == 0:
            logging.info("No stale domains found. Skipping full update.")
            return
        
        try:
            # Run cache updater with larger batch for full updates
            result = subprocess.run(
                ['python3', 'cache_updater.py', '--mode', 'full', '--batch-size', '50'],
                capture_output=True,
                text=True,
                timeout=1800  # 30 minute timeout for full updates
            )
            
            if result.returncode == 0:
                logging.info("Full update completed successfully")
            else:
                logging.error(f"Full update failed: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            logging.warning("Full update timed out after 30 minutes")
        except Exception as e:
            logging.error(f"Error running full update: {e}")
    
    def health_check(self):
        """Perform health check and log status"""
        stats = self.get_cache_stats()
        if stats:
            freshness_pct = (stats['fresh'] / stats['total'] * 100) if stats['total'] > 0 else 0
            staleness_pct = (stats['stale'] / stats['total'] * 100) if stats['total'] > 0 else 0
            
            logging.info(f"HEALTH CHECK: Total domains={stats['total']}, Freshness={freshness_pct:.1f}%, Staleness={staleness_pct:.1f}%")
            
            # Alert if too many stale domains
            if staleness_pct > 20:
                logging.warning(f"WARNING: {staleness_pct:.1f}% of cache is stale (>24h old)")
    
    def start(self):
        """Start the scheduler"""
        logging.info("Cache scheduler starting...")
        
        # Schedule tasks
        # Run incremental updates every 15 minutes
        schedule.every(15).minutes.do(self.run_incremental_update)
        
        # Run full update twice daily (during low traffic hours)
        schedule.every().day.at("02:00").do(self.run_full_update)
        schedule.every().day.at("14:00").do(self.run_full_update)
        
        # Health check every hour
        schedule.every().hour.do(self.health_check)
        
        # Run initial tasks
        self.health_check()
        self.run_incremental_update()
        
        logging.info("Scheduler initialized. Running tasks:")
        logging.info("- Incremental updates: Every 15 minutes")
        logging.info("- Full updates: Daily at 02:00 and 14:00 UTC")
        logging.info("- Health checks: Every hour")
        
        # Main loop
        while self.running:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except Exception as e:
                logging.error(f"Error in scheduler loop: {e}")
                time.sleep(60)
        
        logging.info("Cache scheduler stopped.")


def main():
    """Main entry point"""
    scheduler = CacheScheduler()
    
    # Check if running in background mode
    if '--daemon' in sys.argv:
        # Fork to background
        try:
            pid = os.fork()
            if pid > 0:
                # Parent process
                print(f"Cache scheduler started in background with PID {pid}")
                sys.exit(0)
        except OSError as e:
            print(f"Fork failed: {e}")
            sys.exit(1)
        
        # Child process continues
        os.setsid()
        
        # Redirect standard file descriptors
        sys.stdout.flush()
        sys.stderr.flush()
        
        # Write PID file
        with open('cache_scheduler.pid', 'w') as f:
            f.write(str(os.getpid()))
    
    scheduler.start()


if __name__ == "__main__":
    main()