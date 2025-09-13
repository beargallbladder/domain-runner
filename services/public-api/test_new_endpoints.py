#!/usr/bin/env python3
"""Test script for new tensor/drift/consensus/volatility endpoints"""

import asyncio
import aiohttp
import json

async def test_endpoints():
    """Test the new endpoints"""
    base_url = "http://localhost:8000"
    test_brand = "apple.com"  # Use a common domain for testing
    
    endpoints = [
        f"/api/tensors/{test_brand}",
        f"/api/drift/{test_brand}",
        f"/api/consensus/{test_brand}",
        f"/api/volatility/{test_brand}"
    ]
    
    async with aiohttp.ClientSession() as session:
        for endpoint in endpoints:
            try:
                print(f"\nTesting {endpoint}...")
                async with session.get(f"{base_url}{endpoint}") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Success: {endpoint}")
                        print(f"Response preview: {json.dumps(data, indent=2)[:200]}...")
                    else:
                        print(f"❌ Failed: {endpoint} - Status: {response.status}")
                        error_text = await response.text()
                        print(f"Error: {error_text}")
            except Exception as e:
                print(f"❌ Exception for {endpoint}: {str(e)}")

if __name__ == "__main__":
    print("Testing new production API endpoints...")
    asyncio.run(test_endpoints())