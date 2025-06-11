import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Container = styled.div`
  min-height: 100vh;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
`;

// Steve Jobs style - lots of white space, minimal, emotive
const HeroSection = styled.div`
  text-align: center;
  padding: 120px 40px 80px;
  max-width: 1200px;
  margin: 0 auto;
`;

const MainQuestion = styled(motion.h1)`
  font-size: 4.5rem;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 40px;
  letter-spacing: -3px;
  line-height: 1.1;
  
  @media (max-width: 768px) {
    font-size: 3rem;
    letter-spacing: -2px;
  }
`;

const SubQuestion = styled(motion.p)`
  font-size: 1.8rem;
  color: #86868b;
  margin: 0 0 60px;
  font-weight: 400;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.4;
  
  @media (max-width: 768px) {
    font-size: 1.4rem;
  }
`;

// Financial ticker style
const TickerSection = styled.div`
  background: #f5f5f7;
  padding: 60px 0;
  border-top: 1px solid #d2d2d7;
  border-bottom: 1px solid #d2d2d7;
`;

const TickerHeader = styled.div`
  text-align: center;
  margin-bottom: 40px;
  padding: 0 40px;
`;

const TickerTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 16px;
  letter-spacing: -1px;
`;

const TickerSubtitle = styled.p`
  font-size: 1.3rem;
  color: #86868b;
  margin: 0;
  font-weight: 400;
`;

const TickerContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 40px;
`;

const TickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  margin-top: 40px;
`;

const TickerCard = styled(motion.div)`
  background: #ffffff;
  border-radius: 18px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e7;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  }
`;

const DomainHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const DomainName = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0;
`;

const TrendIndicator = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${props => 
    props.trend === 'up' ? '#30d158' :     // Green for up
    props.trend === 'down' ? '#ff3b30' :   // Red for down
    '#ff9500'                              // Orange for neutral/stable
  };
`;

const ScoreDisplay = styled.div`
  font-size: 3rem;
  font-weight: 700;
  color: ${props => 
    props.score >= 90 ? '#30d158' :        // Green for excellent
    props.score >= 70 ? '#ff9500' :        // Orange for good
    '#ff3b30'                              // Red for poor
  };
  margin-bottom: 12px;
`;

const ScoreLabel = styled.div`
  font-size: 0.9rem;
  color: #86868b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
  margin-bottom: 16px;
`;

const ModelConsensus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const ConsensusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => 
    props.type === 'positive' ? '#30d158' :
    props.type === 'neutral' ? '#ff9500' :
    '#ff3b30'
  };
`;

const ConsensusLabel = styled.span`
  font-size: 0.85rem;
  color: #86868b;
  font-weight: 500;
`;

const CategoryTag = styled.div`
  display: inline-block;
  background: #007aff;
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
    'nvidia.com': 'AI Hardware'
  };
  return categoryMap[domain] || 'Technology';
};

const Home = () => {
  const [tickerData, setTickerData] = useState([]);
  const [stats, setStats] = useState({
    totalDomains: 477,
    aiModels: 21,
    aiResponses: 25491,
    categories: 12
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        const response = await axios.get('https://llm-pagerank-public-api.onrender.com/api/ticker?limit=12');
        const data = response.data;
        
        setTickerData(data.topDomains);
        setStats(prev => ({
          ...prev,
          totalDomains: data.totalDomains
        }));
        
      } catch (error) {
        console.error('Failed to fetch ticker data:', error);
        // Fallback data for demo
        setTickerData([
          { domain: 'openai.com', score: 98, change: '+2.5%', modelsPositive: 18, modelsNeutral: 2, modelsNegative: 1 },
          { domain: 'apple.com', score: 95, change: '+1.2%', modelsPositive: 16, modelsNeutral: 3, modelsNegative: 2 },
          { domain: 'microsoft.com', score: 94, change: '+0.8%', modelsPositive: 15, modelsNeutral: 4, modelsNegative: 2 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTickerData();
  }, []);

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
      </HeroSection>

      <TickerSection>
        <TickerHeader>
          <TickerTitle>Live AI Memory Rankings</TickerTitle>
          <TickerSubtitle>
            Real-time scores across {stats.totalDomains} domains • {stats.aiModels} AI models • {stats.aiResponses.toLocaleString()}+ responses
          </TickerSubtitle>
        </TickerHeader>

        <TickerContainer>
          <TickerGrid>
            {tickerData.slice(0, 12).map((domain, index) => (
              <TickerCard
                key={domain.domain}
                as={Link}
                to={`/domain/${domain.domain}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
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
                  {Array.from({ length: domain.modelsPositive }, (_, i) => (
                    <ConsensusDot key={`pos-${i}`} type="positive" />
                  ))}
                  {Array.from({ length: domain.modelsNeutral }, (_, i) => (
                    <ConsensusDot key={`neu-${i}`} type="neutral" />
                  ))}
                  {Array.from({ length: domain.modelsNegative }, (_, i) => (
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
        </TickerContainer>
      </TickerSection>

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
          <ExploreCard to="/categories">
            <ExploreIcon>🏢</ExploreIcon>
            <ExploreCardTitle>Industry Categories</ExploreCardTitle>
            <ExploreDescription>
              See how different industries perform in AI memory rankings and consensus.
            </ExploreDescription>
          </ExploreCard>

          <ExploreCard to="/rankings">
            <ExploreIcon>📊</ExploreIcon>
            <ExploreCardTitle>Full Rankings</ExploreCardTitle>
            <ExploreDescription>
              Complete leaderboard with search, filtering, and detailed analytics.
            </ExploreDescription>
          </ExploreCard>

          <ExploreCard to="/shadows">
            <ExploreIcon>🌫️</ExploreIcon>
            <ExploreCardTitle>Memory Shadows</ExploreCardTitle>
            <ExploreDescription>
              Domains experiencing memory decline and digital permanence risks.
            </ExploreDescription>
          </ExploreCard>
        </ExploreGrid>
      </ExploreSection>
    </Container>
  );
};

export default Home; 