#!/usr/bin/env python3
"""
Tensor System Validator
Comprehensive validation of the memory-oracle tensor system endpoints
"""

import requests
import json
import time
import sys
from typing import Dict, List, Optional, Any

class TensorSystemValidator:
    def __init__(self, base_url: str = "https://memory-oracle.onrender.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'TensorSystemValidator/1.0'
        })
        
        # Test domain IDs (we'll need to get these from the database)
        self.test_domains = [
            "test-domain-1",
            "test-domain-2",
            "test-domain-3"
        ]
        
        self.results = {
            'service_health': False,
            'endpoints_tested': 0,
            'endpoints_passed': 0,
            'endpoints_failed': 0,
            'detailed_results': {},
            'errors': []
        }

    def log(self, message: str, level: str = "INFO"):
        """Log message with timestamp"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, timeout: int = 30) -> Dict[str, Any]:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, timeout=timeout)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, timeout=timeout)
            else:
                return {"success": False, "error": f"Unsupported method: {method}"}
            
            response.raise_for_status()
            return {
                "success": True,
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "response_time": response.elapsed.total_seconds()
            }
            
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": str(e),
                "status_code": getattr(e.response, 'status_code', None) if hasattr(e, 'response') else None
            }

    def test_health_endpoint(self) -> bool:
        """Test service health endpoint"""
        self.log("Testing health endpoint...")
        
        result = self.make_request('GET', '/health')
        
        if result['success']:
            health_data = result['data']
            self.log(f"Health check passed: {health_data.get('status', 'unknown')}")
            self.log(f"Service: {health_data.get('service', 'unknown')}")
            self.log(f"Version: {health_data.get('version', 'unknown')}")
            
            # Check component status
            components = health_data.get('components', {})
            for component, status in components.items():
                self.log(f"  Component {component}: {'✓' if status else '✗'}")
            
            self.results['service_health'] = True
            self.results['detailed_results']['health'] = result
            return True
        else:
            self.log(f"Health check failed: {result.get('error')}", "ERROR")
            self.results['errors'].append(f"Health check failed: {result.get('error')}")
            return False

    def test_tensor_compute_endpoint(self, domain_id: str) -> bool:
        """Test POST /tensors/compute endpoint"""
        self.log(f"Testing tensor compute for domain: {domain_id}")
        
        result = self.make_request('POST', '/tensors/compute', {"domainId": domain_id})
        
        if result['success']:
            data = result['data']
            self.log(f"Tensor computation successful - composite score: {data.get('compositeScore', 'N/A')}")
            
            # Validate expected fields
            expected_fields = ['domainId', 'memory', 'sentiment', 'grounding', 'drift', 'consensus', 'compositeScore', 'insights']
            missing_fields = [field for field in expected_fields if field not in data]
            
            if missing_fields:
                self.log(f"Missing fields in response: {missing_fields}", "WARNING")
            
            self.results['detailed_results'][f'tensor_compute_{domain_id}'] = result
            return True
        else:
            self.log(f"Tensor compute failed: {result.get('error')}", "ERROR")
            self.results['errors'].append(f"Tensor compute failed for {domain_id}: {result.get('error')}")
            return False

    def test_memory_tensor_endpoint(self, domain_id: str) -> bool:
        """Test GET /tensors/memory/:domainId endpoint"""
        self.log(f"Testing memory tensor for domain: {domain_id}")
        
        result = self.make_request('GET', f'/tensors/memory/{domain_id}')
        
        if result['success']:
            data = result['data']
            self.log(f"Memory tensor successful - score: {data.get('memoryScore', 'N/A')}")
            
            # Validate memory tensor structure
            expected_components = ['recency', 'frequency', 'significance', 'persistence']
            components = data.get('components', {})
            missing_components = [comp for comp in expected_components if comp not in components]
            
            if missing_components:
                self.log(f"Missing memory components: {missing_components}", "WARNING")
            
            self.results['detailed_results'][f'memory_tensor_{domain_id}'] = result
            return True
        else:
            self.log(f"Memory tensor failed: {result.get('error')}", "ERROR")
            self.results['errors'].append(f"Memory tensor failed for {domain_id}: {result.get('error')}")
            return False

    def test_sentiment_tensor_endpoint(self, domain_id: str) -> bool:
        """Test GET /tensors/sentiment/:domainId endpoint"""
        self.log(f"Testing sentiment tensor for domain: {domain_id}")
        
        result = self.make_request('GET', f'/tensors/sentiment/{domain_id}')
        
        if result['success']:
            data = result['data']
            self.log(f"Sentiment tensor successful - score: {data.get('sentimentScore', 'N/A')}")
            self.log(f"Market sentiment: {data.get('marketSentiment', 'N/A')}")
            
            # Validate sentiment tensor structure
            expected_fields = ['sentimentDistribution', 'emotionalProfile', 'marketSentiment']
            missing_fields = [field for field in expected_fields if field not in data]
            
            if missing_fields:
                self.log(f"Missing sentiment fields: {missing_fields}", "WARNING")
            
            self.results['detailed_results'][f'sentiment_tensor_{domain_id}'] = result
            return True
        else:
            self.log(f"Sentiment tensor failed: {result.get('error')}", "ERROR")
            self.results['errors'].append(f"Sentiment tensor failed for {domain_id}: {result.get('error')}")
            return False

    def test_grounding_tensor_endpoint(self, domain_id: str) -> bool:
        """Test GET /tensors/grounding/:domainId endpoint"""
        self.log(f"Testing grounding tensor for domain: {domain_id}")
        
        result = self.make_request('GET', f'/tensors/grounding/{domain_id}')
        
        if result['success']:
            data = result['data']
            self.log(f"Grounding tensor successful - score: {data.get('groundingScore', 'N/A')}")
            self.log(f"Grounding strength: {data.get('groundingStrength', 'N/A')}")
            
            # Validate grounding tensor structure
            expected_components = ['factualAccuracy', 'dataConsistency', 'sourceReliability', 'temporalStability', 'crossValidation']
            components = data.get('components', {})
            missing_components = [comp for comp in expected_components if comp not in components]
            
            if missing_components:
                self.log(f"Missing grounding components: {missing_components}", "WARNING")
            
            self.results['detailed_results'][f'grounding_tensor_{domain_id}'] = result
            return True
        else:
            self.log(f"Grounding tensor failed: {result.get('error')}", "ERROR")
            self.results['errors'].append(f"Grounding tensor failed for {domain_id}: {result.get('error')}")
            return False

    def test_drift_detection_endpoint(self, domain_id: str) -> bool:
        """Test GET /drift/detect/:domainId endpoint"""
        self.log(f"Testing drift detection for domain: {domain_id}")
        
        result = self.make_request('GET', f'/drift/detect/{domain_id}')
        
        if result['success']:
            data = result['data']
            self.log(f"Drift detection successful - score: {data.get('driftScore', 'N/A')}")
            self.log(f"Drift type: {data.get('driftType', 'N/A')}, severity: {data.get('severity', 'N/A')}")
            
            # Validate drift metrics structure
            expected_components = ['conceptDrift', 'dataDrift', 'modelDrift', 'temporalDrift']
            components = data.get('components', {})
            missing_components = [comp for comp in expected_components if comp not in components]
            
            if missing_components:
                self.log(f"Missing drift components: {missing_components}", "WARNING")
            
            self.results['detailed_results'][f'drift_detection_{domain_id}'] = result
            return True
        else:
            self.log(f"Drift detection failed: {result.get('error')}", "ERROR")
            self.results['errors'].append(f"Drift detection failed for {domain_id}: {result.get('error')}")
            return False

    def test_consensus_scoring_endpoint(self, domain_id: str) -> bool:
        """Test GET /consensus/compute/:domainId endpoint"""
        self.log(f"Testing consensus scoring for domain: {domain_id}")
        
        result = self.make_request('GET', f'/consensus/compute/{domain_id}')
        
        if result['success']:
            data = result['data']
            self.log(f"Consensus scoring successful - score: {data.get('consensusScore', 'N/A')}")
            self.log(f"Agreement level: {data.get('agreementLevel', 'N/A')}")
            
            # Validate consensus metrics structure
            expected_components = ['modelAgreement', 'temporalConsistency', 'crossPromptAlignment', 'confidenceAlignment']
            components = data.get('components', {})
            missing_components = [comp for comp in expected_components if comp not in components]
            
            if missing_components:
                self.log(f"Missing consensus components: {missing_components}", "WARNING")
            
            self.results['detailed_results'][f'consensus_scoring_{domain_id}'] = result
            return True
        else:
            self.log(f"Consensus scoring failed: {result.get('error')}", "ERROR")
            self.results['errors'].append(f"Consensus scoring failed for {domain_id}: {result.get('error')}")
            return False

    def test_comprehensive_analysis_endpoint(self, domain_id: str) -> bool:
        """Test GET /analysis/domain/:domainId endpoint"""
        self.log(f"Testing comprehensive analysis for domain: {domain_id}")
        
        result = self.make_request('GET', f'/analysis/domain/{domain_id}')
        
        if result['success']:
            data = result['data']
            self.log(f"Comprehensive analysis successful")
            
            # Check for expected analysis sections
            expected_sections = ['domain', 'current', 'trends', 'similar', 'recommendations']
            missing_sections = [section for section in expected_sections if section not in data]
            
            if missing_sections:
                self.log(f"Missing analysis sections: {missing_sections}", "WARNING")
            
            recommendations = data.get('recommendations', [])
            self.log(f"Generated {len(recommendations)} recommendations")
            
            self.results['detailed_results'][f'comprehensive_analysis_{domain_id}'] = result
            return True
        else:
            self.log(f"Comprehensive analysis failed: {result.get('error')}", "ERROR")
            self.results['errors'].append(f"Comprehensive analysis failed for {domain_id}: {result.get('error')}")
            return False

    def test_additional_endpoints(self) -> int:
        """Test additional utility endpoints"""
        self.log("Testing additional utility endpoints...")
        
        additional_tests = [
            ('GET', '/drift/alerts', 'drift_alerts'),
            ('GET', '/consensus/insights', 'consensus_insights'),
            ('GET', '/consensus/conflicted/10', 'conflicted_domains'),
            ('GET', '/consensus/sectors', 'sector_consensus'),
            ('GET', '/tensors/memory/top/5', 'top_memories'),
            ('GET', '/tensors/sentiment/market/distribution', 'market_sentiment_distribution'),
            ('GET', '/tensors/grounding/ungrounded/0.5', 'ungrounded_domains')
        ]
        
        passed = 0
        for method, endpoint, test_name in additional_tests:
            self.results['endpoints_tested'] += 1
            result = self.make_request(method, endpoint)
            
            if result['success']:
                self.log(f"✓ {test_name} endpoint working")
                self.results['endpoints_passed'] += 1
                self.results['detailed_results'][test_name] = result
                passed += 1
            else:
                self.log(f"✗ {test_name} endpoint failed: {result.get('error')}", "ERROR")
                self.results['endpoints_failed'] += 1
                self.results['errors'].append(f"{test_name} failed: {result.get('error')}")
        
        return passed

    def get_real_domain_ids(self) -> List[str]:
        """Get real domain IDs from the database for testing"""
        # For now, we'll use mock domain IDs since we'd need database access
        # In a real implementation, this would query the domains table
        return [
            "11111111-1111-1111-1111-111111111111",  # Mock UUID
            "22222222-2222-2222-2222-222222222222",  # Mock UUID
            "33333333-3333-3333-3333-333333333333"   # Mock UUID
        ]

    def run_full_validation(self) -> Dict[str, Any]:
        """Run complete validation of tensor system"""
        self.log("🧠 Starting comprehensive tensor system validation...")
        self.log(f"Target service: {self.base_url}")
        
        # Step 1: Test service health
        if not self.test_health_endpoint():
            self.log("❌ Service health check failed - cannot proceed with tensor tests", "ERROR")
            return self.results
        
        # Step 2: Get domain IDs for testing
        domain_ids = self.get_real_domain_ids()
        self.log(f"Testing with {len(domain_ids)} domain(s)")
        
        # Step 3: Test core tensor endpoints for each domain
        core_tests = [
            ('tensor_compute', self.test_tensor_compute_endpoint),
            ('memory_tensor', self.test_memory_tensor_endpoint),
            ('sentiment_tensor', self.test_sentiment_tensor_endpoint),
            ('grounding_tensor', self.test_grounding_tensor_endpoint),
            ('drift_detection', self.test_drift_detection_endpoint),
            ('consensus_scoring', self.test_consensus_scoring_endpoint),
            ('comprehensive_analysis', self.test_comprehensive_analysis_endpoint)
        ]
        
        for domain_id in domain_ids:
            self.log(f"\n🔍 Testing domain: {domain_id}")
            
            for test_name, test_func in core_tests:
                self.results['endpoints_tested'] += 1
                
                if test_func(domain_id):
                    self.results['endpoints_passed'] += 1
                else:
                    self.results['endpoints_failed'] += 1
        
        # Step 4: Test additional utility endpoints
        additional_passed = self.test_additional_endpoints()
        
        # Step 5: Generate final report
        self.generate_final_report()
        
        return self.results

    def generate_final_report(self):
        """Generate and display final validation report"""
        self.log("\n" + "="*80)
        self.log("🧠 TENSOR SYSTEM VALIDATION REPORT")
        self.log("="*80)
        
        # Service health
        health_status = "✅ HEALTHY" if self.results['service_health'] else "❌ UNHEALTHY"
        self.log(f"Service Status: {health_status}")
        
        # Endpoint statistics
        total_tested = self.results['endpoints_tested']
        total_passed = self.results['endpoints_passed']
        total_failed = self.results['endpoints_failed']
        success_rate = (total_passed / total_tested * 100) if total_tested > 0 else 0
        
        self.log(f"Endpoints Tested: {total_tested}")
        self.log(f"Endpoints Passed: {total_passed}")
        self.log(f"Endpoints Failed: {total_failed}")
        self.log(f"Success Rate: {success_rate:.1f}%")
        
        # Overall status
        if success_rate >= 90:
            self.log("🟢 OVERALL STATUS: EXCELLENT - Tensor system fully operational")
        elif success_rate >= 75:
            self.log("🟡 OVERALL STATUS: GOOD - Minor issues detected")
        elif success_rate >= 50:
            self.log("🟠 OVERALL STATUS: DEGRADED - Significant issues detected")
        else:
            self.log("🔴 OVERALL STATUS: CRITICAL - Major system failures")
        
        # Error summary
        if self.results['errors']:
            self.log(f"\n❌ ERRORS DETECTED ({len(self.results['errors'])}):")
            for i, error in enumerate(self.results['errors'], 1):
                self.log(f"  {i}. {error}")
        
        self.log("="*80)
        
        # Save detailed results to file
        with open('/Users/samkim/domain-runner/tensor_validation_results.json', 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        self.log("📊 Detailed results saved to: tensor_validation_results.json")

if __name__ == "__main__":
    # Allow custom base URL from command line
    base_url = sys.argv[1] if len(sys.argv) > 1 else "https://memory-oracle.onrender.com"
    
    validator = TensorSystemValidator(base_url)
    results = validator.run_full_validation()
    
    # Exit with appropriate code
    success_rate = (results['endpoints_passed'] / results['endpoints_tested'] * 100) if results['endpoints_tested'] > 0 else 0
    sys.exit(0 if success_rate >= 75 else 1)