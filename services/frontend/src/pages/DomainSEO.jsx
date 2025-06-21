import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import axios from 'axios';
import SEOHead from '../components/SEOHead';

const Container = styled.div`
  min-height: 100vh;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
`;

const HeroSection = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 80px 40px;
  text-align: center;
`;

const DomainTitle = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 20px;
  letter-spacing: -2px;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const ScoreDisplay = styled(motion.div)`
  font-size: 5rem;
  font-weight: 800;
  color: ${props => 
    props.score >= 90 ? '#30d158' :
    props.score >= 70 ? '#ff9500' :
    '#ff3b30'
  };
  margin: 20px 0;
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
`;

const ScoreLabel = styled.div`
  font-size: 1.5rem;
  opacity: 0.9;
  margin-bottom: 30px;
`;

const QuickStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 30px;
  max-width: 800px;
  margin: 0 auto;
`;

const StatItem = styled.div`
  .value {
    font-size: 2rem;
    font-weight: 700;
    color: white;
  }
  .label {
    font-size: 1rem;
    opacity: 0.8;
  }
`;

const ContentSection = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 40px;
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 600;
  margin-bottom: 40px;
  text-align: center;
  color: #1d1d1f;
`;

const CrisisAnalysis = styled.div`
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 60px;
  border: ${props => 
    props.score > 80 ? '3px solid #30d158' :
    props.score > 60 ? '3px solid #ff9500' :
    '3px solid #ff3b30'
  };
`;

const CrisisGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
  margin-top: 30px;
`;

const CrisisCard = styled.div`
  background: white;
  padding: 30px;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  
  .crisis-name {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 15px;
    color: #666;
  }
  
  .baseline-score {
    font-size: 2rem;
    font-weight: 700;
    color: #ff3b30;
    margin-bottom: 10px;
  }
  
  .buffer {
    font-size: 1.3rem;
    font-weight: 600;
    color: ${props => props.buffer > 0 ? '#30d158' : '#ff3b30'};
  }
`;

const CompetitiveSection = styled.div`
  background: #f8f9fa;
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 60px;
`;

const CompetitorList = styled.div`
  display: grid;
  gap: 20px;
  margin-top: 30px;
`;

const CompetitorItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 20px 30px;
  border-radius: 15px;
  border-left: ${props => props.isCurrentDomain ? '5px solid #007AFF' : '5px solid transparent'};
  
  .rank {
    font-size: 1.5rem;
    font-weight: 700;
    color: ${props => 
      props.rank === 1 ? '#ffd700' :
      props.rank === 2 ? '#c0c0c0' :
      props.rank === 3 ? '#cd7f32' :
      '#666'
    };
  }
  
  .domain-name {
    font-size: 1.2rem;
    font-weight: 600;
    color: ${props => props.isCurrentDomain ? '#007AFF' : '#1d1d1f'};
  }
  
  .score {
    font-size: 1.5rem;
    font-weight: 700;
    color: ${props => 
      props.score >= 90 ? '#30d158' :
      props.score >= 70 ? '#ff9500' :
      '#ff3b30'
    };
  }
`;

const ActionSection = styled.div`
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  border-radius: 20px;
  padding: 50px;
  text-align: center;
  color: white;
  
  h3 {
    font-size: 2rem;
    margin-bottom: 20px;
  }
  
  p {
    font-size: 1.2rem;
    margin-bottom: 30px;
    opacity: 0.9;
  }
