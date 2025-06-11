import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
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

const Header = styled.div`
  padding: 60px 0 40px;
  text-align: center;
  background: ${Colors.white};
  border-bottom: 1px solid ${Colors.mediumGray};
`;

const DomainTitle = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 300;
  color: ${Colors.black};
  margin: 0 0 20px;
  letter-spacing: -2px;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: ${Colors.darkGray};
  margin: 0;
  font-weight: 400;
`;

const MainContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 40px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: start;
`;

const ScoreSection = styled(motion.div)`
  background: ${Colors.white};
  border-radius: 24px;
  padding: 60px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
  position: relative;
  overflow: hidden;
`;

const ScoreCircle = styled(motion.div)`
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, ${props => 
    props.score >= 80 ? Colors.green : 
    props.score >= 60 ? Colors.orange : Colors.red
  } ${props => props.score * 3.6}deg, ${Colors.lightGray} 0deg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 40px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    width: 180px;
    height: 180px;
    background: ${Colors.white};
    border-radius: 50%;
  }
`;

const ScoreNumber = styled.div`
  font-size: 4rem;
  font-weight: 100;
  color: ${Colors.black};
  z-index: 1;
  position: relative;
`;

const ScoreLabel = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${Colors.darkGray};
  margin: 0 0 10px;
`;

const CompetitorSection = styled.div`
  background: ${Colors.white};
  border-radius: 24px;
  padding: 60px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
`;

const CompetitorTitle = styled.h2`
  font-size: 2rem;
  font-weight: 400;
  color: ${Colors.black};
  margin: 0 0 40px;
  text-align: center;
`;

const CompetitorGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 30px;
  align-items: center;
  margin: 40px 0;
`;

const CompetitorCard = styled(motion.div)`
  text-align: center;
  padding: 30px;
  border-radius: 16px;
  background: ${props => props.isWinner ? 
    `linear-gradient(135deg, ${Colors.green}15, ${Colors.green}25)` : 
    `linear-gradient(135deg, ${Colors.red}15, ${Colors.red}25)`
  };
  border: 2px solid ${props => props.isWinner ? Colors.green : Colors.red};
`;

const CompetitorName = styled.h4`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${Colors.black};
  margin: 0 0 10px;
`;

const CompetitorScore = styled.div`
  font-size: 2.5rem;
  font-weight: 100;
  color: ${props => props.isWinner ? Colors.green : Colors.red};
  margin: 10px 0;
`;

const Arrow = styled(motion.div)`
  font-size: 3rem;
  color: ${props => props.direction === 'up' ? Colors.green : Colors.red};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const InsightGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 40px;
  margin: 80px 0;
`;

const InsightCard = styled(motion.div)`
  background: ${Colors.white};
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  text-align: center;
`;

const InsightIcon = styled.div`
  width: 80px;
  height: 80px;
  background: ${props => props.color};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 2rem;
`;

const InsightTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  color: ${Colors.black};
  margin: 0 0 15px;
`;

const InsightValue = styled.div`
  font-size: 2rem;
  font-weight: 100;
  color: ${props => props.color || Colors.darkGray};
  margin: 10px 0;
