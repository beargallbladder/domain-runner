import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { useAuth } from '../contexts/AuthContext'

const ApiKeysContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
`

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
`

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 15px;
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`

const Subtitle = styled.p`
  font-size: 18px;
  color: #666;
  margin-bottom: 30px;
`

const ApiKeySection = styled.div`
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
`

const ApiKeyHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`

const ApiKeyDisplay = styled.div`
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 14px;
  word-break: break-all;
  position: relative;
`

const CopyButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: #007AFF;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #0056b3;
  }
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`

const StatCard = styled.div`
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  border-left: 4px solid #007AFF;
`

const StatNumber = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #007AFF;
  margin-bottom: 5px;
`

const StatLabel = styled.div`
  font-size: 14px;
  color: #666;
`

const DocumentationSection = styled.div`
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
`

const CodeBlock = styled.pre`
  background: #2d3748;
  color: #e2e8f0;
  padding: 20px;
  border-radius: 12px;
  overflow-x: auto;
  font-size: 14px;
  margin: 15px 0;
`

const EndpointList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 20px;
`

const EndpointItem = styled.div`
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  border-left: 4px solid #34C759;
`

const EndpointMethod = styled.span`
  background: #34C759;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  margin-right: 10px;
`

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 18px;
  color: #666;
`

const ActionButton = styled.button`
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 122, 255, 0.3);
  }
`

function ApiKeys() {
  const { user, token } = useAuth()
  const [apiKeyData, setApiKeyData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    fetchApiKey()
  }, [token])

  const fetchApiKey = async () => {
    try {
      const response = await fetch('/api/premium/api-key', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch API key')
      }

      const data = await response.json()
      setApiKeyData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) return <LoadingSpinner>Loading API key...</LoadingSpinner>
  if (error) return <LoadingSpinner>Error: {error}</LoadingSpinner>

  return (
    <ApiKeysContainer>
      <Header>
        <Title>🔑 API Keys Management</Title>
        <Subtitle>Programmatic access to AI brand intelligence data</Subtitle>
      </Header>

      <ApiKeySection>
        <ApiKeyHeader>
          <h2>Your API Key</h2>
          <ActionButton onClick={fetchApiKey}>Regenerate Key</ActionButton>
        </ApiKeyHeader>

        <ApiKeyDisplay>
          {apiKeyData?.api_key}
          <CopyButton 
            onClick={() => copyToClipboard(apiKeyData?.api_key)}
          >
            {copySuccess ? '✅ Copied' : '📋 Copy'}
          </CopyButton>
        </ApiKeyDisplay>

        <StatsGrid>
          <StatCard>
            <StatNumber>{apiKeyData?.rate_limits?.used_today || 0}</StatNumber>
            <StatLabel>Calls Used Today</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>{apiKeyData?.rate_limits?.daily_calls || 0}</StatNumber>
            <StatLabel>Daily Limit</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>{apiKeyData?.tier?.toUpperCase()}</StatNumber>
            <StatLabel>Current Plan</StatLabel>
          </StatCard>
        </StatsGrid>
      </ApiKeySection>

      <DocumentationSection>
        <h2>📚 API Documentation</h2>
        <p>Use your API key to access AI brand intelligence data programmatically.</p>

        <h3>Authentication</h3>
        <p>Include your API key in the Authorization header:</p>
        <CodeBlock>
{`curl -H "Authorization: Bearer ${apiKeyData?.api_key}" \\
     https://llm-pagerank-public-api.onrender.com/api/domain/apple.com`}
        </CodeBlock>

        <h3>Available Endpoints</h3>
        <EndpointList>
          <EndpointItem>
            <EndpointMethod>GET</EndpointMethod>
            <strong>/api/domain/{domain}</strong>
            <p>Get detailed AI memory analysis for a specific domain</p>
          </EndpointItem>
          
          <EndpointItem>
            <EndpointMethod>GET</EndpointMethod>
            <strong>/api/ticker</strong>
            <p>Real-time feed of AI memory scores across all domains</p>
          </EndpointItem>
          
          <EndpointItem>
            <EndpointMethod>GET</EndpointMethod>
            <strong>/api/trends/improvement</strong>
            <p>Domains with the highest AI memory improvements</p>
          </EndpointItem>
          
          <EndpointItem>
            <EndpointMethod>GET</EndpointMethod>
            <strong>/api/trends/degradation</strong>
            <p>Domains experiencing AI memory degradation</p>
          </EndpointItem>
          
          <EndpointItem>
            <EndpointMethod>GET</EndpointMethod>
            <strong>/api/consensus/{domain}</strong>
            <p>LLM consensus patterns for a specific domain</p>
          </EndpointItem>
        </EndpointList>

        <h3>Rate Limits</h3>
        <ul>
          <li><strong>Pro Plan:</strong> 1,000 requests per day</li>
          <li><strong>Enterprise Plan:</strong> 10,000 requests per day</li>
          <li><strong>Response Format:</strong> JSON</li>
          <li><strong>Timeout:</strong> 30 seconds</li>
        </ul>

        <h3>Example Response</h3>
        <CodeBlock>
{`{
  "domain": "apple.com",
  "memory_score": 92.5,
  "reputation_risk_score": 8.2,
  "ai_consensus_score": 98.1,
  "llm_responses": {
    "positive": 14,
    "neutral": 2,
    "negative": 1
  },
  "temporal_data": {
    "24h_change": 0.3,
    "7d_change": -1.2,
    "30d_change": 2.1
  },
  "last_updated": "2024-01-15T10:30:00Z"
}`}
        </CodeBlock>

        <h3>SDKs & Libraries</h3>
        <p>Official SDKs coming soon for:</p>
        <ul>
          <li>Python</li>
          <li>JavaScript/Node.js</li>
          <li>PHP</li>
          <li>Ruby</li>
        </ul>
      </DocumentationSection>
    </ApiKeysContainer>
  )
}

export default ApiKeys 