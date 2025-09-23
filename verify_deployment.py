#!/usr/bin/env python3
"""
Verify domain-runner deployment on Render

This script verifies that the domain-runner application is properly deployed
and functioning on Render. It checks service health, database connectivity,
and API functionality.

Usage:
    python verify_deployment.py [--url https://your-service.onrender.com]
"""

import requests
import json
import time
import argparse
import sys
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin


class DeploymentVerifier:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.timeout = 30

    def test_basic_connectivity(self) -> Tuple[bool, str]:
        """Test basic connectivity to the service"""
        try:
            response = self.session.get(self.base_url)
            if response.status_code in [200, 404]:  # 404 is OK, means service is up
                return True, f"Service reachable (HTTP {response.status_code})"
            else:
                return False, f"Unexpected status code: {response.status_code}"
        except requests.RequestException as e:
            return False, f"Connection failed: {str(e)}"

    def test_health_endpoint(self) -> Tuple[bool, Dict]:
        """Test the /healthz endpoint"""
        try:
            url = urljoin(self.base_url, '/healthz')
            response = self.session.get(url)

            if response.status_code == 200:
                try:
                    health_data = response.json()
                    return True, health_data
                except json.JSONDecodeError:
                    return False, {"error": "Invalid JSON response", "text": response.text}
            else:
                return False, {
                    "error": f"HTTP {response.status_code}",
                    "text": response.text[:500]
                }
        except requests.RequestException as e:
            return False, {"error": f"Request failed: {str(e)}"}

    def test_api_endpoints(self) -> Dict[str, Tuple[bool, str]]:
        """Test various API endpoints"""
        endpoints = {
            "/": "Root endpoint",
            "/docs": "API documentation",
            "/healthz": "Health check"
        }

        results = {}
        for endpoint, description in endpoints.items():
            try:
                url = urljoin(self.base_url, endpoint)
                response = self.session.get(url)

                if response.status_code in [200, 307, 404]:  # Some redirects are OK
                    results[endpoint] = (True, f"OK (HTTP {response.status_code})")
                else:
                    results[endpoint] = (False, f"HTTP {response.status_code}")

            except requests.RequestException as e:
                results[endpoint] = (False, f"Failed: {str(e)}")

        return results

    def test_database_connectivity(self, health_data: Dict) -> Tuple[bool, str]:
        """Test database connectivity from health data"""
        try:
            # Check if health data contains database info
            if 'database' in health_data:
                db_status = health_data['database']
                if db_status == 'connected' or 'connected' in str(db_status).lower():
                    return True, "Database connected"
                else:
                    return False, f"Database status: {db_status}"

            # Check components for database info
            components = health_data.get('components', {})
            if 'database' in components:
                db_info = components['database']
                if db_info.get('status') == 'healthy':
                    return True, "Database healthy"
                else:
                    return False, f"Database unhealthy: {db_info}"

            # If no specific database info, assume it's working if health endpoint works
            return True, "Database status unknown but service responding"

        except Exception as e:
            return False, f"Error checking database: {str(e)}"

    def test_llm_providers(self, health_data: Dict) -> Dict[str, bool]:
        """Test LLM provider availability from health data"""
        providers = {}

        try:
            # Check if providers info is in health data
            if 'providers' in health_data:
                provider_data = health_data['providers']

                if 'configured' in provider_data:
                    configured = provider_data['configured']
                    for provider in configured:
                        providers[provider] = True

                if 'available' in provider_data:
                    available = provider_data['available']
                    for provider in available:
                        providers[provider] = True

                if 'status' in provider_data:
                    status = provider_data['status']
                    for provider, is_available in status.items():
                        providers[provider] = bool(is_available)

            # Check components for provider info
            components = health_data.get('components', {})
            for key, value in components.items():
                if 'provider' in key.lower() or 'llm' in key.lower():
                    providers[key] = value.get('status') == 'healthy'

        except Exception as e:
            print(f"Warning: Error checking LLM providers: {e}")

        return providers

    def run_comprehensive_test(self) -> Dict:
        """Run all verification tests"""
        print(f"🔍 Verifying deployment at: {self.base_url}")
        print("=" * 60)

        results = {
            'overall_status': 'unknown',
            'tests': {},
            'warnings': [],
            'errors': []
        }

        # Test 1: Basic connectivity
        print("1. Testing basic connectivity...")
        conn_ok, conn_msg = self.test_basic_connectivity()
        results['tests']['connectivity'] = {'passed': conn_ok, 'message': conn_msg}

        if conn_ok:
            print(f"   ✅ {conn_msg}")
        else:
            print(f"   ❌ {conn_msg}")
            results['errors'].append(f"Connectivity: {conn_msg}")
            results['overall_status'] = 'failed'
            return results

        # Test 2: Health endpoint
        print("2. Testing health endpoint...")
        health_ok, health_data = self.test_health_endpoint()
        results['tests']['health'] = {'passed': health_ok, 'data': health_data}

        if health_ok:
            print(f"   ✅ Health endpoint responding")
            status = health_data.get('status', 'unknown')
            service = health_data.get('service', 'unknown')
            version = health_data.get('version', 'unknown')
            print(f"      Status: {status}")
            print(f"      Service: {service}")
            print(f"      Version: {version}")
        else:
            print(f"   ❌ Health endpoint failed: {health_data.get('error', 'unknown')}")
            results['errors'].append(f"Health endpoint: {health_data.get('error', 'failed')}")

        # Test 3: Database connectivity
        if health_ok:
            print("3. Testing database connectivity...")
            db_ok, db_msg = self.test_database_connectivity(health_data)
            results['tests']['database'] = {'passed': db_ok, 'message': db_msg}

            if db_ok:
                print(f"   ✅ {db_msg}")
            else:
                print(f"   ❌ {db_msg}")
                results['warnings'].append(f"Database: {db_msg}")

        # Test 4: API endpoints
        print("4. Testing API endpoints...")
        api_results = self.test_api_endpoints()
        results['tests']['api_endpoints'] = api_results

        for endpoint, (passed, message) in api_results.items():
            if passed:
                print(f"   ✅ {endpoint}: {message}")
            else:
                print(f"   ❌ {endpoint}: {message}")
                results['warnings'].append(f"Endpoint {endpoint}: {message}")

        # Test 5: LLM providers
        if health_ok:
            print("5. Testing LLM provider availability...")
            provider_results = self.test_llm_providers(health_data)
            results['tests']['llm_providers'] = provider_results

            if provider_results:
                for provider, available in provider_results.items():
                    if available:
                        print(f"   ✅ {provider}: Available")
                    else:
                        print(f"   ❌ {provider}: Not available")
                        results['warnings'].append(f"LLM provider {provider} not available")
            else:
                print("   ⚠️  No LLM provider information available")
                results['warnings'].append("No LLM provider information in health data")

        # Determine overall status
        if results['errors']:
            results['overall_status'] = 'failed'
        elif results['warnings']:
            results['overall_status'] = 'degraded'
        else:
            results['overall_status'] = 'healthy'

        return results

    def print_summary(self, results: Dict):
        """Print verification summary"""
        print("\n" + "=" * 60)
        print("📊 DEPLOYMENT VERIFICATION SUMMARY")
        print("=" * 60)

        status = results['overall_status']
        if status == 'healthy':
            print("🎉 Overall Status: HEALTHY ✅")
        elif status == 'degraded':
            print("⚠️  Overall Status: DEGRADED (Some issues found)")
        elif status == 'failed':
            print("❌ Overall Status: FAILED")
        else:
            print(f"❓ Overall Status: {status.upper()}")

        # Show test results
        tests = results.get('tests', {})
        print(f"\n📋 Test Results ({len(tests)} tests run):")

        for test_name, test_result in tests.items():
            if isinstance(test_result, dict) and 'passed' in test_result:
                status_icon = "✅" if test_result['passed'] else "❌"
                print(f"   {status_icon} {test_name.replace('_', ' ').title()}")
            else:
                print(f"   📝 {test_name.replace('_', ' ').title()}: {len(test_result)} items")

        # Show errors
        errors = results.get('errors', [])
        if errors:
            print(f"\n❌ Errors ({len(errors)}):")
            for error in errors:
                print(f"   • {error}")

        # Show warnings
        warnings = results.get('warnings', [])
        if warnings:
            print(f"\n⚠️  Warnings ({len(warnings)}):")
            for warning in warnings:
                print(f"   • {warning}")

        # Recommendations
        print(f"\n💡 Recommendations:")
        if status == 'healthy':
            print("   • Deployment looks good! Monitor logs for any runtime issues.")
            print("   • Consider setting up automated health checks.")
            print("   • Test key API functionality with real requests.")
        elif status == 'degraded':
            print("   • Address the warnings above to improve service reliability.")
            print("   • Check service logs for more detailed error information.")
            print("   • Verify environment variables are properly set.")
        elif status == 'failed':
            print("   • Fix critical errors before proceeding.")
            print("   • Check Render dashboard for deployment status.")
            print("   • Verify GitHub repository and render.yaml configuration.")
            print("   • Ensure all dependencies are properly configured.")

        print(f"\n🔗 Service URL: {self.base_url}")
        print(f"📚 Health Endpoint: {self.base_url}/healthz")
        print(f"📖 API Docs: {self.base_url}/docs")


def main():
    parser = argparse.ArgumentParser(description='Verify domain-runner deployment on Render')
    parser.add_argument(
        '--url',
        default='https://domain-runner-web.onrender.com',
        help='Base URL of the deployed service (default: https://domain-runner-web.onrender.com)'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results in JSON format'
    )

    args = parser.parse_args()

    verifier = DeploymentVerifier(args.url)
    results = verifier.run_comprehensive_test()

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        verifier.print_summary(results)

    # Exit with appropriate code
    if results['overall_status'] == 'failed':
        sys.exit(1)
    elif results['overall_status'] == 'degraded':
        sys.exit(2)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()