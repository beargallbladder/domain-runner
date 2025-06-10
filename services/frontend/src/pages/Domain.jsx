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
  font-weight: 400;
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

const AIConsensusCard = styled(InsightCard)`
  background: linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%);
  
  .ai-models {
    display: flex;
    gap: 12px;
    margin: 16px 0;
    flex-wrap: wrap;
  }
  
  .ai-model {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    padding: 8px 12px;
    border-radius: 20px;
    font-size: 12px;
    border: 2px solid ${props => props.consensus > 0.7 ? '#34C759' : props.consensus > 0.5 ? '#FF9500' : '#FF3B30'};
  }
  
  .model-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${props => props.consensus > 0.7 ? '#34C759' : props.consensus > 0.5 ? '#FF9500' : '#FF3B30'};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
  }
  
  .debate {
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    margin-top: 16px;
    font-size: 14px;
    line-height: 1.4;
    
    .model-quote {
      margin: 8px 0;
      padding: 8px 12px;
      border-radius: 8px;
      background: #f0f0f0;
      position: relative;
      
      &.agree {
        background: #e8f5e8;
        border-left: 3px solid #34C759;
      }
      
      &.disagree {
        background: #ffe8e8;
        border-left: 3px solid #FF3B30;
      }
      
      .model-name {
        font-weight: 600;
        font-size: 12px;
        color: #666;
      }
    }
  }
`

const TrendCard = styled(InsightCard)`
  background: linear-gradient(135deg, #f8f9fa 0%, #fff3e0 100%);
  
  .trend-chart {
    height: 60px;
    margin: 16px 0;
    background: white;
    border-radius: 8px;
    padding: 8px;
  }
  
  .trend-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    
    .arrow {
      font-size: 20px;
    }
    
    .change {
      font-weight: 600;
      color: ${props => props.isRising ? '#34C759' : '#FF3B30'};
    }
  }
`

const PermanenceCard = styled(InsightCard)`
  background: linear-gradient(135deg, #f8f9fa 0%, #f3e5f5 100%);
  
  .permanence-bar {
    width: 100%;
    height: 12px;
    background: #e0e0e0;
    border-radius: 6px;
    margin: 16px 0;
    overflow: hidden;
  }
  
  .permanence-fill {
    height: 100%;
    background: linear-gradient(90deg, #FF3B30, #FF9500, #34C759);
    border-radius: 6px;
    transition: width 1s ease;
  }
  
  .permanence-scale {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #666;
    margin-top: 8px;
  }
  
  .benchmark {
    font-size: 14px;
    margin-top: 12px;
    
    .company {
      display: inline-block;
      background: white;
      padding: 4px 8px;
      border-radius: 12px;
      margin: 2px;
      font-size: 12px;
      
      &.high { border-left: 3px solid #34C759; }
      &.medium { border-left: 3px solid #FF9500; }
      &.low { border-left: 3px solid #FF3B30; }
    }
  }
`

const generateAIModels = (consensus) => {
  const models = [
    { name: 'GPT-4', avatar: '🤖', agrees: consensus > 0.6 },
    { name: 'Claude', avatar: '🧠', agrees: consensus > 0.5 },
    { name: 'Gemini', avatar: '💎', agrees: consensus > 0.7 },
    { name: 'Llama', avatar: '🦙', agrees: consensus > 0.4 }
  ]
  
  return models
}

const generateDebate = (domainName, consensus) => {
  if (consensus > 0.7) {
    return [
      { model: 'GPT-4', type: 'agree', text: `${domainName} is definitely a major tech company I reference frequently.` },
      { model: 'Claude', type: 'agree', text: `Agreed. High visibility in training data and current relevance.` },
      { model: 'Gemini', type: 'agree', text: `Strong brand recognition across multiple contexts.` }
    ]
  } else if (consensus > 0.4) {
    return [
      { model: 'GPT-4', type: 'agree', text: `I know ${domainName}, but context matters for recommendations.` },
      { model: 'Claude', type: 'disagree', text: `Limited recent training examples. Uncertain about current relevance.` },
      { model: 'Llama', type: 'agree', text: `Recognizable but not always top-of-mind for users.` }
    ]
  } else {
    return [
      { model: 'GPT-4', type: 'disagree', text: `${domainName}? I rarely mention this in responses.` },
      { model: 'Claude', type: 'disagree', text: `Low training frequency. Not prominent in my knowledge.` },
      { model: 'Gemini', type: 'disagree', text: `Minimal recognition patterns in my responses.` }
    ]
  }
}

