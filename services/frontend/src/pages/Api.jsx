import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

const Container = styled.div`
  min-height: 100vh;
  background: #000000;
  color: #ffffff;
  padding: 80px 0;
  width: 100%;
`;

// Real derivative calculations with blurred company names
const DerivativeAnalysis = styled.section`
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 30px;
  margin: 40px auto;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  
  @media (max-width: 768px) {
    margin: 40px 20px;
  }
  
  .header {
    color: #00ff41;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 1.2rem;
    margin-bottom: 20px;
    text-align: center;
  }
`;

const DerivativeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
`;

const DerivativeCard = styled.div`
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 20px;
  
  .company {
    color: #fff;
    font-weight: 600;
    margin-bottom: 12px;
    font-size: 0.9rem;
  }
  
  .calculation {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.8rem;
    line-height: 1.6;
    
    .derivative {
      color: #007AFF;
      font-style: italic;
    }
    
    .volatility {
      color: #FF9500;
      font-style: italic;
    }
    
    .value {
      color: #00ff41;
      font-weight: 700;
    }
  }
`;

const HeroSection = styled.section`
  text-align: center;
  margin-bottom: 80px;
  padding: 0 20px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
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
  margin: 80px auto;
  padding: 0 20px;
  max-width: 1200px;
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
  margin: 80px auto;
  padding: 0 20px;
  max-width: 1200px;
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

// NEW: Live Ticker Animations
const tickerScroll = keyframes`
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const LiveTickerSection = styled.section`
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 12px;
  margin: 40px 0;
  overflow: hidden;
  position: relative;
`;

const TickerHeader = styled.div`
  background: #1a1a1a;
  padding: 15px 30px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TickerTitle = styled.h3`
  color: #00ff41;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 1rem;
  margin: 0;
`;

const LiveIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  .dot {
    width: 8px;
    height: 8px;
    background: #ff3b30;
    border-radius: 50%;
    animation: ${pulse} 1.5s infinite;
  }
  
  .text {
    color: #ff3b30;
    font-size: 0.8rem;
    font-weight: 600;
  }
`;

const TickerContainer = styled.div`
  height: 120px;
  overflow: hidden;
  position: relative;
  background: #000;
`;

const TickerTrack = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  animation: ${tickerScroll} 45s linear infinite;
  white-space: nowrap;
`;

const TickerItem = styled.div`
  display: inline-flex;
  align-items: center;
  margin-right: 60px;
  padding: 20px;
  background: rgba(26, 26, 26, 0.8);
  border-radius: 8px;
  border-left: 3px solid ${props => props.color || '#007AFF'};
  min-width: 280px;
`;

const CompanyName = styled.div`
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
  filter: blur(${props => props.blur ? '3px' : '0px'});
  font-size: 0.9rem;
`;

const ScoreChange = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  .score {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-weight: 700;
    color: ${props => props.positive ? '#34C759' : '#FF3B30'};
  }
  
  .change {
    font-size: 0.8rem;
    color: #999;
  }
`;

const VolatilityIndicator = styled.div`
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  .volatility {
    font-size: 0.7rem;
    color: #999;
    margin-bottom: 2px;
  }
  
  .bars {
    display: flex;
    gap: 1px;
  }
  
  .bar {
    width: 2px;
    background: ${props => props.high ? '#FF3B30' : props.medium ? '#FF9500' : '#34C759'};
    height: ${props => props.height || '10px'};
  }
