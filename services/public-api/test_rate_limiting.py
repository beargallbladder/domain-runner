#!/usr/bin/env python3
"""
🧪 RATE LIMITING TEST SCRIPT
Tests comprehensive rate limiting functionality
"""

import asyncio
import aiohttp
import time
import json
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api"

# Test scenarios
TEST_SCENARIOS = {
    "public_endpoints": {
        "description": "Test public endpoint rate limits (no auth)",
        "endpoints": [
            {"path": "/domains", "limit": "200/hour", "burst": 5},
            {"path": "/domains/google.com/public", "limit": "100/hour", "burst": 3},
            {"path": "/stats", "limit": "300/hour", "burst": 10}
        ]
    },
    "api_key_endpoints": {
        "description": "Test API key authenticated endpoints",
        "endpoints": [
            {"path": "/v1/domains/google.com", "limit": "based on tier", "requires_api_key": True},
            {"path": "/v1/domains", "limit": "based on tier", "requires_api_key": True}
        ]
    }
}

# Test API keys (mock)
TEST_API_KEYS = {
    "enterprise": "llm_pk_enterprise_test123",
    "pro": "llm_pk_pro_test456",
    "basic": "llm_pk_basic_test789"
}

async def test_endpoint(session, endpoint_path, headers=None, params=None):
    """Test a single endpoint and return response with headers"""
    url = f"{API_BASE_URL}{endpoint_path}"
    
    try:
        async with session.get(url, headers=headers, params=params) as response:
            data = await response.text()
            
            # Extract rate limit headers
            rate_limit_info = {
                "status": response.status,
                "headers": {
                    "X-RateLimit-Limit": response.headers.get("X-RateLimit-Limit"),
                    "X-RateLimit-Remaining": response.headers.get("X-RateLimit-Remaining"),
                    "X-RateLimit-Reset": response.headers.get("X-RateLimit-Reset"),
                    "X-RateLimit-Tier": response.headers.get("X-RateLimit-Tier"),
                    "Retry-After": response.headers.get("Retry-After")
                }
            }
            
            # Try to parse JSON response
            try:
                rate_limit_info["data"] = json.loads(data)
            except:
                rate_limit_info["data"] = data
                
            return rate_limit_info
            
    except Exception as e:
        return {"error": str(e), "status": 0}

async def test_burst_limits(session, endpoint_path, burst_count=10):
    """Test burst rate limiting"""
    print(f"\n🚀 Testing burst limits for {endpoint_path}")
    print(f"   Sending {burst_count} requests rapidly...")
    
    results = []
    start_time = time.time()
    
    # Send burst of requests
    tasks = []
    for i in range(burst_count):
        task = test_endpoint(session, endpoint_path)
        tasks.append(task)
    
    results = await asyncio.gather(*tasks)
    
    elapsed = time.time() - start_time
    
    # Analyze results
    successful = sum(1 for r in results if r.get("status") == 200)
    rate_limited = sum(1 for r in results if r.get("status") == 429)
    
    print(f"   Completed in {elapsed:.2f}s")
    print(f"   ✅ Successful: {successful}")
    print(f"   🚫 Rate limited: {rate_limited}")
    
    # Show rate limit headers from last response
    if results:
        last_result = results[-1]
        if last_result.get("headers"):
            print(f"   📊 Rate limit headers:")
            for key, value in last_result["headers"].items():
                if value:
                    print(f"      {key}: {value}")
    
    return results

