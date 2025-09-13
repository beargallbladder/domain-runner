import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Colors = {
  forgotten: '#FF3B30',    // Death red
  dying: '#FF9500',        // Warning orange  
  surviving: '#34C759',    // Life green
  thriving: '#007AFF',     // Dominance blue
  background: '#F8F9FA',
  white: '#FFFFFF',
  black: '#1D1D1F',
  gray: '#8E8E93'
};

const Container = styled.div`
  background: ${Colors.white};
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  margin: 40px 0;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const Title = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${Colors.black};
  margin: 0 0 16px;
  
  .highlight {
    background: linear-gradient(135deg, ${Colors.thriving} 0%, ${Colors.surviving} 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: ${Colors.gray};
  margin: 0;
  font-weight: 500;
`;

const StackContainer = styled.div`
  position: relative;
  max-width: 800px;
  margin: 0 auto;
`;

const MemoryAxis = styled.div`
  position: absolute;
  left: -80px;
  top: 0;
  bottom: 0;
  width: 60px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  
  .axis-label {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 1rem;
    font-weight: 600;
    color: ${Colors.gray};
    margin: 20px 0;
  }
  
  .scale-marker {
    font-size: 0.9rem;
    font-weight: 600;
    color: ${Colors.gray};
    text-align: right;
    width: 100%;
  }
`;

const CompetitorCard = styled(motion.div)`
  background: ${props => 
    props.score >= 90 ? `linear-gradient(135deg, ${Colors.thriving}15, ${Colors.thriving}25)` :
    props.score >= 70 ? `linear-gradient(135deg, ${Colors.surviving}15, ${Colors.surviving}25)` :
    props.score >= 50 ? `linear-gradient(135deg, ${Colors.dying}15, ${Colors.dying}25)` :
    `linear-gradient(135deg, ${Colors.forgotten}15, ${Colors.forgotten}25)`
  };
  border: 3px solid ${props => 
    props.score >= 90 ? Colors.thriving :
    props.score >= 70 ? Colors.surviving :
    props.score >= 50 ? Colors.dying :
    Colors.forgotten
  };
  border-radius: 16px;
  padding: 24px;
  margin: 12px 0;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateX(8px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  }
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 6px;
    background: ${props => 
      props.score >= 90 ? Colors.thriving :
      props.score >= 70 ? Colors.surviving :
      props.score >= 50 ? Colors.dying :
      Colors.forgotten
    };
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const RankInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const RankBadge = styled.div`
  background: ${props => 
    props.rank === 1 ? Colors.thriving :
    props.rank === 2 ? Colors.surviving :
    props.rank === 3 ? Colors.dying :
    Colors.forgotten
  };
  color: ${Colors.white};
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
`;

const DomainName = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${Colors.black};
  margin: 0;
  
  .you-indicator {
    color: ${Colors.thriving};
    font-size: 0.9rem;
    font-weight: 600;
    margin-left: 8px;
  }
`;

const ScoreDisplay = styled.div`
  text-align: right;
  
  .score {
    font-size: 2.2rem;
    font-weight: 800;
    color: ${props => 
      props.score >= 90 ? Colors.thriving :
      props.score >= 70 ? Colors.surviving :
      props.score >= 50 ? Colors.dying :
      Colors.forgotten
    };
    line-height: 1;
  }
  
  .status {
    font-size: 0.9rem;
    font-weight: 600;
    color: ${props => 
      props.score >= 90 ? Colors.thriving :
      props.score >= 70 ? Colors.surviving :
      props.score >= 50 ? Colors.dying :
      Colors.forgotten
    };
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 4px;
  }
`;

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
`;

const Metric = styled.div`
  text-align: center;
  
  .value {
    font-size: 1.1rem;
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

const StatusLegend = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 40px;
  padding: 24px;
  background: ${Colors.background};
  border-radius: 16px;
`;

const LegendItem = styled.div`
  text-align: center;
  
  .color-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${props => props.color};
    margin: 0 auto 8px;
  }
  
  .status-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: ${Colors.black};
    margin-bottom: 4px;
  }
  
  .score-range {
    font-size: 0.8rem;
    color: ${Colors.gray};
  }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.2rem;
  color: ${Colors.gray};
