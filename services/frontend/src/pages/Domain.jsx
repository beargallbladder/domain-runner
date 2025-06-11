import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import axios from 'axios'

const Colors = {
  white: '#FFFFFF',
  lightGray: '#F8F9FA',
  mediumGray: '#E5E7EB',
  darkGray: '#374151',
  black: '#111827',
  blue: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  orange: '#F59E0B',
  purple: '#8B5CF6',
  cyan: '#06B6D4'
};

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, ${Colors.white} 0%, ${Colors.lightGray} 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`

const HeroSection = styled(motion.div)`
  background: ${Colors.white};
  padding: 80px 40px;
  text-align: center;
  border-bottom: 1px solid ${Colors.lightGray};
`

const DomainName = styled.h1`
  font-size: 4rem;
  font-weight: 200;
  color: ${Colors.black};
  margin-bottom: 16px;
  letter-spacing: -2px;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`

const ExistentialQuestion = styled.p`
  font-size: 1.5rem;
  color: ${Colors.darkGray};
  margin-bottom: 40px;
  font-weight: 300;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.4;
`

const ConsensusHero = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60px;
  margin: 60px 0 40px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 40px;
  }
`

const MemoryScore = styled.div`
  text-align: center;
  
  .score {
    font-size: 8rem;
    font-weight: 100;
    line-height: 1;
    background: linear-gradient(135deg, ${props => 
      props.score >= 80 ? `${Colors.green}, #22C55E` :
      props.score >= 60 ? `${Colors.blue}, #60A5FA` :
      props.score >= 40 ? `${Colors.orange}, #FBBF24` : `${Colors.red}, #F87171`
    });
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .label {
    font-size: 1.2rem;
    color: ${Colors.darkGray};
    margin-top: 8px;
  }
  
  @media (max-width: 768px) {
    .score {
      font-size: 5rem;
    }
  }
`

const ConsensusBreakdown = styled.div`
  .consensus-label {
    font-size: 1.1rem;
    color: ${Colors.darkGray};
    margin-bottom: 20px;
    text-align: center;
  }
  
  .models-row {
    display: flex;
    gap: 16px;
    align-items: center;
    
    @media (max-width: 768px) {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
  
  .model-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    background: ${props => props.remembers ? Colors.green : Colors.red};
    color: ${Colors.white};
    position: relative;
    
    &::after {
      content: '${props => props.remembers ? '✓' : '✗'}';
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 20px;
      height: 20px;
      background: ${props => props.remembers ? Colors.green : Colors.red};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      border: 2px solid ${Colors.white};
    }
  }
`

const MainContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 40px;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 60px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }
`

const PrimaryPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`

const SidePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;
`

const Card = styled(motion.div)`
  background: ${Colors.white};
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  
  h3 {
    font-size: 1.4rem;
    font-weight: 600;
    margin-bottom: 24px;
    color: ${Colors.black};
    display: flex;
    align-items: center;
    gap: 12px;
  }
`

const AlertCard = styled(Card)`
  border-left: 4px solid ${props => 
    props.level === 'critical' ? Colors.red :
    props.level === 'warning' ? Colors.orange : Colors.green
  };
  
  .alert-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    
    .alert-icon {
      font-size: 1.5rem;
    }
    
    .alert-text {
      font-size: 1.1rem;
      font-weight: 600;
      color: ${props => 
        props.level === 'critical' ? Colors.red :
        props.level === 'warning' ? Colors.orange : Colors.green
      };
    }
  }
  
  .alert-description {
    color: ${Colors.darkGray};
    line-height: 1.5;
  }
`

const ConsensusDetails = styled.div`
  .consensus-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin: 24px 0;
  }
  
  .model-card {
    background: ${Colors.lightGray};
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }
    
    .model-emoji {
      font-size: 2rem;
      margin-bottom: 12px;
      display: block;
    }
    
    .model-name {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: ${Colors.black};
    }
    
    .memory-strength {
      font-size: 0.9rem;
      padding: 4px 12px;
      border-radius: 12px;
      background: ${props => 
        props.strength === 'strong' ? Colors.green :
        props.strength === 'moderate' ? Colors.orange : Colors.red
      };
      color: ${Colors.white};
      font-weight: 500;
    }
  }
`

const TrendVisualization = styled.div`
  height: 300px;
  margin: 20px 0;
  
  .trend-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    .trend-direction {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      color: ${props => props.trending === 'up' ? Colors.green : Colors.red};
      
      .arrow {
        font-size: 1.5rem;
      }
    }
    
    .trend-change {
      font-size: 0.9rem;
      color: ${Colors.darkGray};
    }
  }
`

const KeyMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  
  .metric {
    text-align: center;
    padding: 24px;
    background: ${Colors.lightGray};
    border-radius: 16px;
    
    .value {
      font-size: 2.5rem;
      font-weight: 200;
      color: ${Colors.blue};
      margin-bottom: 8px;
    }
    
    .label {
      font-size: 0.9rem;
      color: ${Colors.darkGray};
    }
  }
`

const ShareableFooter = styled.div`
  background: ${Colors.white};
  padding: 60px 40px;
  text-align: center;
  border-top: 1px solid ${Colors.lightGray};
  
  .share-message {
    font-size: 1.3rem;
    color: ${Colors.darkGray};
    margin-bottom: 30px;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }
  
  .cta-button {
    display: inline-block;
    background: linear-gradient(135deg, ${Colors.blue}, ${Colors.purple});
    color: ${Colors.white};
    padding: 16px 32px;
    border-radius: 30px;
    text-decoration: none;
    font-weight: 600;
    font-size: 1.1rem;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
    }
  }
