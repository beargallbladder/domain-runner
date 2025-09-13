#!/usr/bin/env python3
"""
Database Connection Fix Deployment Script
Deploys the fixed production API and monitors the health status
"""
import asyncio
import aiohttp
import logging
import sys
import json
from datetime import datetime
import subprocess
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def check_api_health(base_url="https://llmrank.io"):
    """Check API health status"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{base_url}/health", timeout=30) as response:
                if response.status == 200:
                    health_data = await response.json()
                    logger.info(f"✅ API Health Status: {health_data.get('status', 'unknown')}")
                    logger.info(f"   Database: {health_data.get('database', 'unknown')}")
                    logger.info(f"   Redis: {health_data.get('redis', 'unknown')}")
                    
                    # Check monitoring stats
                    stats = health_data.get('monitoring_stats', {})
                    logger.info(f"   Domains Monitored: {stats.get('domains_monitored', 0)}")
                    logger.info(f"   High Risk Domains: {stats.get('high_risk_domains', 0)}")
                    
                    return health_data.get('status') == 'healthy'
                else:
                    logger.error(f"❌ Health check failed with status: {response.status}")
                    return False
    except Exception as e:
        logger.error(f"❌ Health check error: {e}")
        return False

async def test_api_endpoints(base_url="https://llmrank.io"):
    """Test critical API endpoints"""
    endpoints_to_test = [
        "/",
        "/api/stats",
        "/api/rankings?limit=5",
        "/api/domains?limit=5"
    ]
    
    results = {}
    
    async with aiohttp.ClientSession() as session:
        for endpoint in endpoints_to_test:
            try:
                logger.info(f"🔍 Testing {endpoint}...")
                async with session.get(f"{base_url}{endpoint}", timeout=30) as response:
                    if response.status == 200:
                        data = await response.json()
                        results[endpoint] = {"status": "success", "data_keys": list(data.keys())}
                        logger.info(f"✅ {endpoint} - OK")
                    else:
                        results[endpoint] = {"status": "failed", "code": response.status}
                        logger.error(f"❌ {endpoint} - Failed with {response.status}")
            except Exception as e:
                results[endpoint] = {"status": "error", "error": str(e)}
                logger.error(f"❌ {endpoint} - Error: {e}")
    
    return results

async def monitor_deployment():
    """Monitor the deployment for 5 minutes"""
    logger.info("🔄 Starting 5-minute deployment monitoring...")
    
    start_time = time.time()
    check_interval = 30  # Check every 30 seconds
    healthy_checks = 0
    total_checks = 0
    
    while time.time() - start_time < 300:  # 5 minutes
        total_checks += 1
        logger.info(f"📊 Health check #{total_checks}...")
        
        is_healthy = await check_api_health()
        if is_healthy:
            healthy_checks += 1
        
        logger.info(f"📈 Health ratio: {healthy_checks}/{total_checks}")
        
        # Wait for next check
        await asyncio.sleep(check_interval)
    
    success_rate = (healthy_checks / total_checks) * 100
    logger.info(f"📊 Final monitoring results:")
    logger.info(f"   Success rate: {success_rate:.1f}%")
    logger.info(f"   Healthy checks: {healthy_checks}/{total_checks}")
    
    return success_rate > 80  # Consider successful if > 80% healthy

def run_git_commands():
    """Run git commands to deploy changes"""
    commands = [
        "git add .",
        'git commit -m "Fix database connection issues with retry logic and better error handling\\n\\n- Add connection retry mechanism with exponential backoff\\n- Implement connection pool recovery\\n- Add fallback data for critical endpoints\\n- Improve health check with detailed status\\n- Add comprehensive error handling\\n\\n🤖 Generated with Claude Code"',
        "git push origin main"
    ]
    
    for cmd in commands:
        try:
            logger.info(f"🔄 Running: {cmd}")
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                logger.info(f"✅ Command succeeded")
                if result.stdout:
                    logger.info(f"   Output: {result.stdout.strip()}")
            else:
                logger.error(f"❌ Command failed: {result.stderr}")
                return False
        except Exception as e:
            logger.error(f"❌ Command error: {e}")
            return False
    
    return True

async def main():
    logger.info("🚀 Starting Database Connection Fix Deployment")
    logger.info("=" * 60)
    
    # Step 1: Test endpoints before changes (if already deployed)
    logger.info("📋 Step 1: Testing current API status...")
    try:
        initial_health = await check_api_health()
        logger.info(f"   Initial health status: {'✅ Healthy' if initial_health else '❌ Unhealthy'}")
    except:
        logger.info("   No existing API found or not responding")
    
    # Step 2: Deploy changes
    logger.info("📋 Step 2: Deploying database connection fixes...")
    deploy_success = run_git_commands()
    
    if not deploy_success:
        logger.error("❌ Deployment failed")
        return False
    
    logger.info("✅ Code deployed successfully")
    
    # Step 3: Wait for deployment to complete
    logger.info("📋 Step 3: Waiting for deployment to complete...")
    logger.info("   Render.com typically takes 2-3 minutes to deploy...")
    await asyncio.sleep(120)  # Wait 2 minutes
    
    # Step 4: Test the fixed API
    logger.info("📋 Step 4: Testing fixed API...")
    
    # Try health check multiple times
    for attempt in range(5):
        logger.info(f"   Health check attempt {attempt + 1}/5...")
        health_ok = await check_api_health()
        if health_ok:
            logger.info("✅ API is healthy!")
            break
        await asyncio.sleep(30)
    else:
        logger.warning("⚠️  API may still be starting up...")
    
    # Test endpoints
    logger.info("📋 Step 5: Testing critical endpoints...")
    endpoint_results = await test_api_endpoints()
    
    successful_endpoints = sum(1 for result in endpoint_results.values() if result.get('status') == 'success')
    total_endpoints = len(endpoint_results)
    
    logger.info(f"   Endpoint test results: {successful_endpoints}/{total_endpoints} successful")
    
    # Step 6: Monitor for 5 minutes
    logger.info("📋 Step 6: Monitoring deployment stability...")
    monitoring_success = await monitor_deployment()
    
    # Final report
    logger.info("🎯 DEPLOYMENT REPORT")
    logger.info("=" * 60)
    logger.info(f"✅ Code deployment: {'✅ Success' if deploy_success else '❌ Failed'}")
    logger.info(f"✅ Endpoint tests: {successful_endpoints}/{total_endpoints} passed")
    logger.info(f"✅ Stability monitoring: {'✅ Stable' if monitoring_success else '⚠️  Unstable'}")
    
    overall_success = deploy_success and (successful_endpoints > 0) and monitoring_success
    
    if overall_success:
        logger.info("🎉 DATABASE CONNECTION FIX DEPLOYMENT SUCCESSFUL!")
        logger.info("   The API should now handle database connection issues gracefully.")
        logger.info("   Features added:")
        logger.info("   - Automatic connection retry with exponential backoff")
        logger.info("   - Connection pool recovery")
        logger.info("   - Fallback data for critical endpoints")
        logger.info("   - Enhanced health monitoring")
    else:
        logger.error("❌ DEPLOYMENT HAD ISSUES")
        logger.error("   Manual investigation may be required.")
    
    return overall_success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)