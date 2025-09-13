#!/usr/bin/env python3
"""
API Performance Test for Frontend Integration
"""
import time
import requests
import statistics

API_KEY = 'llmpr_4e8cba54e2b91212a81243d0463133cc1fb2a682d5e911c6417b67e9cbddf8b9'
API_BASE = 'https://llmrank.io'

def test_endpoint_performance(name, url, headers=None):
    """Test endpoint response time"""
    times = []
    errors = 0
    
    for i in range(5):  # 5 requests per endpoint
        try:
            start = time.time()
            response = requests.get(url, headers=headers, timeout=10)
            end = time.time()
            
            response_time = (end - start) * 1000  # Convert to ms
            times.append(response_time)
            
            if not response.ok:
                errors += 1
                
        except Exception as e:
            errors += 1
            print(f"Error on {name}: {e}")
    
    if times:
        return {
            'endpoint': name,
            'avg_response_time_ms': statistics.mean(times),
            'min_response_time_ms': min(times),
            'max_response_time_ms': max(times),
            'errors': errors,
            'success_rate': (5 - errors) / 5 * 100
        }
    else:
        return {
            'endpoint': name,
            'errors': errors,
            'success_rate': 0
        }

def main():
    """Run performance tests"""
    print("API Performance Test Report")
    print("=" * 50)
    
    tests = [
        ('Health Check', f'{API_BASE}/health', None),
        ('Stats API', f'{API_BASE}/api/stats', {'X-API-Key': API_KEY}),
        ('Rankings (20 items)', f'{API_BASE}/api/rankings?limit=20', {'X-API-Key': API_KEY}),
        ('Domain Intelligence', f'{API_BASE}/api/domains/tesla.com/public', {'X-API-Key': API_KEY}),
        ('Ticker API', f'{API_BASE}/api/ticker?limit=10', {'X-API-Key': API_KEY}),
    ]
    
    results = []
    
    for name, url, headers in tests:
        print(f"\nTesting {name}...")
        result = test_endpoint_performance(name, url, headers)
        results.append(result)
        
        if 'avg_response_time_ms' in result:
            print(f"  Average: {result['avg_response_time_ms']:.0f}ms")
            print(f"  Range: {result['min_response_time_ms']:.0f}ms - {result['max_response_time_ms']:.0f}ms")
            print(f"  Success Rate: {result['success_rate']:.0f}%")
        else:
            print(f"  Failed with {result['errors']} errors")
    
    print("\n" + "=" * 50)
    print("Summary:")
    
    # Calculate overall metrics
    successful_tests = [r for r in results if 'avg_response_time_ms' in r]
    if successful_tests:
        avg_response = statistics.mean([r['avg_response_time_ms'] for r in successful_tests])
        print(f"Average Response Time: {avg_response:.0f}ms")
        
        # Check if acceptable for frontend
        if avg_response < 200:
            print("✅ Performance: EXCELLENT (< 200ms)")
        elif avg_response < 500:
            print("✅ Performance: GOOD (< 500ms)")
        elif avg_response < 1000:
            print("⚠️  Performance: ACCEPTABLE (< 1s)")
        else:
            print("❌ Performance: POOR (> 1s)")
    
    # Check caching
    print("\nTesting Cache Performance...")
    # Make same request twice to test caching
    start = time.time()
    requests.get(f'{API_BASE}/api/stats', headers={'X-API-Key': API_KEY})
    first_request = (time.time() - start) * 1000
    
    start = time.time()
    requests.get(f'{API_BASE}/api/stats', headers={'X-API-Key': API_KEY})
    second_request = (time.time() - start) * 1000
    
    if second_request < first_request * 0.5:
        print(f"✅ Caching: WORKING (2nd request {second_request:.0f}ms vs 1st {first_request:.0f}ms)")
    else:
        print(f"⚠️  Caching: NOT DETECTED (2nd request {second_request:.0f}ms vs 1st {first_request:.0f}ms)")

if __name__ == '__main__':
    main()