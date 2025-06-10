import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Steve Jobs inspired minimal color palette
const Colors = {
  white: '#FFFFFF',
  lightGray: '#F8F9FA',
  mediumGray: '#E5E7EB',
  darkGray: '#374151',
  black: '#111827',
  blue: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  orange: '#F59E0B',
  purple: '#8B5CF6'
};

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, ${Colors.white} 0%, ${Colors.lightGray} 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const HeroSection = styled.div`
  text-align: center;
  padding: 120px 40px 80px;
  background: ${Colors.white};
`;

const MainTitle = styled(motion.h1)`
  font-size: 4.5rem;
  font-weight: 100;
  color: ${Colors.black};
  margin: 0 0 30px;
  letter-spacing: -3px;
  line-height: 1.1;
`;

const Subtitle = styled(motion.p)`
  font-size: 1.5rem;
  color: ${Colors.darkGray};
  margin: 0 0 60px;
  font-weight: 300;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
`;

const StatsBar = styled(motion.div)`
  display: flex;
  justify-content: center;
  gap: 80px;
  margin: 60px 0;
  flex-wrap: wrap;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 3rem;
  font-weight: 100;
  color: ${Colors.blue};
  margin-bottom: 10px;
`;

const StatLabel = styled.div`
  font-size: 1rem;
  color: ${Colors.darkGray};
  font-weight: 400;
`;

const LeaderboardSection = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 80px 40px;
`;

const SectionTitle = styled.h2`
  font-size: 3rem;
  font-weight: 200;
  color: ${Colors.black};
  text-align: center;
  margin: 0 0 20px;
  letter-spacing: -1px;
`;

const SectionSubtitle = styled.p`
  font-size: 1.2rem;
  color: ${Colors.darkGray};
  text-align: center;
  margin: 0 0 60px;
  font-weight: 300;
`;

const LeaderboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 30px;
  margin: 60px 0;
`;

const DomainCard = styled(motion.div)`
  background: ${Colors.white};
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => 
      props.rank === 1 ? `linear-gradient(90deg, ${Colors.green}, #22C55E)` :
      props.rank === 2 ? `linear-gradient(90deg, ${Colors.blue}, #3B82F6)` :
      props.rank === 3 ? `linear-gradient(90deg, ${Colors.orange}, #F59E0B)` :
      `linear-gradient(90deg, ${Colors.purple}, #8B5CF6)`
    };
  }
`;

const DomainHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
`;

const DomainName = styled.h3`
  font-size: 1.4rem;
  font-weight: 600;
  color: ${Colors.black};
  margin: 0;
  flex: 1;
`;

const RankBadge = styled.div`
  background: ${props => 
    props.rank === 1 ? Colors.green :
    props.rank === 2 ? Colors.blue :
    props.rank === 3 ? Colors.orange :
    Colors.purple
  };
  color: ${Colors.white};
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  min-width: 60px;
  text-align: center;
`;

const ScoreDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 30px 0;
`;

const ScoreCircle = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, ${props => 
    props.score >= 80 ? Colors.green : 
    props.score >= 60 ? Colors.orange : Colors.red
  } ${props => props.score * 3.6}deg, ${Colors.lightGray} 0deg);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  
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
  font-size: 1.2rem;
  font-weight: 600;
  color: ${Colors.black};
  z-index: 1;
  position: relative;
`;

const ScoreDetails = styled.div`
  flex: 1;
`;

const ScoreLabel = styled.div`
  font-size: 0.9rem;
  color: ${Colors.darkGray};
  margin-bottom: 5px;
`;

const ScoreValue = styled.div`
  font-size: 1.5rem;
  font-weight: 300;
  color: ${Colors.black};
`;

const TrendIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  font-size: 0.9rem;
  color: ${props => props.trend === 'up' ? Colors.green : Colors.red};
`;

const AlertBadge = styled.div`
  background: ${Colors.red};
  color: ${Colors.white};
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 15px;
  display: inline-block;
`;

const ExploreSection = styled.div`
  background: ${Colors.white};
  padding: 80px 40px;
  text-align: center;
  border-top: 1px solid ${Colors.mediumGray};
`;

const ExploreGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
  max-width: 1000px;
  margin: 0 auto;
`;

const ExploreCard = styled(Link)`
  background: ${Colors.lightGray};
  border-radius: 16px;
  padding: 40px 30px;
  text-decoration: none;
  transition: all 0.3s ease;
  display: block;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
    background: ${Colors.white};
  }
`;

const ExploreIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 20px;
`;

const ExploreTitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 600;
  color: ${Colors.black};
  margin: 0 0 15px;
`;

