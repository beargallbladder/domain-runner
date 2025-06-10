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
  font-size: 3.5rem;
  font-weight: 100;
  color: ${Colors.black};
  margin: 0 0 20px;
  letter-spacing: -2px;
`;

const Subtitle = styled.p`
  font-size: 1.3rem;
  color: ${Colors.darkGray};
  margin: 0;
  font-weight: 300;
`;

const FilterBar = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 40px;
  flex-wrap: wrap;
`;

const FilterButton = styled.button`
  padding: 12px 24px;
  border: 2px solid ${props => props.active ? Colors.blue : Colors.mediumGray};
  background: ${props => props.active ? Colors.blue : Colors.white};
  color: ${props => props.active ? Colors.white : Colors.darkGray};
  border-radius: 25px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${Colors.blue};
    background: ${props => props.active ? Colors.blue : Colors.lightGray};
  }
`;

const DomainGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 25px;
  max-width: 1400px;
  margin: 0 auto;
`;

const DomainCard = styled(motion.div)`
  background: ${Colors.white};
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.12);
  }
`;

const DomainHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const DomainName = styled.h3`
  font-size: 1.3rem;
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
  padding: 6px 14px;
  border-radius: 15px;
  font-size: 0.9rem;
  font-weight: 600;
`;

const MetricsRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 15px 0;
`;

const Metric = styled.div`
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${Colors.black};
`;

const MetricLabel = styled.div`
  font-size: 0.8rem;
  color: ${Colors.darkGray};
  margin-top: 2px;
`;

const AlertIndicator = styled.div`
  background: ${Colors.red};
  color: ${Colors.white};
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 10px;
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

const DomainDirectory = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'https://llm-pagerank-public-api.onrender.com'}/api/domains`);
        setDomains(response.data.domains || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching domains:', error);
        setLoading(false);
      }
    };

    fetchDomains();
  }, []);

  const filteredDomains = domains.filter(domain => {
    if (filter === 'all') return true;
    if (filter === 'high-score') return domain.memory_score >= 80;
    if (filter === 'medium-score') return domain.memory_score >= 60 && domain.memory_score < 80;
    if (filter === 'low-score') return domain.memory_score < 60;
    if (filter === 'alerts') return domain.reputation_risk > 50;
    return true;
  });

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
          Loading domain intelligence...
        </LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Domain Directory</Title>
        <Subtitle>
          Complete AI memory analysis for {domains.length} domains
        </Subtitle>
      </Header>

      <FilterBar>
        <FilterButton 
          active={filter === 'all'} 
          onClick={() => setFilter('all')}
        >
          All Domains ({domains.length})
        </FilterButton>
        <FilterButton 
          active={filter === 'high-score'} 
          onClick={() => setFilter('high-score')}
        >
          High Performers (80+)
        </FilterButton>
        <FilterButton 
          active={filter === 'medium-score'} 
          onClick={() => setFilter('medium-score')}
        >
          Medium (60-79)
        </FilterButton>
        <FilterButton 
          active={filter === 'low-score'} 
          onClick={() => setFilter('low-score')}
        >
          At Risk (&lt;60)
        </FilterButton>
        <FilterButton 
          active={filter === 'alerts'} 
          onClick={() => setFilter('alerts')}
        >
          🚨 Active Alerts
        </FilterButton>
      </FilterBar>

      <DomainGrid>
        {filteredDomains.map((domain, index) => (
          <DomainCard
            key={domain.domain}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            as={Link}
            to={`/domain/${domain.domain}`}
          >
            <DomainHeader>
              <DomainName>{domain.domain}</DomainName>
              <ScoreBadge score={domain.memory_score}>
                {Math.round(domain.memory_score)}
              </ScoreBadge>
            </DomainHeader>

            <MetricsRow>
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
            </MetricsRow>

            {domain.reputation_risk > 50 && (
              <AlertIndicator>
                🚨 High Risk Alert
              </AlertIndicator>
            )}
          </DomainCard>
        ))}
      </DomainGrid>
    </Container>
  );
};

export default DomainDirectory; 