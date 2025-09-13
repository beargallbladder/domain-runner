#!/usr/bin/env python3
"""
🚨 EMERGENCY DATA RECOVERY SCRIPT
Fix stuck domains and restart data processing

ISSUE: 29 domains stuck in "processing" status since June 12
IMPACT: No fresh data in 72+ hours - revenue critical
"""

import requests
import psycopg2
import time
from datetime import datetime
import os

# Production database connection
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def get_db_connection():
    """Get database connection with SSL"""
    return psycopg2.connect(DATABASE_URL, sslmode='require')

def check_stuck_domains():
    """Check for domains stuck in processing status"""
    print("🔍 CHECKING FOR STUCK DOMAINS...")
    print("=" * 50)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get stuck domains
    cursor.execute("""
        SELECT domain, status, last_processed_at, 
               EXTRACT(EPOCH FROM (NOW() - last_processed_at))/3600 as hours_stuck
        FROM domains 
        WHERE status = 'processing'
        ORDER BY last_processed_at ASC
    """)
    
    stuck_domains = cursor.fetchall()
    
    if stuck_domains:
        print(f"❌ FOUND {len(stuck_domains)} STUCK DOMAINS:")
        for i, (domain, status, last_processed, hours) in enumerate(stuck_domains, 1):
            print(f"   {i:2d}. {domain}")
            print(f"       Status: {status}")
            print(f"       Stuck for: {hours:.1f} hours")
            print(f"       Last processed: {last_processed}")
            print()
    else:
        print("✅ No stuck domains found!")
    
    cursor.close()
    conn.close()
    return len(stuck_domains)

def reset_stuck_domains():
    """Reset stuck domains to pending status"""
    print("🔧 RESETTING STUCK DOMAINS...")
    print("=" * 50)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Reset stuck domains (processing for more than 1 hour)
    cursor.execute("""
        UPDATE domains 
        SET status = 'pending',
            last_processed_at = NULL,
            process_count = process_count + 1
        WHERE status = 'processing' 
        AND (last_processed_at < NOW() - INTERVAL '1 hour' OR last_processed_at IS NULL)
        RETURNING domain, process_count
    """)
    
    reset_domains = cursor.fetchall()
    conn.commit()
    
    if reset_domains:
        print(f"✅ RESET {len(reset_domains)} DOMAINS TO PENDING:")
        for domain, count in reset_domains:
            print(f"   • {domain} (attempt #{count})")
    else:
        print("ℹ️  No domains needed resetting")
    
    cursor.close()
    conn.close()
    return len(reset_domains)

def check_sophisticated_runner():
    """Check if sophisticated-runner is responsive"""
    print("🔍 CHECKING SOPHISTICATED-RUNNER STATUS...")
    print("=" * 50)
    
    try:
        response = requests.get("https://sophisticated-runner.onrender.com/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("✅ Sophisticated-runner is HEALTHY")
            print(f"   Service ID: {data.get('service_id', 'unknown')}")
            print(f"   API Keys: {len(data.get('api_keys_configured', {}))} configured")
            return True
        else:
            print(f"❌ Sophisticated-runner returned {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot reach sophisticated-runner: {e}")
        return False

def trigger_processing_restart():
    """Try to restart processing by adding a test domain"""
    print("🚀 TRIGGERING PROCESSING RESTART...")
    print("=" * 50)
    
    try:
        # Add a test domain to trigger processing
        test_domains = ["test-processing-restart.com"]
        
        payload = {"domains": test_domains}
        response = requests.post(
            "https://sophisticated-runner.onrender.com/add-domains",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Processing restart triggered!")
            print(f"   Message: {data.get('message', 'Unknown')}")
            return True
        else:
            print(f"❌ Failed to trigger restart: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error triggering restart: {e}")
        return False

def verify_processing_active():
    """Verify that processing is actually running"""
    print("⏳ VERIFYING PROCESSING IS ACTIVE...")
    print("=" * 50)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Wait and check if domains are being processed
    initial_time = time.time()
    
    # Get initial counts
    cursor.execute("""
        SELECT 
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'processing') as processing,
            COUNT(*) FILTER (WHERE status = 'completed') as completed
        FROM domains
    """)
    
    initial_counts = cursor.fetchone()
    print(f"Initial state: {initial_counts[0]} pending, {initial_counts[1]} processing, {initial_counts[2]} completed")
    
    print("Waiting 30 seconds to check for activity...")
    time.sleep(30)
    
    # Check again
    cursor.execute("""
        SELECT 
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'processing') as processing,
            COUNT(*) FILTER (WHERE status = 'completed') as completed
        FROM domains
    """)
    
    final_counts = cursor.fetchone()
    print(f"After 30s: {final_counts[0]} pending, {final_counts[1]} processing, {final_counts[2]} completed")
    
    # Check if anything changed
    if (initial_counts[1] != final_counts[1] or  # processing count changed
        initial_counts[2] != final_counts[2]):   # completed count changed
        print("✅ PROCESSING IS ACTIVE! Domains are being processed.")
        success = True
    else:
        print("❌ NO ACTIVITY DETECTED. Processing may still be stuck.")
        success = False
    
    cursor.close()
    conn.close()
    return success

def main():
    """Main recovery process"""
    print("🚨 EMERGENCY DATA RECOVERY - STARTING")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("Issue: Stuck domains blocking data processing")
    print("Goal: Restore fresh data collection")
    print()
    
    try:
        # Step 1: Check stuck domains
        stuck_count = check_stuck_domains()
        print()
        
        # Step 2: Reset stuck domains if any found
        if stuck_count > 0:
            reset_count = reset_stuck_domains()
            print()
            
            if reset_count > 0:
                print(f"✅ Successfully reset {reset_count} stuck domains")
            else:
                print("⚠️  No domains were reset")
        else:
            print("✅ No stuck domains to reset")
        
        print()
        
        # Step 3: Check sophisticated-runner health
        runner_healthy = check_sophisticated_runner()
        print()
        
        # Step 4: Trigger processing restart
        if runner_healthy:
            restart_success = trigger_processing_restart()
            print()
            
            # Step 5: Verify processing is working
            if restart_success:
                processing_active = verify_processing_active()
                print()
                
                if processing_active:
                    print("🎉 SUCCESS: DATA PROCESSING RESTORED!")
                    print("✅ Stuck domains fixed")
                    print("✅ Processing loop restarted") 
                    print("✅ New data collection active")
                    print()
                    print("📊 Expected results:")
                    print("   • Fresh data within 60 minutes")
                    print("   • Pending domains decreasing")
                    print("   • Public API showing fresh timestamps")
                else:
                    print("⚠️  PARTIAL SUCCESS: Domains reset but processing inactive")
                    print("Manual intervention may be required")
            else:
                print("❌ FAILED: Could not restart processing")
                print("Manual intervention required")
        else:
            print("❌ FAILED: Sophisticated-runner not responding")
            print("Service may need manual restart")
        
        print()
        print("🔍 NEXT STEPS:")
        print("1. Monitor https://sophisticated-runner.onrender.com/status")
        print("2. Check https://llm-pagerank-public-api.onrender.com/health")
        print("3. Verify fresh data appears in 30-60 minutes")
        print("4. If issues persist, investigate sophisticated-runner logs")
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        print("Manual database intervention required")
        raise

if __name__ == "__main__":
    main() 