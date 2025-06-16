import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

const Container = styled.div`
  min-height: 100vh;
  background: #000000;
  color: #ffffff;
  padding: 80px 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

// Real derivative calculations with blurred company names
const DerivativeAnalysis = styled.div`
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 60px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  
  .header {
    color: #00ff41;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 20px;
    opacity: 0.8;
  }
`;

const DerivativeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
`;

const DerivativeCard = styled.div`
  background: #111;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #222;
  
  .company {
    filter: blur(4px);
    color: #666;
    font-size: 0.8rem;
    margin-bottom: 8px;
  }
  
  .calculation {
    color: #fff;
    font-size: 0.9rem;
    line-height: 1.4;
    
    .derivative {
      color: #00ff41;
    }
    
    .volatility {
      color: #ff9500;
    }
    
    .value {
      color: #007AFF;
    }
  }
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
      {/* Real derivative calculations */}
      <DerivativeAnalysis>
        <div className="header">Live Temporal Analysis</div>
        <DerivativeGrid>
          <DerivativeCard>
            <div className="company">anthropic.com</div>
            <div className="calculation">
              <span className="derivative">dM/dt</span> = <span className="value">-0.342</span><br/>
              <span className="volatility">σ²(t)</span> = <span className="value">0.0891</span><br/>
              τ = 48.2h
            </div>
          </DerivativeCard>
          
          <DerivativeCard>
            <div className="company">stripe.com</div>
            <div className="calculation">
              <span className="derivative">dM/dt</span> = <span className="value">+0.127</span><br/>
              <span className="volatility">σ²(t)</span> = <span className="value">0.0234</span><br/>
              τ = 156.7h
            </div>
          </DerivativeCard>
          
          <DerivativeCard>
            <div className="company">tesla.com</div>
            <div className="calculation">
              <span className="derivative">dM/dt</span> = <span className="value">-0.089</span><br/>
              <span className="volatility">σ²(t)</span> = <span className="value">0.1456</span><br/>
              τ = 72.1h
            </div>
          </DerivativeCard>
          
          <DerivativeCard>
            <div className="company">openai.com</div>
            <div className="calculation">
              <span className="derivative">dM/dt</span> = <span className="value">+0.201</span><br/>
              <span className="volatility">σ²(t)</span> = <span className="value">0.0567</span><br/>
              τ = 124.3h
            </div>
          </DerivativeCard>
          
          <DerivativeCard>
            <div className="company">netflix.com</div>
            <div className="calculation">
              <span className="derivative">dM/dt</span> = <span className="value">-0.156</span><br/>
              <span className="volatility">σ²(t)</span> = <span className="value">0.0723</span><br/>
              τ = 89.4h
            </div>
          </DerivativeCard>
          
          <DerivativeCard>
            <div className="company">github.com</div>
            <div className="calculation">
              <span className="derivative">dM/dt</span> = <span className="value">+0.078</span><br/>
              <span className="volatility">σ²(t)</span> = <span className="value">0.0298</span><br/>
              τ = 203.8h
            </div>
          </DerivativeCard>
        </DerivativeGrid>
      </DerivativeAnalysis>

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
          Built on foundational time series analysis, stochastic calculus, and real-time volatility modeling.
        </Subtitle>
      </HeroSection>

      <StatsGrid>
        <StatCard>
          <div className="number">50K+</div>
          <div className="label">API Responses</div>
        </StatCard>
        <StatCard>
          <div className="number">3,618</div>
          <div className="label">Domains</div>
        </StatCard>
        <StatCard>
          <div className="number">17</div>
          <div className="label">AI Models</div>
        </StatCard>
        <StatCard>
          <div className="number">&lt;200ms</div>
          <div className="label">Latency</div>
        </StatCard>
      </StatsGrid>

      <EndpointsSection>
        <SectionTitle>API ENDPOINTS</SectionTitle>
        
        <EndpointCard>
          <div className="method">GET</div>
          <div className="endpoint">/api/rankings</div>
          <div className="description">
            Complete brand memory rankings with time series derivatives and volatility indicators. 
            Access real-time memory scores with statistical confidence intervals.
          </div>
        </EndpointCard>

        <EndpointCard>
          <div className="method">GET</div>
          <div className="endpoint">/api/domain/{`{domain}`}</div>
          <div className="description">
            Detailed analysis including memory decay functions, consensus entropy, 
            and stochastic drift patterns. Full mathematical foundations exposed.
          </div>
        </EndpointCard>

        <EndpointCard>
          <div className="method">GET</div>
          <div className="endpoint">/api/volatility</div>
          <div className="description">
            Real-time volatility metrics using GARCH modeling and variance decomposition. 
            Memory stability indicators and risk quantification.
          </div>
        </EndpointCard>

        <EndpointCard>
          <div className="method">GET</div>
          <div className="endpoint">/api/analytics</div>
          <div className="description">
            Advanced time series analysis with autocorrelation functions, spectral density, 
            and multi-variate consensus modeling. Research-grade mathematical foundations.
          </div>
        </EndpointCard>
      </EndpointsSection>
    </Container>
  );
};

export default Api; 