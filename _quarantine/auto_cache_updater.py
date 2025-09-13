#!/usr/bin/env python3
"""
Auto Cache Updater - Domain Processing Monitor
Monitors domain processing and triggers cache updates automatically
"""

import os
import sys
import json
import requests
import time
import logging
from datetime import datetime, timedelta
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cache_updater.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Configuration
SERVICES = {
    'sophisticated_runner': 'https://sophisticated-runner.onrender.com',
    'public_api': 'https://llmrank.io',
    'domain_processor': 'https://domain-processor-v2.onrender.com'
}

def check_pending_domains():
    """Check how many domains are pending processing"""
    try:
        response = requests.get(f"{SERVICES['sophisticated_runner']}/api/pending-count", timeout=30)
        if response.status_code == 200:
            data = response.json()
            return data.get('pending', 0)
        else:
            logger.warning(f"Failed to get pending count: {response.status_code}")
            return None
    except Exception as e:
        logger.error(f"Error checking pending domains: {e}")
        return None

def trigger_processing():
    """Trigger domain processing if domains are pending"""
    try:
        response = requests.post(
            f"{SERVICES['sophisticated_runner']}/process-pending-domains",
            headers={'Content-Type': 'application/json', 'X-API-Key': 'auto-updater'},
            timeout=60
        )
        if response.status_code in [200, 202]:
            logger.info("Successfully triggered domain processing")
            return True
        else:
            logger.warning(f"Processing trigger failed: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Error triggering processing: {e}")
        return False

def check_service_health():
    """Check health of all services"""
    health_status = {}
    for service_name, url in SERVICES.items():
        try:
            response = requests.get(f"{url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                health_status[service_name] = {
                    'status': 'healthy',
                    'uptime': data.get('uptime_seconds', 0),
                    'version': data.get('version', 'unknown')
                }
            else:
                health_status[service_name] = {'status': 'unhealthy', 'code': response.status_code}
        except Exception as e:
            health_status[service_name] = {'status': 'error', 'error': str(e)}
    
    return health_status

def main():
    """Main monitoring loop"""
    logger.info("🚀 Auto Cache Updater started")
    
    while True:
        try:
            # Check service health
            health = check_service_health()
            logger.info(f"Service health: {json.dumps(health, indent=2)}")
            
            # Check pending domains
            pending = check_pending_domains()
            if pending is not None:
                logger.info(f"📊 Pending domains: {pending}")
                
                # Trigger processing if there are pending domains
                if pending > 0:
                    logger.info(f"🔄 Processing {pending} pending domains...")
                    success = trigger_processing()
                    if success:
                        logger.info("✅ Processing triggered successfully")
                    else:
                        logger.error("❌ Failed to trigger processing")
                else:
                    logger.info("✅ No pending domains - system idle")
            
            # Log timestamp
            logger.info(f"🕐 Next check in 30 minutes - {datetime.now()}")
            
            # Wait 30 minutes
            time.sleep(1800)
            
        except KeyboardInterrupt:
            logger.info("🛑 Auto cache updater stopped by user")
            break
        except Exception as e:
            logger.error(f"🚨 Unexpected error: {e}")
            logger.error(traceback.format_exc())
            # Wait 5 minutes before retrying on error
            time.sleep(300)

if __name__ == "__main__":
    main()