#!/usr/bin/env python3
"""
🚨 CORS TEST SCRIPT
Quick test to verify CORS configuration is working
"""

import requests
import json

def test_cors_preflight():
    """Test CORS preflight request"""
    
    # Test URLs
    urls = [
        "https://llmrank.io",
        "http://localhost:8000"  # If testing locally
    ]
    
    for base_url in urls:
        print(f"\n🧪 Testing CORS for: {base_url}")
        
        try:
            # Test OPTIONS request (preflight)
            options_response = requests.options(
                f"{base_url}/api/auth/register",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "Content-Type"
                },
                timeout=10
            )
            
            print(f"OPTIONS status: {options_response.status_code}")
            print(f"CORS headers: {dict(options_response.headers)}")
            
            # Test actual POST request
            post_response = requests.post(
                f"{base_url}/api/auth/register",
                headers={
                    "Origin": "http://localhost:3000",
                    "Content-Type": "application/json"
                },
                json={
                    "email": "test@example.com",
                    "password": "testpass123",
                    "full_name": "Test User"
                },
                timeout=10
            )
            
            print(f"POST status: {post_response.status_code}")
            print(f"POST response: {post_response.text[:200]}...")
            
        except Exception as e:
            print(f"❌ Error testing {base_url}: {e}")

if __name__ == "__main__":
    test_cors_preflight() 