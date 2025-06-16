import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

const scroll = keyframes`
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
`;

const Container = styled.div`
  min-height: 100vh;
  background: #000000;
  color: #ffffff;
  padding: 80px 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

// Mathematical Ticker for API sophistication
const MathTicker = styled.div`
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 12px 0;
  margin-bottom: 60px;
  overflow: hidden;
  position: relative;
  
  &::before {
    content: '⚡ FOUNDATIONAL TIME SERIES ANALYSIS';
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.7rem;
    color: #00ff41;
    font-weight: 600;
    letter-spacing: 1px;
    z-index: 2;
  }
`;

const ScrollingMath = styled.div`
  white-space: nowrap;
  animation: ${scroll} 45s linear infinite;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  padding-left: 300px;
  
  .formula {
    margin-right: 80px;
    display: inline-block;
  }
  
  .derivative {
    color: #00ff41;
  }
  
  .integral {
    color: #007AFF;
  }
  
  .volatility {
    color: #ff9500;
  }
  
  .consensus {
    color: #af52de;
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
      {/* Mathematical Sophistication Ticker */}
      <MathTicker>
        <ScrollingMath>
          <span className="formula derivative">∂M/∂t = -λM(t) + η(t)</span>
          <span className="formula volatility">σ²(t) = E[(R(t) - μ)²]</span>
          <span className="formula integral">V(T) = ∫₀ᵀ σ(s)²ds</span>
          <span className="formula consensus">C = Σᵢwᵢlog(pᵢ/(1-pᵢ))</span>
          <span className="formula derivative">dS/dt = μS + σSdW</span>
          <span className="formula volatility">GARCH(1,1): σₜ² = ω + αεₜ₋₁² + βσₜ₋₁²</span>
          <span className="formula integral">γ(τ) = E[X(t)X(t+τ)]</span>
          <span className="formula consensus">H = -Σp(x)log₂p(x)</span>
          <span className="formula derivative">∇·F = ∂Fₓ/∂x + ∂Fᵧ/∂y + ∂Fᵤ/∂z</span>
          <span className="formula volatility">VaR₀.₀₅ = μ - 1.645σ</span>
          <span className="formula integral">∫∫∫ρ(r,θ,φ)dV</span>
          <span className="formula consensus">χ² = Σ(Oᵢ - Eᵢ)²/Eᵢ</span>
        </ScrollingMath>
      </MathTicker>

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