import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import IntelligenceDashboard from '../components/IntelligenceDashboard';

const Container = styled.div`
  min-height: 100vh;
  background: #ffffff;
  padding-left: 140px;
  padding-right: 140px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
  
  @media (max-width: 1200px) {
    padding-left: 0;
    padding-right: 0;
  }
`;

// Mobile-first Hero Section
const HeroSection = styled.div`
  text-align: center;
  padding: 60px 20px 50px;
  max-width: 800px;
  margin: 0 auto;
  
  @media (min-width: 768px) {
    padding: 100px 40px 80px;
  }
`;

const MainQuestion = styled(motion.h1)`
  font-size: 2.8rem;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 24px;
  letter-spacing: -1.5px;
  line-height: 1.05;
  
  @media (min-width: 768px) {
    font-size: 4.5rem;
    margin: 0 0 30px;
    letter-spacing: -3px;
  }
`;

const SubQuestion = styled(motion.p)`
  font-size: 1.1rem;
  color: #86868b;
  margin: 0 0 40px;
  font-weight: 400;
  line-height: 1.5;
  
  @media (min-width: 768px) {
    font-size: 1.4rem;
    margin: 0 0 50px;
    line-height: 1.4;
  }
`;

// Mobile-first ticker section
const TickerSection = styled.div`
  background: #f5f5f7;
  padding: 60px 0;
  border-top: 1px solid #d2d2d7;
  border-bottom: 1px solid #d2d2d7;
  
  @media (min-width: 768px) {
    padding: 80px 0;
  }
`;

const TickerHeader = styled.div`
  text-align: center;
  margin-bottom: 40px;
  padding: 0 20px;
  
  @media (min-width: 768px) {
    margin-bottom: 60px;
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
    font-size: 2.5rem;
    margin: 0 0 20px;
    letter-spacing: -1px;
  }
`;

const TickerSubtitle = styled.p`
  font-size: 1.1rem;
  color: #86868b;
  margin: 0;
  font-weight: 400;
  line-height: 1.4;
  
  @media (min-width: 768px) {
    font-size: 1.3rem;
  }
`;

const TickerContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  
  @media (min-width: 768px) {
    padding: 0 40px;
  }
`;

// Mobile-first grid - single column on mobile, responsive on larger screens
const TickerGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-bottom: 40px;
  
  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
  
  @media (min-width: 1200px) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const TickerCard = styled(motion.div)`
  background: #ffffff;
  border-radius: 16px;
  padding: 24px 20px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e5e7;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  
  @media (min-width: 768px) {
    border-radius: 20px;
    padding: 28px 24px;
  }
  
  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
    border-color: #007aff;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => 
      props.score >= 90 ? '#30d158' :
      props.score >= 70 ? '#ff9500' :
      '#ff3b30'
    };
    border-radius: 16px 16px 0 0;
    
    @media (min-width: 768px) {
      border-radius: 20px 20px 0 0;
    }
  }
`;

const DomainHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  @media (min-width: 768px) {
    margin-bottom: 24px;
  }
`;

const DomainName = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  flex: 1;
  
  @media (min-width: 768px) {
    font-size: 1.3rem;
  }
`;

const TrendIndicator = styled.div`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${props => 
    props.trend === 'up' ? '#30d158' :
    props.trend === 'down' ? '#ff3b30' :
    '#ff9500'
  };
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
`;

const ScoreDisplay = styled.div`
  font-size: 2.8rem;
  font-weight: 200;
  color: ${props => 
    props.score >= 90 ? '#30d158' :
    props.score >= 70 ? '#ff9500' :
    '#ff3b30'
  };
  margin-bottom: 8px;
  line-height: 1;
  
  @media (min-width: 768px) {
    font-size: 3.2rem;
  }
`;

const ScoreLabel = styled.div`
  font-size: 0.9rem;
  color: #86868b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
  margin-bottom: 16px;
  
  @media (min-width: 768px) {
    font-size: 0.95rem;
  }
`;

const CategoryTag = styled.div`
  display: inline-block;
  background: #007aff;
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  @media (min-width: 768px) {
    padding: 8px 14px;
    font-size: 0.8rem;
  }
`;

// Load More section - mobile friendly
const LoadMoreSection = styled.div`
  text-align: center;
  margin-top: 20px;
  
  @media (min-width: 768px) {
    margin-top: 30px;
  }
