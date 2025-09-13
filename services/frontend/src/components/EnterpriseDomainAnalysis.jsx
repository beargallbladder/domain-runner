import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const AnalysisContainer = styled.div`
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 20px;
  padding: 40px;
  margin: 40px 0;
  position: relative;
  overflow: hidden;
`;

const EnterpriseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  
  .title {
    font-size: 2rem;
    font-weight: 700;
    color: #1d1d1f;
  }
  
  .upgrade-badge {
    background: linear-gradient(135deg, #ff6b35 0%, #f7971e 100%);
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    cursor: pointer;
    transition: transform 0.2s ease;
    
    &:hover {
      transform: scale(1.05);
    }
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
`;

const MetricCard = styled(motion.div)`
  background: white;
  border-radius: 15px;
  padding: 25px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
  transition: border-color 0.3s ease;
  
  &:hover {
    border-color: ${props => props.premium ? '#ff6b35' : '#007AFF'};
  }
  
  .metric-value {
    font-size: 2.5rem;
    font-weight: 800;
    color: ${props => props.premium ? '#ff6b35' : '#007AFF'};
    margin-bottom: 10px;
  }
  
  .metric-label {
    font-size: 1rem;
    color: #666;
    font-weight: 600;
  }
  
  .metric-change {
    font-size: 0.9rem;
    margin-top: 5px;
    color: ${props => props.positive ? '#30d158' : '#ff3b30'};
    font-weight: 600;
  }
`;

const PremiumOverlay = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(255, 107, 53, 0.95) 0%, 
    rgba(247, 151, 30, 0.95) 100%
  );
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  text-align: center;
  padding: 40px;
  backdrop-filter: blur(10px);
  
  .unlock-title {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 20px;
  }
  
  .unlock-desc {
    font-size: 1.2rem;
    margin-bottom: 30px;
    line-height: 1.6;
    max-width: 600px;
  }
  
  .feature-list {
    list-style: none;
    padding: 0;
    margin: 20px 0;
    
    li {
      padding: 8px 0;
      font-size: 1.1rem;
      
      &::before {
        content: '✓ ';
        color: #30d158;
        font-weight: bold;
        margin-right: 10px;
      }
    }
  }
`;

const UnlockButton = styled.button`
  background: white;
  color: #ff6b35;
  border: none;
  padding: 15px 40px;
  border-radius: 30px;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }
`;

const AdvancedChart = styled.div`
  background: white;
  border-radius: 15px;
  padding: 30px;
  margin: 20px 0;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    .chart-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: #1d1d1f;
    }
    
    .time-selector {
      display: flex;
      gap: 10px;
      
      button {
        padding: 5px 15px;
        border: 2px solid #e5e5e7;
        background: white;
        border-radius: 20px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s ease;
        
        &.active {
          background: #007AFF;
          color: white;
          border-color: #007AFF;
        }
        
        &:hover:not(.active) {
          border-color: #007AFF;
        }
      }
    }
  }
`;

const CompetitorInsights = styled.div`
  background: white;
  border-radius: 15px;
  padding: 30px;
  margin: 20px 0;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  
  .insights-header {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 20px;
    color: #1d1d1f;
  }
  
  .insight-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 0;
    border-bottom: 1px solid #e5e5e7;
    
    &:last-child {
      border-bottom: none;
    }
    
    .insight-text {
      font-size: 1.1rem;
      color: #333;
    }
    
    .insight-value {
      font-size: 1.2rem;
      font-weight: 700;
      color: #007AFF;
    }
  }
`;

const EnterpriseDomainAnalysis = ({ domain, isEnterprise = false }) => {
  const [showPremiumOverlay, setShowPremiumOverlay] = useState(!isEnterprise);
  const [domainData, setDomainData] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    const fetchEnterpriseData = async () => {
      try {
        // Fetch both public and enterprise data
        const publicResponse = await axios.get(`/api/domains/${domain}/public`);
        
        if (isEnterprise) {
          // Enterprise users get additional data
          const enterpriseResponse = await axios.get(`/api/premium/domain/${domain}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          
          setDomainData({
            ...publicResponse.data,
            ...enterpriseResponse.data
          });
        } else {
          setDomainData(publicResponse.data);
        }
      } catch (error) {
        console.error('Error fetching domain data:', error);
      }
    };

    fetchEnterpriseData();
  }, [domain, isEnterprise]);

  const handleUpgrade = () => {
    window.location.href = '/register?plan=enterprise&domain=' + domain;
  };

  if (!domainData) {
    return <div>Loading advanced analytics...</div>;
  }

  const enterpriseMetrics = [
    {
      value: domainData.sentiment_trend || '+12.3%',
      label: 'Sentiment Trend',
      change: '+2.1%',
      positive: true,
      premium: true
    },
    {
      value: domainData.crisis_probability || '8.2%',
      label: 'Crisis Risk',
      change: '-1.5%',
      positive: true,
      premium: true
    },
    {
      value: domainData.competitive_advantage || '73%',
      label: 'Competitive Edge',
      change: '+5.2%',
      positive: true,
      premium: true
    },
    {
      value: domainData.market_share_ai || '15.2%',
      label: 'AI Market Share',
      change: '+0.8%',
      positive: true,
      premium: true
    },
    {
      value: domainData.brand_velocity || '2.4x',
      label: 'Brand Velocity',
      change: '+0.3x',
      positive: true,
      premium: true
    },
    {
      value: domainData.prediction_accuracy || '94.7%',
      label: 'Prediction Accuracy',
      change: '+1.2%',
      positive: true,
      premium: true
    }
  ];

  return (
    <AnalysisContainer>
      <EnterpriseHeader>
        <div className="title">Advanced Analytics</div>
        {!isEnterprise && (
          <div className="upgrade-badge" onClick={handleUpgrade}>
            Unlock Enterprise
          </div>
        )}
      </EnterpriseHeader>

      <MetricsGrid>
        {enterpriseMetrics.map((metric, index) => (
          <MetricCard
            key={index}
            premium={metric.premium}
            positive={metric.positive}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="metric-value">{metric.value}</div>
            <div className="metric-label">{metric.label}</div>
            <div className="metric-change">{metric.change}</div>
          </MetricCard>
        ))}
      </MetricsGrid>

      <AdvancedChart>
        <div className="chart-header">
          <div className="chart-title">AI Memory Evolution</div>
          <div className="time-selector">
            {['24h', '7d', '30d', '90d'].map(range => (
              <button
                key={range}
                className={timeRange === range ? 'active' : ''}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: '200px', background: '#f8f9fa', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
          {isEnterprise ? 'Interactive Chart Would Render Here' : 'Chart Preview - Enterprise Feature'}
        </div>
      </AdvancedChart>

      <CompetitorInsights>
        <div className="insights-header">Competitive Intelligence</div>
        {[
          { text: 'Market position vs top competitor', value: '+12.3 points' },
          { text: 'AI mention frequency advantage', value: '2.4x higher' },
          { text: 'Sentiment stability compared to sector', value: '15% better' },
          { text: 'Crisis resilience vs industry average', value: '3.2x stronger' }
        ].map((insight, index) => (
          <div key={index} className="insight-item">
            <div className="insight-text">{insight.text}</div>
            <div className="insight-value">{insight.value}</div>
          </div>
        ))}
      </CompetitorInsights>

      <AnimatePresence>
        {showPremiumOverlay && !isEnterprise && (
          <PremiumOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="unlock-title">🚀 Enterprise Intelligence</div>
            <div className="unlock-desc">
              Unlock the complete picture of your brand's AI reputation with enterprise-grade analytics, 
              real-time monitoring, and predictive insights that Fortune 500 companies rely on.
            </div>
            
            <ul className="feature-list">
              <li>Real-time sentiment tracking across 30+ AI models</li>
              <li>Predictive crisis detection with 94.7% accuracy</li>
              <li>Competitive benchmarking and market positioning</li>
              <li>Custom alerts and automated reporting</li>
              <li>API access for integration with your tools</li>
              <li>Dedicated success manager and priority support</li>
            </ul>
            
            <UnlockButton onClick={handleUpgrade}>
              Start Enterprise Trial
            </UnlockButton>
            
            <div style={{ marginTop: '20px', fontSize: '0.9rem', opacity: '0.8' }}>
              14-day free trial • No credit card required • Cancel anytime
            </div>
          </PremiumOverlay>
        )}
      </AnimatePresence>
    </AnalysisContainer>
  );
};

export default EnterpriseDomainAnalysis;