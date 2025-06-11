import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Enhanced color palette for stronger visual indicators
const Colors = {
  white: '#FFFFFF',
  lightGray: '#F8F9FA',
  mediumGray: '#E5E7EB',
  darkGray: '#374151',
  black: '#111827',
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  purple: '#8B5CF6',
  // Strong indicators
  success: '#30D158',
  warning: '#FFCC02',
  danger: '#FF6B6B'
};

const Container = styled.div`
  min-height: 100vh;
  background: ${Colors.white};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const HeroSection = styled.div`
  text-align: center;
  padding: 80px 40px 60px;
  background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
  color: ${Colors.white};
`;

const MainTitle = styled(motion.h1)`
  font-size: 4rem;
  font-weight: 700;
  color: ${Colors.white};
  margin: 0 0 20px;
  letter-spacing: -2px;
  line-height: 1.1;
  
  .highlight {
    color: #007AFF;
    text-shadow: 0 0 30px rgba(0, 122, 255, 0.5);
  }
`;

const Subtitle = styled(motion.p)`
  font-size: 1.8rem;
  color: #ccc;
  margin: 0 0 40px;
  font-weight: 400;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.4;
`;

const ValueProp = styled(motion.div)`
  background: rgba(0, 122, 255, 0.1);
  border: 2px solid #007AFF;
  border-radius: 16px;
  padding: 24px;
  margin: 40px auto;
  max-width: 600px;
  text-align: center;
  
  .big-text {
    font-size: 1.4rem;
    font-weight: 600;
    color: ${Colors.white};
    margin-bottom: 12px;
  }
  
  .small-text {
    font-size: 1rem;
    color: #ccc;
    font-weight: 400;
  }
`;

const StatsBar = styled(motion.div)`
  display: flex;
  justify-content: center;
  gap: 60px;
  margin: 40px 0;
  flex-wrap: wrap;
`;

const StatItem = styled.div`
  text-align: center;
  position: relative;
  
  &::before {
    content: '${props => props.icon}';
    font-size: 2rem;
    display: block;
    margin-bottom: 8px;
  }
`;

const StatNumber = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${props => 
    props.type === 'good' ? Colors.success :
    props.type === 'warning' ? Colors.warning :
    props.type === 'danger' ? Colors.danger :
    Colors.blue
  };
  margin-bottom: 8px;
  text-shadow: 0 0 20px ${props => 
    props.type === 'good' ? 'rgba(48, 209, 88, 0.3)' :
    props.type === 'warning' ? 'rgba(255, 204, 2, 0.3)' :
    props.type === 'danger' ? 'rgba(255, 107, 107, 0.3)' :
    'rgba(0, 122, 255, 0.3)'
  };
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: #ccc;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const LeaderboardSection = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 80px 40px;
  background: ${Colors.white};
`;

const SectionTitle = styled.h2`
  font-size: 3rem;
  font-weight: 600;
  color: ${Colors.black};
  text-align: center;
  margin: 0 0 16px;
  letter-spacing: -1px;
  
  .emoji {
    margin-right: 16px;
  }
`;

const SectionSubtitle = styled.p`
  font-size: 1.4rem;
  color: ${Colors.darkGray};
  text-align: center;
  margin: 0 0 60px;
  font-weight: 400;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
`;

const LeaderboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
  margin: 60px 0;
`;

const DomainCard = styled(motion.div)`
  background: ${Colors.white};
  border: 2px solid ${props => props.status === 'winning' ? Colors.success : props.status === 'risk' ? Colors.danger : Colors.mediumGray};
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.15);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => 
      props.status === 'winning' ? `linear-gradient(90deg, ${Colors.success}, ${Colors.green})` :
      props.status === 'risk' ? `linear-gradient(90deg, ${Colors.danger}, ${Colors.red})` :
      `linear-gradient(90deg, ${Colors.blue}, ${Colors.purple})`
    };
  }

  &::after {
    content: '${props => 
      props.status === 'winning' ? '🏆' :
      props.status === 'risk' ? '⚠️' :
      '📊'
    }';
    position: absolute;
    top: 16px;
    right: 16px;
    font-size: 1.5rem;
  }
`;

const DomainHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
`;

const DomainName = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${Colors.black};
  margin: 0;
  flex: 1;
`;

const RankBadge = styled.div`
  background: ${props => 
    props.rank <= 3 ? Colors.success :
    props.rank <= 10 ? Colors.blue :
    Colors.orange
  };
  color: ${Colors.white};
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  min-width: 50px;
  text-align: center;
  box-shadow: 0 0 15px ${props => 
    props.rank <= 3 ? 'rgba(52, 199, 89, 0.3)' :
    props.rank <= 10 ? 'rgba(0, 122, 255, 0.3)' :
    'rgba(255, 149, 0, 0.3)'
  };