`;

const CompetitorStackRanking = ({ domain, category = null, limit = 5 }) => {
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDomainRank, setCurrentDomainRank] = useState(null);

  useEffect(() => {
    const fetchCompetitors = async () => {
      try {
        // 🎯 PRIORITY: Try new cohort intelligence API first
        try {
          const cohortResponse = await axios.get(`https://sophisticated-runner.onrender.com/api/cohorts/competitive`);
          const cohortData = cohortResponse.data;
          
          if (cohortData.success && cohortData.categories) {
            // Find the cohort that contains our domain
            let targetCohort = null;
            let domainCohortMembers = [];
            
            for (const cohortCategory of cohortData.categories) {
              const cohortMembers = JSON.parse(cohortCategory.topDomains || '[]');
              const domainInCohort = cohortMembers.find(member => member.domain === domain);
              
              if (domainInCohort) {
                targetCohort = cohortCategory;
                domainCohortMembers = cohortMembers;
                break;
              }
            }
            
            // If domain found in a cohort, use that cohort's data
            if (targetCohort && domainCohortMembers.length > 0) {
              const competitorList = domainCohortMembers
                .sort((a, b) => b.score - a.score)
                .slice(0, limit)
                .map(member => ({
                  domain: member.domain,
                  score: member.score,
                  modelsPositive: member.modelsPositive,
                  modelsNeutral: member.modelsNeutral,
                  modelsNegative: member.modelsNegative,
                  competitive_position: member.competitive_position,
                  gap_to_leader: member.gap_to_leader
                }));
              
              setCompetitors(competitorList);
              setCurrentDomainRank(competitorList.findIndex(c => c.domain === domain) + 1);
              setLoading(false);
              console.log(`🎯 Using cohort data from: ${targetCohort.name}`);
              return;
            }
            
            // If no specific cohort found but category specified, try to match by category name
            if (category) {
              const matchingCohort = cohortData.categories.find(cat => 
                cat.name.toLowerCase().includes(category.toLowerCase())
              );
              
              if (matchingCohort) {
                const cohortMembers = JSON.parse(matchingCohort.topDomains || '[]');
                const competitorList = cohortMembers
                  .sort((a, b) => b.score - a.score)
                  .slice(0, limit)
                  .map(member => ({
                    domain: member.domain,
                    score: member.score,
                    modelsPositive: member.modelsPositive,
                    modelsNeutral: member.modelsNeutral,
                    modelsNegative: member.modelsNegative,
                    competitive_position: member.competitive_position,
                    gap_to_leader: member.gap_to_leader
                  }));
                
                setCompetitors(competitorList);
                setCurrentDomainRank(competitorList.findIndex(c => c.domain === domain) + 1);
                setLoading(false);
                console.log(`🎯 Using category cohort: ${matchingCohort.name}`);
                return;
              }
            }
          }
        } catch (cohortError) {
          console.log('Cohort API not available, falling back to legacy API:', cohortError.message);
        }

        // FALLBACK: Legacy category-based approach
        if (category) {
          const categoryResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'https://llmrank.io'}/api/categories`);
          const categories = categoryResponse.data.categories || [];
          
          const targetCategory = categories.find(cat => 
            cat.name.toLowerCase().includes(category.toLowerCase()) ||
            cat.topDomains?.some(d => d.domain === domain)
          );
          
          if (targetCategory && targetCategory.topDomains) {
            const categoryCompetitors = targetCategory.topDomains
              .sort((a, b) => b.score - a.score)
              .slice(0, limit);
            
            setCompetitors(categoryCompetitors);
            setCurrentDomainRank(categoryCompetitors.findIndex(c => c.domain === domain) + 1);
            setLoading(false);
            return;
          }
        }
        
        // FINAL FALLBACK: Get top domains from rankings
                  const rankingsResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'https://llmrank.io'}/api/rankings?limit=${limit * 2}`);
        const allDomains = rankingsResponse.data.domains || [];
        
        // Include the target domain if not in top results
        let competitorList = allDomains.slice(0, limit);
        const domainInList = competitorList.find(d => d.domain === domain);
        
        if (!domainInList) {
          // Try to get the specific domain data
          try {
            const domainResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'https://llmrank.io'}/api/domains/${domain}/public`);
            const domainData = domainResponse.data;
            
            competitorList.push({
              domain: domainData.domain,
              score: Math.round(domainData.ai_intelligence.memory_score),
              modelsPositive: Math.floor(domainData.ai_intelligence.models_tracking * 0.7),
              modelsNeutral: Math.floor(domainData.ai_intelligence.models_tracking * 0.2),
              modelsNegative: Math.floor(domainData.ai_intelligence.models_tracking * 0.1)
            });
          } catch (error) {
            console.log('Could not fetch specific domain data');
          }
        }
        
        // Sort by score and limit
        competitorList = competitorList
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
        
        setCompetitors(competitorList);
        setCurrentDomainRank(competitorList.findIndex(c => c.domain === domain) + 1);
        setLoading(false);
        
      } catch (error) {
        console.error('Error fetching competitors:', error);
        setLoading(false);
      }
    };

    fetchCompetitors();
  }, [domain, category, limit]);

  const getStatusText = (score) => {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 70) return 'STRONG';
    if (score >= 50) return 'MODERATE';
    return 'WEAK';
  };

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
          Loading competitive intelligence...
        </LoadingState>
      </Container>
    );
  }

  if (competitors.length === 0) {
    return (
      <Container>
        <Header>
          <Title>No competitive data available</Title>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <span className="highlight">Competitive AI Memory</span> Analysis
        </Title>
        <Subtitle>
          {category ? `${category} Industry` : 'Competitive'} Benchmarking - Objective Performance Rankings
        </Subtitle>
      </Header>

      <StackContainer>
        <MemoryAxis>
          <div className="axis-label">AI MEMORY STRENGTH</div>
          <div className="scale-marker">100</div>
          <div className="scale-marker">75</div>
          <div className="scale-marker">50</div>
          <div className="scale-marker">25</div>
          <div className="scale-marker">0</div>
        </MemoryAxis>

        {competitors.map((competitor, index) => (
          <CompetitorCard
            key={competitor.domain}
            score={competitor.score}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            as={Link}
            to={`/domain/${competitor.domain}`}
          >
            <CardHeader>
              <RankInfo>
                <RankBadge rank={index + 1}>
                  #{index + 1}
                </RankBadge>
                <DomainName>
                  {competitor.domain}
                  {competitor.domain === domain && (
                    <span className="you-indicator">(YOU)</span>
                  )}
                </DomainName>
              </RankInfo>
              
              <ScoreDisplay score={competitor.score}>
                <div className="score">{competitor.score}</div>
                <div className="status">{getStatusText(competitor.score)}</div>
              </ScoreDisplay>
            </CardHeader>

            <MetricsRow>
              <Metric>
                <div className="value">{competitor.modelsPositive || 0}</div>
                <div className="label">Remember</div>
              </Metric>
              <Metric>
                <div className="value">{competitor.modelsNeutral || 0}</div>
                <div className="label">Neutral</div>
              </Metric>
              <Metric>
                <div className="value">{competitor.modelsNegative || 0}</div>
                <div className="label">Forget</div>
              </Metric>
            </MetricsRow>
          </CompetitorCard>
        ))}
      </StackContainer>

      <StatusLegend>
        <LegendItem color={Colors.thriving}>
          <div className="color-dot" />
          <div className="status-name">EXCELLENT</div>
          <div className="score-range">90-100</div>
        </LegendItem>
        <LegendItem color={Colors.surviving}>
          <div className="color-dot" />
          <div className="status-name">STRONG</div>
          <div className="score-range">70-89</div>
        </LegendItem>
        <LegendItem color={Colors.dying}>
          <div className="color-dot" />
          <div className="status-name">MODERATE</div>
          <div className="score-range">50-69</div>
        </LegendItem>
        <LegendItem color={Colors.forgotten}>
          <div className="color-dot" />
          <div className="status-name">WEAK</div>
          <div className="score-range">0-49</div>
        </LegendItem>
      </StatusLegend>
    </Container>
  );
};

export default CompetitorStackRanking; 