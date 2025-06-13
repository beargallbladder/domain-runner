import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import IntelligenceDashboard from '../components/IntelligenceDashboard';

const Container = styled.div`
  min-height: 100vh;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
`;

// Mobile-first Hero Section
const HeroSection = styled.div`
  text-align: center;
  padding: 40px 20px 30px;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (min-width: 768px) {
    padding: 80px 40px 60px;
  }
`;

const MainQuestion = styled(motion.h1)`
  font-size: 2.5rem;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 20px;
  letter-spacing: -1px;
  line-height: 1.1;
  
  @media (min-width: 768px) {
    font-size: 4.5rem;
    margin: 0 0 30px;
    letter-spacing: -3px;
  }
`;

const SubQuestion = styled(motion.p)`
  font-size: 1.2rem;
  color: #86868b;
  margin: 0 0 30px;
  font-weight: 400;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.4;
  
  @media (min-width: 768px) {
    font-size: 1.8rem;
    margin: 0 0 50px;
  }
`;

// Mobile-first ticker section
const TickerSection = styled.div`
  background: #f5f5f7;
  padding: 40px 0;
  border-top: 1px solid #d2d2d7;
  border-bottom: 1px solid #d2d2d7;
  
  @media (min-width: 768px) {
    padding: 80px 0;
  }
`;

const TickerHeader = styled.div`
  text-align: center;
  margin-bottom: 30px;
  padding: 0 20px;
  
  @media (min-width: 768px) {
    margin-bottom: 50px;
    padding: 0 40px;
  }
`;

const TickerTitle = styled.h2`
  font-size: 2rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 16px;
  letter-spacing: -0.5px;
  
  @media (min-width: 768px) {
    font-size: 3rem;
    margin: 0 0 20px;
    letter-spacing: -1px;
  }
`;

const TickerSubtitle = styled.p`
  font-size: 1rem;
  color: #86868b;
  margin: 0 0 16px;
  font-weight: 400;
  
  @media (min-width: 768px) {
    font-size: 1.4rem;
    margin: 0 0 20px;
  }
`;

const LiveIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: #007aff;
  color: white;
  padding: 12px 24px;
  border-radius: 24px;
  font-size: 1rem;
  font-weight: 600;
  
  &::before {
    content: '🟢';
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const TickerContainer = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 20px;
  
  @media (min-width: 768px) {
    padding: 0 40px;
  }
`;

// Mobile-first grid
const TickerGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-top: 30px;
  
  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-top: 40px;
  }
  
  @media (min-width: 1200px) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const TickerCard = styled(motion.div)`
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e5e7;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  
  @media (min-width: 768px) {
    border-radius: 16px;
    padding: 24px;
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    border-color: #007aff;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => 
      props.score >= 90 ? '#30d158' :
      props.score >= 70 ? '#ff9500' :
      '#ff3b30'
    };
    border-radius: 12px 12px 0 0;
    
    @media (min-width: 768px) {
      border-radius: 16px 16px 0 0;
    }
  }
`;

const DomainHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const DomainName = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

const TrendIndicator = styled.div`
  font-size: 1.6rem;
  font-weight: 700;
  color: ${props => 
    props.trend === 'up' ? '#30d158' :
    props.trend === 'down' ? '#ff3b30' :
    '#ff9500'
  };
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ScoreDisplay = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${props => 
    props.score >= 90 ? '#30d158' :
    props.score >= 70 ? '#ff9500' :
    '#ff3b30'
  };
  margin-bottom: 8px;
`;

const ScoreLabel = styled.div`
  font-size: 0.8rem;
  color: #86868b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
  margin-bottom: 12px;
`;

const ModelConsensus = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
`;

const ConsensusDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => 
    props.type === 'positive' ? '#30d158' :
    props.type === 'neutral' ? '#ff9500' :
    '#ff3b30'
  };