`;

const CTAButton = styled(Link)`
  display: inline-block;
  background: white;
  color: #007AFF;
  padding: 15px 30px;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.1rem;
  margin: 0 10px;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const DomainSEO = () => {
  const { domainName, pageType = 'analyze' } = useParams();
  const [domainData, setDomainData] = useState(null);
  const [competitorData, setCompetitorData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDomainData = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'https://llmrank.io'}/api/domains/${domainName}/public`);
        const realData = response.data;
        
        const processedData = {
          domain: realData.domain,
          memoryScore: Math.round(realData.ai_intelligence.memory_score),
          consensusPercent: Math.round(realData.ai_intelligence.ai_consensus),
          category: realData.business_focus || 'Technology',
          modelsTracking: realData.ai_intelligence.models_tracking,
          trendDirection: realData.ai_intelligence.trend_direction,
          crisisBuffers: {
            facebook: realData.ai_intelligence.memory_score - 52.0,
            twitter: realData.ai_intelligence.memory_score - 45.0,
            theranos: realData.ai_intelligence.memory_score - 25.0
          }
        };

        // Fetch competitor data
        const categoriesResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'https://llmrank.io'}/api/categories`);
        const categories = categoriesResponse.data.categories || [];
        
        let competitors = [];
        for (const category of categories) {
          if (category.topDomains && typeof category.topDomains === 'string') {
            const domains = JSON.parse(category.topDomains);
            if (domains.some(d => d.domain === domainName)) {
              competitors = [...domains, { domain: domainName, score: processedData.memoryScore }]
                .sort((a, b) => b.score - a.score);
              break;
            }
          }
        }

        setDomainData(processedData);
        setCompetitorData(competitors);
        
      } catch (error) {
        console.error('Error fetching domain data:', error);
        setDomainData({ domain: domainName, notFound: true });
      } finally {
        setLoading(false);
      }
    };

    fetchDomainData();
  }, [domainName]);

  if (loading) {
    return (
      <Container>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Loading {domainName} analysis...</div>
        </div>
      </Container>
    );
  }

  if (domainData?.notFound) {
    return (
      <Container>
        <SEOHead 
          domain={domainName}
          score={0}
          rank="Not Found"
          totalDomains={477}
          crisisBuffer={0}
          category="Unknown"
          pageType={pageType}
        />
        <HeroSection>
          <DomainTitle>{domainName}</DomainTitle>
          <div style={{ fontSize: '1.5rem' }}>Not found in our dataset of 477 monitored domains</div>
        </HeroSection>
      </Container>
    );
  }

  const currentRank = competitorData.findIndex(c => c.domain === domainName) + 1;

  return (
    <Container>
      <SEOHead 
        domain={domainData.domain}
        score={domainData.memoryScore}
        rank={currentRank}
        totalDomains={477}
        crisisBuffer={domainData.crisisBuffers.facebook}
        category={domainData.category}
        competitors={competitorData}
        pageType={pageType}
      />

      <HeroSection>
        <DomainTitle
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {domainData.domain}
        </DomainTitle>
        
        <ScoreDisplay
          score={domainData.memoryScore}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {domainData.memoryScore}
        </ScoreDisplay>
        
        <ScoreLabel>AI Memory Score</ScoreLabel>
        
        <QuickStats>
          <StatItem>
            <div className="value">#{currentRank}</div>
            <div className="label">Industry Rank</div>
          </StatItem>
          <StatItem>
            <div className="value">{domainData.consensusPercent}%</div>
            <div className="label">AI Consensus</div>
          </StatItem>
          <StatItem>
            <div className="value">{domainData.modelsTracking}</div>
            <div className="label">Models Tracking</div>
          </StatItem>
          <StatItem>
            <div className="value">{domainData.crisisBuffers.facebook > 0 ? '+' : ''}{domainData.crisisBuffers.facebook.toFixed(1)}</div>
            <div className="label">Crisis Buffer</div>
          </StatItem>
        </QuickStats>
      </HeroSection>

      <ContentSection>
        <SectionTitle>Crisis Resilience Analysis</SectionTitle>
        <CrisisAnalysis score={domainData.memoryScore}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
              {domainData.crisisBuffers.facebook > 30 ? '🛡️ Strong Crisis Protection' :
               domainData.crisisBuffers.facebook > 10 ? '⚠️ Moderate Risk Level' :
               '🚨 High Vulnerability Zone'}
            </h3>
            <p style={{ color: '#666', fontSize: '1.1rem' }}>
              How {domainData.domain} would perform against historical brand crises
            </p>
          </div>
          
          <CrisisGrid>
            <CrisisCard buffer={domainData.crisisBuffers.facebook}>
              <div className="crisis-name">Facebook Crisis</div>
              <div className="baseline-score">52.0</div>
              <div className="buffer">
                {domainData.crisisBuffers.facebook > 0 ? '+' : ''}{domainData.crisisBuffers.facebook.toFixed(1)} buffer
              </div>
            </CrisisCard>
            
            <CrisisCard buffer={domainData.crisisBuffers.twitter}>
              <div className="crisis-name">Twitter Transition</div>
              <div className="baseline-score">45.0</div>
              <div className="buffer">
                {domainData.crisisBuffers.twitter > 0 ? '+' : ''}{domainData.crisisBuffers.twitter.toFixed(1)} buffer
              </div>
            </CrisisCard>
            
            <CrisisCard buffer={domainData.crisisBuffers.theranos}>
              <div className="crisis-name">Theranos Collapse</div>
              <div className="baseline-score">25.0</div>
              <div className="buffer">
                {domainData.crisisBuffers.theranos > 0 ? '+' : ''}{domainData.crisisBuffers.theranos.toFixed(1)} buffer
              </div>
            </CrisisCard>
          </CrisisGrid>
        </CrisisAnalysis>

        {competitorData.length > 0 && (
          <CompetitiveSection>
            <SectionTitle>Competitive Positioning</SectionTitle>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
                {domainData.category} Industry Rankings
              </h3>
              <p style={{ color: '#666', fontSize: '1.1rem' }}>
                Crisis resilience vs {competitorData.length - 1} competitors
              </p>
            </div>
            
            <CompetitorList>
              {competitorData.map((competitor, index) => (
                <CompetitorItem
                  key={competitor.domain}
                  rank={index + 1}
                  score={competitor.score}
                  isCurrentDomain={competitor.domain === domainName}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div className="rank">#{index + 1}</div>
                    <div className="domain-name">
                      {competitor.domain}
                      {competitor.domain === domainName && ' (YOU)'}
                    </div>
                  </div>
                  <div className="score">{competitor.score}</div>
                </CompetitorItem>
              ))}
            </CompetitorList>
          </CompetitiveSection>
        )}

        <ActionSection>
          <h3>Ready to Track Your Brand's AI Memory?</h3>
          <p>
            Monitor your competitive position and crisis resilience in real-time
          </p>
          <CTAButton to={`/domain/${domainName}`}>View Full Analysis</CTAButton>
          <CTAButton to="/rankings">Compare All Brands</CTAButton>
        </ActionSection>
      </ContentSection>
    </Container>
  );
};

export default DomainSEO; 