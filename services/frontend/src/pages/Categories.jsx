import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import ConsensusVisualization from '../components/ConsensusVisualization'

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 40px;
  background: #ffffff;
  min-height: 100vh;
  
  @media (max-width: 768px) {
    padding: 60px 20px;
  }
`

const Breadcrumbs = styled.div`
  margin-bottom: 40px;
  font-size: 14px;
  color: #666;
  
  a {
    color: #007AFF;
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  .separator {
    margin: 0 8px;
    color: #ccc;
  }
  
  .current {
    color: #000;
    font-weight: 600;
  }
`

const Header = styled.div`
  text-align: center;
  margin-bottom: 80px;
`

const Title = styled(motion.h1)`
  font-size: 48px;
  font-weight: 500;
  margin-bottom: 24px;
  letter-spacing: -0.02em;
  color: #000;
`

const Subtitle = styled(motion.p)`
  font-size: 20px;
  color: #666;
  font-weight: 400;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
`

const CategoriesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 32px;
  margin-bottom: 80px;
`

const CategoryCard = styled(motion.div)`
  background: #fff;
  border: 2px solid #f0f0f0;
  border-radius: 16px;
  padding: 32px;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => 
      props.trend === 'Rising' ? 'linear-gradient(90deg, #34C759, #30D158)' : 
      props.trend === 'Stable' ? 'linear-gradient(90deg, #007AFF, #32D74B)' : 
      'linear-gradient(90deg, #FF3B30, #FF9500)'
    };
  }
  
  &:hover {
    border-color: #007AFF;
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 122, 255, 0.15);
  }
`

const CategoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`

const CategoryName = styled.h3`
  font-size: 24px;
  font-weight: 600;
  color: #000;
`

const CategoryCount = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #007AFF;
  text-shadow: 0 0 20px rgba(0, 122, 255, 0.2);
`

const CategoryMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`

const Trend = styled.span`
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${props => 
    props.trend === 'Rising' ? '#E8F5E8' : 
    props.trend === 'Stable' ? '#E3F2FD' : '#FFEBEE'
  };
  color: ${props => 
    props.trend === 'Rising' ? '#1B5E20' : 
    props.trend === 'Stable' ? '#0D47A1' : '#B71C1C'
  };
  
  &::before {
    content: '${props => 
      props.trend === 'Rising' ? '📈' : 
      props.trend === 'Stable' ? '📊' : '📉'
    }';
    margin-right: 4px;
  }
`

const CategoryDescription = styled.p`
  font-size: 16px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 20px;
  font-weight: 400;
`

const CategoryStats = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #999;
  
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .value {
      font-size: 18px;
      font-weight: 600;
      color: #000;
      margin-bottom: 4px;
    }
    
    .label {
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }
  }
`