`;

const ConsensusLabel = styled.span`
  font-size: 0.75rem;
  color: #86868b;
  font-weight: 500;
  margin-left: 4px;
`;

const CategoryTag = styled.div`
  display: inline-block;
  background: #007aff;
  color: #ffffff;
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// Load More button
const LoadMoreSection = styled.div`
  text-align: center;
  margin-top: 40px;
`;

const LoadMoreButton = styled(motion.button)`
  background: #007aff;
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 24px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #0056cc;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 122, 255, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// Steve Jobs style stats section
const StatsSection = styled.div`
  padding: 100px 40px;
  text-align: center;
  max-width: 1000px;
  margin: 0 auto;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 60px;
  margin-top: 60px;
`;

const StatItem = styled.div`
  .number {
    font-size: 4rem;
    font-weight: 700;
    color: #1d1d1f;
    margin-bottom: 8px;
    letter-spacing: -2px;
  }
  
  .label {
    font-size: 1.1rem;
    color: #86868b;
    font-weight: 500;
  }
`;

const ExploreSection = styled.div`
  background: #f5f5f7;
  padding: 100px 40px;
  text-align: center;
`;

const ExploreTitle = styled.h2`
  font-size: 3rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 60px;
  letter-spacing: -1px;
`;

const ExploreGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
`;

const ExploreCard = styled(Link)`
  background: #ffffff;
  border-radius: 18px;
  padding: 40px 32px;
  text-decoration: none;
  transition: all 0.3s ease;
  display: block;
  border: 1px solid #e5e5e7;
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  }
`;

const ExploreIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 20px;
`;

const ExploreCardTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 16px;
`;

const ExploreDescription = styled.p`
  font-size: 1.1rem;
  color: #86868b;
  margin: 0;
  font-weight: 400;
  line-height: 1.5;
`;

const getTrendFromChange = (change) => {
  if (change.startsWith('+')) return 'up';
  if (change.startsWith('-')) return 'down';
  return 'neutral';
};

const getScoreColor = (score) => {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  return 'poor';
};

const getCategoryFromDomain = (domain) => {
  // Simple domain to category mapping - in production this would come from API
  const categoryMap = {
    'facebook.com': 'Social Media',
    'google.es': 'Search',
    'bloomberg.com': 'Financial Media',
    'yahoo.com': 'Web Portal',
    'synopsys.com': 'Enterprise Software',
    'apple.com': 'Consumer Tech',
    'microsoft.com': 'Cloud Platform',
    'nvidia.com': 'AI Hardware',
    'openai.com': 'AI Platform',
    'anthropic.com': 'AI Research',
    'netflix.com': 'Streaming',
    'amazon.com': 'E-commerce',
    'tesla.com': 'Electric Vehicles',
    'stripe.com': 'Fintech',
    'zoom.us': 'Communication'
  };
  return categoryMap[domain] || 'Technology';
};

