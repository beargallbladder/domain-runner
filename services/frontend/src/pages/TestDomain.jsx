import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

// 🧪 ULTRA SIMPLE TEST PAGE - Validate domain links work
function TestDomain() {
  const [tickerData, setTickerData] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runCompleteTest = async () => {
      console.log('🧪 Starting complete domain link test...');
      
      try {
        // Step 1: Get ticker data (same as homepage)
        console.log('📊 Fetching ticker data...');
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'https://llmrank.io'}/api/ticker?limit=5`);
        const data = response.data;
        setTickerData(data.topDomains);
        console.log('✅ Ticker data:', data.topDomains);
        
        // Step 2: Test each domain individually
        const results = [];
        for (const domain of data.topDomains) {
          console.log(`🔍 Testing domain: ${domain.domain}`);
          
          try {
            // Test rankings API call
            const rankingsResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'https://llmrank.io'}/api/rankings?search=${encodeURIComponent(domain.domain)}&limit=1`);
            const rankingsData = rankingsResponse.data;
            
            const testResult = {
              domain: domain.domain,
              tickerScore: domain.score,
              rankingsFound: rankingsData.domains && rankingsData.domains.length > 0,
              rankingsScore: rankingsData.domains?.[0]?.score || 'N/A',
              linkUrl: `/domain/${domain.domain}`,
              status: rankingsData.domains && rankingsData.domains.length > 0 ? '✅ PASS' : '❌ FAIL'
            };
            
            console.log(`📊 Test result for ${domain.domain}:`, testResult);
            results.push(testResult);
            
          } catch (error) {
            console.error(`❌ Error testing ${domain.domain}:`, error);
            results.push({
              domain: domain.domain,
              status: '❌ API ERROR',
              error: error.message,
              linkUrl: `/domain/${domain.domain}`
            });
          }
        }
        
        setTestResults(results);
        console.log('🎯 Complete test results:', results);
        
      } catch (error) {
        console.error('❌ Test failed:', error);
      } finally {
        setLoading(false);
      }
    };

    runCompleteTest();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>🧪 Running Domain Link Tests...</h1>
        <div>Testing if domain clicks work properly</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>🧪 Domain Link Test Results</h1>
      <p>Testing the complete flow from homepage ticker to domain pages</p>
      
      <div style={{ marginBottom: '40px' }}>
        <h2>📊 Ticker Data (Homepage)</h2>
        <div style={{ display: 'grid', gap: '16px' }}>
          {tickerData.map((domain, index) => (
            <div key={domain.domain} style={{
              padding: '20px',
              border: '2px solid #e5e5e5',
              borderRadius: '8px',
              background: '#f8f9fa'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{domain.domain}</strong>
                  <div>Score: {domain.score}</div>
                </div>
                <Link 
                  to={`/domain/${domain.domain}`}
                  style={{
                    background: '#007AFF',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontWeight: '600'
                  }}
                >
                  Test Link →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>🔍 API Test Results</h2>
        <div style={{ display: 'grid', gap: '16px' }}>
          {testResults.map((result, index) => (
            <div key={result.domain} style={{
              padding: '20px',
              border: `2px solid ${result.status.includes('PASS') ? '#34C759' : '#FF3B30'}`,
              borderRadius: '8px',
              background: result.status.includes('PASS') ? '#e8f5e8' : '#ffebee'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div><strong>{result.domain}</strong> {result.status}</div>
                  <div>Ticker Score: {result.tickerScore}</div>
                  <div>Rankings Score: {result.rankingsScore}</div>
                  {result.error && <div style={{ color: '#FF3B30' }}>Error: {result.error}</div>}
                </div>
                <Link 
                  to={result.linkUrl}
                  style={{
                    background: result.status.includes('PASS') ? '#34C759' : '#FF3B30',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontWeight: '600'
                  }}
                >
                  View Domain →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ 
        padding: '20px',
        background: '#f0f0f0',
        borderRadius: '8px',
        marginTop: '40px'
      }}>
        <h3>🎯 Test Summary</h3>
        <div>Total Domains Tested: {testResults.length}</div>
        <div>Passing Tests: {testResults.filter(r => r.status.includes('PASS')).length}</div>
        <div>Failing Tests: {testResults.filter(r => r.status.includes('FAIL')).length}</div>
        
        <div style={{ marginTop: '20px' }}>
          <Link to="/" style={{
            background: '#007AFF',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            marginRight: '16px'
          }}>
            ← Back to Homepage
          </Link>
          
          <Link to="/rankings" style={{
            background: '#34C759',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600'
          }}>
            Test Rankings Page →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default TestDomain; 