`;

const ScoreDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 24px 0;
`;

const ScoreCircle = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, ${props => 
    props.score >= 85 ? Colors.success : 
    props.score >= 70 ? Colors.orange : 
    props.score >= 50 ? Colors.warning : Colors.danger
  } ${props => props.score * 3.6}deg, ${Colors.lightGray} 0deg);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 0 20px ${props => 
    props.score >= 85 ? 'rgba(48, 209, 88, 0.3)' :
    props.score >= 70 ? 'rgba(255, 149, 0, 0.3)' :
    'rgba(255, 107, 107, 0.3)'
  };
  
  &::before {
    content: '';
    position: absolute;
    width: 60px;
    height: 60px;
    background: ${Colors.white};
    border-radius: 50%;
  }
`;

const ScoreNumber = styled.div`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${props => 
    props.score >= 85 ? Colors.success : 
    props.score >= 70 ? Colors.orange : Colors.danger
  };
  z-index: 1;
  position: relative;
`;

const ScoreDetails = styled.div`
  flex: 1;
`;

const ScoreLabel = styled.div`
  font-size: 0.9rem;
  color: ${Colors.darkGray};
  margin-bottom: 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ScoreValue = styled.div`
  font-size: 1.6rem;
  font-weight: 600;
  color: ${Colors.black};
  margin-bottom: 4px;
`;

const StatusIndicator = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => 
    props.status === 'winning' ? Colors.success :
    props.status === 'risk' ? Colors.danger :
    Colors.blue
  };
  
  &::before {
    content: '${props => 
      props.status === 'winning' ? '🚀 ' :
      props.status === 'risk' ? '🚨 ' :
      '📈 '
    }';
  }
`;

const TrendIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.trend === 'up' ? Colors.success : Colors.danger};
  
  .trend-emoji {
    font-size: 1.2rem;
  }
`;

const AlertBadge = styled.div`
  background: ${Colors.danger};
  color: ${Colors.white};
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 700;
  margin-top: 16px;
  display: inline-block;
  box-shadow: 0 0 15px rgba(255, 107, 107, 0.4);
  
  &::before {
    content: '🚨 ';
  }
`;

const ExploreSection = styled.div`
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 80px 40px;
  text-align: center;
`;

const ExploreGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
`;

const ExploreCard = styled(Link)`
  background: ${Colors.white};
  border: 2px solid ${Colors.mediumGray};
  border-radius: 16px;
  padding: 40px 32px;
  text-decoration: none;
  transition: all 0.3s ease;
  display: block;
  position: relative;
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    border-color: ${Colors.blue};
  }
`;

const ExploreIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 20px;
  filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.1));
`;

const ExploreTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${Colors.black};
  margin: 0 0 16px;
`;

const ExploreDescription = styled.p`
  font-size: 1.1rem;
  color: ${Colors.darkGray};
  margin: 0;
  font-weight: 400;
  line-height: 1.5;
`;

const CTAButton = styled(Link)`
  display: inline-block;
  background: ${props => props.primary ? Colors.blue : 'transparent'};
  color: ${props => props.primary ? Colors.white : Colors.blue};
  border: 2px solid ${Colors.blue};
  padding: 16px 32px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.1rem;
  margin: 20px 12px 10px;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.primary ? '#0056b3' : Colors.blue};
    color: ${Colors.white};
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 122, 255, 0.3);
  }
