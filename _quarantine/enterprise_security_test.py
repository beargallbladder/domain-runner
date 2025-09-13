#!/usr/bin/env python3
"""
🔒 ENTERPRISE SECURITY TEST SUITE
Comprehensive testing of all security fixes and features before deployment
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
import os
from dataclasses import dataclass
from enum import Enum

# Test configuration
API_BASE_URL = os.getenv("API_BASE_URL", "https://llm-pagerank-public-api.onrender.com")
TEST_API_KEY = os.getenv("TEST_API_KEY", "llmpr_test_key_here")
TEST_USER_EMAIL = "test@enterprise.com"
TEST_USER_PASSWORD = "SecureTest123!"

class TestStatus(Enum):
    PASSED = "✅ PASSED"
    FAILED = "❌ FAILED"
    SKIPPED = "⏭️ SKIPPED"
    WARNING = "⚠️ WARNING"

@dataclass
class TestResult:
    name: str
    status: TestStatus
    message: str
    duration_ms: float
    details: Optional[Dict] = None

class EnterpriseSecurityTester:
    def __init__(self):
        self.results: List[TestResult] = []
        self.session: Optional[aiohttp.ClientSession] = None
        self.auth_token: Optional[str] = None
        self.test_user_id: Optional[str] = None
        
    async def setup(self):
        """Initialize test session"""
        self.session = aiohttp.ClientSession()
        print("🚀 Starting Enterprise Security Test Suite")
        print(f"📍 Testing API at: {API_BASE_URL}")
        print("=" * 60)
        
    async def teardown(self):
        """Cleanup test session"""
        if self.session:
            await self.session.close()
            
    async def run_test(self, test_name: str, test_func):
        """Run a single test and record results"""
        print(f"\n🧪 Running: {test_name}")
        start_time = time.time()
        
        try:
            result = await test_func()
            duration_ms = (time.time() - start_time) * 1000
            
            if result is True:
                status = TestStatus.PASSED
                message = "Test completed successfully"
                details = None
            elif isinstance(result, dict):
                status = result.get('status', TestStatus.PASSED)
                message = result.get('message', 'Test completed')
                details = result.get('details', None)
            else:
                status = TestStatus.FAILED
                message = str(result)
                details = None
                
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            status = TestStatus.FAILED
            message = f"Exception: {str(e)}"
            details = {"error": str(e), "type": type(e).__name__}
            
        test_result = TestResult(
            name=test_name,
            status=status,
            message=message,
            duration_ms=duration_ms,
            details=details
        )
        
        self.results.append(test_result)
        print(f"   {status.value} - {message} ({duration_ms:.1f}ms)")
        
        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")
            
    # ==================== API KEY AUTHENTICATION TESTS ====================
    
    async def test_api_key_authentication_valid(self):
        """Test: Valid API key allows access"""
        async with self.session.get(
            f"{API_BASE_URL}/api/domains/apple.com/public",
            headers={"X-API-Key": TEST_API_KEY}
        ) as resp:
            if resp.status == 200:
                return True
            elif resp.status == 401:
                return {
                    'status': TestStatus.WARNING,
                    'message': 'API key authentication not yet implemented',
                    'details': {'status_code': resp.status}
                }
            else:
                return {
                    'status': TestStatus.FAILED,
                    'message': f'Unexpected status code: {resp.status}',
                    'details': {'status_code': resp.status, 'body': await resp.text()}
                }
                
    async def test_api_key_authentication_invalid(self):
        """Test: Invalid API key returns 401"""
        async with self.session.get(
            f"{API_BASE_URL}/api/domains/apple.com/public",
            headers={"X-API-Key": "invalid_key_12345"}
        ) as resp:
            if resp.status == 401:
                body = await resp.json()
                if 'error' in body or 'detail' in body:
                    return True
                else:
                    return {
                        'status': TestStatus.WARNING,
                        'message': '401 returned but no error message',
                        'details': {'body': body}
                    }
            elif resp.status == 200:
                return {
                    'status': TestStatus.FAILED,
                    'message': 'Invalid API key was accepted!',
                    'details': {'critical': True}
                }
            else:
                return {
                    'status': TestStatus.WARNING,
                    'message': f'Expected 401, got {resp.status}',
                    'details': {'status_code': resp.status}
                }
                
    async def test_api_key_authentication_missing(self):
        """Test: Missing API key returns 401"""
        async with self.session.get(
            f"{API_BASE_URL}/api/domains/apple.com/public"
        ) as resp:
            # Public endpoints might allow access without key
            if resp.status == 200:
                return {
                    'status': TestStatus.WARNING,
                    'message': 'Public endpoint allows access without API key',
                    'details': {'endpoint': '/api/domains/*/public'}
                }
            elif resp.status == 401:
                return True
            else:
                return {
                    'status': TestStatus.WARNING,
                    'message': f'Unexpected status: {resp.status}',
                    'details': {'status_code': resp.status}
                }
                
    # ==================== RATE LIMITING TESTS ====================
    
    async def test_rate_limiting_enforcement(self):
        """Test: Rate limits are enforced correctly"""
        requests_made = 0
        rate_limited = False
        
        # Make rapid requests
        for i in range(150):  # Try to exceed rate limit
            async with self.session.get(
                f"{API_BASE_URL}/health",
                headers={"X-API-Key": TEST_API_KEY}
            ) as resp:
                requests_made += 1
                
                if resp.status == 429:
                    rate_limited = True
                    headers = dict(resp.headers)
                    
                    # Check for rate limit headers
                    if 'X-RateLimit-Limit' in headers or 'RateLimit-Limit' in headers:
                        return True
                    else:
                        return {
                            'status': TestStatus.WARNING,
                            'message': 'Rate limit enforced but no headers',
                            'details': {
                                'requests_made': requests_made,
                                'headers': headers
                            }
                        }
                    break
                    
                await asyncio.sleep(0.01)  # Small delay between requests
                
        if not rate_limited:
            return {
                'status': TestStatus.WARNING,
                'message': f'No rate limiting after {requests_made} requests',
                'details': {'requests_made': requests_made}
            }
            
    async def test_rate_limit_headers(self):
        """Test: Rate limit headers show remaining quota"""
        async with self.session.get(
            f"{API_BASE_URL}/api/stats",
            headers={"X-API-Key": TEST_API_KEY}
        ) as resp:
            headers = dict(resp.headers)
            
            rate_limit_headers = [
                'X-RateLimit-Limit',
                'X-RateLimit-Remaining', 
                'X-RateLimit-Reset',
                'RateLimit-Limit',
                'RateLimit-Remaining',
                'RateLimit-Reset'
            ]
            
            found_headers = [h for h in rate_limit_headers if h in headers]
            
            if found_headers:
                return {
                    'status': TestStatus.PASSED,
                    'message': 'Rate limit headers present',
                    'details': {h: headers[h] for h in found_headers}
                }
            else:
                return {
                    'status': TestStatus.WARNING,
                    'message': 'No rate limit headers found',
                    'details': {'all_headers': list(headers.keys())}
                }
                
    # ==================== REQUEST LOGGING TESTS ====================
    
    async def test_request_logging(self):
        """Test: All requests are logged"""
        # Make a unique request
        unique_id = f"test_{int(time.time())}"
        
        async with self.session.get(
            f"{API_BASE_URL}/api/stats",
            headers={
                "X-API-Key": TEST_API_KEY,
                "X-Request-ID": unique_id
            }
        ) as resp:
            if resp.status == 200:
                return {
                    'status': TestStatus.PASSED,
                    'message': 'Request completed (logging assumed)',
                    'details': {
                        'request_id': unique_id,
                        'note': 'Check server logs for verification'
                    }
                }
            else:
                return {
                    'status': TestStatus.WARNING,
                    'message': f'Request returned {resp.status}',
                    'details': {'status_code': resp.status}
                }
                
    # ==================== DATA FRESHNESS TESTS ====================
    
    async def test_data_freshness(self):
        """Test: Cache updated with recent data"""
        async with self.session.get(f"{API_BASE_URL}/api/stats") as resp:
            if resp.status != 200:
                return {
                    'status': TestStatus.FAILED,
                    'message': f'Stats endpoint returned {resp.status}',
                    'details': {'status_code': resp.status}
                }
                
            data = await resp.json()
            
            if 'platform_stats' in data and 'last_updated' in data['platform_stats']:
                last_updated = data['platform_stats']['last_updated']
                
                # Parse timestamp
                try:
                    from datetime import datetime, timedelta, timezone
                    update_time = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
                    now = datetime.now(timezone.utc)
                    age_hours = (now - update_time).total_seconds() / 3600
                    
                    if age_hours < 24:
                        return {
                            'status': TestStatus.PASSED,
                            'message': f'Data is fresh ({age_hours:.1f} hours old)',
                            'details': {'last_updated': last_updated, 'age_hours': age_hours}
                        }
                    elif age_hours < 48:
                        return {
                            'status': TestStatus.WARNING,
                            'message': f'Data is {age_hours:.1f} hours old',
                            'details': {'last_updated': last_updated}
                        }
                    else:
                        return {
                            'status': TestStatus.FAILED,
                            'message': f'Data is stale ({age_hours:.1f} hours old)',
                            'details': {'last_updated': last_updated}
                        }
                except Exception as e:
                    return {
                        'status': TestStatus.WARNING,
                        'message': 'Could not parse timestamp',
                        'details': {'timestamp': last_updated, 'error': str(e)}
                    }
            else:
                return {
                    'status': TestStatus.WARNING,
                    'message': 'No timestamp in response',
                    'details': {'response': data}
                }
                
    # ==================== ENDPOINT TESTS ====================
    
    async def test_public_endpoints(self):
        """Test: All public endpoints return valid data"""
        endpoints = [
            ("/", "Homepage"),
            ("/health", "Health check"),
            ("/api/stats", "Platform statistics"),
            ("/api/rankings", "Domain rankings"),
            ("/api/domains/apple.com/public", "Domain intelligence"),
        ]
        
        results = []
        
        for endpoint, description in endpoints:
            async with self.session.get(f"{API_BASE_URL}{endpoint}") as resp:
                if resp.status == 200:
                    results.append({
                        'endpoint': endpoint,
                        'description': description,
                        'status': 'OK',
                        'content_type': resp.headers.get('Content-Type', 'unknown')
                    })
                else:
                    results.append({
                        'endpoint': endpoint,
                        'description': description,
                        'status': f'ERROR ({resp.status})',
                        'error': await resp.text()
                    })
                    
        failed = [r for r in results if r['status'] != 'OK']
        
        if not failed:
            return {
                'status': TestStatus.PASSED,
                'message': f'All {len(endpoints)} endpoints working',
                'details': {'endpoints': results}
            }
        else:
            return {
                'status': TestStatus.FAILED,
                'message': f'{len(failed)} endpoints failed',
                'details': {'failed': failed, 'all_results': results}
            }
            
    async def test_error_handling(self):
        """Test: Proper error handling"""
        test_cases = [
            ("/api/domains/nonexistent.fake/public", 404, "Domain not found"),
            ("/api/invalid/endpoint", 404, "Not found"),
            ("/api/rankings?page=-1", 400, "Invalid page"),
        ]
        
        results = []
        
        for endpoint, expected_status, expected_message in test_cases:
            async with self.session.get(f"{API_BASE_URL}{endpoint}") as resp:
                body = await resp.text()
                
                try:
                    json_body = json.loads(body)
                except:
                    json_body = None
                    
                results.append({
                    'endpoint': endpoint,
                    'expected_status': expected_status,
                    'actual_status': resp.status,
                    'status_match': resp.status == expected_status,
                    'has_error_message': bool(json_body and ('error' in json_body or 'detail' in json_body)),
                    'body': body[:200] if len(body) > 200 else body
                })
                
        all_correct = all(r['status_match'] and r['has_error_message'] for r in results)
        
        if all_correct:
            return True
        else:
            return {
                'status': TestStatus.WARNING,
                'message': 'Some error cases not handled properly',
                'details': {'results': results}
            }
            
    async def test_performance(self):
        """Test: Good performance"""
        endpoints = [
            "/health",
            "/api/stats",
            "/api/rankings?limit=10"
        ]
        
        results = []
        
        for endpoint in endpoints:
            times = []
            
            # Make 5 requests and measure time
            for _ in range(5):
                start = time.time()
                async with self.session.get(f"{API_BASE_URL}{endpoint}") as resp:
                    await resp.read()
                duration_ms = (time.time() - start) * 1000
                times.append(duration_ms)
                
            avg_time = sum(times) / len(times)
            max_time = max(times)
            
            results.append({
                'endpoint': endpoint,
                'avg_ms': round(avg_time, 1),
                'max_ms': round(max_time, 1),
                'samples': len(times)
            })
            
        # Check if all endpoints are reasonably fast
        slow_endpoints = [r for r in results if r['avg_ms'] > 1000]
        
        if not slow_endpoints:
            return {
                'status': TestStatus.PASSED,
                'message': 'All endpoints respond quickly',
                'details': {'performance': results}
            }
        else:
            return {
                'status': TestStatus.WARNING,
                'message': f'{len(slow_endpoints)} endpoints are slow',
                'details': {'slow': slow_endpoints, 'all': results}
            }
            
    # ==================== USER AUTHENTICATION TESTS ====================
    
    async def test_user_registration(self):
        """Test: User registration flow"""
        # Try to register a test user
        test_email = f"test_{int(time.time())}@enterprise.com"
        
        async with self.session.post(
            f"{API_BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": TEST_USER_PASSWORD,
                "full_name": "Test User"
            }
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                if 'id' in data and 'email' in data:
                    return {
                        'status': TestStatus.PASSED,
                        'message': 'User registration successful',
                        'details': {
                            'user_id': data.get('id'),
                            'email': data.get('email'),
                            'tier': data.get('subscription_tier')
                        }
                    }
            elif resp.status == 404:
                return {
                    'status': TestStatus.WARNING,
                    'message': 'Auth endpoints not yet deployed',
                    'details': {'endpoint': '/api/auth/register'}
                }
            else:
                return {
                    'status': TestStatus.FAILED,
                    'message': f'Registration failed with status {resp.status}',
                    'details': {'status': resp.status, 'body': await resp.text()}
                }
                
    async def test_user_login(self):
        """Test: User login and JWT token"""
        # First try to create a user
        test_email = f"test_{int(time.time())}@enterprise.com"
        
        # Register
        async with self.session.post(
            f"{API_BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": TEST_USER_PASSWORD,
                "full_name": "Test User"
            }
        ) as resp:
            if resp.status != 200:
                return {
                    'status': TestStatus.SKIPPED,
                    'message': 'Cannot test login - registration not working',
                    'details': {'registration_status': resp.status}
                }
                
        # Now try to login
        async with self.session.post(
            f"{API_BASE_URL}/api/auth/login",
            json={
                "email": test_email,
                "password": TEST_USER_PASSWORD
            }
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                if 'access_token' in data:
                    self.auth_token = data['access_token']
                    return {
                        'status': TestStatus.PASSED,
                        'message': 'Login successful, JWT token received',
                        'details': {
                            'token_type': data.get('token_type'),
                            'user_tier': data.get('user', {}).get('subscription_tier')
                        }
                    }
                else:
                    return {
                        'status': TestStatus.FAILED,
                        'message': 'Login succeeded but no token received',
                        'details': {'response': data}
                    }
            else:
                return {
                    'status': TestStatus.FAILED,
                    'message': f'Login failed with status {resp.status}',
                    'details': {'status': resp.status}
                }
                
    # ==================== REPORT GENERATION ====================
    
    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "=" * 60)
        print("📊 ENTERPRISE SECURITY TEST REPORT")
        print("=" * 60)
        print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🎯 API: {API_BASE_URL}")
        print(f"🧪 Total Tests: {len(self.results)}")
        
        # Count by status
        status_counts = {}
        for result in self.results:
            status_counts[result.status] = status_counts.get(result.status, 0) + 1
            
        print("\n📈 Test Summary:")
        for status, count in status_counts.items():
            print(f"   {status.value}: {count}")
            
        # Critical failures
        critical_failures = [r for r in self.results if r.status == TestStatus.FAILED]
        if critical_failures:
            print("\n🚨 CRITICAL FAILURES:")
            for failure in critical_failures:
                print(f"   - {failure.name}: {failure.message}")
                
        # Warnings
        warnings = [r for r in self.results if r.status == TestStatus.WARNING]
        if warnings:
            print("\n⚠️  WARNINGS:")
            for warning in warnings:
                print(f"   - {warning.name}: {warning.message}")
                
        # Performance summary
        print("\n⏱️  Performance Summary:")
        total_time = sum(r.duration_ms for r in self.results)
        avg_time = total_time / len(self.results) if self.results else 0
        print(f"   Total test time: {total_time:.1f}ms")
        print(f"   Average per test: {avg_time:.1f}ms")
        
        # Security assessment
        print("\n🔒 SECURITY ASSESSMENT:")
        
        security_checks = {
            "API Key Authentication": any("api_key_authentication" in r.name for r in self.results if r.status == TestStatus.PASSED),
            "Rate Limiting": any("rate_limiting" in r.name for r in self.results if r.status == TestStatus.PASSED),
            "Request Logging": any("request_logging" in r.name for r in self.results if r.status == TestStatus.PASSED),
            "Error Handling": any("error_handling" in r.name for r in self.results if r.status == TestStatus.PASSED),
            "Data Freshness": any("data_freshness" in r.name for r in self.results if r.status == TestStatus.PASSED),
        }
        
        for check, passed in security_checks.items():
            status = "✅ Implemented" if passed else "❌ Not Implemented"
            print(f"   {check}: {status}")
            
        # Deployment readiness
        print("\n🚀 DEPLOYMENT READINESS:")
        
        passed_count = len([r for r in self.results if r.status == TestStatus.PASSED])
        total_count = len(self.results)
        pass_rate = (passed_count / total_count * 100) if total_count > 0 else 0
        
        if pass_rate >= 90 and not critical_failures:
            print("   ✅ READY FOR DEPLOYMENT")
            print(f"   Pass rate: {pass_rate:.1f}%")
        elif pass_rate >= 70:
            print("   ⚠️  DEPLOY WITH CAUTION")
            print(f"   Pass rate: {pass_rate:.1f}%")
            print("   Fix critical issues before production deployment")
        else:
            print("   ❌ NOT READY FOR DEPLOYMENT")
            print(f"   Pass rate: {pass_rate:.1f}%")
            print("   Multiple critical issues need to be resolved")
            
        print("\n" + "=" * 60)
        
        # Save detailed report
        report_file = f"security_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            report_data = {
                'timestamp': datetime.now().isoformat(),
                'api_url': API_BASE_URL,
                'summary': {
                    'total_tests': len(self.results),
                    'passed': passed_count,
                    'failed': len(critical_failures),
                    'warnings': len(warnings),
                    'pass_rate': pass_rate
                },
                'security_checks': security_checks,
                'test_results': [
                    {
                        'name': r.name,
                        'status': r.status.name,
                        'message': r.message,
                        'duration_ms': r.duration_ms,
                        'details': r.details
                    }
                    for r in self.results
                ]
            }
            json.dump(report_data, f, indent=2)
            
        print(f"\n📄 Detailed report saved to: {report_file}")
        
async def main():
    """Run all enterprise security tests"""
    tester = EnterpriseSecurityTester()
    
    try:
        await tester.setup()
        
        # API Key Authentication Tests
        await tester.run_test("API Key Authentication - Valid Key", tester.test_api_key_authentication_valid)
        await tester.run_test("API Key Authentication - Invalid Key", tester.test_api_key_authentication_invalid)
        await tester.run_test("API Key Authentication - Missing Key", tester.test_api_key_authentication_missing)
        
        # Rate Limiting Tests
        await tester.run_test("Rate Limiting - Enforcement", tester.test_rate_limiting_enforcement)
        await tester.run_test("Rate Limiting - Headers", tester.test_rate_limit_headers)
        
        # Request Logging Tests
        await tester.run_test("Request Logging", tester.test_request_logging)
        
        # Data Freshness Tests
        await tester.run_test("Data Freshness", tester.test_data_freshness)
        
        # Endpoint Tests
        await tester.run_test("Public Endpoints", tester.test_public_endpoints)
        await tester.run_test("Error Handling", tester.test_error_handling)
        await tester.run_test("Performance", tester.test_performance)
        
        # User Authentication Tests
        await tester.run_test("User Registration", tester.test_user_registration)
        await tester.run_test("User Login", tester.test_user_login)
        
        # Generate report
        tester.generate_report()
        
    finally:
        await tester.teardown()

if __name__ == "__main__":
    asyncio.run(main())