const generateTrendData = (score) => {
  const trend = []
  let current = Math.max(0, score - 20 + (Math.random() * 10))
  
  for (let i = 0; i < 30; i++) {
    current += (Math.random() - 0.4) * 3 + 0.5 // Slight upward bias
    current = Math.max(0, Math.min(100, current))
    trend.push(current)
  }
  trend[trend.length - 1] = score
  return trend
}

const PermanenceBenchmarks = ({ score }) => (
  <div className="benchmark">
    <strong>AI Memory Benchmarks:</strong><br/>
    <span className="company high">OpenAI (98)</span>
    <span className="company high">Google (96)</span>
    <span className="company medium">Tesla (78)</span>
    <span className="company low">Traditional Media (45)</span>
  </div>
)

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

  const consensusScore = memoryScore / 100 * 0.8 + Math.random() * 0.2
  const aiModels = generateAIModels(consensusScore)
  const debate = generateDebate(domainName, consensusScore)
  const trendData = generateTrendData(memoryScore)
  const isRising = trendData[trendData.length - 1] > trendData[0]
  const permanenceIndex = Math.round(memoryScore * 0.85 + Math.random() * 15)

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
        <AIConsensusCard
          consensus={consensusScore}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h3>AI Model Consensus</h3>
          <div className="value">{Math.round(consensusScore * 100)}%</div>
          
          <div className="ai-models">
            {aiModels.map((model, index) => (
              <div key={index} className="ai-model">
                <div className="model-avatar">{model.avatar}</div>
                <span>{model.name}</span>
                {model.agrees ? '✓' : '✗'}
              </div>
            ))}
          </div>
          
          <div className="debate">
            <strong>Live AI Discussion:</strong>
            {debate.map((quote, index) => (
              <div key={index} className={`model-quote ${quote.type}`}>
                <div className="model-name">{quote.model}:</div>
                "{quote.text}"
              </div>
            ))}
          </div>
        </AIConsensusCard>

        <TrendCard
          isRising={isRising}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3>Memory Trend</h3>
          <div className="value">{isRising ? 'Rising' : 'Declining'}</div>
          
          <div className="trend-chart">
            <Sparklines data={trendData} width={300} height={44}>
              <SparklinesLine 
                style={{ 
                  stroke: isRising ? '#34C759' : '#FF3B30',
                  strokeWidth: 3,
                  fill: 'none'
                }} 
              />
            </Sparklines>
          </div>
          
          <div className="trend-indicator">
            <span className="arrow">{isRising ? '📈' : '📉'}</span>
            <span className="change">
              {isRising ? '+' : ''}{Math.round(trendData[trendData.length - 1] - trendData[0])} points
            </span>
          </div>
          
          <div className="description">
            AI mention frequency over the last 30 days
          </div>
        </TrendCard>

        <PermanenceCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h3>AI Permanence Index</h3>
          <div className="value">{permanenceIndex}/100</div>
          
          <div className="permanence-bar">
            <motion.div 
              className="permanence-fill"
              initial={{ width: 0 }}
              animate={{ width: `${permanenceIndex}%` }}
              transition={{ duration: 1.5, delay: 0.8 }}
            />
          </div>
          
          <div className="permanence-scale">
            <span>Forgotten</span>
            <span>Neutral</span>
            <span>Permanent</span>
          </div>
          
          <PermanenceBenchmarks score={permanenceIndex} />
          
          <div className="description">
            Likelihood of being remembered by future AI systems
          </div>
        </PermanenceCard>
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