async def test_sustained_load(session, endpoint_path, duration_seconds=10, requests_per_second=5):
    """Test sustained load with controlled rate"""
    print(f"\n📈 Testing sustained load for {endpoint_path}")
    print(f"   Target: {requests_per_second} req/s for {duration_seconds}s")
    
    start_time = time.time()
    results = []
    request_count = 0
    rate_limited_count = 0
    
    while time.time() - start_time < duration_seconds:
        # Send request
        result = await test_endpoint(session, endpoint_path)
        results.append(result)
        request_count += 1
        
        if result.get("status") == 429:
            rate_limited_count += 1
            print(f"   🚫 Rate limited at request #{request_count}")
            
            # Check retry-after header
            retry_after = result.get("headers", {}).get("Retry-After")
            if retry_after:
                print(f"      Retry after: {retry_after}s")
        
        # Control request rate
        await asyncio.sleep(1.0 / requests_per_second)
    
    elapsed = time.time() - start_time
    actual_rate = request_count / elapsed
    
    print(f"   📊 Results:")
    print(f"      Total requests: {request_count}")
    print(f"      Actual rate: {actual_rate:.2f} req/s")
    print(f"      Rate limited: {rate_limited_count} ({rate_limited_count/request_count*100:.1f}%)")
    
    return results

async def test_api_key_tiers(session):
    """Test different API key tiers"""
    print("\n🔑 Testing API key tier rate limits")
    
    for tier, api_key in TEST_API_KEYS.items():
        print(f"\n   Testing {tier} tier...")
        
        # Test with API key
        params = {"api_key": api_key}
        
        # Send burst of requests
        results = []
        for i in range(10):
            result = await test_endpoint(session, "/v1/domains", params=params)
            results.append(result)
            
            if result.get("status") == 200:
                tier_header = result.get("headers", {}).get("X-RateLimit-Tier")
                limit_header = result.get("headers", {}).get("X-RateLimit-Limit")
                print(f"      ✅ Request {i+1}: Tier={tier_header}, Limit={limit_header}")
            elif result.get("status") == 429:
                print(f"      🚫 Request {i+1}: Rate limited")
                break
            
            await asyncio.sleep(0.1)  # Small delay between requests

async def test_rate_limit_reset(session, endpoint_path):
    """Test rate limit reset behavior"""
    print(f"\n⏰ Testing rate limit reset for {endpoint_path}")
    
    # First, exhaust the rate limit
    print("   Exhausting rate limit...")
    exhausted = False
    request_count = 0
    
    while not exhausted and request_count < 50:
        result = await test_endpoint(session, endpoint_path)
        request_count += 1
        
        if result.get("status") == 429:
            exhausted = True
            reset_time = result.get("headers", {}).get("X-RateLimit-Reset")
            retry_after = result.get("headers", {}).get("Retry-After")
            
            print(f"   🚫 Rate limit exhausted after {request_count} requests")
            print(f"      Reset time: {reset_time}")
            print(f"      Retry after: {retry_after}s")
            
            if retry_after and int(retry_after) < 120:  # Only wait if less than 2 minutes
                print(f"   ⏳ Waiting {retry_after}s for reset...")
                await asyncio.sleep(int(retry_after) + 1)
                
                # Test after reset
                print("   🔄 Testing after reset...")
                result = await test_endpoint(session, endpoint_path)
                if result.get("status") == 200:
                    print("   ✅ Rate limit reset successfully!")
                else:
                    print("   ❌ Still rate limited after waiting")

async def main():
    """Run all rate limiting tests"""
    print("🧪 RATE LIMITING TEST SUITE")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        # Test 1: Public endpoints burst limits
        print("\n1️⃣ PUBLIC ENDPOINT BURST TESTS")
        for endpoint in TEST_SCENARIOS["public_endpoints"]["endpoints"]:
            await test_burst_limits(session, endpoint["path"])
            await asyncio.sleep(2)  # Pause between tests
        
        # Test 2: Sustained load test
        print("\n2️⃣ SUSTAINED LOAD TESTS")
        await test_sustained_load(session, "/api/stats", duration_seconds=10, requests_per_second=5)
        
        # Test 3: API key tier tests
        print("\n3️⃣ API KEY TIER TESTS")
        await test_api_key_tiers(session)
        
        # Test 4: Rate limit reset test
        print("\n4️⃣ RATE LIMIT RESET TEST")
        await test_rate_limit_reset(session, "/api/domains")
        
    print("\n✅ Rate limiting tests completed!")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main())