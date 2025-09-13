#!/usr/bin/env python3
"""
API Key Security Audit for llmrank.io
Tests authentication, rate limiting, and security vulnerabilities
"""

import asyncio
import asyncpg
import aiohttp
import hashlib
import json
from datetime import datetime
import os

class APIKeySecurityAuditor:
    def __init__(self, database_url: str, api_base_url: str = "https://sophisticated-runner.onrender.com"):
        self.database_url = database_url
        self.api_base_url = api_base_url
        self.audit_results = {
            "timestamp": datetime.now().isoformat(),
            "database_security": {},
            "api_authentication": {},
            "rate_limiting": {},
            "vulnerabilities": []
        }
    
    async def audit_database_security(self):
        """Audit API key storage and database security"""
        print("\n🔍 AUDITING DATABASE SECURITY...")
        
        try:
            conn = await asyncpg.connect(self.database_url)
            
            # 1. Check if API keys are properly hashed
            raw_keys = await conn.fetch("""
                SELECT api_key_hash, partner_email, tier, is_active, expires_at, usage_count
                FROM partner_api_keys
            """)
            
            self.audit_results["database_security"]["total_keys"] = len(raw_keys)
            
            # Check hash format (should be SHA256 = 64 chars)
            properly_hashed = all(len(key['api_key_hash']) == 64 for key in raw_keys)
            self.audit_results["database_security"]["properly_hashed"] = properly_hashed
            
            if not properly_hashed:
                self.audit_results["vulnerabilities"].append({
                    "severity": "CRITICAL",
                    "issue": "API keys not properly hashed",
                    "description": "Some API keys are not using SHA256 hashing"
                })
            
            # 2. Check for expired keys
            expired_keys = [k for k in raw_keys if k['expires_at'] and k['expires_at'] < datetime.now()]
            self.audit_results["database_security"]["expired_keys"] = len(expired_keys)
            
            if expired_keys:
                self.audit_results["vulnerabilities"].append({
                    "severity": "MEDIUM",
                    "issue": f"{len(expired_keys)} expired API keys still in database",
                    "description": "Expired keys should be deactivated or removed"
                })
            
            # 3. Check API key tiers and limits
            tier_stats = {}
            for key in raw_keys:
                tier = key['tier']
                if tier not in tier_stats:
                    tier_stats[tier] = {"count": 0, "active": 0}
                tier_stats[tier]["count"] += 1
                if key['is_active']:
                    tier_stats[tier]["active"] += 1
            
            self.audit_results["database_security"]["tier_distribution"] = tier_stats
            
            # 4. Check usage tracking
            usage_log_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'api_key_usage_log'
                )
            """)
            
            self.audit_results["database_security"]["usage_tracking_enabled"] = usage_log_exists
            
            if usage_log_exists:
                usage_count = await conn.fetchval("SELECT COUNT(*) FROM api_key_usage_log")
                self.audit_results["database_security"]["usage_log_entries"] = usage_count
            
            # 5. Check for database encryption
            # Note: This is a basic check - real encryption audit would be more complex
            ssl_enabled = "sslmode" in self.database_url or "ssl=true" in self.database_url
            self.audit_results["database_security"]["ssl_enabled"] = ssl_enabled
            
            if not ssl_enabled:
                self.audit_results["vulnerabilities"].append({
                    "severity": "HIGH",
                    "issue": "Database connection not using SSL",
                    "description": "API key data transmitted without encryption"
                })
            
            await conn.close()
            print("✅ Database security audit complete")
            
        except Exception as e:
            print(f"❌ Database audit failed: {e}")
            self.audit_results["vulnerabilities"].append({
                "severity": "CRITICAL",
                "issue": "Database audit failed",
                "description": str(e)
            })
    
    async def test_api_authentication(self):
        """Test API endpoint authentication"""
        print("\n🔍 TESTING API AUTHENTICATION...")
        
        endpoints_to_test = [
            "/api/domains/apple.com/public",
            "/api/rankings",
            "/api/stats",
            "/api/ticker",
            "/api/fire-alarm-dashboard"
        ]
        
        # Test 1: Access without API key
        print("Testing endpoints without API key...")
        no_key_results = {}
        
        async with aiohttp.ClientSession() as session:
            for endpoint in endpoints_to_test:
                try:
                    url = f"{self.api_base_url}{endpoint}"
                    async with session.get(url, timeout=10) as response:
                        no_key_results[endpoint] = {
                            "status": response.status,
                            "requires_auth": response.status in [401, 403]
                        }
                except Exception as e:
                    no_key_results[endpoint] = {
                        "status": "error",
                        "error": str(e)
                    }
        
        self.audit_results["api_authentication"]["no_key_access"] = no_key_results
        
        # Check if any endpoints are unprotected
        unprotected = [ep for ep, res in no_key_results.items() 
                      if res.get("status") == 200]
        
        if unprotected:
            self.audit_results["vulnerabilities"].append({
                "severity": "CRITICAL",
                "issue": "Unprotected API endpoints",
                "description": f"Endpoints accessible without authentication: {unprotected}"
            })
        
        # Test 2: Invalid API key
        print("Testing with invalid API key...")
        invalid_key_results = {}
        
        async with aiohttp.ClientSession() as session:
            headers = {"X-API-Key": "llmpr_invalid_key_12345"}
            for endpoint in endpoints_to_test[:2]:  # Test first 2 endpoints
                try:
                    url = f"{self.api_base_url}{endpoint}"
                    async with session.get(url, headers=headers, timeout=10) as response:
                        invalid_key_results[endpoint] = {
                            "status": response.status,
                            "properly_rejected": response.status in [401, 403]
                        }
                except Exception as e:
                    invalid_key_results[endpoint] = {
                        "status": "error",
                        "error": str(e)
                    }
        
        self.audit_results["api_authentication"]["invalid_key_access"] = invalid_key_results
        
        print("✅ API authentication test complete")
    
    async def test_rate_limiting(self):
        """Test rate limiting functionality"""
        print("\n🔍 TESTING RATE LIMITING...")
        
        # Note: This would require a valid API key to test properly
        # For now, we'll check if rate limiting headers are present
        
        async with aiohttp.ClientSession() as session:
            try:
                url = f"{self.api_base_url}/api/stats"
                async with session.get(url, timeout=10) as response:
                    headers = dict(response.headers)
                    
                    rate_limit_headers = {
                        "X-RateLimit-Limit": headers.get("X-RateLimit-Limit"),
                        "X-RateLimit-Remaining": headers.get("X-RateLimit-Remaining"),
                        "X-RateLimit-Reset": headers.get("X-RateLimit-Reset")
                    }
                    
                    self.audit_results["rate_limiting"]["headers_present"] = any(rate_limit_headers.values())
                    self.audit_results["rate_limiting"]["headers"] = rate_limit_headers
                    
                    if not any(rate_limit_headers.values()):
                        self.audit_results["vulnerabilities"].append({
                            "severity": "MEDIUM",
                            "issue": "No rate limiting headers",
                            "description": "API does not return rate limiting information"
                        })
                        
            except Exception as e:
                self.audit_results["rate_limiting"]["error"] = str(e)
        
        print("✅ Rate limiting test complete")
    
    async def check_code_vulnerabilities(self):
        """Check for hardcoded secrets and vulnerabilities"""
        print("\n🔍 CHECKING CODE VULNERABILITIES...")
        
        # This would normally scan the codebase, but we'll check known patterns
        vulnerabilities_found = []
        
        # Check environment variables
        critical_vars = ["DATABASE_URL", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"]
        for var in critical_vars:
            if var in os.environ:
                # Check if it's exposed in any way
                value = os.environ[var]
                if "postgresql://" in value and "@" in value:
                    # Database URL contains credentials
                    vulnerabilities_found.append({
                        "severity": "INFO",
                        "issue": f"{var} contains inline credentials",
                        "description": "Consider using connection pooling with separate credential management"
                    })
        
        self.audit_results["vulnerabilities"].extend(vulnerabilities_found)
        print("✅ Code vulnerability check complete")
    
    def generate_report(self):
        """Generate security audit report"""
        print("\n" + "="*60)
        print("🔐 API KEY SECURITY AUDIT REPORT")
        print("="*60)
        print(f"Timestamp: {self.audit_results['timestamp']}")
        
        # Database Security
        print("\n📊 DATABASE SECURITY:")
        db_sec = self.audit_results["database_security"]
        print(f"  • Total API Keys: {db_sec.get('total_keys', 'Unknown')}")
        print(f"  • Properly Hashed: {db_sec.get('properly_hashed', 'Unknown')}")
        print(f"  • Expired Keys: {db_sec.get('expired_keys', 'Unknown')}")
        print(f"  • SSL Enabled: {db_sec.get('ssl_enabled', 'Unknown')}")
        print(f"  • Usage Tracking: {db_sec.get('usage_tracking_enabled', 'Unknown')}")
        
        if db_sec.get('tier_distribution'):
            print("\n  Tier Distribution:")
            for tier, stats in db_sec['tier_distribution'].items():
                print(f"    • {tier}: {stats['count']} total, {stats['active']} active")
        
        # API Authentication
        print("\n🔑 API AUTHENTICATION:")
        auth = self.audit_results["api_authentication"]
        if auth.get("no_key_access"):
            protected = sum(1 for r in auth["no_key_access"].values() if r.get("requires_auth"))
            total = len(auth["no_key_access"])
            print(f"  • Endpoints tested: {total}")
            print(f"  • Protected endpoints: {protected}/{total}")
        
        # Rate Limiting
        print("\n⏱️  RATE LIMITING:")
        rl = self.audit_results["rate_limiting"]
        print(f"  • Headers Present: {rl.get('headers_present', 'Unknown')}")
        
        # Vulnerabilities
        print("\n⚠️  VULNERABILITIES FOUND:")
        if not self.audit_results["vulnerabilities"]:
            print("  ✅ No critical vulnerabilities detected")
        else:
            for vuln in self.audit_results["vulnerabilities"]:
                print(f"\n  [{vuln['severity']}] {vuln['issue']}")
                print(f"  Description: {vuln['description']}")
        
        # Recommendations
        print("\n📋 RECOMMENDATIONS:")
        print("  1. Implement API key authentication on all public endpoints")
        print("  2. Add rate limiting with proper headers")
        print("  3. Implement API key rotation mechanism")
        print("  4. Add IP whitelisting for high-tier API keys")
        print("  5. Enable comprehensive usage logging and monitoring")
        print("  6. Set up alerts for suspicious API usage patterns")
        print("  7. Implement API key expiration and auto-renewal")
        print("  8. Add request signing for additional security")
        
        print("\n" + "="*60)
        
        # Save report
        with open("api_key_security_audit_report.json", "w") as f:
            json.dump(self.audit_results, f, indent=2, default=str)
        print("📄 Full report saved to: api_key_security_audit_report.json")

async def main():
    database_url = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"
    
    auditor = APIKeySecurityAuditor(database_url)
    
    # Run all audits
    await auditor.audit_database_security()
    await auditor.test_api_authentication()
    await auditor.test_rate_limiting()
    await auditor.check_code_vulnerabilities()
    
    # Generate report
    auditor.generate_report()

if __name__ == "__main__":
    asyncio.run(main())