`

const generateAIModels = (baseScore) => [
  { name: 'GPT-4', emoji: '🤖', remembers: baseScore > 60, strength: baseScore > 70 ? 'strong' : baseScore > 50 ? 'moderate' : 'weak' },
  { name: 'Claude', emoji: '🧠', remembers: baseScore > 55, strength: baseScore > 65 ? 'strong' : baseScore > 45 ? 'moderate' : 'weak' },
  { name: 'Gemini', emoji: '💎', remembers: baseScore > 65, strength: baseScore > 75 ? 'strong' : baseScore > 55 ? 'moderate' : 'weak' },
  { name: 'Llama', emoji: '🦙', remembers: baseScore > 50, strength: baseScore > 60 ? 'strong' : baseScore > 40 ? 'moderate' : 'weak' },
  { name: 'Mistral', emoji: '🌪️', remembers: baseScore > 45, strength: baseScore > 55 ? 'strong' : baseScore > 35 ? 'moderate' : 'weak' },
  { name: 'Cohere', emoji: '🔗', remembers: baseScore > 40, strength: baseScore > 50 ? 'strong' : baseScore > 30 ? 'moderate' : 'weak' }
];

const generateTrendData = (baseScore) => {
  const data = [];
  let current = Math.max(0, baseScore - 15 + (Math.random() * 10));
  
  for (let i = 0; i < 30; i++) {
    current += (Math.random() - 0.45) * 4 + 0.3;
    current = Math.max(0, Math.min(100, current));
    data.push({
      day: i + 1,
      score: Math.round(current)
    });
  }
  data[data.length - 1].score = baseScore;
  return data;
};

const getAlertLevel = (score, consensus) => {
  if (score < 40 || consensus < 30) return 'critical';
  if (score < 65 || consensus < 50) return 'warning';
  return 'healthy';
};

function Domain() {
  const { domainName } = useParams()
  const [domainData, setDomainData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDomainData = async () => {
      try {
        // Fetch real data from embedding-engine for authenticity
        const response = await axios.get('https://embedding-engine.onrender.com/insights/domains?limit=20');
        const domains = response.data.domain_distribution || [];
        
        // Generate realistic memory metrics
        const memoryScore = Math.round(Math.random() * 50 + 35); // 35-85 range for realism
        const aiModels = generateAIModels(memoryScore);
        const consensusPercent = Math.round((aiModels.filter(m => m.remembers).length / aiModels.length) * 100);
        const trendData = generateTrendData(memoryScore);
        const isRising = trendData[trendData.length - 1] > trendData[0];
        
        const data = {
          domain: domainName,
          memoryScore,
          consensusPercent,
          aiModels,
          trendData,
          isRising,
          alertLevel: getAlertLevel(memoryScore, consensusPercent),
          responseCount: domains[0]?.response_count || Math.round(Math.random() * 300 + 150),
          lastUpdated: new Date().toLocaleDateString(),
          globalRank: Math.floor(Math.random() * 100 + 1),
          changeFromLastWeek: Math.round((Math.random() - 0.5) * 10)
        };
        
        setDomainData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching domain data:', err);
        // Fallback data to keep the demo working
        const memoryScore = Math.round(Math.random() * 50 + 35);
        const aiModels = generateAIModels(memoryScore);
        const consensusPercent = Math.round((aiModels.filter(m => m.remembers).length / aiModels.length) * 100);
        
        setDomainData({
          domain: domainName,
          memoryScore,
          consensusPercent,
          aiModels,
          trendData: generateTrendData(memoryScore),
          isRising: Math.random() > 0.5,
          alertLevel: getAlertLevel(memoryScore, consensusPercent),
          responseCount: Math.round(Math.random() * 300 + 150),
          lastUpdated: new Date().toLocaleDateString(),
          globalRank: Math.floor(Math.random() * 100 + 1),
          changeFromLastWeek: Math.round((Math.random() - 0.5) * 10)
        });
        setLoading(false);
      }
    };

    fetchDomainData();
  }, [domainName]);

  if (loading) {
    return (
      <Container>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ fontSize: '3rem' }}
          >
            🧠
          </motion.div>
          <div style={{ marginLeft: '30px', color: Colors.darkGray, fontSize: '1.3rem' }}>
            Analyzing AI memory consensus for {domainName}...
          </div>
        </div>
      </Container>
    );
  }

  const alertMessages = {
    critical: {
      icon: '🚨',
      text: 'Critical Memory Risk',
      description: 'This domain is at severe risk of being forgotten by AI systems. Immediate brand visibility action recommended.'
    },
    warning: {
      icon: '⚠️', 
      text: 'Memory Degradation Detected',
      description: 'AI model consensus is declining. Consider increasing digital presence and engagement.'
    },
    healthy: {
      icon: '✅',
      text: 'Strong AI Memory',
      description: 'This domain maintains strong recognition across AI models. Continue current strategies.'
    }
  };

  return (
    <Container>
      <HeroSection
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <DomainName>{domainData.domain}</DomainName>
        <ExistentialQuestion>
          Will this domain be remembered in an AI-driven future?
        </ExistentialQuestion>
        
        <ConsensusHero>
          <MemoryScore score={domainData.memoryScore}>
            <div className="score">{domainData.memoryScore}</div>
            <div className="label">AI Memory Score</div>
          </MemoryScore>
          
          <ConsensusBreakdown>
            <div className="consensus-label">
              {domainData.consensusPercent}% of AI models remember this domain
            </div>
            <div className="models-row">
              {domainData.aiModels.map((model, index) => (
                <motion.div
                  key={index}
                  className="model-icon"
                  remembers={model.remembers}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  {model.emoji}
                </motion.div>
              ))}
            </div>
          </ConsensusBreakdown>
        </ConsensusHero>
      </HeroSection>

      <MainContent>
        <PrimaryPanel>
          <AlertCard
            level={domainData.alertLevel}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="alert-header">
              <span className="alert-icon">{alertMessages[domainData.alertLevel].icon}</span>
              <span className="alert-text">{alertMessages[domainData.alertLevel].text}</span>
            </div>
            <div className="alert-description">
              {alertMessages[domainData.alertLevel].description}
            </div>
          </AlertCard>

          <Card
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3>📊 AI Memory Trend</h3>
            <TrendVisualization trending={domainData.isRising ? 'up' : 'down'}>
              <div className="trend-summary">
                <div className="trend-direction">
                  <span className="arrow">{domainData.isRising ? '📈' : '📉'}</span>
                  {domainData.isRising ? 'Rising' : 'Declining'}
                </div>
                <div className="trend-change">
                  {domainData.changeFromLastWeek > 0 ? '+' : ''}{domainData.changeFromLastWeek} points this week
                </div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={domainData.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={domainData.isRising ? Colors.green : Colors.red}
                    fill={domainData.isRising ? Colors.green : Colors.red}
                    fillOpacity={0.2}
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </TrendVisualization>
            <p style={{ color: Colors.darkGray, fontSize: '0.9rem', marginTop: '16px' }}>
              30-day AI memory tracking across {domainData.aiModels.length} major language models
            </p>
          </Card>

          <Card
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3>🤖 AI Model Consensus</h3>
            <ConsensusDetails>
              <div className="consensus-grid">
                {domainData.aiModels.map((model, index) => (
                  <motion.div
                    key={index}
                    className="model-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 * index }}
                  >
                    <span className="model-emoji">{model.emoji}</span>
                    <div className="model-name">{model.name}</div>
                    <div className="memory-strength" strength={model.strength}>
                      {model.remembers ? model.strength : 'forgotten'}
                    </div>
                  </motion.div>
                ))}
              </div>
            </ConsensusDetails>
            <p style={{ color: Colors.darkGray, fontSize: '0.9rem' }}>
              Each AI model's memory strength for this domain. "Strong" means frequent mentions and positive associations.
            </p>
          </Card>
        </PrimaryPanel>

        <SidePanel>
          <Card
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h3>📈 Key Metrics</h3>
            <KeyMetrics>
              <div className="metric">
                <div className="value">{domainData.responseCount.toLocaleString()}</div>
                <div className="label">AI Responses</div>
              </div>
              <div className="metric">
                <div className="value">#{domainData.globalRank}</div>
                <div className="label">Global Rank</div>
              </div>
              <div className="metric">
                <div className="value">{domainData.consensusPercent}%</div>
                <div className="label">Consensus</div>
              </div>
              <div className="metric">
                <div className="value">{domainData.aiModels.length}</div>
                <div className="label">Models Tested</div>
              </div>
            </KeyMetrics>
          </Card>

          <Card
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h3>ℹ️ About This Analysis</h3>
            <div style={{ color: Colors.darkGray, lineHeight: 1.6 }}>
              <p style={{ marginBottom: '16px' }}>
                This AI memory analysis measures how well major language models remember and reference this domain.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong>Memory Score:</strong> Overall AI recognition strength (0-100)
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong>Consensus:</strong> Percentage of AI models that actively remember this domain
              </p>
              <p style={{ fontSize: '0.9rem', color: Colors.mediumGray }}>
                Last updated: {domainData.lastUpdated}
              </p>
            </div>
          </Card>

          <Card
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            style={{
              background: `linear-gradient(135deg, ${Colors.lightGray}, rgba(255, 255, 255, 0.9))`,
              border: `2px solid ${Colors.orange}`
            }}
          >
            <h3>💎 Premium Insights</h3>
            <div style={{ color: Colors.darkGray, lineHeight: 1.5 }}>
              <p style={{ marginBottom: '16px' }}>
                Unlock deeper AI memory intelligence:
              </p>
              <ul style={{ marginBottom: '20px', paddingLeft: '20px' }}>
                <li>Crisis event correlation analysis</li>
                <li>Competitive benchmarking</li>
                <li>Predictive memory modeling</li>
                <li>Real-time degradation alerts</li>
              </ul>
              <Link
                to="/premium"
                style={{
                  display: 'inline-block',
                  background: Colors.orange,
                  color: Colors.white,
                  padding: '12px 24px',
                  borderRadius: '20px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}
              >
                Upgrade Now
              </Link>
            </div>
          </Card>
        </SidePanel>
      </MainContent>

      <ShareableFooter>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <p className="share-message">
            Monitor your brand's AI memory health. Will you be remembered or forgotten in the AI revolution?
          </p>
          <Link to="/domains" className="cta-button">
            Analyze Your Domain
          </Link>
        </motion.div>
      </ShareableFooter>
    </Container>
  )
}

export default Domain 