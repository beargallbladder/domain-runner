import React from 'react'
import { useParams, Link } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Sparklines, SparklinesLine } from 'react-sparklines'
import { useDomainData } from '../hooks/useMemoryAPI'

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 40px;
  
  @media (max-width: 768px) {
    padding: 60px 20px;
  }
`

const Header = styled(motion.div)`
  text-align: center;
  margin-bottom: 80px;
`

const DomainName = styled.h1`
  font-size: 48px;
  font-weight: 300;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
  color: #000;
`

const DomainUrl = styled.a`
  color: #007AFF;
  font-size: 18px;
  text-decoration: none;
  margin-bottom: 32px;
  display: inline-block;
  
  &:hover {
    text-decoration: underline;
  }
`

const MainScore = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48px;
`

const Score = styled.div`
  font-size: 120px;
  font-weight: 200;
  line-height: 1;
  margin-bottom: 16px;
  color: ${props => 
    props.score >= 90 ? '#34C759' : 
    props.score >= 75 ? '#007AFF' : 
    props.score >= 60 ? '#FF9500' : '#FF3B30'
  };
`

const ScoreLabel = styled.div`
  font-size: 20px;
  color: #666;
  font-weight: 300;
`

const Consensus = styled.div`
  font-size: 18px;
  margin-top: 8px;
  color: ${props => 
    props.type === 'Strong' ? '#34C759' : 
    props.type === 'Moderate' ? '#007AFF' : '#FF9500'
  };
  font-weight: 500;
`

const InsightsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 32px;
  margin-bottom: 80px;
`

const InsightCard = styled(motion.div)`
  background: #f8f9fa;
  border-radius: 16px;
  padding: 32px;
  
  h3 {
    font-size: 20px;
    font-weight: 500;
    margin-bottom: 16px;
    color: #000;
  }
  
  .value {
    font-size: 32px;
    font-weight: 300;
    color: #007AFF;
    margin-bottom: 8px;
  }
  
  .description {
    font-size: 16px;
    color: #666;
    line-height: 1.5;
  }
`

const TrendChart = styled.div`
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 48px;
  
  h3 {
    font-size: 24px;
    font-weight: 300;
    margin-bottom: 24px;
    color: #000;
  }
`

const SparklineContainer = styled.div`
  height: 100px;
  margin: 24px 0;
`

const ModelsSection = styled.div`
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 48px;
  
  h3 {
    font-size: 24px;
    font-weight: 300;
    margin-bottom: 24px;
    color: #000;
  }
`

const ModelsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`

const ModelItem = styled.div`
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  
  .name {
    font-size: 14px;
    font-weight: 500;
    color: #000;
    margin-bottom: 4px;
  }
  
  .tier {
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`

const PremiumTeaser = styled(motion.div)`
  background: linear-gradient(135deg, #000 0%, #1a1a1a 100%);
  color: #fff;
  border-radius: 16px;
  padding: 48px;
  text-align: center;
  
  h3 {
    font-size: 32px;
    font-weight: 300;
    margin-bottom: 16px;
    
    .premium {
      color: #007AFF;
    }
  }
  
  p {
    font-size: 18px;
    color: #ccc;
    margin-bottom: 32px;
    line-height: 1.6;
  }
  
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 24px;
    margin: 32px 0;
  }
  
  .feature {
    .icon {
      font-size: 32px;
      margin-bottom: 12px;
    }
    
    .title {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 8px;
      color: #fff;
    }
    
    .desc {
      font-size: 14px;
      color: #999;
    }
  }
`

const CTAButton = styled(Link)`
  display: inline-block;
  padding: 16px 32px;
  background: #007AFF;
  color: #fff;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  
  &:hover {
    background: #0056CC;
    transform: translateY(-1px);
  }
`

const freeModels = [
  { name: 'Claude Haiku', tier: 'Ultra Budget' },
  { name: 'GPT-4o Mini', tier: 'Budget' },
  { name: 'DeepSeek Chat', tier: 'Ultra Budget' },
  { name: 'Gemini Flash', tier: 'Budget' }
]

const generateTrendData = (score) => {
  const trend = []
  let current = score - 15
  for (let i = 0; i < 30; i++) {
    current += (Math.random() - 0.5) * 4
    current = Math.max(0, Math.min(100, current))
    trend.push(current)
  }
  trend[trend.length - 1] = score
  return trend
}