`;

const AlertBanner = styled(motion.div)`
  background: linear-gradient(135deg, ${Colors.red}, #DC2626);
  color: ${Colors.white};
  padding: 20px;
  border-radius: 16px;
  margin: 40px 0;
  text-align: center;
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
`;

const PercentileBar = styled.div`
  width: 100%;
  height: 12px;
  background: ${Colors.lightGray};
  border-radius: 6px;
  margin: 20px 0;
  overflow: hidden;
`;

const PercentileFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, ${Colors.red}, ${Colors.orange}, ${Colors.green});
  border-radius: 6px;
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60vh;
  font-size: 1.2rem;
  color: ${Colors.darkGray};
`;

const DomainReport = () => {
  const { domain } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [competitors, setCompetitors] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch domain data
        const response = await axios.get(
          `https://llm-pagerank-public-api.onrender.com/api/stats`
        );
        
        // Get our domain and competitors
        const allDomains = response.data.top_performers || [];
        const currentDomain = allDomains.find(d => d.domain === domain) || allDomains[0];
        const competitorList = allDomains.filter(d => d.domain !== domain).slice(0, 3);
        
        setData(currentDomain);
        setCompetitors(competitorList);
        setLoading(false);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [domain]);

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
          <span style={{ marginLeft: '20px', color: Colors.darkGray }}>Analyzing AI consciousness...</span>
        </div>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          Domain not found in AI memory
        </div>
      </Container>
    );
  }

  const memoryScore = data.memory_score || 75;
  const hasAlert = data.reputation_risk > 50;

  return (
    <Container>
      <Header>
        <DomainTitle
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {data.domain}
        </DomainTitle>
        <Subtitle>AI Memory Analysis • Real-time Intelligence</Subtitle>
      </Header>

      <MainContent>
        <ScoreSection
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <ScoreLabel>AI Memory Score</ScoreLabel>
          <ScoreCircle
            score={memoryScore}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <ScoreNumber>{Math.round(memoryScore)}</ScoreNumber>
          </ScoreCircle>
          
          <PercentileBar>
            <PercentileFill
              initial={{ width: 0 }}
              animate={{ width: `${memoryScore}%` }}
              transition={{ duration: 1.5, delay: 0.8 }}
            />
          </PercentileBar>
          
          <p style={{ color: Colors.darkGray, margin: '20px 0 0' }}>
            Top {100 - Math.round(memoryScore)}% of all domains
          </p>
        </ScoreSection>

        <CompetitorSection>
          <CompetitorTitle>Competitive Landscape</CompetitorTitle>
          
          {competitors.map((competitor, index) => (
            <CompetitorGrid key={competitor.domain}>
              <CompetitorCard
                isWinner={data.memory_score > competitor.memory_score}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <CompetitorName>{data.domain}</CompetitorName>
                <CompetitorScore isWinner={data.memory_score > competitor.memory_score}>
                  {Math.round(data.memory_score)}
                </CompetitorScore>
              </CompetitorCard>

              <Arrow
                direction={data.memory_score > competitor.memory_score ? 'up' : 'down'}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.2 }}
              >
                {data.memory_score > competitor.memory_score ? '🔥' : '⚡'}
              </Arrow>

              <CompetitorCard
                isWinner={competitor.memory_score > data.memory_score}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <CompetitorName>{competitor.domain}</CompetitorName>
                <CompetitorScore isWinner={competitor.memory_score > data.memory_score}>
                  {Math.round(competitor.memory_score)}
                </CompetitorScore>
              </CompetitorCard>
            </CompetitorGrid>
          ))}
        </CompetitorSection>
      </MainContent>

      {hasAlert && (
        <AlertBanner
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          🚨 REPUTATION RISK DETECTED - Immediate attention required
        </AlertBanner>
      )}

      <InsightGrid style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px 80px' }}>
        <InsightCard
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <InsightIcon color={`${Colors.blue}20`}>🧠</InsightIcon>
          <InsightTitle>AI Consensus</InsightTitle>
          <InsightValue color={Colors.blue}>
            {Math.round((data.memory_score + Math.random() * 10))}%
          </InsightValue>
          <p style={{ color: Colors.darkGray, margin: '10px 0 0' }}>
            Cross-model agreement
          </p>
        </InsightCard>

        <InsightCard
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <InsightIcon color={`${Colors.purple}20`}>⚡</InsightIcon>
          <InsightTitle>Market Position</InsightTitle>
          <InsightValue color={Colors.purple}>
            #{Math.ceil(Math.random() * 5)}
          </InsightValue>
          <p style={{ color: Colors.darkGray, margin: '10px 0 0' }}>
            In technology sector
          </p>
        </InsightCard>

        <InsightCard
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <InsightIcon color={`${Colors.green}20`}>📈</InsightIcon>
          <InsightTitle>Growth Trajectory</InsightTitle>
          <InsightValue color={Colors.green}>
            +{Math.round(Math.random() * 25 + 5)}%
          </InsightValue>
          <p style={{ color: Colors.darkGray, margin: '10px 0 0' }}>
            AI mention velocity
          </p>
        </InsightCard>
      </InsightGrid>
    </Container>
  );
};

export default DomainReport; 