#!/usr/bin/env python3
"""
Test script to verify rate limiting is working properly
"""

import asyncio
import aiohttp
import time
from datetime import datetime

# Configuration
BASE_URL = "https://public-api-service.onrender.com"  # Update to your actual URL
API_KEY = "YOUR_API_KEY_HERE"  # Replace with a valid API key

async def test_rate_limiting():
    """Test that rate limiting is enforced"""
    print(f"🧪 Testing rate limiting at {BASE_URL}")
    print("=" * 50)
    
    # Test endpoints with their rate limits
    test_cases = [
        ("/api/stats", 50),  # 50/minute limit
        ("/api/rankings", 30),  # 30/minute limit
        ("/api/domains/google.com/public", 10),  # 10/minute limit
    ]
    
    async with aiohttp.ClientSession() as session:
        for endpoint, limit in test_cases:
            print(f"\n📍 Testing {endpoint} (limit: {limit}/minute)")
            print("-" * 40)
            
            # Make requests up to and beyond the limit
            requests_to_make = limit + 5
            success_count = 0
            rate_limited_count = 0
            
            headers = {"X-API-Key": API_KEY}
            
            for i in range(requests_to_make):
                try:
                    async with session.get(f"{BASE_URL}{endpoint}", headers=headers) as response:
                        if response.status == 200:
                            success_count += 1
                            # Check rate limit headers
                            limit_header = response.headers.get("X-RateLimit-Limit")
                            remaining = response.headers.get("X-RateLimit-Remaining")
                            reset = response.headers.get("X-RateLimit-Reset")
                            
                            print(f"✅ Request {i+1}: SUCCESS - Remaining: {remaining}/{limit_header}")
                        elif response.status == 429:
                            rate_limited_count += 1
                            retry_after = response.headers.get("Retry-After", "Unknown")
                            print(f"🚫 Request {i+1}: RATE LIMITED - Retry after: {retry_after}s")
                        else:
                            print(f"❌ Request {i+1}: ERROR - Status: {response.status}")
                            
                except Exception as e:
                    print(f"❌ Request {i+1}: EXCEPTION - {str(e)}")
                
                # Small delay between requests
                await asyncio.sleep(0.1)
            
            print(f"\nSummary: {success_count} successful, {rate_limited_count} rate limited")
            
            if rate_limited_count > 0:
                print("✅ Rate limiting is WORKING!")
            else:
                print("❌ Rate limiting is NOT WORKING - all requests succeeded!")
            
            # Wait before testing next endpoint
            print("\nWaiting 60 seconds for rate limit reset...")
            await asyncio.sleep(60)

async def test_burst_limiting():
    """Test burst rate limiting (requests per second)"""
    print(f"\n\n🚀 Testing burst rate limiting")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        endpoint = "/api/stats"
        headers = {"X-API-Key": API_KEY}
        
        # Try to make 10 requests as fast as possible
        print(f"Making 10 rapid requests to {endpoint}...")
        
        start_time = time.time()
        results = []
        
        tasks = []
        for i in range(10):
            task = session.get(f"{BASE_URL}{endpoint}", headers=headers)
            tasks.append(task)
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        duration = end_time - start_time
        
        success_count = 0
        rate_limited_count = 0
        
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                print(f"Request {i+1}: EXCEPTION - {str(response)}")
            else:
                async with response:
                    if response.status == 200:
                        success_count += 1
                        print(f"Request {i+1}: SUCCESS")
                    elif response.status == 429:
                        rate_limited_count += 1
                        print(f"Request {i+1}: RATE LIMITED")
                    else:
                        print(f"Request {i+1}: ERROR - Status {response.status}")
        
        print(f"\nCompleted 10 requests in {duration:.2f} seconds")
        print(f"Success: {success_count}, Rate limited: {rate_limited_count}")
        
        if rate_limited_count > 0:
            print("✅ Burst rate limiting is WORKING!")
        else:
            print("❌ Burst rate limiting is NOT WORKING!")

async def test_without_api_key():
    """Test rate limiting for unauthenticated requests"""
    print(f"\n\n🔒 Testing rate limiting without API key")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        endpoint = "/health"  # Public endpoint
        
        # Free tier limit is 10/minute
        print(f"Making 15 requests to {endpoint} without API key...")
        
        success_count = 0
        rate_limited_count = 0
        
        for i in range(15):
            try:
                async with session.get(f"{BASE_URL}{endpoint}") as response:
                    if response.status == 200:
                        success_count += 1
                        remaining = response.headers.get("X-RateLimit-Remaining", "?")
                        print(f"Request {i+1}: SUCCESS - Remaining: {remaining}")
                    elif response.status == 429:
                        rate_limited_count += 1
                        print(f"Request {i+1}: RATE LIMITED")
                    else:
                        print(f"Request {i+1}: Status {response.status}")
            except Exception as e:
                print(f"Request {i+1}: EXCEPTION - {str(e)}")
            
            await asyncio.sleep(0.5)
        
        print(f"\nSummary: {success_count} successful, {rate_limited_count} rate limited")
        
        if rate_limited_count > 0:
            print("✅ Unauthenticated rate limiting is WORKING!")
        else:
            print("⚠️  Unauthenticated rate limiting may not be working properly")

async def main():
    """Run all rate limiting tests"""
    print("🚦 RATE LIMITING TEST SUITE")
    print(f"Time: {datetime.now().isoformat()}")
    print("=" * 50)
    
    # Run tests
    await test_rate_limiting()
    await test_burst_limiting()
    await test_without_api_key()
    
    print("\n\n✅ All tests completed!")

if __name__ == "__main__":
    # Update these values before running
    print("⚠️  Please update BASE_URL and API_KEY before running!")
    print("BASE_URL should be your deployed API URL")
    print("API_KEY should be a valid API key from your system")
    
    # Uncomment to run tests
    # asyncio.run(main())