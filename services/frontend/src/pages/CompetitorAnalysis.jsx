import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import CompetitorStackRanking from '../components/CompetitorStackRanking';

const Colors = {
  primary: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  neutral: '#8E8E93',
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
    background: linear-gradient(135deg, ${Colors.primary} 0%, ${Colors.success} 100%);
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

const AnalysisGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 32px;
  max-width: 1400px;
  margin: 0 auto;
`;

const AnalysisCard = styled(motion.div)`
  background: ${Colors.white};
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
  
  &:hover {
    border-color: ${Colors.primary};
    transform: translateY(-4px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  }
`;

const AnalysisHeader = styled.div`
  margin-bottom: 24px;
  text-align: center;
`;

const AnalysisTitle = styled.h2`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${Colors.black};
  margin: 0 0 8px;
`;

const AnalysisDescription = styled.p`
  font-size: 1rem;
  color: ${Colors.gray};
  margin: 0 0 24px;
  line-height: 1.5;
`;

const CompetitorComparison = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const CompetitorInfo = styled.div`
  text-align: center;
  flex: 1;
  
  .domain {
    font-size: 1.2rem;
    font-weight: 600;
    color: ${Colors.black};
    margin-bottom: 8px;
  }
  
  .score {
    font-size: 2rem;
    font-weight: 800;
    color: ${props => 
      props.score >= 80 ? Colors.success :
      props.score >= 70 ? Colors.primary :
      props.score >= 60 ? Colors.warning :
      Colors.danger
    };
    margin-bottom: 4px;
  }
  
  .position {
    font-size: 0.9rem;
    color: ${Colors.gray};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const VersusIndicator = styled.div`
  background: ${Colors.primary};
  color: ${Colors.white};
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  margin: 0 20px;
`;

const AnalysisMetrics = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
`;

const MetricCard = styled.div`
  background: ${Colors.background};
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  
  .value {
    font-size: 1.4rem;
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

const InsightBox = styled.div`
  background: ${Colors.background};
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
  
  .insight {
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

const CompetitorAnalysis = () => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCompetitiveAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('https://llm-pagerank-public-api.onrender.com/api/rankings?limit=20');
      
      if (response.data && response.data.domains) {
        const domains = response.data.domains;
        const competitiveAnalyses = generateCompetitiveAnalyses(domains);
        setAnalyses(competitiveAnalyses);
      } else {
        throw new Error('Failed to fetch competitive data');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching competitive analyses:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const generateCompetitiveAnalyses = (domains) => {
    const analyses = [];
    
    // Create head-to-head competitive analyses
    const competitivePairs = [
      { category: 'Enterprise Productivity', domains: ['monday.com', 'airtable.com'] },
      { category: 'Payment Processing', domains: ['stripe.com', 'paypal.com'] },
      { category: 'Cloud Infrastructure', domains: ['aws.amazon.com', 'azure.microsoft.com'] },
      { category: 'AI Platforms', domains: ['openai.com', 'anthropic.com'] }
    ];

    competitivePairs.forEach(pair => {
      const domain1 = domains.find(d => d.domain === pair.domains[0]);
      const domain2 = domains.find(d => d.domain === pair.domains[1]);
      
      if (domain1 && domain2) {
        const scoreDiff = Math.abs(domain1.score - domain2.score);
        const leader = domain1.score > domain2.score ? domain1 : domain2;
        const challenger = domain1.score > domain2.score ? domain2 : domain1;
        
        analyses.push({
          category: pair.category,
          leader,
          challenger,
          scoreDifference: scoreDiff,
          marketGap: scoreDiff,
          competitiveAdvantage: scoreDiff > 10 ? 'Significant' : scoreDiff > 5 ? 'Moderate' : 'Minimal',
          insight: `In the ${pair.category} sector, ${leader.domain} maintains a ${scoreDiff.toFixed(1)}-point AI memory advantage over ${challenger.domain}. This represents ${scoreDiff > 10 ? 'dominant market positioning' : scoreDiff > 5 ? 'competitive leadership' : 'tight market competition'} in AI model recognition and brand recall.`
        });
      }
    });

    return analyses;
  };

  useEffect(() => {
    fetchCompetitiveAnalyses();
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
            📊
          </motion.div>
          Loading competitive intelligence analysis...
        </LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <span className="highlight">Competitive Intelligence</span> Analysis
        </Title>
        <Subtitle>
          Head-to-head competitive analysis powered by AI memory benchmarking.<br/>
          Strategic insights for market positioning and competitive advantage.
        </Subtitle>
      </Header>

      <AnalysisGrid>
        {analyses.map((analysis, index) => (
          <AnalysisCard
            key={`${analysis.leader.domain}-${analysis.challenger.domain}`}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <AnalysisHeader>
              <AnalysisTitle>{analysis.category} Leadership</AnalysisTitle>
              <AnalysisDescription>
                Competitive positioning analysis in {analysis.category.toLowerCase()}
              </AnalysisDescription>
            </AnalysisHeader>

            <CompetitorComparison>
              <CompetitorInfo score={analysis.leader.score}>
                <div className="domain">{analysis.leader.domain}</div>
                <div className="score">{analysis.leader.score}</div>
                <div className="position">Market Leader</div>
              </CompetitorInfo>
              
              <VersusIndicator>VS</VersusIndicator>
              
              <CompetitorInfo score={analysis.challenger.score}>
                <div className="domain">{analysis.challenger.domain}</div>
                <div className="score">{analysis.challenger.score}</div>
                <div className="position">Challenger</div>
              </CompetitorInfo>
            </CompetitorComparison>

            <AnalysisMetrics>
              <MetricCard>
                <div className="value">{analysis.scoreDifference.toFixed(1)}</div>
                <div className="label">Score Gap</div>
              </MetricCard>
              <MetricCard>
                <div className="value">{analysis.competitiveAdvantage}</div>
                <div className="label">Advantage</div>
              </MetricCard>
            </AnalysisMetrics>

            <InsightBox>
              <div className="insight">{analysis.insight}</div>
            </InsightBox>
          </AnalysisCard>
        ))}
      </AnalysisGrid>
    </Container>
  );
};

export default CompetitorAnalysis; 