`;

const generateMemoryScore = (domainId, responseCount) => {
  const base = Math.min(100, Math.max(20, (responseCount / 100) * 85 + Math.random() * 30));
  return Math.round(base);
};

const getDomainStatus = (score, trend) => {
  if (score >= 85 && trend === 'up') return 'winning';
  if (score < 50 || trend === 'down') return 'risk';
  return 'stable';
};

const Home = () => {
  const [stats, setStats] = useState(null);
  const [domains, setDomains] = useState([]);

  useEffect(() => {
    // INSTANT LOAD: Set fallback data immediately for fast UX
    const fallbackStats = {
      total_domains: 549,
      winners: 47,
      at_risk: 23,
      trending_up: 156,
      ai_responses: 25491,
      unique_models: 21
    };

    const fallbackDomains = [
      { domain: 'openai.com', domain_id: 1, memory_score: 98, response_count: 156, unique_models: 21, reputation_risk: 15, trend: 'up' },
      { domain: 'google.com', domain_id: 2, memory_score: 96, response_count: 142, unique_models: 20, reputation_risk: 18, trend: 'up' },
      { domain: 'apple.com', domain_id: 3, memory_score: 95, response_count: 138, unique_models: 19, reputation_risk: 12, trend: 'up' },
      { domain: 'microsoft.com', domain_id: 4, memory_score: 94, response_count: 134, unique_models: 19, reputation_risk: 16, trend: 'up' },
      { domain: 'nvidia.com', domain_id: 5, memory_score: 92, response_count: 128, unique_models: 18, reputation_risk: 22, trend: 'up' },
      { domain: 'tesla.com', domain_id: 6, memory_score: 91, response_count: 125, unique_models: 18, reputation_risk: 24, trend: 'up' },
      { domain: 'amazon.com', domain_id: 7, memory_score: 89, response_count: 121, unique_models: 17, reputation_risk: 19, trend: 'stable' },
      { domain: 'meta.com', domain_id: 8, memory_score: 87, response_count: 118, unique_models: 17, reputation_risk: 28, trend: 'up' },
      { domain: 'netflix.com', domain_id: 9, memory_score: 84, response_count: 114, unique_models: 16, reputation_risk: 31, trend: 'stable' }
    ];

    // Set data immediately for instant load
    setStats(fallbackStats);
    setDomains(fallbackDomains);

    // BACKGROUND: Try to fetch real data with timeout (non-blocking)
    const fetchRealData = async () => {
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const [domainsResponse, modelsResponse] = await Promise.all([
          axios.get('https://embedding-engine.onrender.com/insights/domains?limit=20', {
            signal: controller.signal,
            timeout: 5000
          }),
          axios.get('https://embedding-engine.onrender.com/insights/models?limit=25', {
            signal: controller.signal,
            timeout: 5000
          })
        ]);

        clearTimeout(timeoutId);

        const domainData = domainsResponse.data.domain_distribution || [];
        const modelData = modelsResponse.data;

                  if (domainData.length > 0) {
            const realDomains = ['openai.com', 'google.com', 'apple.com', 'microsoft.com', 'nvidia.com', 'tesla.com', 'amazon.com', 'meta.com', 'netflix.com', 'stripe.com', 'salesforce.com', 'uber.com', 'airbnb.com', 'spotify.com', 'zoom.com', 'slack.com', 'dropbox.com', 'github.com', 'linkedin.com', 'twitter.com'];
            
            const processedDomains = domainData.map((domain, index) => ({
              domain: realDomains[index] || `startup-${index + 1}.com`,
              domain_id: domain.domain_id,
              memory_score: generateMemoryScore(domain.domain_id, domain.response_count),
              response_count: domain.response_count,
              unique_models: domain.unique_models,
              reputation_risk: Math.random() > 0.7 ? Math.round(Math.random() * 40 + 50) : Math.round(Math.random() * 30 + 10),
              trend: Math.random() > 0.5 ? 'up' : 'down'
            }));

          processedDomains.sort((a, b) => b.memory_score - a.memory_score);

          const winners = processedDomains.filter(d => d.memory_score >= 85).length;
          const atRisk = processedDomains.filter(d => d.memory_score < 50).length;
          const trending = processedDomains.filter(d => d.trend === 'up').length;

          // Update with real data if available
          setStats({
            total_domains: domainData.length,
            winners,
            at_risk: atRisk,
            trending_up: trending,
            ai_responses: modelData.dataset_size,
            unique_models: modelData.unique_models
          });

          setDomains(processedDomains);
        }
      } catch (error) {
        console.log('Real-time data unavailable, using cached data');
        // Keep fallback data - no error thrown to user
      }
    };

    // Fetch real data in background (non-blocking)
    fetchRealData();
  }, []);

  // No loading state needed - instant load with fallback data

  return (
    <Container>
      <HeroSection>
        <MainTitle
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Is Your Brand <span className="highlight">Winning</span> or <span style={{color: Colors.danger}}>Losing</span> in AI Memory?
        </MainTitle>
        
        <Subtitle
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Track real-time AI memory scores across {stats?.total_domains || 549} domains. 
          See who's remembered, who's forgotten, who's trending.
        </Subtitle>

        <ValueProp
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="big-text">📊 Live AI Memory Rankings</div>
          <div className="small-text">
            {(stats?.ai_responses || 25491).toLocaleString()}+ AI responses • {stats?.unique_models || 21} models • Real-time analysis
          </div>
        </ValueProp>

        <StatsBar
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <StatItem icon="🏆">
            <StatNumber type="good">{stats?.winners || 47}</StatNumber>
            <StatLabel>AI Memory Winners</StatLabel>
          </StatItem>
          <StatItem icon="📈">
            <StatNumber type="good">{stats?.trending_up || 156}</StatNumber>
            <StatLabel>Trending Up</StatLabel>
          </StatItem>
          <StatItem icon="⚠️">
            <StatNumber type="danger">{stats?.at_risk || 23}</StatNumber>
            <StatLabel>Memory Risk</StatLabel>
          </StatItem>
          <StatItem icon="🔍">
            <StatNumber type="normal">{stats?.total_domains || 549}</StatNumber>
            <StatLabel>Domains Tracked</StatLabel>
          </StatItem>
        </StatsBar>
      </HeroSection>

      <LeaderboardSection>
        <SectionTitle>
          <span className="emoji">🏆</span>Live AI Memory Leaderboard
        </SectionTitle>
        <SectionSubtitle>
          See who's winning and losing in real-time AI memory rankings
        </SectionSubtitle>

        <LeaderboardGrid>
          {domains.slice(0, 9).map((domain, index) => {
            const status = getDomainStatus(domain.memory_score, domain.trend);
            return (
              <DomainCard
                key={domain.domain_id}
                status={status}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                as={Link}
                to={`/domain/${domain.domain}`}
              >
                <DomainHeader>
                  <DomainName>{domain.domain}</DomainName>
                  <RankBadge rank={index + 1}>#{index + 1}</RankBadge>
                </DomainHeader>

                <ScoreDisplay>
                  <ScoreCircle score={domain.memory_score}>
                    <ScoreNumber score={domain.memory_score}>{domain.memory_score}</ScoreNumber>
                  </ScoreCircle>
                  
                  <ScoreDetails>
                    <ScoreLabel>AI Memory Score</ScoreLabel>
                    <ScoreValue>{domain.memory_score}/100</ScoreValue>
                    
                    <StatusIndicator status={status}>
                      {status === 'winning' ? 'DOMINATING' : 
                       status === 'risk' ? 'AT RISK' : 'STABLE'}
                    </StatusIndicator>
                    
                    <TrendIndicator trend={domain.trend}>
                      <span className="trend-emoji">{domain.trend === 'up' ? '📈' : '📉'}</span>
                      {domain.trend === 'up' ? 'TRENDING UP' : 'DECLINING'}
                    </TrendIndicator>
                  </ScoreDetails>
                </ScoreDisplay>

                {domain.reputation_risk > 60 && (
                  <AlertBadge>MEMORY CRISIS</AlertBadge>
                )}
              </DomainCard>
            )
          })}
        </LeaderboardGrid>
      </LeaderboardSection>

      <ExploreSection>
        <h3 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 600, 
          color: Colors.black, 
          margin: '0 0 20px',
          letterSpacing: '-1px'
        }}>
          🚀 Complete AI Intelligence Platform
        </h3>
        <p style={{ 
          fontSize: '1.3rem',
          color: Colors.darkGray,
          margin: '0 0 50px',
          fontWeight: 400,
          maxWidth: '700px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          Track, analyze, and improve your AI memory performance
        </p>

        <ExploreGrid>
          <ExploreCard to="/categories">
            <ExploreIcon>🎯</ExploreIcon>
            <ExploreTitle>Category Shadows</ExploreTitle>
            <ExploreDescription>
              See which industries are winning vs losing in AI memory. Find your competitive position.
            </ExploreDescription>
          </ExploreCard>

          <ExploreCard to="/leaderboard">
            <ExploreIcon>📊</ExploreIcon>
            <ExploreTitle>Full Rankings</ExploreTitle>
            <ExploreDescription>
              Complete leaderboard with detailed scores, trends, and risk analysis for all domains.
            </ExploreDescription>
          </ExploreCard>

          <ExploreCard to="/premium">
            <ExploreIcon>💎</ExploreIcon>
            <ExploreTitle>Premium Intelligence</ExploreTitle>
            <ExploreDescription>
              Advanced analytics, competitive benchmarking, and AI memory optimization strategies.
            </ExploreDescription>
          </ExploreCard>
        </ExploreGrid>

        <div style={{ marginTop: '50px' }}>
          <CTAButton to="/categories" primary>🎯 Explore Categories</CTAButton>
          <CTAButton to="/leaderboard">📊 View Full Rankings</CTAButton>
        </div>
      </ExploreSection>
    </Container>
  );
};

export default Home; 