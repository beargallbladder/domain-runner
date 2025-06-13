import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Colors = {
  excellent: '#007AFF',    // Blue for excellent
  strong: '#34C759',       // Green for strong
  average: '#FF9500',      // Orange for average
  weak: '#FF3B30',         // Red for weak
  critical: '#8E8E93',     // Gray for critical
  background: '#F8F9FA',
  white: '#FFFFFF',
  black: '#1D1D1F',
  gray: '#8E8E93'
};

const Container = styled.div`
  min-height: 100vh;
  background: ${Colors.background};
  padding: 40px 20px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 60px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
`;

const Title = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  color: ${Colors.black};
  margin: 0 0 24px;
  
  .highlight {
    background: linear-gradient(135deg, ${Colors.excellent} 0%, ${Colors.strong} 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const Subtitle = styled.p`
  font-size: 1.4rem;
  color: ${Colors.gray};
  margin: 0 0 32px;
  font-weight: 500;
  line-height: 1.6;
`;

const StatsBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
`;

const StatCard = styled.div`
  background: ${Colors.white};
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  
  .value {
    font-size: 2.5rem;
    font-weight: 800;
    color: ${Colors.excellent};
    margin-bottom: 8px;
  }
  
  .label {
    font-size: 1rem;
    color: ${Colors.gray};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const CohortsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 32px;
  max-width: 1400px;
  margin: 0 auto;
`;

const CohortCard = styled(motion.div)`
  background: ${Colors.white};
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
  
  &:hover {
    border-color: ${Colors.excellent};
    transform: translateY(-4px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  }
`;

const CohortHeader = styled.div`
  margin-bottom: 24px;
`;

const CohortTitle = styled.h2`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${Colors.black};
  margin: 0 0 8px;
`;

const CohortDescription = styled.p`
  font-size: 1rem;
  color: ${Colors.gray};
  margin: 0 0 16px;
  line-height: 1.5;
`;

const CohortStats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
`;

const CohortStat = styled.div`
  text-align: center;
  
  .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: ${Colors.black};
    margin-bottom: 4px;
  }
  
  .label {
    font-size: 0.8rem;
    color: ${Colors.gray};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const CompetitorsList = styled.div`
  margin-bottom: 24px;
`;

const CompetitorItem = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  margin: 8px 0;
  background: ${props => 
    props.position === 'EXCELLENT' ? `${Colors.excellent}10` :
    props.position === 'STRONG' ? `${Colors.strong}10` :
    props.position === 'AVERAGE' ? `${Colors.average}10` :
    props.position === 'WEAK' ? `${Colors.weak}10` :
    `${Colors.critical}10`
  };
  border-radius: 12px;
  border-left: 4px solid ${props => 
    props.position === 'EXCELLENT' ? Colors.excellent :
    props.position === 'STRONG' ? Colors.strong :
    props.position === 'AVERAGE' ? Colors.average :
    props.position === 'WEAK' ? Colors.weak :
    Colors.critical
  };
  cursor: pointer;
  
  &:hover {
    transform: translateX(4px);
  }
`;

const CompetitorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  
  .rank {
    background: ${props => 
      props.position === 'EXCELLENT' ? Colors.excellent :
      props.position === 'STRONG' ? Colors.strong :
      props.position === 'AVERAGE' ? Colors.average :
      props.position === 'WEAK' ? Colors.weak :
      Colors.critical
    };
    color: ${Colors.white};
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: 700;
  }
  
  .domain {
    font-size: 1.1rem;
    font-weight: 600;
    color: ${Colors.black};
  }
  
  .position {
    font-size: 0.8rem;
    font-weight: 600;
    color: ${props => 
      props.position === 'EXCELLENT' ? Colors.excellent :
      props.position === 'STRONG' ? Colors.strong :
      props.position === 'AVERAGE' ? Colors.average :
      props.position === 'WEAK' ? Colors.weak :
      Colors.critical
    };
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const CompetitorScore = styled.div`
  text-align: right;
  
  .score {
    font-size: 1.4rem;
    font-weight: 700;
    color: ${Colors.black};
  }
  
  .gap {
    font-size: 0.8rem;
    color: ${Colors.gray};
  }
`;

const NarrativeBox = styled.div`
  background: ${Colors.background};
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
  
  .narrative {
    font-size: 1rem;
    color: ${Colors.black};
    line-height: 1.6;
    font-style: italic;
  }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  font-size: 1.4rem;
  color: ${Colors.gray};
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 60px 20px;
  
  .error-title {
    font-size: 2rem;
    font-weight: 700;
    color: ${Colors.weak};
    margin-bottom: 16px;
  }
  
  .error-message {
    font-size: 1.2rem;
    color: ${Colors.gray};
    margin-bottom: 24px;
  }
  
  .retry-button {
    background: ${Colors.excellent};
    color: ${Colors.white};
    border: none;
    border-radius: 12px;
    padding: 16px 32px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    
    &:hover {
      background: ${Colors.strong};
    }
  }
`;

const CompetitiveCohorts = () => {
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCohorts: 0,
    totalCompanies: 0,
    systemVersion: '2.0.0'
  });

  const fetchCohorts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('https://llm-pagerank-public-api.onrender.com/api/rankings?limit=100');
      
      if (response.data && response.data.domains) {
        const groupedDomains = groupDomainsByCategory(response.data.domains);
        setCohorts(groupedDomains);
        setStats({
          totalCohorts: groupedDomains.length,
          totalCompanies: response.data.totalDomains || response.data.domains.length,
          systemVersion: '2.1.0'
        });
      } else {
        throw new Error('Failed to fetch domain data');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching cohorts:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const groupDomainsByCategory = (domains) => {
    // Remove duplicates first
    const uniqueDomains = domains.reduce((acc, domain) => {
      if (!acc.find(d => d.domain === domain.domain)) {
        acc.push(domain);
      }
      return acc;
    }, []);

    const categories = {
      'Technology Leaders': {
        name: 'Technology Leaders',
        description: 'Top-performing domains with highest AI memory scores.',
        domains: []
      },
      'Strong Performers': {
        name: 'Strong Performers', 
        description: 'Domains with strong AI recognition and brand recall.',
        domains: []
      },
      'Emerging Brands': {
        name: 'Emerging Brands',
        description: 'Growing domains building AI memory presence.',
        domains: []
      },
      'Developing Markets': {
        name: 'Developing Markets',
        description: 'Domains with potential for AI memory growth.',
        domains: []
      },
      'Niche Players': {
        name: 'Niche Players',
        description: 'Specialized domains in specific market segments.',
        domains: []
      },
      'Global Platforms': {
        name: 'Global Platforms',
        description: 'International domains with broad market reach.',
        domains: []
      },
      'Innovation Hubs': {
        name: 'Innovation Hubs',
        description: 'Cutting-edge domains driving technological advancement.',
        domains: []
      },
      'Market Challengers': {
        name: 'Market Challengers',
        description: 'Competitive domains challenging market leaders.',
        domains: []
      }
    };

    // Categorize domains based on ACTUAL data, not hardcoded keywords
    uniqueDomains.forEach((domain, index) => {
      const score = domain.score || 0;
      const domainLower = domain.domain.toLowerCase();
      
      // Categorize based on score ranges and domain characteristics
      if (score >= 85) {
        categories['Technology Leaders'].domains.push(domain);
      } else if (score >= 75) {
        categories['Strong Performers'].domains.push(domain);
      } else if (score >= 65) {
        categories['Emerging Brands'].domains.push(domain);
      } else if (score >= 55) {
        categories['Developing Markets'].domains.push(domain);
      } else if (domainLower.includes('.org') || domainLower.includes('.edu') || domainLower.includes('.gov')) {
        categories['Niche Players'].domains.push(domain);
      } else if (domainLower.includes('.com.') || domainLower.includes('.co.') || domainLower.includes('.de') || domainLower.includes('.es') || domainLower.includes('.cn')) {
        categories['Global Platforms'].domains.push(domain);
      } else if (index % 3 === 0) {
        categories['Innovation Hubs'].domains.push(domain);
      } else {
        categories['Market Challengers'].domains.push(domain);
      }
    });

    // Convert to the expected format and filter out empty categories
    return Object.entries(categories)
      .filter(([_, category]) => category.domains.length > 0)
      .map(([key, category]) => {
        // Sort domains by score within each category
        const sortedDomains = category.domains.sort((a, b) => b.score - a.score).slice(0, 8);
        
        return {
          name: category.name,
          description: category.description,
          totalDomains: sortedDomains.length,
          averageScore: (sortedDomains.reduce((sum, d) => sum + d.score, 0) / sortedDomains.length).toFixed(1),
          scoreRange: `${Math.min(...sortedDomains.map(d => d.score)).toFixed(1)}-${Math.max(...sortedDomains.map(d => d.score)).toFixed(1)}`,
          topDomains: JSON.stringify(sortedDomains.map((domain, index) => ({
            domain: domain.domain,
            score: domain.score,
            rank: index + 1,
            competitive_position: domain.score >= 80 ? 'EXCELLENT' : 
                                domain.score >= 70 ? 'STRONG' : 
                                domain.score >= 60 ? 'AVERAGE' : 
                                domain.score >= 50 ? 'WEAK' : 'CRITICAL',
            gap_to_leader: sortedDomains[0].score - domain.score
          }))),
          competitiveNarrative: `${category.name} represents ${sortedDomains.length} companies with an average AI memory score of ${(sortedDomains.reduce((sum, d) => sum + d.score, 0) / sortedDomains.length).toFixed(1)}. These domains demonstrate ${category.description.toLowerCase()}`
        };
      });
  };

  useEffect(() => {
    fetchCohorts();
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
            🎯
          </motion.div>
          Loading competitive intelligence cohorts...
        </LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorState>
          <div className="error-title">Cohort Intelligence Unavailable</div>
          <div className="error-message">
            Unable to load competitive cohorts. The system may be initializing or experiencing issues.
          </div>
          <button className="retry-button" onClick={fetchCohorts}>
            Retry Loading
          </button>
        </ErrorState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <span className="highlight">Competitive Intelligence</span> Cohorts
        </Title>
        <Subtitle>
          Ultra-precise competitive groupings powered by AI memory analysis.<br/>
          Scientific benchmarking for strategic decision-making.
        </Subtitle>
        
        <StatsBar>
          <StatCard>
            <div className="value">{stats.totalCohorts}</div>
            <div className="label">Active Cohorts</div>
          </StatCard>
          <StatCard>
            <div className="value">{stats.totalCompanies}</div>
            <div className="label">Companies Analyzed</div>
          </StatCard>
          <StatCard>
            <div className="value">v{stats.systemVersion}</div>
            <div className="label">System Version</div>
          </StatCard>
        </StatsBar>
      </Header>

      <CohortsGrid>
        {cohorts.map((cohort, index) => {
          const members = JSON.parse(cohort.topDomains || '[]');
          
          return (
            <CohortCard
              key={cohort.name}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <CohortHeader>
                <CohortTitle>{cohort.name}</CohortTitle>
                <CohortDescription>{cohort.description}</CohortDescription>
                
                <CohortStats>
                  <CohortStat>
                    <div className="value">{cohort.totalDomains}</div>
                    <div className="label">Companies</div>
                  </CohortStat>
                  <CohortStat>
                    <div className="value">{cohort.averageScore}</div>
                    <div className="label">Avg Score</div>
                  </CohortStat>
                  <CohortStat>
                    <div className="value">{cohort.scoreRange}</div>
                    <div className="label">Score Range</div>
                  </CohortStat>
                </CohortStats>
              </CohortHeader>

              <CompetitorsList>
                {members.slice(0, 5).map((member, memberIndex) => (
                  <CompetitorItem
                    key={member.domain}
                    position={member.competitive_position}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: (index * 0.1) + (memberIndex * 0.05) }}
                    as={Link}
                    to={`/domain/${member.domain}`}
                  >
                    <CompetitorInfo position={member.competitive_position}>
                      <div className="rank">#{member.rank}</div>
                      <div>
                        <div className="domain">{member.domain}</div>
                        <div className="position">{member.competitive_position}</div>
                      </div>
                    </CompetitorInfo>
                    
                    <CompetitorScore>
                      <div className="score">{member.score}</div>
                      <div className="gap">
                        {member.gap_to_leader > 0 ? `-${member.gap_to_leader.toFixed(1)}` : 'Leader'}
                      </div>
                    </CompetitorScore>
                  </CompetitorItem>
                ))}
              </CompetitorsList>

              {cohort.competitiveNarrative && (
                <NarrativeBox>
                  <div className="narrative">{cohort.competitiveNarrative}</div>
                </NarrativeBox>
              )}
            </CohortCard>
          );
        })}
      </CohortsGrid>
    </Container>
  );
};

export default CompetitiveCohorts; 