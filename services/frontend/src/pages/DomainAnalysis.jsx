import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { motion } from 'framer-motion'
import { useDomainAnalysis } from '../hooks/useMemoryAPI'

// Animations
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`

const slideIn = keyframes`
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`

// Main Container
const Container = styled.div`
  min-height: 100vh;
  background: #000;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`

// Navigation Header
const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  padding: 16px 40px;
  z-index: 1000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const Logo = styled(Link)`
  font-size: 24px;
  font-weight: 300;
  color: #fff;
  text-decoration: none;
  
  &:hover {
    color: #ccc;
  }
`

const Nav = styled.nav`
  display: flex;
  gap: 32px;
  
  a {
    color: #ccc;
    text-decoration: none;
    font-size: 16px;
    font-weight: 300;
    
    &:hover {
      color: #fff;
    }
  }
`

// Hero Section
const HeroSection = styled.section`
  padding: 120px 40px 60px 40px;
  background: linear-gradient(135deg, #000 0%, #111 100%);
  text-align: center;
`

const DomainTitle = styled(motion.h1)`
  font-size: clamp(36px, 6vw, 72px);
  font-weight: 100;
  margin-bottom: 20px;
  color: #fff;
  
  .domain {
    background: linear-gradient(45deg, #fff, #ccc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`

const BusinessFocus = styled(motion.p)`
  font-size: 20px;
  color: #888;
  margin-bottom: 40px;
  text-transform: uppercase;
  letter-spacing: 2px;
`

const ScoreDisplay = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
  margin-bottom: 40px;
  flex-wrap: wrap;
`

const MainScore = styled.div`
  text-align: center;
  
  .score {
    font-size: 96px;
    font-weight: 100;
    line-height: 1;
    color: ${props => 
      props.score >= 90 ? '#00ff88' : 
      props.score >= 75 ? '#fff' : 
      props.score >= 60 ? '#ffbb00' : '#ff4444'
    };
  }
  
  .label {
    font-size: 16px;
    color: #ccc;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 8px;
  }
