#!/usr/bin/env python3
"""
Full System Test - Check all deployed services and identify issues
"""

import requests
import psycopg2
import json
import time
from datetime import datetime
import subprocess
import os

# ANSI colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'=' * 60}{RESET}")
    print(f"{BLUE}{text}{RESET}")
    print(f"{BLUE}{'=' * 60}{RESET}")

def print_success(text):
    print(f"{GREEN}✅ {text}{RESET}")

def print_error(text):
    print(f"{RED}❌ {text}{RESET}")

def print_warning(text):
    print(f"{YELLOW}⚠️  {text}{RESET}")

def print_info(text):
    print(f"   {text}")

# Database configuration
DB_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

# Services to test
SERVICES = {
    'sophisticated-runner': {
        'url': 'https://sophisticated-runner.onrender.com',
        'health': '/health',
        'endpoints': ['/api/provider-status', '/swarm/metrics'],
        'expected': 'Node.js domain processor'
    },
    'domain-runner': {
        'url': 'https://domain-runner.onrender.com',
        'health': '/health',
        'endpoints': ['/api/provider-status'],
        'expected': 'Node.js service with 11 providers'
    },
    'llmrank.io': {
        'url': 'https://llmrank.io',
        'health': '/health',
        'endpoints': ['/api/stats', '/api/rankings'],
        'expected': 'Public API (Python FastAPI)'
    }
}

