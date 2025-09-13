#!/usr/bin/env python3
"""Test authentication implementation"""

import asyncio
import aiohttp
import sys

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_API_KEY = None  # Will be set from command line or use a test key

async def test_endpoint(session, method, path, headers=None, expected_status=200):
    """Test a single endpoint"""
    url = f"{BASE_URL}{path}"
    try:
        async with session.request(method, url, headers=headers) as response:
            status = response.status
            try:
                data = await response.json()
            except:
                data = await response.text()
            
            success = status == expected_status
            icon = "✅" if success else "❌"
            print(f"{icon} {method} {path} - Status: {status} (expected {expected_status})")
            
            if not success and data:
                print(f"   Response: {data}")
            
            return success
    except Exception as e:
        print(f"❌ {method} {path} - Error: {e}")
        return False

async def run_tests(api_key=None):
    """Run all authentication tests"""
    print("🔒 Testing API Authentication\n")
    
    async with aiohttp.ClientSession() as session:
        # Test public endpoints (should work without auth)
        print("📋 Testing public endpoints (no auth required):")
        await test_endpoint(session, "GET", "/", expected_status=200)
        await test_endpoint(session, "GET", "/health", expected_status=200)
        
        # Test protected endpoints without auth (should fail)
        print("\n🚫 Testing protected endpoints without auth (should fail):")
        await test_endpoint(session, "GET", "/api/stats", expected_status=401)
        await test_endpoint(session, "GET", "/api/rankings", expected_status=401)
        await test_endpoint(session, "GET", "/api/domains/google.com/public", expected_status=401)
        
        if api_key:
            # Test with valid API key
            headers = {"X-API-Key": api_key}
            print(f"\n✅ Testing with API key: {api_key[:12]}...")
            await test_endpoint(session, "GET", "/api/stats", headers=headers, expected_status=200)
            await test_endpoint(session, "GET", "/api/rankings", headers=headers, expected_status=200)
            await test_endpoint(session, "GET", "/api/domains/google.com/public", headers=headers, expected_status=200)
            
            # Test with invalid API key
            bad_headers = {"X-API-Key": "invalid_key_12345"}
            print("\n❌ Testing with invalid API key (should fail):")
            await test_endpoint(session, "GET", "/api/stats", headers=bad_headers, expected_status=401)
            
            # Test security headers
            print("\n🔐 Testing security headers:")
            async with session.get(f"{BASE_URL}/health") as response:
                headers = response.headers
                security_headers = [
                    ("X-Content-Type-Options", "nosniff"),
                    ("X-Frame-Options", "DENY"),
                    ("X-XSS-Protection", "1; mode=block"),
                    ("Strict-Transport-Security", "max-age=31536000; includeSubDomains"),
                    ("Referrer-Policy", "strict-origin-when-cross-origin")
                ]
                
                for header, expected_value in security_headers:
                    value = headers.get(header)
                    if value == expected_value:
                        print(f"✅ {header}: {value}")
                    else:
                        print(f"❌ {header}: {value} (expected: {expected_value})")
        else:
            print("\n⚠️  No API key provided. Skipping authenticated endpoint tests.")
            print("   Usage: python test_auth.py <api_key>")

if __name__ == "__main__":
    api_key = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(run_tests(api_key))