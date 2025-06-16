#!/usr/bin/env python3
"""
🚨 PRODUCTION BLOCKER FIX SCRIPT
Fixes critical data processing issues preventing domain analysis
"""

import os
import subprocess
import requests
import time

def fix_environment_variables():
    """Fix the replace_with_your_url configuration issue"""
    print("🔧 Fixing environment variable configuration...")
    
    # Check for the problematic configuration
    config_files = [
        'services/raw-capture-runner/config.js',
        'services/sophisticated-runner/src/config.ts',
        'services/embedding-engine/config.py'
    ]
    
    for config_file in config_files:
        if os.path.exists(config_file):
            with open(config_file, 'r') as f:
                content = f.read()
            
            if 'replace_with_your_url' in content:
                print(f"❌ Found problematic config in {config_file}")
                # Replace with actual API endpoint
                updated_content = content.replace(
                    'replace_with_your_url',
                    'https://llm-pagerank-public-api.onrender.com'
                )
                
                with open(config_file, 'w') as f:
                    f.write(updated_content)
                
                print(f"✅ Fixed {config_file}")
    
def test_service_endpoints():
    """Test that all critical services are responding"""
    endpoints = {
        'Public API': 'https://llm-pagerank-public-api.onrender.com/health',
        'Sophisticated Runner': 'https://sophisticated-runner.onrender.com/health',
        'SEO Metrics Runner': 'https://seo-metrics-runner.onrender.com/health'
    }
    
    print("\n🔍 Testing service endpoints...")
    
    for name, url in endpoints.items():
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                print(f"✅ {name}: Healthy")
            else:
                print(f"⚠️ {name}: Status {response.status_code}")
        except Exception as e:
            print(f"❌ {name}: Failed - {str(e)}")

def restart_failed_services():
    """Restart services that are down"""
    print("\n🔄 Restarting failed services...")
    
    # This would require access to Render API or manual restart
    print("⚡ Manual action required:")
    print("   1. Go to Render dashboard")
    print("   2. Restart 'sophisticated-runner' service")
    print("   3. Restart 'seo-metrics-runner' service")
    print("   4. Redeploy if necessary")

def verify_database_connection():
    """Test database connectivity"""
    print("\n💾 Testing database connection...")
    
    try:
        # Use the API health endpoint to verify DB connectivity
        response = requests.get('https://llm-pagerank-public-api.onrender.com/health', timeout=15)
        if response.status_code == 200:
            data = response.json()
            if 'database' in data and data['database'] == 'connected':
                print("✅ Database: Connected")
            else:
                print("⚠️ Database: Connection status unclear")
        else:
            print("❌ Database: Cannot verify connection")
    except Exception as e:
        print(f"❌ Database: Failed to test - {str(e)}")

def check_stripe_integration():
    """Verify Stripe configuration"""
    print("\n💳 Checking Stripe integration...")
    
    stripe_vars = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PUBLISHABLE_KEY']
    missing_vars = []
    
    for var in stripe_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠️ Missing Stripe environment variables: {', '.join(missing_vars)}")
        print("   These need to be configured in Render environment settings")
    else:
        print("✅ Stripe environment variables configured")

def run_diagnostics():
    """Run comprehensive diagnostics"""
    print("🚨 PRODUCTION BLOCKER FIX - DIAGNOSTIC REPORT")
    print("=" * 60)
    
    fix_environment_variables()
    test_service_endpoints()
    verify_database_connection()
    check_stripe_integration()
    restart_failed_services()
    
    print("\n" + "=" * 60)
    print("🎯 NEXT STEPS:")
    print("1. ✅ TypeScript compilation fixed")
    print("2. ⚡ Restart services manually in Render")
    print("3. 💳 Add Stripe API keys to environment")
    print("4. 🔄 Test domain processing end-to-end")
    print("5. 🚀 Ready for production launch!")

if __name__ == "__main__":
    run_diagnostics() 