const Home = () => {
  const [tickerData, setTickerData] = useState([]);
  const [displayCount, setDisplayCount] = useState(20);
  const [stats, setStats] = useState({
    totalDomains: 477,
    aiModels: 21,
    aiResponses: 25491,
    categories: 12
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        const response = await axios.get(`https://llm-pagerank-public-api.onrender.com/api/ticker?limit=${displayCount}`);
        const data = response.data;
        
        setTickerData(data.topDomains);
        setStats(prev => ({
          ...prev,
          totalDomains: data.totalDomains
        }));
        
      } catch (error) {
        console.error('Failed to fetch ticker data:', error);
        // Enhanced fallback data for demo
        setTickerData([
          { domain: 'openai.com', score: 98, change: '+2.5%', modelsPositive: 18, modelsNeutral: 2, modelsNegative: 1 },
          { domain: 'apple.com', score: 95, change: '+1.2%', modelsPositive: 16, modelsNeutral: 3, modelsNegative: 2 },
          { domain: 'microsoft.com', score: 94, change: '+0.8%', modelsPositive: 15, modelsNeutral: 4, modelsNegative: 2 },
          { domain: 'google.com', score: 93, change: '+0.5%', modelsPositive: 14, modelsNeutral: 5, modelsNegative: 2 },
          { domain: 'netflix.com', score: 91, change: '+1.8%', modelsPositive: 13, modelsNeutral: 6, modelsNegative: 2 },
          { domain: 'amazon.com', score: 90, change: '+0.3%', modelsPositive: 12, modelsNeutral: 7, modelsNegative: 2 },
          { domain: 'tesla.com', score: 89, change: '-0.2%', modelsPositive: 11, modelsNeutral: 8, modelsNegative: 2 },
          { domain: 'facebook.com', score: 88, change: '+1.1%', modelsPositive: 10, modelsNeutral: 9, modelsNegative: 2 },
          { domain: 'stripe.com', score: 87, change: '+2.1%', modelsPositive: 9, modelsNeutral: 10, modelsNegative: 2 },
          { domain: 'zoom.us', score: 85, change: '+0.7%', modelsPositive: 8, modelsNeutral: 11, modelsNegative: 2 },
        ]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchTickerData();
  }, [displayCount]);

  const loadMore = () => {
    setLoadingMore(true);
    setDisplayCount(prev => prev + 20);
  };

  return (
    <Container>
      <HeroSection>
        <MainQuestion
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
        >
          Is your brand remembered in AI?
        </MainQuestion>
        
        <SubQuestion
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
        >
          Large language models are becoming the new interface to human knowledge. 
          Track how AI systems remember, rank, and recall your brand.
        </SubQuestion>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.6 }}
          style={{ 
            marginTop: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center'
          }}
        >
          <Link
            to="/competitive-analysis"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #FF3B30 0%, #007AFF 100%)',
              color: '#ffffff',
              padding: '16px 32px',
              borderRadius: '25px',
              textDecoration: 'none',
              fontSize: '1.1rem',
              fontWeight: '700',
              boxShadow: '0 8px 25px rgba(255, 59, 48, 0.3)',
              transition: 'all 0.3s ease',
              width: '100%',
              maxWidth: '280px',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-3px)';
              e.target.style.boxShadow = '0 15px 40px rgba(255, 59, 48, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 25px rgba(255, 59, 48, 0.3)';
            }}
          >
            📊 Competitive Intelligence
          </Link>
          
          <Link
            to="/rankings"
            style={{
              display: 'inline-block',
              background: 'transparent',
              color: '#007AFF',
              border: '2px solid #007AFF',
              padding: '14px 30px',
              borderRadius: '25px',
              textDecoration: 'none',
              fontSize: '1.1rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              width: '100%',
              maxWidth: '280px',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#007AFF';
              e.target.style.color = '#ffffff';
              e.target.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = '#007AFF';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            📊 View Rankings
          </Link>
        </motion.div>
      </HeroSection>

      <TickerSection>
        <TickerHeader>
          <TickerTitle>Live AI Memory Rankings</TickerTitle>
          <TickerSubtitle>
            Real-time scores across {stats.totalDomains} domains • {stats.aiModels} AI models • {stats.aiResponses.toLocaleString()}+ responses
          </TickerSubtitle>
          <LiveIndicator>
            LIVE: Memory scores updating every 30 minutes
          </LiveIndicator>
        </TickerHeader>

        <TickerContainer>
          <TickerGrid>
            {tickerData.slice(0, displayCount).map((domain, index) => (
              <TickerCard
                key={domain.domain}
                as={Link}
                to={`/domain/${domain.domain}`}
                score={domain.score}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
              >
                <DomainHeader>
                  <DomainName>{domain.domain}</DomainName>
                  <TrendIndicator trend={getTrendFromChange(domain.change)}>
                    {getTrendFromChange(domain.change) === 'up' ? '↗' : 
                     getTrendFromChange(domain.change) === 'down' ? '↘' : '→'}
                    {domain.change}
                  </TrendIndicator>
                </DomainHeader>

                <ScoreDisplay score={domain.score}>
                  {Math.round(domain.score)}
                </ScoreDisplay>
                
                <ScoreLabel>AI Memory Score</ScoreLabel>

                <ModelConsensus>
                  {Array.from({ length: Math.min(domain.modelsPositive, 10) }, (_, i) => (
                    <ConsensusDot key={`pos-${i}`} type="positive" />
                  ))}
                  {Array.from({ length: Math.min(domain.modelsNeutral, 5) }, (_, i) => (
                    <ConsensusDot key={`neu-${i}`} type="neutral" />
                  ))}
                  {Array.from({ length: Math.min(domain.modelsNegative, 3) }, (_, i) => (
                    <ConsensusDot key={`neg-${i}`} type="negative" />
                  ))}
                  <ConsensusLabel>
                    {domain.modelsPositive + domain.modelsNeutral + domain.modelsNegative} models
                  </ConsensusLabel>
                </ModelConsensus>

                <CategoryTag>
                  {getCategoryFromDomain(domain.domain)}
                </CategoryTag>
              </TickerCard>
            ))}
          </TickerGrid>
          
          {tickerData.length >= displayCount && (
            <LoadMoreSection>
              <LoadMoreButton
                onClick={loadMore}
                disabled={loadingMore}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loadingMore ? 'Loading More...' : `Load More Domains (${stats.totalDomains - displayCount} remaining)`}
              </LoadMoreButton>
            </LoadMoreSection>
          )}
        </TickerContainer>
      </TickerSection>

      <IntelligenceDashboard />

      <StatsSection>
        <StatsGrid>
          <StatItem>
            <div className="number">{stats.totalDomains}</div>
            <div className="label">Domains Tracked</div>
          </StatItem>
          <StatItem>
            <div className="number">{stats.aiModels}</div>
            <div className="label">AI Models</div>
          </StatItem>
          <StatItem>
            <div className="number">{Math.round(stats.aiResponses / 1000)}K</div>
            <div className="label">AI Responses</div>
          </StatItem>
          <StatItem>
            <div className="number">{stats.categories}</div>
            <div className="label">Categories</div>
          </StatItem>
        </StatsGrid>
      </StatsSection>

      <ExploreSection>
        <ExploreTitle>Explore AI Memory Intelligence</ExploreTitle>
        
        <ExploreGrid>
          <ExploreCard to="/rankings">
            <ExploreIcon>🏆</ExploreIcon>
            <ExploreCardTitle>Complete Rankings</ExploreCardTitle>
            <ExploreDescription>
              Browse all domains ranked by AI memory strength. Winners vs Losers in the AI memory game.
            </ExploreDescription>
          </ExploreCard>

          <ExploreCard to="/cohorts">
            <ExploreIcon>⚔️</ExploreIcon>
            <ExploreCardTitle>Competitive Cohorts</ExploreCardTitle>
            <ExploreDescription>
              Advanced competitive intelligence showing how brands stack against direct rivals.
            </ExploreDescription>
          </ExploreCard>

          <ExploreCard to="/competitive-analysis">
            <ExploreIcon>📊</ExploreIcon>
            <ExploreCardTitle>Competitive Intelligence</ExploreCardTitle>
            <ExploreDescription>
              Head-to-head competitive analysis. Strategic insights for market positioning and competitive advantage.
            </ExploreDescription>
          </ExploreCard>

          <ExploreCard to="/about">
            <ExploreIcon>🧠</ExploreIcon>
            <ExploreCardTitle>How It Works</ExploreCardTitle>
            <ExploreDescription>
              Learn about our AI memory analysis methodology and what the scores mean.
            </ExploreDescription>
          </ExploreCard>
        </ExploreGrid>
      </ExploreSection>
    </Container>
  );
};

export default Home; 