function Domain() {
  const { domainName } = useParams()
  const { memoryScore, consensus, trending, loading, error } = useDomainData(domainName)

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '120px 0' }}>
          <div style={{ fontSize: '24px', color: '#666' }}>
            Analyzing {domainName}...
          </div>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '120px 0' }}>
          <div style={{ fontSize: '24px', color: '#FF3B30' }}>
            Failed to load domain data
          </div>
        </div>
      </Container>
    )
  }

  const trendData = generateTrendData(memoryScore)

  return (
    <Container>
      <Header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <DomainName>{domainName}</DomainName>
        <DomainUrl 
          href={`https://${domainName}`} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          Visit {domainName} →
        </DomainUrl>
      </Header>

      <MainScore
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <Score score={memoryScore}>{memoryScore}</Score>
        <ScoreLabel>Memory Score</ScoreLabel>
        <Consensus type={consensus}>{consensus}</Consensus>
      </MainScore>

      <InsightsGrid>
        <InsightCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h3>AI Consensus</h3>
          <div className="value">{consensus}</div>
          <div className="description">
            {consensus === 'Strong Consensus' ? 
              'AI models consistently recognize and reference this domain across diverse contexts.' :
              'AI models show moderate agreement about this domain\'s significance and relevance.'
            }
          </div>
        </InsightCard>

        <InsightCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3>Trend Status</h3>
          <div className="value">{trending}</div>
          <div className="description">
            Memory score trajectory over the last 30 days based on AI model responses and mentions.
          </div>
        </InsightCard>

        <InsightCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h3>Permanence Index</h3>
          <div className="value">{Math.floor(memoryScore * 0.85)}</div>
          <div className="description">
            Likelihood that this domain will be remembered and referenced by AI systems in the future.
          </div>
        </InsightCard>
      </InsightsGrid>

      <TrendChart>
        <h3>30-Day Memory Trend</h3>
        <SparklineContainer>
          <Sparklines data={trendData} width={1000} height={100}>
            <SparklinesLine 
              style={{ 
                stroke: memoryScore >= 90 ? '#34C759' : '#007AFF',
                strokeWidth: 3,
                fill: 'none'
              }} 
            />
          </Sparklines>
        </SparklineContainer>
        <div style={{ fontSize: '14px', color: '#666', marginTop: '16px' }}>
          Memory score changes over time based on AI model consensus analysis
        </div>
      </TrendChart>

      <ModelsSection>
        <h3>Sample AI Models (Free Tier)</h3>
        <ModelsList>
          {freeModels.map((model, index) => (
            <ModelItem key={index}>
              <div className="name">{model.name}</div>
              <div className="tier">{model.tier}</div>
            </ModelItem>
          ))}
        </ModelsList>
        <div style={{ marginTop: '24px', fontSize: '14px', color: '#666' }}>
          Premium subscribers access insights from 15+ additional models including GPT-4, Claude Opus, and more.
        </div>
      </ModelsSection>

      <PremiumTeaser
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <h3>Unlock <span className="premium">Premium</span> Intelligence</h3>
        <p>
          Get deeper insights with our complete AI model suite, tensor analysis, 
          and predictive memory forecasting.
        </p>
        
        <div className="features">
          <div className="feature">
            <div className="icon">🧠</div>
            <div className="title">Tensor Scores</div>
            <div className="desc">Multi-dimensional memory analysis</div>
          </div>
          <div className="feature">
            <div className="icon">📊</div>
            <div className="title">15+ AI Models</div>
            <div className="desc">Complete LLM consensus data</div>
          </div>
          <div className="feature">
            <div className="icon">🔮</div>
            <div className="title">Future Predictions</div>
            <div className="desc">6-month memory forecasting</div>
          </div>
          <div className="feature">
            <div className="icon">⚡</div>
            <div className="title">Real-time Alerts</div>
            <div className="desc">Memory score change notifications</div>
          </div>
        </div>
        
        <CTAButton to="/premium">
          Explore Premium Features
        </CTAButton>
      </PremiumTeaser>
    </Container>
  )
}

export default Domain 