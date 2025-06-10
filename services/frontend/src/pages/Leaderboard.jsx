import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';

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
  background: ${Colors.lightGray};
  padding: 40px 20px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 60px;
`;

const Title = styled.h1`
  font-size: 4rem;
  font-weight: 100;
  color: ${Colors.black};
  margin: 0 0 20px;
  letter-spacing: -2px;
`;

const Subtitle = styled.p`
  font-size: 1.4rem;
  color: ${Colors.darkGray};
  margin: 0;
  font-weight: 300;
`;

const LeaderboardContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const RankCard = styled(motion.div)`
  background: ${Colors.white};
  border-radius: 20px;
  padding: 30px;
  margin-bottom: 20px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.12);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 5px;
    background: ${props => 
      props.rank === 1 ? `linear-gradient(90deg, ${Colors.green}, #22C55E)` :
      props.rank === 2 ? `linear-gradient(90deg, ${Colors.blue}, #3B82F6)` :
      props.rank === 3 ? `linear-gradient(90deg, ${Colors.orange}, #F59E0B)` :
      props.rank <= 10 ? `linear-gradient(90deg, ${Colors.purple}, #8B5CF6)` :
      `linear-gradient(90deg, ${Colors.mediumGray}, ${Colors.darkGray})`
    };
  }
`;

const RankHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
`;

const RankInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const RankNumber = styled.div`
  font-size: 2.5rem;
  font-weight: 100;
  color: ${props => 
    props.rank === 1 ? Colors.green :
    props.rank === 2 ? Colors.blue :
    props.rank === 3 ? Colors.orange :
    Colors.darkGray
  };
  min-width: 80px;
`;

const DomainName = styled.h3`
  font-size: 1.8rem;
  font-weight: 600;
  color: ${Colors.black};
  margin: 0;
`;

const ScoreBadge = styled.div`
  background: ${props => 
    props.score >= 80 ? Colors.green :
    props.score >= 60 ? Colors.orange :
    Colors.red
  };
  color: ${Colors.white};
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 1.1rem;
  font-weight: 600;
  min-width: 80px;
  text-align: center;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const Metric = styled.div`
  text-align: center;
  padding: 15px;
  background: ${Colors.lightGray};
  border-radius: 12px;
`;

const MetricValue = styled.div`
  font-size: 1.3rem;
  font-weight: 600;
  color: ${Colors.black};
  margin-bottom: 5px;
`;

const MetricLabel = styled.div`
  font-size: 0.9rem;
  color: ${Colors.darkGray};
`;

const TrophyIcon = styled.div`
  font-size: 2rem;
  margin-right: 15px;
`;

const AlertBadge = styled.div`
  background: ${Colors.red};
  color: ${Colors.white};
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 15px;
  display: inline-block;
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  font-size: 1.2rem;
  color: ${Colors.darkGray};
`;

const Leaderboard = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axios.get('https://llm-pagerank-public-api.onrender.com/api/leaderboard');
        setDomains(response.data.domains || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <Container>
        <LoadingState>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{ marginRight: '15px' }}
          >
            ⭕
          </motion.div>
          Loading competitive rankings...
        </LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>AI Memory Leaderboard</Title>
        <Subtitle>
          Complete competitive rankings - Winners vs Losers in the AI memory game
        </Subtitle>
      </Header>

      <LeaderboardContainer>
        {domains.map((domain, index) => (
          <RankCard
            key={domain.domain}
            rank={index + 1}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
            as={Link}
            to={`/domain/${domain.domain}`}
          >
            <RankHeader>
              <RankInfo>
                {index < 3 && (
                  <TrophyIcon>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </TrophyIcon>
                )}
                <RankNumber rank={index + 1}>#{index + 1}</RankNumber>
                <DomainName>{domain.domain}</DomainName>
              </RankInfo>
              <ScoreBadge score={domain.memory_score}>
                {Math.round(domain.memory_score)}
              </ScoreBadge>
            </RankHeader>

            <MetricsGrid>
              <Metric>
                <MetricValue>{Math.round(domain.memory_score)}</MetricValue>
                <MetricLabel>Memory Score</MetricLabel>
              </Metric>
              <Metric>
                <MetricValue>{Math.round(domain.ai_consensus_score || 0)}</MetricValue>
                <MetricLabel>AI Consensus</MetricLabel>
              </Metric>
              <Metric>
                <MetricValue>{Math.round(domain.competitive_threat || 0)}</MetricValue>
                <MetricLabel>Threat Level</MetricLabel>
              </Metric>
              <Metric>
                <MetricValue>{Math.round(domain.business_intelligence || 0)}</MetricValue>
                <MetricLabel>Business Intel</MetricLabel>
              </Metric>
            </MetricsGrid>

            {domain.reputation_risk > 50 && (
              <AlertBadge>
                🚨 High Risk - Memory Declining
              </AlertBadge>
            )}
          </RankCard>
        ))}
      </LeaderboardContainer>
    </Container>
  );
};

export default Leaderboard; 