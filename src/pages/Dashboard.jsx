import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  min-height: 100vh;
  background: #f5f5f7;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
`;

const Header = styled.div`
  max-width: 1200px;
  margin: 0 auto 40px;
  text-align: center;
`;

const WelcomeTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 12px;
  letter-spacing: -1px;
`;

const WelcomeSubtitle = styled.p`
  font-size: 1.2rem;
  color: #86868b;
  margin: 0;
`;

const MainGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 32px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Card = styled(motion.div)`
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e5e7;
`;

const CardTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 20px;
`;

const AlertCard = styled(Card)`
  background: linear-gradient(135deg, #ff3b30, #ff6b6b);
  color: #ffffff;
  border: none;
  
  h2 {
    color: #ffffff;
  }
`;

const UpgradeCard = styled(Card)`
  background: linear-gradient(135deg, #007aff, #4fc3f7);
  color: #ffffff;
  border: none;
  
  h2 {
    color: #ffffff;
  }
`;

const DomainsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 16px;
`;

const DomainCard = styled(motion.div)`
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e5e7;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    border-color: #007aff;
  }
`;

const DomainHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const DomainName = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0;
`;

const ScoreDisplay = styled.div`
  font-size: 2rem;
  font-weight: 200;
  color: ${props => 
    props.score >= 80 ? '#30d158' :
    props.score >= 60 ? '#ff9500' :
    '#ff3b30'
  };
`;

const TrendIndicator = styled.div`
  font-size: 0.9rem;
  color: ${props => 
    props.trend === 'improving' ? '#30d158' :
    props.trend === 'declining' ? '#ff3b30' :
    '#86868b'
  };
  margin-top: 8px;
`;

const AddDomainCard = styled(motion.div)`
  background: #f0f9ff;
  border: 2px dashed #007aff;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #e6f3ff;
    border-color: #0051d0;
  }
`;

const AddDomainText = styled.div`
  font-size: 1.1rem;
  color: #007aff;
  font-weight: 600;
`;

const AddDomainSubtext = styled.div`
  font-size: 0.9rem;
  color: #86868b;
  margin-top: 8px;
`;

const StatItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e5e5e7;
  
  &:last-child {
    border-bottom: none;
  }
  
  .label {
    font-size: 0.95rem;
    color: #86868b;
  }
  
  .value {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1d1d1f;
  }
`;

const UpgradeButton = styled(motion.button)`
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  margin-top: 16px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #86868b;
  
  .empty-icon {
    font-size: 4rem;
    margin-bottom: 16px;
  }
  
  .empty-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1d1d1f;
    margin-bottom: 8px;
  }
  
  .empty-subtitle {
    font-size: 1.1rem;
    margin-bottom: 24px;
  }
`;

const Dashboard = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const { user, hasProAccess, canTrackMoreDomains, getRemainingApiCalls, getSubscriptionDisplayName } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserDomains();
    }
  }, [user]);

  const fetchUserDomains = async () => {
    try {
      const response = await axios.get('/api/user/domains');
      setDomains(response.data.domains || []);
    } catch (error) {
      console.error('Failed to fetch domains:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = () => {
    if (canTrackMoreDomains()) {
      setShowAddDomain(true);
    } else {
      // Show upgrade prompt
      alert('Domain limit reached. Upgrade to track more domains.');
    }
  };

  if (!user) {
    return (
      <Container>
        <Header>
          <WelcomeTitle>Authentication Required</WelcomeTitle>
          <WelcomeSubtitle>Please log in to access your dashboard</WelcomeSubtitle>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <WelcomeTitle>Welcome back, {user.full_name || user.email}</WelcomeTitle>
        <WelcomeSubtitle>Monitor your brand's AI memory performance</WelcomeSubtitle>
      </Header>

      <MainGrid>
        <MainContent>
          {/* Active Alerts */}
          {domains.some(d => d.reputation_risk_score > 50) && (
            <AlertCard>
              <CardTitle>🚨 Critical Brand Alerts</CardTitle>
              <p>High reputation risk detected across your domains. Immediate action recommended.</p>
              <UpgradeButton>View All Alerts</UpgradeButton>
            </AlertCard>
          )}

          {/* Tracked Domains */}
          <Card>
            <CardTitle>Your Tracked Domains ({domains.length}/{user.domains_limit})</CardTitle>
            
            {loading ? (
              <div>Loading your domains...</div>
            ) : domains.length === 0 ? (
              <EmptyState>
                <div className="empty-icon">🎯</div>
                <div className="empty-title">Start Tracking Your Brand</div>
                <div className="empty-subtitle">Add your first domain to begin AI memory monitoring</div>
                <UpgradeButton onClick={handleAddDomain}>
                  Add Your Domain
                </UpgradeButton>
              </EmptyState>
            ) : (
              <DomainsGrid>
                {domains.map((domain, index) => (
                  <DomainCard
                    key={domain.domain}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    as={Link}
                    to={`/domain/${domain.domain}`}
                  >
                    <DomainHeader>
                      <DomainName>{domain.domain}</DomainName>
                      <ScoreDisplay score={domain.memory_score || 0}>
                        {Math.round(domain.memory_score || 0)}
                      </ScoreDisplay>
                    </DomainHeader>
                    <div>
                      <div style={{ fontSize: '0.9rem', color: '#86868b' }}>
                        AI Memory Score
                      </div>
                      <TrendIndicator trend={domain.memory_score_trend}>
                        {domain.trend_percentage > 0 ? '📈' : domain.trend_percentage < 0 ? '📉' : '➡️'} 
                        {domain.memory_score_trend || 'stable'}
                      </TrendIndicator>
                    </div>
                  </DomainCard>
                ))}
                
                {canTrackMoreDomains() && (
                  <AddDomainCard onClick={handleAddDomain}>
                    <AddDomainText>+ Add Domain</AddDomainText>
                    <AddDomainSubtext>
                      Track competitor or additional brand
                    </AddDomainSubtext>
                  </AddDomainCard>
                )}
              </DomainsGrid>
            )}
          </Card>
        </MainContent>

        <Sidebar>
          {/* Subscription Status */}
          <Card>
            <CardTitle>Subscription Status</CardTitle>
            <StatItem>
              <span className="label">Current Plan</span>
              <span className="value">{getSubscriptionDisplayName()}</span>
            </StatItem>
            <StatItem>
              <span className="label">Domains Used</span>
              <span className="value">{user.domains_tracked}/{user.domains_limit}</span>
            </StatItem>
            <StatItem>
              <span className="label">API Calls Remaining</span>
              <span className="value">{getRemainingApiCalls()}</span>
            </StatItem>
            
            {user.subscription_tier === 'free' && (
              <UpgradeButton as={Link} to="/pricing">
                🚀 Upgrade to Pro
              </UpgradeButton>
            )}
          </Card>

          {/* Upgrade Prompt for Free Users */}
          {user.subscription_tier === 'free' && (
            <UpgradeCard>
              <CardTitle>🔥 Missing Critical Features</CardTitle>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>❌ Competitor tracking</li>
                <li>❌ API access</li>
                <li>❌ Advanced alerts</li>
                <li>❌ Historical data</li>
              </ul>
              <UpgradeButton as={Link} to="/pricing">
                Unlock Pro Features
              </UpgradeButton>
            </UpgradeCard>
          )}

          {/* Quick Actions */}
          <Card>
            <CardTitle>Quick Actions</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <UpgradeButton 
                as={Link} 
                to="/rankings"
                style={{ background: '#007aff', color: 'white' }}
              >
                📊 View All Rankings
              </UpgradeButton>
              
              {hasProAccess() && (
                <UpgradeButton 
                  as={Link} 
                  to="/api-keys"
                  style={{ background: '#30d158', color: 'white' }}
                >
                  🔑 Manage API Keys
                </UpgradeButton>
              )}
              
              <UpgradeButton 
                as={Link} 
                to="/settings"
                style={{ background: '#86868b', color: 'white' }}
              >
                ⚙️ Account Settings
              </UpgradeButton>
            </div>
          </Card>
        </Sidebar>
      </MainGrid>
    </Container>
  );
};

export default Dashboard; 