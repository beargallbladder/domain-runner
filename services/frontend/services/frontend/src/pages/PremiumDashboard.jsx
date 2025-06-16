import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { useAuth } from '../contexts/AuthContext'

const DashboardContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  padding: 30px;
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  color: white;
  border-radius: 20px;
`

const WelcomeText = styled.div`
  h1 {
    font-size: 32px;
    margin-bottom: 10px;
    color: white;
  }
  p {
    font-size: 18px;
    opacity: 0.9;
    color: white;
  }
`

const PlanBadge = styled.div`
  background: white;
  color: #007AFF;
  padding: 12px 24px;
  border-radius: 25px;
  font-weight: 600;
  font-size: 16px;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 25px;
  margin-bottom: 40px;
`

const StatCard = styled.div`
  background: white;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border-left: 5px solid #007AFF;
`

const StatNumber = styled.div`
  font-size: 36px;
  font-weight: 700;
  color: #007AFF;
  margin-bottom: 10px;
`

const StatLabel = styled.div`
  font-size: 16px;
  color: #666;
  margin-bottom: 5px;
`

const StatLimit = styled.div`
  font-size: 14px;
  color: #999;
`

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
  margin-bottom: 40px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const DomainsSection = styled.div`
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
`

const SectionTitle = styled.h2`
  font-size: 24px;
  margin-bottom: 25px;
  color: #000;
`

const DomainList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`

const DomainItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border-left: 4px solid ${props => {
    if (props.score >= 80) return '#34C759'
    if (props.score >= 60) return '#FF9500' 
    return '#FF3B30'
  }};
`

const DomainInfo = styled.div`
  h3 {
    font-size: 18px;
    margin-bottom: 5px;
    color: #000;
  }
  p {
    font-size: 14px;
    color: #666;
  }
`

const DomainScore = styled.div`
  text-align: right;
  .score {
    font-size: 24px;
    font-weight: 700;
    color: ${props => {
      if (props.score >= 80) return '#34C759'
      if (props.score >= 60) return '#FF9500'
      return '#FF3B30'
    }};
  }
  .label {
    font-size: 12px;
    color: #666;
  }
`

const ActionsSection = styled.div`
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
`

const ActionButton = styled.button`
  width: 100%;
  padding: 15px;
  margin-bottom: 15px;
  background: ${props => props.primary ? 
    'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' : 
    'transparent'
  };
  color: ${props => props.primary ? 'white' : '#007AFF'};
  border: 2px solid #007AFF;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 122, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 18px;
  color: #666;
