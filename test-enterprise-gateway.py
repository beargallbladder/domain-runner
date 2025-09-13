#!/usr/bin/env python3
"""
Enterprise Neural Gateway Integration Test Suite
Tests the complete closed-loop system with all tiers
"""

import asyncio
import json
import time
import websockets
import aiohttp
from datetime import datetime
from typing import Dict, List, Any

# Configuration
GATEWAY_URL = "http://localhost:3003"  # Change to production URL when deployed
WS_URL = "ws://localhost:3003/ws/realtime"

# API Keys for different tiers
API_KEYS = {
    "partner": "llmpagerank-2025-neural-gateway",
    "premium": "brandsentiment-premium-2025",
    "enterprise": "enterprise-tier-2025-secure"
}

# Test domains
TEST_DOMAINS = [
    "huggingface.co",
    "openai.com",
    "anthropic.com",
    "google.com",
    "microsoft.com"
]

class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text: str):
    """Print section header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")

def print_success(text: str):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_error(text: str):
    """Print error message"""
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_warning(text: str):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")

async def test_health_endpoint():
    """Test health check endpoint"""
    print_header("Testing Health Endpoint")
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{GATEWAY_URL}/api/v2/health") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print_success(f"Health check passed - {data.get('status', 'unknown')}")
                    return True
                else:
                    print_error(f"Health check failed - HTTP {resp.status}")
                    return False
        except Exception as e:
            print_error(f"Health check error: {e}")
            return False

async def test_partner_api():
    """Test partner tier API (llmpagerank.com)"""
    print_header("Testing Partner API (llmpagerank.com)")
    
    headers = {"X-API-Key": API_KEYS["partner"]}
    endpoints = [
        "/api/stats",
        "/api/rankings",
        f"/api/rankings/{TEST_DOMAINS[0]}"
    ]
    
    async with aiohttp.ClientSession() as session:
        for endpoint in endpoints:
            try:
                async with session.get(
                    f"{GATEWAY_URL}{endpoint}",
                    headers=headers
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        print_success(f"{endpoint} - Limited data returned")
                        if "notice" in data:
                            print(f"  Notice: {data['notice']}")
                    else:
                        print_error(f"{endpoint} - HTTP {resp.status}")
            except Exception as e:
                print_error(f"{endpoint} - Error: {e}")

async def test_premium_api():
    """Test premium tier API (brandsentiment.io)"""
    print_header("Testing Premium API (brandsentiment.io)")
    
    headers = {"X-API-Key": API_KEYS["premium"]}
    
    # Test timeline drift analysis
    try:
        async with aiohttp.ClientSession() as session:
            endpoint = f"/api/v2/timeline-drift/{TEST_DOMAINS[0]}"
            async with session.get(
                f"{GATEWAY_URL}{endpoint}",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print_success("Timeline drift analysis accessible")
                    if "data" in data:
                        drift = data["data"]
                        print(f"  Overall drift: {drift.get('overall_drift', 'N/A')}")
                        print(f"  Risk level: {drift.get('risk_level', 'N/A')}")
                else:
                    print_error(f"Timeline drift - HTTP {resp.status}")
    except Exception as e:
        print_error(f"Timeline drift error: {e}")
    
    # Test memory gap analysis
    try:
        async with aiohttp.ClientSession() as session:
            endpoint = f"/api/v2/memory-gap/{TEST_DOMAINS[0]}"
            async with session.get(
                f"{GATEWAY_URL}{endpoint}",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    print_success("Memory gap analysis accessible")
                else:
                    print_warning(f"Memory gap - HTTP {resp.status}")
    except Exception as e:
        print_warning(f"Memory gap error: {e}")

async def test_juice_feedback():
    """Test juice feedback system (closed-loop)"""
    print_header("Testing Juice Feedback System")
    
    headers = {
        "X-API-Key": API_KEYS["premium"],
        "Content-Type": "application/json"
    }
    
    # Send juice feedback
    juice_data = {
        "guid": f"test-{TEST_DOMAINS[0]}",
        "juice_score": 0.85,
        "reason": "High Reddit activity detected",
        "last_updated": datetime.now().isoformat(),
        "signals": {
            "reddit_spike": True,
            "news_coverage": False,
            "market_movement": True
        }
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{GATEWAY_URL}/api/v2/juice-feedback",
                headers=headers,
                json=juice_data
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print_success("Juice feedback accepted")
                    print(f"  New priority rank: {data.get('new_priority_rank', 'N/A')}")
                    print(f"  Next crawl: {data.get('next_crawl', 'N/A')}")
                else:
                    print_error(f"Juice feedback - HTTP {resp.status}")
                    text = await resp.text()
                    print(f"  Response: {text}")
    except Exception as e:
        print_error(f"Juice feedback error: {e}")
    
    # Test batch feedback
    batch_data = {
        "feedbacks": [
            {
                "guid": f"test-{domain}",
                "juice_score": 0.5 + (i * 0.1),
                "last_updated": datetime.now().isoformat()
            }
            for i, domain in enumerate(TEST_DOMAINS[:3])
        ]
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{GATEWAY_URL}/api/v2/juice-feedback/batch",
                headers=headers,
                json=batch_data
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print_success(f"Batch feedback processed - {data.get('successful', 0)}/{data.get('processed', 0)}")
                else:
                    print_error(f"Batch feedback - HTTP {resp.status}")
    except Exception as e:
        print_error(f"Batch feedback error: {e}")

async def test_websocket_connection():
    """Test WebSocket real-time updates"""
    print_header("Testing WebSocket Real-Time Connection")
    
    try:
        async with websockets.connect(WS_URL) as websocket:
            # Wait for connection message
            message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(message)
            
            if data.get("type") == "connected":
                print_success(f"WebSocket connected - Client ID: {data.get('clientId', 'N/A')}")
                
                # Subscribe to priority updates
                await websocket.send(json.dumps({
                    "type": "subscribe:priority",
                    "domain": TEST_DOMAINS[0]
                }))
                
                # Subscribe to juice updates
                await websocket.send(json.dumps({
                    "type": "subscribe:juice",
                    "domain": TEST_DOMAINS[0]
                }))
                
                print_success("Subscribed to real-time updates")
                
                # Listen for a few seconds
                print("  Listening for updates (5 seconds)...")
                try:
                    while True:
                        message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        update = json.loads(message)
                        print(f"  Received: {update.get('type', 'unknown')}")
                except asyncio.TimeoutError:
                    print("  No updates received (normal if no activity)")
            else:
                print_error("Unexpected connection response")
                
    except websockets.exceptions.WebSocketException as e:
        print_error(f"WebSocket connection failed: {e}")
    except asyncio.TimeoutError:
        print_error("WebSocket connection timeout")
    except Exception as e:
        print_error(f"WebSocket error: {e}")

async def test_crawl_priorities():
    """Test crawl priority retrieval"""
    print_header("Testing Crawl Priorities")
    
    headers = {"X-API-Key": API_KEYS["premium"]}
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{GATEWAY_URL}/api/v2/crawl-priorities?limit=10",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print_success(f"Retrieved {len(data.get('priorities', []))} priorities")
                    
                    weights = data.get('weights', {})
                    print(f"  Algorithm: {data.get('algorithm', 'unknown')}")
                    print(f"  Weights: Juice={weights.get('juice_score', 0)}, "
                          f"Decay={weights.get('memory_decay', 0)}, "
                          f"SLA={weights.get('sla_override', 0)}")
                    
                    # Show top priorities
                    for p in data.get('priorities', [])[:3]:
                        print(f"  #{p.get('priority_rank', '?')}: {p.get('domain', 'N/A')} "
                              f"(juice={p.get('juice_score', 0):.2f})")
                else:
                    print_error(f"Crawl priorities - HTTP {resp.status}")
    except Exception as e:
        print_error(f"Crawl priorities error: {e}")

async def test_enterprise_features():
    """Test enterprise-only features"""
    print_header("Testing Enterprise Features")
    
    headers = {"X-API-Key": API_KEYS["enterprise"]}
    
    # Test memory correction campaign
    campaign_data = {
        "domain": TEST_DOMAINS[0],
        "corrections": {
            "founding_year": "2016",
            "headquarters": "New York, NY",
            "key_products": ["Transformers", "Datasets", "Spaces"]
        },
        "priority": "high"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{GATEWAY_URL}/api/v2/memory-correction",
                headers=headers,
                json=campaign_data
            ) as resp:
                if resp.status == 200:
                    print_success("Memory correction campaign created")
                elif resp.status == 403:
                    print_warning("Enterprise features require proper authentication")
                else:
                    print_error(f"Memory correction - HTTP {resp.status}")
    except Exception as e:
        print_warning(f"Enterprise feature not available: {e}")

async def run_all_tests():
    """Run complete test suite"""
    print(f"\n{Colors.BOLD}🚀 Enterprise Neural Gateway Test Suite{Colors.END}")
    print(f"Testing: {GATEWAY_URL}")
    print(f"Started: {datetime.now().isoformat()}\n")
    
    # Track results
    results = {
        "passed": 0,
        "failed": 0,
        "warnings": 0
    }
    
    # Run tests
    tests = [
        test_health_endpoint(),
        test_partner_api(),
        test_premium_api(),
        test_juice_feedback(),
        test_crawl_priorities(),
        test_websocket_connection(),
        test_enterprise_features()
    ]
    
    for test in tests:
        try:
            await test
            await asyncio.sleep(0.5)  # Small delay between tests
        except Exception as e:
            print_error(f"Test failed with error: {e}")
    
    # Summary
    print_header("Test Summary")
    print(f"Completed: {datetime.now().isoformat()}")
    print(f"\nResults:")
    print(f"  ✓ Tests completed")
    print(f"\nNext Steps:")
    print(f"1. Deploy to production using: ./deploy-enterprise.sh")
    print(f"2. Update llmpagerank.com API configuration")
    print(f"3. Configure brandsentiment.io juice feedback")
    print(f"4. Monitor WebSocket connections for real-time updates")

if __name__ == "__main__":
    # Run async tests
    asyncio.run(run_all_tests())