const TopDomains = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
  
  .title {
    font-size: 14px;
    color: #666;
    margin-bottom: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .domains {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .domain {
    padding: 6px 12px;
    background: #f8f9fa;
    border-radius: 20px;
    font-size: 12px;
    color: #666;
    transition: all 0.2s ease;
    font-weight: 500;
    
    &:hover {
      background: #007AFF;
      color: #fff;
      transform: translateY(-1px);
    }
  }
`

const DomainGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 40px;
`

const DomainCard = styled(motion.div)`
  background: #fff;
  border: 2px solid #f0f0f0;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => 
      props.score >= 90 ? 'linear-gradient(90deg, #34C759, #30D158)' : 
      props.score >= 70 ? 'linear-gradient(90deg, #FF9500, #FFCC02)' : 
      'linear-gradient(90deg, #FF3B30, #FF6B6B)'
    };
    border-radius: 12px 12px 0 0;
  }
  
  &:hover {
    border-color: #007AFF;
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(0, 122, 255, 0.15);
  }
`

const DomainHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`

const DomainName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin: 0;
`

const MemoryScore = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${props => 
    props.score >= 90 ? '#34C759' : 
    props.score >= 70 ? '#FF9500' : '#FF3B30'
  };
  text-shadow: 0 0 15px ${props => 
    props.score >= 90 ? 'rgba(52, 199, 89, 0.3)' : 
    props.score >= 70 ? 'rgba(255, 149, 0, 0.3)' : 'rgba(255, 59, 48, 0.3)'
  };
  
  &::after {
    content: '${props => 
      props.score >= 90 ? '🔥' : 
      props.score >= 70 ? '⚡' : '⚠️'
    }';
    font-size: 16px;
    margin-left: 8px;
  }
`

const DomainMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #666;
  margin-bottom: 12px;
  font-weight: 500;
`

const DomainDescription = styled.p`
  font-size: 14px;
  color: #666;
  line-height: 1.4;
  margin: 0;
  font-weight: 400;
`

const CategorySummary = styled.div`
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px solid #e5e5e5;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 40px;
  text-align: center;
  
  .title {
    font-size: 24px;
    font-weight: 600;
    color: #000;
    margin-bottom: 12px;
  }
  
  .stats {
    display: flex;
    justify-content: center;
    gap: 40px;
    margin-top: 20px;
    
    @media (max-width: 768px) {
      flex-direction: column;
      gap: 16px;
    }
  }
  
  .stat {
    text-align: center;
    
    .value {
      font-size: 28px;
      font-weight: 700;
      color: #007AFF;
      display: block;
      text-shadow: 0 0 20px rgba(0, 122, 255, 0.2);
    }
    
    .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
  }
`

const categoryData = {
  'AI/ML': {
    name: 'AI/ML',
    count: 45,
    trend: 'Rising',
    description: 'Artificial Intelligence and Machine Learning companies leading the future of technology.',
    avgScore: 92,
    topPerformer: 'openai.com',
    marketCap: '$2.8T',
    domains: ['openai.com', 'anthropic.com', 'huggingface.co', 'stability.ai', 'midjourney.com']
  },
  'Biotech': {
    name: 'Biotech',
    count: 15,
    trend: 'Rising',
    description: 'Biotechnology and pharmaceutical companies advancing healthcare innovation.',
    avgScore: 78,
    topPerformer: 'moderna.com',
    marketCap: '$1.2T',
    domains: ['moderna.com', 'pfizer.com', 'gilead.com', 'regeneron.com', 'biogen.com']
  },
  'Aerospace': {
    name: 'Aerospace',
    count: 12,
    trend: 'Stable',
    description: 'Aerospace, defense, and space exploration companies.',
    avgScore: 82,
    topPerformer: 'spacex.com',
    marketCap: '$800B',
    domains: ['spacex.com', 'boeing.com', 'lockheedmartin.com', 'northropgrumman.com']
  },
  'Energy': {
    name: 'Energy',
    count: 15,
    trend: 'Rising',
    description: 'Energy companies including renewable and traditional sources.',
    avgScore: 75,
    topPerformer: 'tesla.com',
    marketCap: '$1.5T',
    domains: ['tesla.com', 'exxonmobil.com', 'chevron.com', 'shell.com', 'bp.com']
  },
  'Semiconductors': {
    name: 'Semiconductors',
    count: 15,
    trend: 'Rising',
    description: 'Semiconductor and hardware companies powering digital infrastructure.',
    avgScore: 88,
    topPerformer: 'nvidia.com',
    marketCap: '$3.2T',
    domains: ['nvidia.com', 'amd.com', 'intel.com', 'tsmc.com', 'asml.com']
  },
  'Telecom': {
    name: 'Telecom',
    count: 10,
    trend: 'Stable',
    description: 'Telecommunications and networking infrastructure companies.',
    avgScore: 71,
    topPerformer: 'verizon.com',
    marketCap: '$600B',
    domains: ['verizon.com', 'att.com', 'tmobile.com', 'cisco.com', 'qualcomm.com']
  },
  'Manufacturing': {
    name: 'Manufacturing',
    count: 10,
    trend: 'Stable',
    description: 'Industrial manufacturing and automation companies.',
    avgScore: 69,
    topPerformer: 'caterpillar.com',
    marketCap: '$900B',
    domains: ['caterpillar.com', 'ge.com', '3m.com', 'honeywell.com', 'siemens.com']
  },
  'International': {
    name: 'International',
    count: 8,
    trend: 'Rising',
    description: 'Leading international companies from global markets.',
    avgScore: 84,
    topPerformer: 'tencent.com',
    marketCap: '$1.8T',
    domains: ['tencent.com', 'alibaba.com', 'samsung.com', 'sony.com', 'toyota.com']
  }
}

// Generate mock domain data for each category
const generateDomainData = (category) => {
  const baseData = categoryData[category]
  if (!baseData) return []
  
  return baseData.domains.map((domain, index) => ({
    name: domain,
    score: Math.max(60, baseData.avgScore + (Math.random() - 0.5) * 20),
    trend: Math.random() > 0.5 ? 'Rising' : 'Stable',
    responses: Math.floor(Math.random() * 500) + 100,
    models: Math.floor(Math.random() * 5) + 10,
    description: `Leading ${category.toLowerCase()} company with strong market presence and technological innovation.`
  }))
}

function Categories() {
  const { category } = useParams()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://llm-pagerank-public-api.onrender.com'}/api/categories`)
        const data = await response.json()
        setCategories(data.categories || [])
      } catch (error) {
        console.error('Failed to fetch categories:', error)
        // Fallback to some demo data
        setCategories([
          {
            name: 'Technology',
            totalDomains: 45,
            averageScore: 88.5,
            topDomains: [
              { domain: 'google.com', score: 95, modelsPositive: 15, modelsNeutral: 2, modelsNegative: 1 },
              { domain: 'microsoft.com', score: 94, modelsPositive: 14, modelsNeutral: 3, modelsNegative: 1 },
              { domain: 'apple.com', score: 93, modelsPositive: 13, modelsNeutral: 3, modelsNegative: 2 }
            ]
          },
          {
            name: 'Social Media',
            totalDomains: 12,
            averageScore: 76.2,
            topDomains: [
              { domain: 'facebook.com', score: 82, modelsPositive: 10, modelsNeutral: 4, modelsNegative: 4 },
              { domain: 'twitter.com', score: 79, modelsPositive: 9, modelsNeutral: 5, modelsNegative: 4 },
              { domain: 'instagram.com', score: 77, modelsPositive: 8, modelsNeutral: 6, modelsNegative: 4 }
            ]
          },
          {
            name: 'E-commerce',
            totalDomains: 18,
            averageScore: 85.1,
            topDomains: [
              { domain: 'amazon.com', score: 96, modelsPositive: 16, modelsNeutral: 1, modelsNegative: 1 },
              { domain: 'ebay.com', score: 84, modelsPositive: 11, modelsNeutral: 4, modelsNegative: 3 },
              { domain: 'shopify.com', score: 81, modelsPositive: 10, modelsNeutral: 5, modelsNegative: 3 }
            ]
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>Loading Categories...</Title>
        </Header>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <Title
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          AI Memory Categories
        </Title>
        <Subtitle
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Explore domains by category with real-time consensus visualization from AI models
        </Subtitle>
      </Header>

      <CategoriesGrid>
        {categories.map((cat, index) => (
          <CategoryCard
            key={cat.name}
            trend="Rising"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <CategoryHeader>
              <CategoryName>{cat.name}</CategoryName>
              <CategoryCount>{cat.totalDomains}</CategoryCount>
            </CategoryHeader>

            <CategoryMeta>
              <Trend trend="Rising">Rising</Trend>
              <span style={{ fontSize: '14px', color: '#666', fontWeight: '600' }}>
                Avg: {Math.round(cat.averageScore)}
              </span>
            </CategoryMeta>

            <CategoryDescription>
              {cat.totalDomains} domains tracked with real-time AI consensus monitoring
            </CategoryDescription>

            <CategoryStats>
              <div className="stat">
                <div className="value">{Math.round(cat.averageScore)}</div>
                <div className="label">Avg Memory</div>
              </div>
              <div className="stat">
                <div className="value">{cat.totalDomains}</div>
                <div className="label">Domains</div>
              </div>
              <div className="stat">
                <div className="value">
                  {cat.topDomains && cat.topDomains[0] ? cat.topDomains[0].domain.split('.')[0] : 'N/A'}
                </div>
                <div className="label">Top Domain</div>
              </div>
            </CategoryStats>

            <TopDomains>
              <div className="title">Top Domains with Consensus</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                {(cat.topDomains || []).slice(0, 3).map(domain => (
                  <div key={domain.domain} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    <Link 
                      to={`/domain/${domain.domain}`}
                      style={{ 
                        color: '#007AFF', 
                        fontWeight: '600', 
                        textDecoration: 'none',
                        fontSize: '14px'
                      }}
                    >
                      {domain.domain}
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#000' }}>
                        {Math.round(domain.score)}
                      </span>
                      <ConsensusVisualization 
                        modelsPositive={domain.modelsPositive}
                        modelsNeutral={domain.modelsNeutral}
                        modelsNegative={domain.modelsNegative}
                        size="small"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TopDomains>
          </CategoryCard>
        ))}
      </CategoriesGrid>
      
      <div style={{ textAlign: 'center', marginTop: '60px' }}>
        <Link 
          to="/rankings" 
          style={{ 
            color: '#007AFF', 
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '600',
            padding: '12px 24px',
            border: '2px solid #007AFF',
            borderRadius: '8px',
            transition: 'all 0.3s ease',
            marginRight: '16px'
          }}
        >
          View Full Rankings →
        </Link>
        <Link 
          to="/shadows" 
          style={{ 
            color: '#FF3B30', 
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '600',
            padding: '12px 24px',
            border: '2px solid #FF3B30',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}
        >
          Explore Memory Shadows →
        </Link>
      </div>
    </Container>
  )
}

export default Categories 