`

const UpgradePrompt = styled.div`
  background: linear-gradient(135deg, #FF9500 0%, #FF3B30 100%);
  color: white;
  padding: 20px;
  border-radius: 15px;
  text-align: center;
  margin-bottom: 30px;
  
  h3 {
    margin-bottom: 10px;
    color: white;
  }
  
  p {
    margin-bottom: 15px;
    color: white;
  }
`

function PremiumDashboard() {
  const { user, token } = useAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [token])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/premium/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addDomain = async () => {
    const domain = prompt('Enter domain to track (e.g., example.com):')
    if (!domain) return

    try {
      const response = await fetch('/api/premium/track-domain', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain })
      })

      const result = await response.json()
      
      if (response.ok) {
        alert(`✅ ${result.message}`)
        fetchDashboardData() // Refresh data
      } else {
        alert(`❌ ${result.detail}`)
      }
    } catch (err) {
      alert(`❌ Failed to add domain: ${err.message}`)
    }
  }

  if (loading) return <LoadingSpinner>Loading your dashboard...</LoadingSpinner>
  if (error) return <LoadingSpinner>Error: {error}</LoadingSpinner>
  if (!dashboardData) return <LoadingSpinner>No data available</LoadingSpinner>

  const { user: userData, tracked_domains, premium_features } = dashboardData

  return (
    <DashboardContainer>
      <Header>
        <WelcomeText>
          <h1>👋 Welcome back, {userData.email.split('@')[0]}!</h1>
          <p>AI Brand Intelligence Dashboard</p>
        </WelcomeText>
        <PlanBadge>{userData.tier.toUpperCase()}</PlanBadge>
      </Header>

      {userData.tier === 'free' && (
        <UpgradePrompt>
          <h3>🚀 Unlock Premium Features</h3>
          <p>Track more domains, access competitor analysis, and get API access</p>
          <ActionButton onClick={() => window.location.href = '/pricing'}>
            Upgrade Now
          </ActionButton>
        </UpgradePrompt>
      )}

      <StatsGrid>
        <StatCard>
          <StatNumber>{userData.domains_tracked}</StatNumber>
          <StatLabel>Domains Tracked</StatLabel>
          <StatLimit>of {userData.domains_limit} allowed</StatLimit>
        </StatCard>
        
        <StatCard>
          <StatNumber>{userData.api_calls_used}</StatNumber>
          <StatLabel>API Calls Today</StatLabel>
          <StatLimit>of {userData.api_calls_limit} allowed</StatLimit>
        </StatCard>
        
        <StatCard>
          <StatNumber>{tracked_domains?.length || 0}</StatNumber>
          <StatLabel>Active Monitoring</StatLabel>
          <StatLimit>Real-time tracking</StatLimit>
        </StatCard>
        
        <StatCard>
          <StatNumber>
            {tracked_domains?.length > 0 ? 
              Math.round(tracked_domains.reduce((sum, d) => sum + d.memory_score, 0) / tracked_domains.length) : 
              0
            }
          </StatNumber>
          <StatLabel>Avg Memory Score</StatLabel>
          <StatLimit>Across all domains</StatLimit>
        </StatCard>
      </StatsGrid>

      <ContentGrid>
        <DomainsSection>
          <SectionTitle>🎯 Your Tracked Domains</SectionTitle>
          
          {tracked_domains?.length > 0 ? (
            <DomainList>
              {tracked_domains.map((domain, index) => (
                <DomainItem key={index} score={domain.memory_score}>
                  <DomainInfo>
                    <h3>{domain.domain}</h3>
                    <p>Last updated: {new Date(domain.last_updated).toLocaleDateString()}</p>
                  </DomainInfo>
                  <DomainScore score={domain.memory_score}>
                    <div className="score">{domain.memory_score}</div>
                    <div className="label">Memory Score</div>
                  </DomainScore>
                </DomainItem>
              ))}
            </DomainList>
          ) : (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
              No domains tracked yet. Add your first domain to get started!
            </p>
          )}
        </DomainsSection>

        <ActionsSection>
          <SectionTitle>⚡ Quick Actions</SectionTitle>
          
          <ActionButton 
            primary 
            onClick={addDomain}
            disabled={userData.domains_tracked >= userData.domains_limit}
          >
            {userData.domains_tracked >= userData.domains_limit ? 
              '🔒 Domain Limit Reached' : 
              '➕ Add Domain to Track'
            }
          </ActionButton>

          <ActionButton 
            disabled={!premium_features.api_access}
            onClick={() => window.location.href = '/api-keys'}
          >
            {premium_features.api_access ? '🔑 Manage API Keys' : '🔒 API Access (Pro+)'}
          </ActionButton>

          <ActionButton 
            disabled={!premium_features.competitor_tracking}
            onClick={() => window.location.href = '/competitive-analysis'}
          >
            {premium_features.competitor_tracking ? '🔍 Competitor Analysis' : '🔒 Competitor Analysis (Pro+)'}
          </ActionButton>

          <ActionButton onClick={() => window.location.href = '/rankings'}>
            📊 View Public Rankings
          </ActionButton>

          <ActionButton onClick={() => window.location.href = '/settings'}>
            ⚙️ Account Settings
          </ActionButton>
        </ActionsSection>
      </ContentGrid>
    </DashboardContainer>
  )
}

export default PremiumDashboard 