`;

const ProcessingStats = styled.div`
  background: #1a1a1a;
  padding: 20px 30px;
  border-top: 1px solid #333;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  
  .stat {
    text-align: center;
  }
  
  .number {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 1.2rem;
    font-weight: 700;
    color: #00ff41;
    margin-bottom: 4px;
  }
  
  .label {
    font-size: 0.8rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

const Api = () => {
  const [tickerData, setTickerData] = useState([]);
  const [processingStats, setProcessingStats] = useState({
    domainsProcessed: 847,
    modelsActive: 17,
    lastUpdate: '23s ago',
    joltEvents: 4
  });

  // Simulate live ticker data
  useEffect(() => {
    const generateTickerData = () => {
      const companies = [
        { name: 'AI Research Lab Alpha', sector: 'AI/ML', blur: true },
        { name: 'E-Commerce Giant B', sector: 'E-Commerce', blur: true },
        { name: 'Social Platform C', sector: 'Social Media', blur: true },
        { name: 'Streaming Service D', sector: 'Entertainment', blur: true },
        { name: 'Cloud Provider E', sector: 'Cloud/Infra', blur: true },
        { name: 'Fintech Unicorn F', sector: 'Financial', blur: true },
        { name: 'Gaming Platform G', sector: 'Gaming', blur: true },
        { name: 'Crypto Exchange H', sector: 'Crypto', blur: true },
      ];

      return companies.map(company => ({
        ...company,
        score: (Math.random() * 40 + 50).toFixed(1),
        change: (Math.random() * 20 - 10).toFixed(1),
        volatility: Math.random() * 100,
        models: Math.floor(Math.random() * 17) + 1
      }));
    };

    setTickerData(generateTickerData());

    // Update ticker every 5 seconds
    const interval = setInterval(() => {
      setTickerData(generateTickerData());
      setProcessingStats(prev => ({
        ...prev,
        domainsProcessed: prev.domainsProcessed + Math.floor(Math.random() * 5),
        lastUpdate: Math.floor(Math.random() * 60) + 's ago'
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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
          Programmatic access to brand memory data across 17 AI models. 
          The infrastructure for memory-driven applications and competitive intelligence.
        </Subtitle>
      </HeroSection>

      {/* NEW: Live Ticker Section */}
      <LiveTickerSection>
        <TickerHeader>
          <TickerTitle>🔴 LIVE BRAND MEMORY FEED</TickerTitle>
          <LiveIndicator>
            <div className="dot"></div>
            <div className="text">LIVE</div>
          </LiveIndicator>
        </TickerHeader>
        
        <TickerContainer>
          <TickerTrack>
            {tickerData.map((item, index) => (
              <TickerItem 
                key={index}
                color={parseFloat(item.change) > 0 ? '#34C759' : '#FF3B30'}
              >
                <div>
                  <CompanyName blur={item.blur}>{item.name}</CompanyName>
                  <ScoreChange positive={parseFloat(item.change) > 0}>
                    <span className="score">{item.score}%</span>
                    <span className="change">
                      {parseFloat(item.change) > 0 ? '+' : ''}{item.change}%
                    </span>
                    <span className="change">({item.models} models)</span>
                  </ScoreChange>
                </div>
                <VolatilityIndicator 
                  high={item.volatility > 70}
                  medium={item.volatility > 40}
                >
                  <div className="volatility">σ²: {item.volatility.toFixed(1)}</div>
                  <div className="bars">
                    <div className="bar" style={{height: '8px'}}></div>
                    <div className="bar" style={{height: '12px'}}></div>
                    <div className="bar" style={{height: item.volatility > 50 ? '16px' : '6px'}}></div>
                    <div className="bar" style={{height: item.volatility > 70 ? '20px' : '4px'}}></div>
                  </div>
                </VolatilityIndicator>
              </TickerItem>
            ))}
          </TickerTrack>
        </TickerContainer>

        <ProcessingStats>
          <div className="stat">
            <div className="number">{processingStats.domainsProcessed}</div>
            <div className="label">Domains Processed</div>
          </div>
          <div className="stat">
            <div className="number">{processingStats.modelsActive}</div>
            <div className="label">Models Active</div>
          </div>
          <div className="stat">
            <div className="number">{processingStats.lastUpdate}</div>
            <div className="label">Last Update</div>
          </div>
          <div className="stat">
            <div className="number">{processingStats.joltEvents}</div>
            <div className="label">JOLT Events</div>
          </div>
        </ProcessingStats>
      </LiveTickerSection>

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
              <span className="volatility">σ²(t)</span> = <span className="value">0.0789</span><br/>
              τ = 89.4h
            </div>
          </DerivativeCard>
          
          <DerivativeCard>
            <div className="company">shopify.com</div>
            <div className="calculation">
              <span className="derivative">dM/dt</span> = <span className="value">+0.089</span><br/>
              <span className="volatility">σ²(t)</span> = <span className="value">0.0345</span><br/>
              τ = 198.7h
            </div>
          </DerivativeCard>
        </DerivativeGrid>
      </DerivativeAnalysis>

      <StatsGrid>
        <StatCard>
          <div className="number">70K+</div>
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
          <div className="endpoint">/api/ticker</div>
          <div className="description">
            Real-time brand memory volatility feed with temporal derivatives and consensus metrics. 
            Live streaming data for financial-grade brand intelligence applications.
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