def test_service_health(service_name, config):
    """Test if a service is healthy"""
    print(f"\n{service_name}:")
    
    try:
        # Test health endpoint
        health_url = f"{config['url']}{config['health']}"
        response = requests.get(health_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Service is healthy")
            print_info(f"Response: {json.dumps(data, indent=2)}")
            
            # Test additional endpoints
            for endpoint in config.get('endpoints', []):
                try:
                    ep_response = requests.get(f"{config['url']}{endpoint}", timeout=10)
                    if ep_response.status_code == 200:
                        print_success(f"Endpoint {endpoint} is working")
                    else:
                        print_error(f"Endpoint {endpoint} returned {ep_response.status_code}")
                except Exception as e:
                    print_error(f"Endpoint {endpoint} failed: {str(e)}")
                    
            return True
        else:
            print_error(f"Health check failed with status {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print_error("Service timeout - may be starting up")
        return False
    except Exception as e:
        print_error(f"Service error: {str(e)}")
        return False

def test_database():
    """Test database connectivity and data"""
    print_header("DATABASE TEST")
    
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        # Check domain counts
        cursor.execute("""
            SELECT status, COUNT(*) 
            FROM domains 
            GROUP BY status 
            ORDER BY status
        """)
        
        print_success("Database connected")
        print_info("Domain status counts:")
        for row in cursor.fetchall():
            print_info(f"  {row[0]}: {row[1]} domains")
        
        # Check recent activity
        cursor.execute("""
            SELECT model, COUNT(*), MAX(created_at) 
            FROM domain_responses 
            WHERE created_at > NOW() - INTERVAL '1 hour'
            GROUP BY model
            ORDER BY COUNT(*) DESC
        """)
        
        recent = cursor.fetchall()
        if recent:
            print_info("\nRecent activity (last hour):")
            for row in recent:
                print_info(f"  {row[0]}: {row[1]} responses, latest: {row[2]}")
        else:
            print_warning("No activity in the last hour")
        
        # Check volatility scores
        cursor.execute("SELECT COUNT(*) FROM volatility_scores")
        vol_count = cursor.fetchone()[0]
        print_info(f"\nVolatility scores: {vol_count} domains scored")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print_error(f"Database error: {str(e)}")
        return False

def test_local_issues():
    """Check for local configuration issues"""
    print_header("LOCAL ISSUES CHECK")
    
    issues_found = False
    
    # Check cache updater log
    if os.path.exists('cache_updater.log'):
        with open('cache_updater.log', 'r') as f:
            content = f.read()
            if 'No such file or directory' in content:
                print_error("cache_updater.log shows missing auto_cache_updater.py")
                print_info("This is causing repeated cron errors")
                issues_found = True
    
    # Check for cron jobs
    try:
        cron_output = subprocess.check_output(['crontab', '-l'], stderr=subprocess.DEVNULL).decode()
        if 'auto_cache_updater.py' in cron_output:
            print_error("Cron job referencing non-existent auto_cache_updater.py")
            print_info("Run: crontab -e and remove the line")
            issues_found = True
    except:
        print_info("No cron jobs found (good)")
    
    # Check for confusing files
    confusing_files = [
        'CLAUDE.md',  # May have outdated instructions
        'cache_updater.log',  # Full of errors
        'deploy_status.log',  # Old deployment logs
    ]
    
    for file in confusing_files:
        if os.path.exists(file):
            print_warning(f"Found potentially confusing file: {file}")
            issues_found = True
    
    if not issues_found:
        print_success("No local issues found")
    
    return not issues_found

def test_api_keys():
    """Check which API keys are available locally"""
    print_header("API KEY CHECK")
    
    providers = [
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'DEEPSEEK_API_KEY',
        'MISTRAL_API_KEY',
        'COHERE_API_KEY',
        'TOGETHER_API_KEY',
        'GROQ_API_KEY',
        'GOOGLE_API_KEY',
        'PERPLEXITY_API_KEY',
        'XAI_API_KEY',
        'AI21_API_KEY'
    ]
    
    found = 0
    for provider in providers:
        if os.getenv(provider):
            print_success(f"{provider} is set locally")
            found += 1
        else:
            print_info(f"{provider} not set locally (may be on Render)")
    
    print_info(f"\nTotal: {found}/{len(providers)} keys set locally")
    return found > 0

def test_render_deployment():
    """Check Render deployment status"""
    print_header("RENDER DEPLOYMENT CHECK")
    
    # Check render.yaml
    if os.path.exists('render.yaml'):
        with open('render.yaml', 'r') as f:
            content = f.read()
            
        # Count services
        service_count = content.count('- type: web')
        print_info(f"Services defined in render.yaml: {service_count}")
        
        # Check for Rust references
        if 'rust' in content.lower():
            print_warning("Found 'rust' references in render.yaml")
        else:
            print_success("No Rust references in render.yaml")
            
        # Check for commented services
        commented_services = content.count('# - type: web')
        if commented_services > 0:
            print_warning(f"Found {commented_services} commented-out services")
            
        return True
    else:
        print_error("render.yaml not found")
        return False

def suggest_cleanup():
    """Suggest cleanup actions"""
    print_header("CLEANUP SUGGESTIONS")
    
    suggestions = []
    
    # Check cache_updater.log size
    if os.path.exists('cache_updater.log'):
        size = os.path.getsize('cache_updater.log') / (1024 * 1024)  # MB
        if size > 1:
            suggestions.append(f"Remove cache_updater.log ({size:.1f}MB of errors)")
    
    # Check for old CLAUDE.md
    if os.path.exists('CLAUDE.md'):
        with open('CLAUDE.md', 'r') as f:
            content = f.read()
        if '3,183 pending domains' in content:
            suggestions.append("Update CLAUDE.md - it says there are pending domains but they're all completed")
    
    # Check cron
    try:
        cron_output = subprocess.check_output(['crontab', '-l'], stderr=subprocess.DEVNULL).decode()
        if cron_output.strip():
            suggestions.append("Remove cron job: Run 'crontab -e' and delete the auto_cache_updater line")
    except:
        pass
    
    if suggestions:
        print_warning("Recommended cleanup actions:")
        for i, suggestion in enumerate(suggestions, 1):
            print_info(f"{i}. {suggestion}")
    else:
        print_success("No cleanup needed!")

def main():
    """Run all tests"""
    print_header("FULL SYSTEM TEST")
    print(f"Started at: {datetime.now()}")
    
    # Test deployed services
    print_header("DEPLOYED SERVICES TEST")
    service_results = {}
    for service_name, config in SERVICES.items():
        service_results[service_name] = test_service_health(service_name, config)
    
    # Test database
    db_result = test_database()
    
    # Test local issues
    local_result = test_local_issues()
    
    # Test API keys
    api_result = test_api_keys()
    
    # Test Render config
    render_result = test_render_deployment()
    
    # Cleanup suggestions
    suggest_cleanup()
    
    # Summary
    print_header("TEST SUMMARY")
    
    total_tests = len(service_results) + 4
    passed_tests = sum(service_results.values()) + db_result + local_result + api_result + render_result
    
    print(f"\nTests passed: {passed_tests}/{total_tests}")
    
    if passed_tests == total_tests:
        print_success("All tests passed! 🎉")
    else:
        print_warning("Some issues found - see cleanup suggestions above")
    
    print(f"\nCompleted at: {datetime.now()}")

if __name__ == "__main__":
    main()