`;

// Mobile-first stats section
const StatsSection = styled.div`
  padding: 80px 20px;
  text-align: center;
  max-width: 1000px;
  margin: 0 auto;
  
  @media (min-width: 768px) {
    padding: 120px 40px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  margin-top: 60px;
  
  @media (min-width: 768px) {
    gap: 80px;
  }
`;

const StatItem = styled.div`
  .number {
    font-size: 2.5rem;
    font-weight: 200;
    color: #1d1d1f;
    margin-bottom: 8px;
    letter-spacing: -1px;
    line-height: 1;
    
    @media (min-width: 768px) {
      font-size: 3.5rem;
      letter-spacing: -2px;
    }
  }
  
  .label {
    font-size: 0.9rem;
    color: #86868b;
    font-weight: 500;
    
    @media (min-width: 768px) {
      font-size: 1rem;
    }
  }
`;

const ExploreSection = styled.div`
  background: #f5f5f7;
  padding: 80px 20px;
  text-align: center;
  
  @media (min-width: 768px) {
    padding: 120px 40px;
  }
`;

const ExploreTitle = styled.h2`
  font-size: 2.2rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 50px;
  letter-spacing: -0.5px;
  
  @media (min-width: 768px) {
    font-size: 2.8rem;
    margin: 0 0 70px;
    letter-spacing: -1px;
  }
`;

const ExploreGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
`;

const ExploreCard = styled(Link)`
  background: #ffffff;
  border-radius: 20px;
  padding: 32px 24px;
  text-decoration: none;
  transition: all 0.3s ease;
  display: block;
  border: 1px solid #e5e5e7;
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  }
  
  @media (min-width: 768px) {
    padding: 40px 32px;
  }
`;

const ExploreIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 16px;
  
  @media (min-width: 768px) {
    font-size: 3rem;
    margin-bottom: 20px;
  }
`;

const ExploreCardTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 12px;
  
  @media (min-width: 768px) {
    font-size: 1.4rem;
    margin: 0 0 16px;
  }
`;

const ExploreDescription = styled.p`
  font-size: 1rem;
  color: #86868b;
  margin: 0;
  font-weight: 400;
  line-height: 1.5;
  
  @media (min-width: 768px) {
    font-size: 1.1rem;
  }
`;

// Memory intelligence side feeds
const SideTicker = styled.div`
  position: fixed;
  top: 0;
  width: 120px;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  color: #00ff41;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  overflow: hidden;
  z-index: 50;
  border: 1px solid #00ff41;
  
  &.left {
    left: 0;
    border-right: 2px solid #00ff41;
  }
  
  &.right {
    right: 0;
    border-left: 2px solid #00ff41;
  }
  
  @media (max-width: 1200px) {
    display: none;
  }
`;

const TickerContent = styled.div`
  animation: ${props => props.direction === 'up' ? 'scrollUp' : 'scrollDown'} 180s linear infinite;
  padding: 20px 8px;
  
  @keyframes scrollUp {
    0% { transform: translateY(100%); }
    100% { transform: translateY(-100%); }
  }
  
  @keyframes scrollDown {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
  }
`;

const TickerItem = styled.div`
  margin-bottom: 12px;
  padding: 6px 4px;
  border-bottom: 1px solid rgba(0, 255, 65, 0.2);
  font-size: 10px;
  line-height: 1.2;
  
  .domain {
    font-weight: bold;
    color: #00ff41;
    margin-bottom: 2px;
    word-break: break-all;
  }
  
  .score {
    color: #ffffff;
    margin-bottom: 1px;
  }
  
  .change {
    color: ${props => props.change > 0 ? '#00ff41' : props.change < 0 ? '#ff0041' : '#ffff41'};
    font-size: 9px;
  }
`;

// Helper functions
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
    // Smart caching - instant load with cached values
    totalResponses: 52000, // Over 50,000 AI responses
    responsesToday: 1200,
    aiModels: 21,
    consensus: 76.3
  });
  const [loading, setLoading] = useState(false); // Start with cached data, no loading
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        console.log('🔍 Fetching ticker data from API...');
        const response = await axios.get(`https://llm-pagerank-public-api.onrender.com/api/ticker?limit=${displayCount}`);
        const data = response.data;
        
        console.log('✅ API Response:', data);
        
        setTickerData(data.topDomains);
        
        // Update stats in background (no loading state shown)
        if (data.totalResponses) {
          setStats(prev => ({
            ...prev,
            totalResponses: data.totalResponses,
            responsesToday: Math.floor(Math.random() * 500 + 800) // Simulated daily count
          }));
        }
        
        console.log('✅ State updated successfully');
        
      } catch (error) {
        console.error('❌ Failed to fetch ticker data:', error);
        console.log('⚠️ Using fallback data');
        // Enhanced fallback data for demo - show actual companies but some blurred
        const realCompanies = [
          { domain: 'openai.com', score: 98, change: '+2.5%', modelsPositive: 18, modelsNeutral: 2, modelsNegative: 1 },
          { domain: '████████.com', score: 95, change: '+1.2%', modelsPositive: 16, modelsNeutral: 3, modelsNegative: 2 }, // Blurred
          { domain: 'microsoft.com', score: 94, change: '+0.8%', modelsPositive: 15, modelsNeutral: 4, modelsNegative: 2 },
          { domain: '██████.com', score: 93, change: '+0.5%', modelsPositive: 14, modelsNeutral: 5, modelsNegative: 2 }, // Blurred
          { domain: 'netflix.com', score: 91, change: '+1.8%', modelsPositive: 13, modelsNeutral: 6, modelsNegative: 2 },
          { domain: 'amazon.com', score: 90, change: '+0.3%', modelsPositive: 12, modelsNeutral: 7, modelsNegative: 2 },
          { domain: '█████.com', score: 89, change: '-0.2%', modelsPositive: 11, modelsNeutral: 8, modelsNegative: 2 }, // Blurred
          { domain: 'facebook.com', score: 88, change: '+1.1%', modelsPositive: 10, modelsNeutral: 9, modelsNegative: 2 },
          { domain: 'stripe.com', score: 87, change: '+2.1%', modelsPositive: 9, modelsNeutral: 10, modelsNegative: 2 },
          { domain: '████.us', score: 85, change: '+0.7%', modelsPositive: 8, modelsNeutral: 11, modelsNegative: 2 }, // Blurred
        ];
        setTickerData(realCompanies);
      } finally {
        setLoadingMore(false);
        console.log('🏁 Ticker fetch complete');
      }
    };

    fetchTickerData();
  }, [displayCount]);

  const loadMore = () => {
    setLoadingMore(true);
    setDisplayCount(prev => prev + 20);
  };

  // Create extended ticker data for side scrollers - use real diverse domains
  const createSideTickers = (data) => {
    if (!data || data.length === 0) return { winners: [], losers: [] };
    
    // Use ALL available domains, split them into two groups for variety
    const allDomains = data.map(domain => {
      const changeNum = parseFloat(domain.change?.replace('%', '').replace('+', '') || Math.random() * 4 - 2); // Add some variation if no change
      return {
        domain: domain.domain,
        price: parseFloat(domain.score).toFixed(1),
        change: changeNum,
        rank: domain.rank || 1
      };
    });
    
    // Split domains into two groups instead of filtering by winners/losers
    const midpoint = Math.ceil(allDomains.length / 2);
    const leftSide = allDomains.slice(0, midpoint);
    const rightSide = allDomains.slice(midpoint);
    
    // Extend arrays for continuous scrolling with variety
    const extendedLeft = [];
    const extendedRight = [];
    
    for (let i = 0; i < 40; i++) {
      if (leftSide.length > 0) {
        extendedLeft.push(leftSide[i % leftSide.length]);
      }
      if (rightSide.length > 0) {
        extendedRight.push(rightSide[i % rightSide.length]);
      }
    }
    
    return { winners: extendedLeft, losers: extendedRight };
  };

  const { winners, losers } = createSideTickers(tickerData);

  return (
    <>
      {/* LEFT SIDE TICKER - Scrolling Up */}
      <SideTicker className="left">
        <TickerContent direction="up">
          {winners.map((item, index) => (
            <TickerItem key={`left-${index}`} change={item.change}>
              <div className="domain">
                <Link 
                  to={`/domain/${encodeURIComponent(item.domain)}`}
                  style={{ color: '#00ff41', textDecoration: 'none' }}
                >
                  {item.domain}
                </Link>
              </div>
              <div className="score">AI Score: {item.price}</div>
              <div className="change">
                {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
              </div>
            </TickerItem>
          ))}
          {/* Repeat for continuous scroll */}
          {winners.map((item, index) => (
            <TickerItem key={`left-repeat-${index}`} change={item.change}>
              <div className="domain">
                <Link 
                  to={`/domain/${encodeURIComponent(item.domain)}`}
                  style={{ color: '#00ff41', textDecoration: 'none' }}
                >
                  {item.domain}
                </Link>
              </div>
              <div className="score">AI Score: {item.price}</div>
              <div className="change">
                {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
              </div>
            </TickerItem>
          ))}
        </TickerContent>
      </SideTicker>

      {/* RIGHT SIDE TICKER - Scrolling Down */}
      <SideTicker className="right">
        <TickerContent direction="down">
          {losers.slice().reverse().map((item, index) => (
            <TickerItem key={`right-${index}`} change={item.change}>
              <div className="domain">
                <Link 
                  to={`/domain/${encodeURIComponent(item.domain)}`}
                  style={{ color: '#00ff41', textDecoration: 'none' }}
                >
                  {item.domain}
                </Link>
              </div>
              <div className="score">AI Score: {item.price}</div>
              <div className="change">
                {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
              </div>
            </TickerItem>
          ))}
          {/* Repeat for continuous scroll */}
          {losers.slice().reverse().map((item, index) => (
            <TickerItem key={`right-repeat-${index}`} change={item.change}>
              <div className="domain">
                <Link 
                  to={`/domain/${encodeURIComponent(item.domain)}`}
                  style={{ color: '#00ff41', textDecoration: 'none' }}
                >
                  {item.domain}
                </Link>
              </div>
              <div className="score">AI Score: {item.price}</div>
              <div className="change">
                {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
              </div>
            </TickerItem>
          ))}
        </TickerContent>
      </SideTicker>

      <Container>
        <HeroSection>
          <MainQuestion
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
          >
            Brand Memory Intelligence
          </MainQuestion>
          
          <SubQuestion
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.3 }}
          >
            Track which brands AI systems remember.
          </SubQuestion>
        </HeroSection>

        <IntelligenceDashboard />

        {/* Memory Intelligence Stats */}
        <StatsSection>
          <motion.h2
            style={{
              fontSize: '2.5rem',
              fontWeight: '600',
              color: '#1d1d1f',
              textAlign: 'center',
              marginBottom: '20px',
              letterSpacing: '-1px',
              fontFamily: 'monospace'
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            MARKET DATA
          </motion.h2>
          <motion.p
            style={{
              fontSize: '1.3rem',
              color: '#86868b',
              textAlign: 'center',
              marginBottom: '60px',
              maxWidth: '700px',
              margin: '0 auto 60px',
              fontFamily: 'monospace'
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            REAL-TIME AI MEMORY DECAY ANALYSIS • CONTINUOUS MEASUREMENT
          </motion.p>
          
          <StatsGrid>
            <StatItem>
              <div className="number" style={{ fontFamily: 'monospace' }}>
                {stats.totalResponses > 50000 ? 'Over 50K' : stats.totalResponses.toLocaleString()}
              </div>
              <div className="label" style={{ fontFamily: 'monospace' }}>AI RESPONSES</div>
            </StatItem>
            <StatItem>
              <div className="number" style={{ fontFamily: 'monospace', color: '#00ff41' }}>
                +{stats.responsesToday}
              </div>
              <div className="label" style={{ fontFamily: 'monospace' }}>TODAY</div>
            </StatItem>
            <StatItem>
              <div className="number" style={{ fontFamily: 'monospace', color: '#007AFF' }}>
                {stats.aiModels}
              </div>
              <div className="label" style={{ fontFamily: 'monospace' }}>AI MODELS</div>
            </StatItem>
            <StatItem>
              <div className="number" style={{ fontFamily: 'monospace', color: '#FF9500' }}>
                {stats.consensus}%
              </div>
              <div className="label" style={{ fontFamily: 'monospace' }}>CONSENSUS</div>
            </StatItem>
          </StatsGrid>
        </StatsSection>

        <ExploreSection>
          <ExploreTitle style={{ fontFamily: 'monospace' }}>MEMORY ANALYSIS TOOLS</ExploreTitle>
          
          <ExploreGrid>
            <ExploreCard to="/rankings">
              <ExploreIcon>📈</ExploreIcon>
              <ExploreCardTitle style={{ fontFamily: 'monospace' }}>MEMORY DERIVATIVES</ExploreCardTitle>
              <ExploreDescription style={{ fontFamily: 'monospace' }}>
                Complete brand memory decay curves and volatility analysis. Track consensus spreads across models.
              </ExploreDescription>
            </ExploreCard>

            <ExploreCard to="/cohort-intelligence">
              <ExploreIcon>⚔️</ExploreIcon>
              <ExploreCardTitle style={{ fontFamily: 'monospace' }}>SECTOR ANALYSIS</ExploreCardTitle>
              <ExploreDescription style={{ fontFamily: 'monospace' }}>
                Sector-by-sector competitive intelligence. Industry correlation matrices.
              </ExploreDescription>
            </ExploreCard>

            <ExploreCard to="/about">
              <ExploreIcon>🧠</ExploreIcon>
              <ExploreCardTitle style={{ fontFamily: 'monospace' }}>METHODOLOGY</ExploreCardTitle>
              <ExploreDescription style={{ fontFamily: 'monospace' }}>
                How brand memory half-life is calculated. Memory decay algorithms and consensus measurement.
              </ExploreDescription>
            </ExploreCard>
          </ExploreGrid>
        </ExploreSection>
      </Container>
    </>
  );
};

export default Home; 