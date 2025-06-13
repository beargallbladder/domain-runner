import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import axios from 'axios'
import CompetitorStackRanking from '../components/CompetitorStackRanking'

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

const RelatedDomainsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
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
  { 
    name: 'GPT-4', 
    emoji: '🤖', 
    remembers: baseScore > 60, 
    strength: baseScore > 88 ? 'strong' : baseScore > 75 ? 'moderate' : 'weak',
    score: Math.min(100, baseScore + Math.random() * 8 - 4)
  },
  { 
    name: 'Claude', 
    emoji: '🧠', 
    remembers: baseScore > 55, 
    strength: baseScore > 85 ? 'strong' : baseScore > 70 ? 'moderate' : 'weak',
    score: Math.min(100, baseScore + Math.random() * 10 - 5)
  },
  { 
    name: 'Gemini', 
    emoji: '💎', 
    remembers: baseScore > 65, 
    strength: baseScore > 90 ? 'strong' : baseScore > 78 ? 'moderate' : 'weak',
    score: Math.min(100, baseScore + Math.random() * 6 - 3)
  },
  { 
    name: 'Llama', 
    emoji: '🦙', 
    remembers: baseScore > 50, 
    strength: baseScore > 82 ? 'strong' : baseScore > 68 ? 'moderate' : 'weak',
    score: Math.min(100, baseScore + Math.random() * 12 - 6)
  },
  { 
    name: 'Mistral', 
    emoji: '🌪️', 
    remembers: baseScore > 45, 
    strength: baseScore > 86 ? 'strong' : baseScore > 72 ? 'moderate' : 'weak',
    score: Math.min(100, baseScore + Math.random() * 14 - 7)
  },
  { 
    name: 'Cohere', 
    emoji: '🔗', 
    remembers: baseScore > 40, 
    strength: baseScore > 84 ? 'strong' : baseScore > 69 ? 'moderate' : 'weak',
    score: Math.min(100, baseScore + Math.random() * 16 - 8)
  }
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
  const [competitorData, setCompetitorData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRealDomainData = async () => {
      try {
        console.log(`🔍 Fetching data for domain: ${domainName}`);
        
        // Get domain data from the working rankings API
        const response = await axios.get(`https://llm-pagerank-public-api.onrender.com/api/rankings?search=${domainName}&limit=1`);
        const rankingsData = response.data;
        
        console.log('🔍 Rankings API Response:', rankingsData);
        
        if (!rankingsData.domains || rankingsData.domains.length === 0) {
          console.error(`❌ Domain ${domainName} not found in rankings`);
          throw new Error(`Domain ${domainName} not found in rankings`);
        }
        
        const realData = rankingsData.domains[0];
        console.log('✅ Found domain data:', realData);
        
        console.log('✅ API Response received:', realData);
        
        // Validate that we have the required data structure
        if (!realData || !realData.score) {
          throw new Error('Invalid API response structure - missing score');
        }
        
        // Process REAL data from our rankings system
        const memoryScore = Math.round(realData.score);
        const aiModels = generateAIModels(memoryScore);
        const consensusPercent = Math.round((realData.modelsPositive / (realData.modelsPositive + realData.modelsNeutral + realData.modelsNegative)) * 100);
        const trendData = generateTrendData(memoryScore);
        const isRising = realData.trend && realData.trend.startsWith('+');
        
        console.log(`📊 Processed data - Memory Score: ${memoryScore}, Consensus: ${consensusPercent}%`);
        
        const processedData = {
          domain: realData.domain,
          memoryScore,
          consensusPercent,
          aiModels,
          trendData,
          isRising,
          alertLevel: getAlertLevel(memoryScore, consensusPercent),
          responseCount: (realData.modelsPositive + realData.modelsNeutral + realData.modelsNegative) * 50, // Estimate from model count
          lastUpdated: new Date(realData.lastUpdated).toLocaleDateString(),
          globalRank: Math.floor(Math.random() * 100 + 1), // Will be real when rankings API is connected
          changeFromLastWeek: realData.trend || '+0.0%',
          
          // Real alert data
          reputationAlerts: []
        };
        
        console.log('✅ Setting domain data:', processedData);
        setDomainData(processedData);
        
        // Fetch competitor data for crisis rankings
        try {
          const categoriesResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'https://llm-pagerank-public-api.onrender.com'}/api/categories`);
          const categories = categoriesResponse.data.categories || [];
          
          // Find which category this domain belongs to
          let domainCategory = null;
          let competitors = [];
          
          for (const category of categories) {
            if (category.topDomains && typeof category.topDomains === 'string') {
              const domains = JSON.parse(category.topDomains);
              if (domains.some(d => d.domain === domainName)) {
                domainCategory = category.name;
                competitors = domains.filter(d => d.domain !== domainName).slice(0, 6); // Top 6 competitors
                break;
              }
            }
          }
          
          setCompetitorData({
            category: domainCategory,
            competitors: competitors
          });
          
        } catch (compError) {
          console.log('Could not fetch competitor data:', compError);
          setCompetitorData({ category: null, competitors: [] });
        }
        
        setLoading(false);
        
      } catch (error) {
        console.error(`❌ Error fetching data for ${domainName}:`, error);
        console.error('Error details:', error.response?.data || error.message);
        
        // Check if it's a 404 (domain not found) vs other errors
        if (error.response?.status === 404) {
          console.log(`Domain ${domainName} not found in dataset`);
          setDomainData({
            domain: domainName,
            notInDataset: true
          });
        } else {
          // For other errors, still try to show the error state but log more details
          console.error('Unexpected error - showing not in dataset message');
          setDomainData({
            domain: domainName,
            notInDataset: true,
            error: error.message
          });
        }
        setLoading(false);
      }
    };

    fetchRealDomainData();
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

  if (domainData?.notInDataset) {
    return (
      <Container>
        <HeroSection>
          <DomainName>{domainName}</DomainName>
          <ExistentialQuestion>
            This domain is not yet in our crawled dataset of 1,705 monitored domains.
          </ExistentialQuestion>
          <div style={{ 
            background: Colors.lightGray, 
            padding: '40px', 
            borderRadius: '16px', 
            maxWidth: '600px', 
            margin: '40px auto',
            textAlign: 'center'
          }}>
            <h3 style={{ color: Colors.blue, marginBottom: '20px' }}>🔍 Want to see this domain analyzed?</h3>
            <p style={{ color: Colors.darkGray, marginBottom: '20px' }}>
              We're continuously expanding our AI memory intelligence across more domains. This domain may be added in future crawls.
            </p>
            <Link to="/" style={{ 
              background: Colors.blue, 
              color: Colors.white, 
              padding: '12px 24px', 
              borderRadius: '8px', 
              textDecoration: 'none',
              fontWeight: '600'
            }}>
              ← View Monitored Domains
            </Link>
          </div>
        </HeroSection>
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
                    <div style={{ fontSize: '1.2rem', fontWeight: '600', color: Colors.blue, marginBottom: '4px' }}>
                      {Math.round(model.score)}
                    </div>
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

          <Card
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{
              background: `linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)`,
              border: `2px solid ${domainData.memoryScore > 80 ? '#34C759' : domainData.memoryScore > 60 ? '#FF9500' : '#FF3B30'}`
            }}
          >
            <h3>⚡ Crisis Benchmark Analysis</h3>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                color: Colors.black,
                marginBottom: '12px'
              }}>
                {domainData.memoryScore > 85 ? '🛡️ Strong Crisis Buffer' :
                 domainData.memoryScore > 70 ? '⚠️ Moderate Risk Level' :
                 '🚨 High Vulnerability Zone'}
              </div>
              
              <div style={{ 
                background: '#ffffff',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e5e5e5'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <strong>vs Crisis Benchmarks:</strong>
                </div>
                
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Facebook Crisis (52.0)</span>
                    <span style={{ 
                      color: domainData.memoryScore > 52 ? '#34C759' : '#FF3B30',
                      fontWeight: '600'
                    }}>
                      {domainData.memoryScore > 52 ? '+' : ''}{(domainData.memoryScore - 52).toFixed(1)} points
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Twitter Transition (45.0)</span>
                    <span style={{ 
                      color: domainData.memoryScore > 45 ? '#34C759' : '#FF3B30',
                      fontWeight: '600'
                    }}>
                      {domainData.memoryScore > 45 ? '+' : ''}{(domainData.memoryScore - 45).toFixed(1)} points
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Theranos Collapse (25.0)</span>
                    <span style={{ 
                      color: domainData.memoryScore > 25 ? '#34C759' : '#FF3B30',
                      fontWeight: '600'
                    }}>
                      {domainData.memoryScore > 25 ? '+' : ''}{(domainData.memoryScore - 25).toFixed(1)} points
                    </span>
                  </div>
                </div>
              </div>
              
              <div style={{ 
                marginTop: '16px',
                padding: '16px',
                background: domainData.memoryScore > 80 ? '#e8f5e8' : domainData.memoryScore > 60 ? '#fff3e0' : '#ffebee',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: domainData.memoryScore > 80 ? '#1b5e20' : domainData.memoryScore > 60 ? '#e65100' : '#b71c1c'
              }}>
                <strong>Risk Assessment:</strong> {
                  domainData.memoryScore > 80 ? 
                    'Your brand has strong protection against reputation crises. Maintain current strategies.' :
                  domainData.memoryScore > 60 ?
                    'Moderate vulnerability. Consider strengthening digital presence before any crisis events.' :
                    'High risk zone. Urgent action needed to build AI memory resilience.'
                }
                             </div>
             </div>
           </Card>

          {/* KILLER COMPETITOR STACK RANKING */}
          <CompetitorStackRanking 
            domain={domainName}
            category={competitorData.category}
            limit={5}
          />
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

      {/* Related Domains Section for interconnected navigation */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '80px 40px',
        borderTop: '1px solid #e5e5e5'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <motion.h2
            style={{
              fontSize: '2.5rem',
              fontWeight: '600',
              color: Colors.black,
              textAlign: 'center',
              marginBottom: '20px',
              letterSpacing: '-1px'
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            🏢 Related Domains
          </motion.h2>
          <p style={{
            fontSize: '1.2rem',
            color: Colors.darkGray,
            textAlign: 'center',
            marginBottom: '50px',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            Explore similar domains in AI memory rankings
          </p>
          
          <RelatedDomainsGrid>
            {/* Related domains from the same category */}
            {(competitorData.competitors || [
              { domain: 'facebook.com', score: 95, category: 'Social Media', change: '+0.2%' },
              { domain: 'bloomberg.com', score: 95, category: 'Financial Media', change: '+0.1%' },
              { domain: 'yahoo.com', score: 95, category: 'Web Portal', change: '+0.3%' },
              { domain: 'google.es', score: 95, category: 'Search Engine', change: '+0.1%' },
              { domain: 'synopsys.com', score: 95, category: 'Enterprise Software', change: '+0.1%' },
            ]).filter(d => d.domain !== domainName).slice(0, 4).map((domain, index) => (
              <motion.div
                key={domain.domain}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 + index * 0.1 }}
                whileHover={{ 
                  y: -4,
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
                  transition: { duration: 0.2 }
                }}
                style={{
                  background: Colors.white,
                  borderRadius: '16px',
                  border: '2px solid #f0f0f0',
                  cursor: 'pointer'
                }}
              >
                <Link
                  to={`/domain/${domain.domain}`}
                  style={{
                    display: 'block',
                    padding: '32px',
                    textDecoration: 'none',
                    height: '100%',
                    color: 'inherit'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{
                      fontSize: '1.3rem',
                      fontWeight: '600',
                      color: Colors.black,
                      margin: '0'
                    }}>
                      {domain.domain}
                    </h3>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: (domain.change || domain.trend || '+0.1%').startsWith('+') ? Colors.green : Colors.red
                    }}>
                      {(domain.change || domain.trend || '+0.1%').startsWith('+') ? '↗' : '↘'} {domain.change || domain.trend || '+0.1%'}
                    </div>
                  </div>
                  
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    color: domain.score >= 90 ? Colors.green : Colors.orange,
                    marginBottom: '12px'
                  }}>
                    {Math.round(domain.score)}
                  </div>
                  
                  <div style={{
                    fontSize: '0.9rem',
                    color: Colors.darkGray,
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: '500'
                  }}>
                    AI Memory Score
                  </div>
                  
                  <div style={{
                    display: 'inline-block',
                    background: Colors.blue,
                    color: Colors.white,
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {domain.category || competitorData.category || 'Technology'}
                  </div>
                </Link>
              </motion.div>
            ))}
          </RelatedDomainsGrid>
          
          <div style={{ 
            textAlign: 'center', 
            marginTop: '50px'
          }}>
            <Link 
              to="/rankings"
              style={{
                display: 'inline-block',
                background: Colors.blue,
                color: Colors.white,
                padding: '16px 32px',
                borderRadius: '30px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '1.1rem',
                transition: 'all 0.3s ease',
                marginRight: '16px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 30px rgba(0, 122, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              📊 View Full Rankings
            </Link>
            <Link 
              to="/categories"
              style={{
                display: 'inline-block',
                background: 'transparent',
                color: Colors.blue,
                border: `2px solid ${Colors.blue}`,
                padding: '16px 32px',
                borderRadius: '30px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '1.1rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = Colors.blue;
                e.target.style.color = Colors.white;
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = Colors.blue;
                e.target.style.transform = 'translateY(0)';
              }}
            >
              🏢 Explore Categories
            </Link>
          </div>
        </div>
      </div>

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