`

const SubScore = styled.div`
  text-align: center;
  
  .score {
    font-size: 32px;
    font-weight: 200;
    color: #fff;
    margin-bottom: 4px;
  }
  
  .label {
    font-size: 14px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`

// Fire Alarm Section
const AlertSection = styled.section`
  padding: 60px 40px;
  background: #111;
  border-top: 1px solid #333;
  border-bottom: 1px solid #333;
`

const AlertTitle = styled.h2`
  font-size: 36px;
  font-weight: 100;
  text-align: center;
  margin-bottom: 40px;
  color: #fff;
  
  .icon {
    margin-right: 15px;
    animation: ${pulse} 2s infinite;
  }
`

const AlertGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
`

const AlertCard = styled(motion.div)`
  background: ${props => 
    props.severity === 'critical' ? 'rgba(255, 68, 68, 0.1)' :
    props.severity === 'high' ? 'rgba(255, 187, 0, 0.1)' :
    'rgba(136, 136, 136, 0.1)'
  };
  border: 1px solid ${props => 
    props.severity === 'critical' ? 'rgba(255, 68, 68, 0.3)' :
    props.severity === 'high' ? 'rgba(255, 187, 0, 0.3)' :
    'rgba(136, 136, 136, 0.3)'
  };
  border-radius: 12px;
  padding: 30px;
  
  .alert-header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    
    .icon {
      font-size: 24px;
      margin-right: 12px;
    }
    
    .title {
      font-size: 18px;
      font-weight: 500;
      color: #fff;
    }
  }
  
  .message {
    font-size: 16px;
    color: #ccc;
    margin-bottom: 15px;
    line-height: 1.5;
  }
  
  .impact {
    font-size: 14px;
    color: #888;
    margin-bottom: 15px;
    line-height: 1.4;
  }
  
  .action {
    font-size: 14px;
    color: ${props => 
      props.severity === 'critical' ? '#ff6666' :
      props.severity === 'high' ? '#ffbb00' :
      '#888'
    };
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`

// Model Breakdown Section
const ModelSection = styled.section`
  padding: 80px 40px;
  background: #000;
`

const ModelTitle = styled.h2`
  font-size: 48px;
  font-weight: 100;
  text-align: center;
  margin-bottom: 20px;
  color: #fff;
`

const ModelSubtitle = styled.p`
  font-size: 18px;
  color: #ccc;
  text-align: center;
  margin-bottom: 60px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
`

const ModelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
`

const ModelCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  
  .model-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    
    .name {
      font-size: 16px;
      font-weight: 500;
      color: #fff;
    }
    
    .status {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: ${props => props.agrees ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 68, 68, 0.2)'};
      color: ${props => props.agrees ? '#00ff88' : '#ff6666'};
    }
  }
  
  .provider {
    font-size: 12px;
    color: #888;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .confidence {
    font-size: 14px;
    color: #ccc;
    margin-bottom: 12px;
  }
  
  .response-sample {
    font-size: 14px;
    color: #999;
    font-style: italic;
    line-height: 1.4;
    border-left: 2px solid rgba(255, 255, 255, 0.1);
    padding-left: 12px;
  }
`

// Competitive Analysis Section
const CompetitiveSection = styled.section`
  padding: 80px 40px;
  background: #111;
  border-top: 1px solid #333;
`

const CompetitiveTitle = styled.h2`
  font-size: 48px;
  font-weight: 100;
  text-align: center;
  margin-bottom: 60px;
  color: #fff;
`

const CompetitiveGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 40px;
  max-width: 1200px;
  margin: 0 auto;
`

const CompetitiveCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  
  .metric {
    font-size: 32px;
    font-weight: 200;
    color: #fff;
    margin-bottom: 8px;
  }
  
  .label {
    font-size: 16px;
    color: #ccc;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .description {
    font-size: 14px;
    color: #888;
    line-height: 1.4;
  }
`

// Methodology Section
const MethodologySection = styled.section`
  padding: 80px 40px;
  background: #000;
  border-top: 1px solid #333;
`

const MethodologyTitle = styled.h2`
  font-size: 48px;
  font-weight: 100;
  text-align: center;
  margin-bottom: 60px;
  color: #fff;
`

const MethodologyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
  max-width: 1000px;
  margin: 0 auto;
`

const MethodologyCard = styled(motion.div)`
  text-align: center;
  padding: 30px 20px;
  
  .number {
    font-size: 36px;
    font-weight: 100;
    color: #fff;
    margin-bottom: 12px;
  }
  
  .label {
    font-size: 14px;
    color: #ccc;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  
  .detail {
    font-size: 14px;
    color: #888;
    line-height: 1.4;
  }
`

// Loading State
const LoadingState = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #000;
  
  .title {
    font-size: 36px;
    font-weight: 100;
    color: #fff;
    margin-bottom: 20px;
  }
  
  .subtitle {
    font-size: 18px;
    color: #ccc;
  }
`

function DomainAnalysis() {
  const { domain } = useParams()
  const { analysis, loading, error } = useDomainAnalysis(`${domain}.com`)

  if (loading) {
    return (
      <Container>
        <LoadingState>
          <div className="title">Analyzing {domain}.com</div>
          <div className="subtitle">Processing AI model responses...</div>
        </LoadingState>
      </Container>
    )
  }

  if (error || !analysis) {
    return (
      <Container>
        <LoadingState>
          <div className="title">Analysis Unavailable</div>
          <div className="subtitle">Unable to load data for {domain}.com</div>
        </LoadingState>
      </Container>
    )
  }

  return (
    <Container>
      {/* Navigation Header */}
      <Header>
        <Logo to="/">LLM PageRank</Logo>
        <Nav>
          <Link to="/">Home</Link>
          <Link to="/domains">Browse Domains</Link>
          <Link to="/methodology">Methodology</Link>
          <Link to="/pricing">Pricing</Link>
        </Nav>
      </Header>

      {/* Hero Section */}
      <HeroSection>
        <DomainTitle
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="domain">{analysis.domain}</span>
        </DomainTitle>
        
        <BusinessFocus
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {analysis.brand_intelligence?.primary_focus || 'Technology Innovation'}
        </BusinessFocus>

        <ScoreDisplay
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <MainScore score={analysis.ai_intelligence?.memory_score}>
            <div className="score">{analysis.ai_intelligence?.memory_score}</div>
            <div className="label">AI Memory Score</div>
          </MainScore>
          
          <SubScore>
            <div className="score">{analysis.ai_intelligence?.models_tracking}</div>
            <div className="label">Models Tracking</div>
          </SubScore>
          
          <SubScore>
            <div className="score">{(analysis.ai_intelligence?.ai_consensus * 100).toFixed(0)}%</div>
            <div className="label">Consensus Rate</div>
          </SubScore>
          
          <SubScore>
            <div className="score">{analysis.data_freshness?.total_responses || analysis.ai_intelligence?.response_volume}</div>
            <div className="label">Responses</div>
          </SubScore>
        </ScoreDisplay>
      </HeroSection>

      {/* Fire Alarm Alerts */}
      {analysis.reputation_alerts?.active_alerts?.length > 0 && (
        <AlertSection>
          <AlertTitle>
            <span className="icon">🚨</span>
            Reputation Intelligence Alerts
          </AlertTitle>
          <AlertGrid>
            {analysis.reputation_alerts.active_alerts.map((alert, index) => (
              <AlertCard
                key={index}
                severity={alert.severity}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="alert-header">
                  <span className="icon">{alert.icon}</span>
                  <span className="title">{alert.title}</span>
                </div>
                <div className="message">{alert.message}</div>
                <div className="impact">{alert.business_impact}</div>
                <div className="action">{alert.recommended_action}</div>
              </AlertCard>
            ))}
          </AlertGrid>
        </AlertSection>
      )}

      {/* Model-by-Model Breakdown */}
      {analysis.model_breakdown && (
        <ModelSection>
          <ModelTitle>AI Model Consensus Breakdown</ModelTitle>
          <ModelSubtitle>
            See exactly how each of the {analysis.ai_intelligence?.models_tracking} AI models 
            perceives {analysis.domain}. This is the raw intelligence that drives your score.
          </ModelSubtitle>
          <ModelGrid>
            {analysis.model_breakdown.map((model, index) => (
              <ModelCard
                key={index}
                agrees={model.agreement_status === 'agrees'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
              >
                <div className="model-header">
                  <span className="name">{model.model_name}</span>
                  <span className="status">
                    {model.agreement_status === 'agrees' ? 'Agrees' : 'Disagrees'}
                  </span>
                </div>
                <div className="provider">{model.provider}</div>
                <div className="confidence">
                  Confidence: {(model.confidence_score * 100).toFixed(0)}%
                </div>
                <div className="response-sample">
                  "{model.response_sample}"
                </div>
              </ModelCard>
            ))}
          </ModelGrid>
        </ModelSection>
      )}

      {/* Competitive Analysis */}
      <CompetitiveSection>
        <CompetitiveTitle>Competitive Intelligence</CompetitiveTitle>
        <CompetitiveGrid>
          <CompetitiveCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="metric">{analysis.competitive_analysis?.ai_visibility_rank}</div>
            <div className="label">AI Visibility Rank</div>
            <div className="description">
              Your position among all analyzed domains in AI model awareness
            </div>
          </CompetitiveCard>
          
          <CompetitiveCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="metric">{analysis.competitive_analysis?.brand_clarity}</div>
            <div className="label">Brand Clarity</div>
            <div className="description">
              How consistently AI models understand your brand identity
            </div>
          </CompetitiveCard>
          
          <CompetitiveCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="metric">{analysis.brand_intelligence?.market_position}</div>
            <div className="label">Market Position</div>
            <div className="description">
              Your competitive standing based on AI model recognition
            </div>
          </CompetitiveCard>
        </CompetitiveGrid>
      </CompetitiveSection>

      {/* Methodology */}
      <MethodologySection>
        <MethodologyTitle>Scientific Methodology</MethodologyTitle>
        <MethodologyGrid>
          <MethodologyCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="number">{analysis.methodology?.data_source?.split(' ')[0] || '24,693'}</div>
            <div className="label">AI Responses</div>
            <div className="detail">Total responses analyzed across all models</div>
          </MethodologyCard>
          
          <MethodologyCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="number">{analysis.methodology?.model_coverage?.split(' ')[0] || '21'}</div>
            <div className="label">AI Models</div>
            <div className="detail">Leading models from OpenAI, Anthropic, Google, Meta</div>
          </MethodologyCard>
          
          <MethodologyCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="number">56</div>
            <div className="label">Weeks</div>
            <div className="detail">Continuous monitoring and temporal analysis</div>
          </MethodologyCard>
          
          <MethodologyCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="number">Patent</div>
            <div className="label">Technology</div>
            <div className="detail">Patent-pending AI memory measurement system</div>
          </MethodologyCard>
        </MethodologyGrid>
      </MethodologySection>
    </Container>
  )
}

export default DomainAnalysis 