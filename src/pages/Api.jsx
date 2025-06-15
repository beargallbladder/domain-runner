import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const Container = styled.div`
  min-height: 100vh;
  background: #000000;
  color: #ffffff;
  padding: 80px 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const HeroSection = styled.section`
  text-align: center;
  margin-bottom: 80px;
`;

const Title = styled(motion.h1)`
  font-size: 3rem;
  font-weight: 300;
  margin-bottom: 24px;
  letter-spacing: -1px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
`;

const Subtitle = styled(motion.p)`
  font-size: 1.3rem;
  color: #cccccc;
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.6;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 40px;
  margin: 80px 0;
`;

const StatCard = styled.div`
  background: #1a1a1a;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  border: 1px solid #333;
  
  .number {
    font-size: 2.5rem;
    font-weight: 700;
    color: #00ff41;
    margin-bottom: 8px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }
  
  .label {
    font-size: 0.9rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

const EndpointsSection = styled.section`
  margin: 80px 0;
`;

const SectionTitle = styled.h2`
  font-size: 2.2rem;
  margin-bottom: 40px;
  text-align: center;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
`;

const EndpointCard = styled.div`
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 24px;
  
  .method {
    display: inline-block;
    background: #007AFF;
    color: white;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 12px;
  }
  
  .endpoint {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 1.1rem;
    color: #00ff41;
    margin-bottom: 12px;
  }
  
  .description {
    color: #ccc;
    line-height: 1.6;
  }
`;

const Api = () => {
  return (
    <Container>
      <HeroSection>
        <Title
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          AI MEMORY INTELLIGENCE API
        </Title>
        <Subtitle
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Programmatic access to brand memory data across 21 AI models. 
          The infrastructure for memory-driven applications and competitive intelligence.
        </Subtitle>
      </HeroSection>

      <StatsGrid>
        <StatCard>
          <div className="number">50K+</div>
          <div className="label">API Responses</div>
        </StatCard>
        <StatCard>
          <div className="number">1,700+</div>
          <div className="label">Domains</div>
        </StatCard>
        <StatCard>
          <div className="number">21</div>
          <div className="label">AI Models</div>
        </StatCard>
        <StatCard>
          <div className="number">&lt;1s</div>
          <div className="label">Latency</div>
        </StatCard>
      </StatsGrid>

      <EndpointsSection>
        <SectionTitle>API ENDPOINTS</SectionTitle>
        
        <EndpointCard>
          <div className="method">GET</div>
          <div className="endpoint">/api/rankings</div>
          <div className="description">
            Complete brand memory rankings with filtering, sorting, and pagination. 
            Access real-time memory scores across all AI models.
          </div>
        </EndpointCard>

        <EndpointCard>
          <div className="method">GET</div>
          <div className="endpoint">/api/domain/{`{domain}`}</div>
          <div className="description">
            Detailed analysis for specific domains including memory decay trends, 
            model consensus, and competitive positioning.
          </div>
        </EndpointCard>

        <EndpointCard>
          <div className="method">GET</div>
          <div className="endpoint">/api/competitive</div>
          <div className="description">
            Head-to-head brand comparisons, competitive gaps, and market positioning data. 
            Perfect for competitive intelligence applications.
          </div>
        </EndpointCard>

        <EndpointCard>
          <div className="method">GET</div>
          <div className="endpoint">/api/analytics</div>
          <div className="description">
            Memory drift tracking, consensus measurement, and trend analysis. 
            Historical data for longitudinal brand memory studies.
          </div>
        </EndpointCard>
      </EndpointsSection>
    </Container>
  );
};

export default Api; 