const ExploreDescription = styled.p`
  font-size: 1rem;
  color: ${Colors.darkGray};
  margin: 0;
  font-weight: 400;
`;

const CTAButton = styled(Link)`
  display: inline-block;
  background: ${Colors.blue};
  color: ${Colors.white};
  padding: 16px 32px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.1rem;
  margin: 30px 15px 10px;
  transition: all 0.3s ease;
  
  &:hover {
    background: #2563eb;
    transform: translateY(-2px);
  }
`;

const Home = () => {
  const [stats, setStats] = useState(null);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('https://llm-pagerank-public-api.onrender.com/api/stats');
        setStats(response.data.platform_stats);
        setDomains(response.data.top_performers || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Container>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            ⭕
          </motion.div>
          <span style={{ marginLeft: '20px', color: Colors.darkGray }}>Loading AI intelligence...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <HeroSection>
        <MainTitle
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          Will your domain be remembered?
        </MainTitle>
        <Subtitle
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          Real-time memory scoring across {stats?.total_domains || 477} domains 
          through {stats?.total_ai_responses || '35,000+'} AI model responses
        </Subtitle>

        <StatsBar
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          <StatItem>
            <StatNumber>{stats?.total_domains || 477}</StatNumber>
            <StatLabel>Domains Monitored</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>{stats?.critical_risk_domains || 0}</StatNumber>
            <StatLabel>High Risk</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>{stats?.active_fire_alarms || 147}</StatNumber>
            <StatLabel>Active Alerts</StatLabel>
          </StatItem>
        </StatsBar>
      </HeroSection>

      <LeaderboardSection>
        <SectionTitle>AI Memory Leaderboard</SectionTitle>
        <SectionSubtitle>
          The domains that AI models remember most — and their competitive standing
        </SectionSubtitle>

        <LeaderboardGrid>
          {domains.slice(0, 12).map((domain, index) => (
            <DomainCard
              key={domain.domain}
              rank={index + 1}
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
                  <ScoreNumber>{Math.round(domain.memory_score)}</ScoreNumber>
                </ScoreCircle>
                
                <ScoreDetails>
                  <ScoreLabel>Memory Score</ScoreLabel>
                  <ScoreValue>{Math.round(domain.memory_score)}/100</ScoreValue>
                  
                  <TrendIndicator trend={domain.memory_score > 80 ? 'up' : 'down'}>
                    {domain.memory_score > 80 ? '📈' : '📉'}
                    {domain.memory_score > 80 ? 'Rising' : 'Declining'}
                  </TrendIndicator>
                </ScoreDetails>
              </ScoreDisplay>

              {domain.reputation_risk > 50 && (
                <AlertBadge>🚨 Risk Alert</AlertBadge>
              )}
            </DomainCard>
          ))}
        </LeaderboardGrid>
      </LeaderboardSection>

      <ExploreSection>
        <h3 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 200, 
          color: Colors.black, 
          margin: '0 0 20px',
          letterSpacing: '-1px'
        }}>
          Explore AI Intelligence
        </h3>
        <p style={{ 
          fontSize: '1.2rem',
          color: Colors.darkGray,
          margin: '0 0 50px',
          fontWeight: 300
        }}>
          Deep competitive analysis across 477 domains with 35,000+ AI responses
        </p>

        <ExploreGrid>
          <ExploreCard to="/domains">
            <ExploreIcon>🏢</ExploreIcon>
            <ExploreTitle>Domain Directory</ExploreTitle>
            <ExploreDescription>
              Browse all 477 monitored domains with AI memory scores, competitive rankings, and risk assessments
            </ExploreDescription>
          </ExploreCard>

          <ExploreCard to="/leaderboard">
            <ExploreIcon>🏆</ExploreIcon>
            <ExploreTitle>Full Leaderboard</ExploreTitle>
            <ExploreDescription>
              Complete rankings showing winners vs losers in the AI memory game with detailed competitive analysis
            </ExploreDescription>
          </ExploreCard>

          <ExploreCard to="/categories">
            <ExploreIcon>📊</ExploreIcon>
            <ExploreTitle>Industry Analysis</ExploreTitle>
            <ExploreDescription>
              AI, SaaS, E-commerce, and more - see which industries dominate AI memory and which are forgotten
            </ExploreDescription>
          </ExploreCard>
        </ExploreGrid>

        <div style={{ marginTop: '60px' }}>
          <CTAButton to="/domains">View All Domains</CTAButton>
          <CTAButton to="/leaderboard">See Full Rankings</CTAButton>
        </div>
      </ExploreSection>
    </Container>
  );
};

export default Home; 