#!/usr/bin/env python3
"""
📚 EXAMPLE: Using the Rate-Limited API
Shows how to properly handle rate limiting in client applications
"""

import requests
import time
import json
from typing import Optional, Dict

class LLMPageRankClient:
    """
    Example client for LLM PageRank API with rate limit handling
    """
    
    def __init__(self, api_key: Optional[str] = None, base_url: str = "http://localhost:8000"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        
        if api_key:
            self.session.params = {"api_key": api_key}
    
    def _handle_rate_limit(self, response: requests.Response) -> None:
        """Handle rate limit response"""
        if response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 60))
            print(f"⚠️  Rate limited! Waiting {retry_after} seconds...")
            print(f"   Limit: {response.headers.get('X-RateLimit-Limit')}")
            print(f"   Reset: {response.headers.get('X-RateLimit-Reset')}")
            time.sleep(retry_after)
    
    def _check_rate_limit_headers(self, response: requests.Response) -> None:
        """Check and display rate limit information"""
        remaining = response.headers.get('X-RateLimit-Remaining')
        limit = response.headers.get('X-RateLimit-Limit')
        tier = response.headers.get('X-RateLimit-Tier')
        
        if remaining and limit:
            usage_percent = (1 - int(remaining) / int(limit)) * 100
            print(f"📊 Rate Limit: {remaining}/{limit} remaining ({usage_percent:.1f}% used) - Tier: {tier}")
            
            if int(remaining) < 10:
                print("⚠️  Warning: Approaching rate limit!")
    
    def get_domain_intelligence(self, domain: str, max_retries: int = 3) -> Optional[Dict]:
        """
        Get domain intelligence with automatic retry on rate limit
        """
        endpoint = f"/api/domains/{domain}/public"
        if self.api_key:
            endpoint = f"/api/v1/domains/{domain}"
        
        url = f"{self.base_url}{endpoint}"
        
        for attempt in range(max_retries):
            try:
                response = self.session.get(url)
                
                if response.status_code == 429:
                    self._handle_rate_limit(response)
                    continue
                
                response.raise_for_status()
                
                # Check rate limit status
                self._check_rate_limit_headers(response)
                
                return response.json()
                
            except requests.exceptions.RequestException as e:
                print(f"❌ Error: {e}")
                if attempt < max_retries - 1:
                    print(f"   Retrying... (attempt {attempt + 2}/{max_retries})")
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise
        
        return None
    
    def list_domains(self, limit: int = 20, sort_by: str = "score") -> Optional[Dict]:
        """
        List domains with pagination
        """
        endpoint = "/api/domains" if not self.api_key else "/api/v1/domains"
        url = f"{self.base_url}{endpoint}"
        
        params = {"limit": limit, "sort_by": sort_by}
        
        response = self.session.get(url, params=params)
        
        if response.status_code == 429:
            self._handle_rate_limit(response)
            response = self.session.get(url, params=params)
        
        response.raise_for_status()
        self._check_rate_limit_headers(response)
        
        return response.json()
    
    def monitor_domain(self, domain: str, interval_seconds: int = 60, duration_minutes: int = 5):
        """
        Monitor a domain over time, respecting rate limits
        """
        print(f"📍 Monitoring {domain} for {duration_minutes} minutes...")
        print(f"   Checking every {interval_seconds} seconds")
        
        end_time = time.time() + (duration_minutes * 60)
        check_count = 0
        
        while time.time() < end_time:
            check_count += 1
            print(f"\n🔍 Check #{check_count}")
            
            try:
                data = self.get_domain_intelligence(domain)
                if data:
                    if 'metrics' in data:
                        # API v1 response
                        metrics = data['metrics']
                        print(f"   Memory Score: {metrics['memory_score']}")
                        print(f"   AI Consensus: {metrics['ai_consensus']}%")
                        print(f"   Risk: {metrics['reputation_risk']}")
                    else:
                        # Public endpoint response
                        intel = data.get('ai_intelligence', {})
                        print(f"   Memory Score: {intel.get('memory_score')}")
                        print(f"   AI Consensus: {intel.get('ai_consensus')}%")
                        print(f"   Trend: {intel.get('trend')}")
                
            except Exception as e:
                print(f"❌ Error: {e}")
            
            # Wait for next check
            if time.time() < end_time:
                time.sleep(interval_seconds)
        
        print(f"\n✅ Monitoring complete. Made {check_count} checks.")


def main():
    """Example usage of the API client"""
    print("🚀 LLM PageRank API Client Example")
    print("=" * 50)
    
    # Example 1: Public API (no authentication)
    print("\n1️⃣ PUBLIC API USAGE (No Auth)")
    public_client = LLMPageRankClient()
    
    # Get domain intelligence
    domain_data = public_client.get_domain_intelligence("google.com")
    if domain_data:
        print(f"✅ Retrieved data for google.com")
        print(f"   Intelligence: {json.dumps(domain_data.get('ai_intelligence', {}), indent=2)}")
    
    # List domains
    print("\n2️⃣ LISTING DOMAINS")
    domains = public_client.list_domains(limit=5)
    if domains:
        print(f"✅ Found {len(domains.get('domains', []))} domains")
        for d in domains.get('domains', [])[:3]:
            print(f"   - {d['domain']}: Score {d['memory_score']}")
    
    # Example 2: Authenticated API
    print("\n3️⃣ AUTHENTICATED API USAGE")
    # In production, get this from environment or secure storage
    api_key = "llm_pk_test_example_key"
    auth_client = LLMPageRankClient(api_key=api_key)
    
    try:
        domain_data = auth_client.get_domain_intelligence("facebook.com")
        if domain_data:
            print(f"✅ Retrieved enhanced data for facebook.com")
            print(f"   Tier: {domain_data.get('meta', {}).get('tier')}")
    except Exception as e:
        print(f"⚠️  Auth failed (expected with test key): {e}")
    
    # Example 3: Monitoring with rate limit awareness
    print("\n4️⃣ MONITORING WITH RATE LIMIT AWARENESS")
    print("Starting 2-minute monitoring demo...")
    
    # Monitor for just 2 minutes as a demo
    public_client.monitor_domain("twitter.com", interval_seconds=30, duration_minutes=2)
    
    print("\n✅ Example complete!")
    print("=" * 50)
    print("\n💡 Tips:")
    print("- Always check rate limit headers")
    print("- Implement exponential backoff for retries")
    print("- Cache responses when possible")
    print("- Use API keys for higher limits")


if __name__ == "__main__":
    main()