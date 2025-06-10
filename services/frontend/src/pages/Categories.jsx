import React from 'react'
import { Link, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { useCategories } from '../hooks/useMemoryAPI'

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 40px;
  
  @media (max-width: 768px) {
    padding: 60px 20px;
  }
`

const Header = styled.div`
  text-align: center;
  margin-bottom: 80px;
`

const Title = styled(motion.h1)`
  font-size: 48px;
  font-weight: 300;
  margin-bottom: 24px;
  letter-spacing: -0.02em;
  color: #000;
`

const Subtitle = styled(motion.p)`
  font-size: 20px;
  color: #666;
  font-weight: 300;
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
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  padding: 32px;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    border-color: #007AFF;
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(0, 122, 255, 0.1);
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
  font-weight: 500;
  color: #000;
`

const CategoryCount = styled.div`
  font-size: 32px;
  font-weight: 300;
  color: #007AFF;
`

const CategoryMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`

const Trend = styled.span`
  font-size: 14px;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 500;
  background: ${props => 
    props.trend === 'Rising' ? '#E8F5E8' : 
    props.trend === 'Stable' ? '#F0F0F0' : '#FFF0F0'
  };
  color: ${props => 
    props.trend === 'Rising' ? '#34C759' : 
    props.trend === 'Stable' ? '#666' : '#FF3B30'
  };
`

const CategoryDescription = styled.p`
  font-size: 16px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 20px;
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
      font-weight: 500;
      color: #000;
      margin-bottom: 4px;
    }
    
    .label {
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
    font-weight: 500;
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
    
    &:hover {
      background: #007AFF;
      color: #fff;
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

function Categories() {
  const { category } = useParams()
  const { categories } = useCategories()

  if (category && categoryData[category]) {
    // Render single category view
    const cat = categoryData[category]
    return (
      <Container>
        <Header>
          <Title
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {cat.name}
          </Title>
          <Subtitle
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {cat.description}
          </Subtitle>
        </Header>
        
        {/* Single category detailed view would go here */}
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <h2>Category Details Coming Soon</h2>
          <p style={{ color: '#666', marginTop: '16px' }}>
            Detailed category analysis and domain listings will be available in the next update.
          </p>
          <Link 
            to="/categories" 
            style={{ 
              color: '#007AFF', 
              textDecoration: 'none',
              marginTop: '24px',
              display: 'inline-block'
            }}
          >
            ← Back to Categories
          </Link>
        </div>
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
          Domain Categories
        </Title>
        <Subtitle
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Explore memory scores and AI consensus across major industry sectors
        </Subtitle>
      </Header>

      <CategoriesGrid>
        {Object.values(categoryData).map((category, index) => (
          <CategoryCard
            key={category.name}
            as={Link}
            to={`/categories/${category.name}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <CategoryHeader>
              <CategoryName>{category.name}</CategoryName>
              <CategoryCount>{category.count}</CategoryCount>
            </CategoryHeader>

            <CategoryMeta>
              <Trend trend={category.trend}>{category.trend}</Trend>
              <span style={{ fontSize: '14px', color: '#666' }}>
                Avg Score: {category.avgScore}
              </span>
            </CategoryMeta>

            <CategoryDescription>
              {category.description}
            </CategoryDescription>

            <CategoryStats>
              <div className="stat">
                <div className="value">{category.avgScore}</div>
                <div className="label">Avg Score</div>
              </div>
              <div className="stat">
                <div className="value">{category.marketCap}</div>
                <div className="label">Market Cap</div>
              </div>
              <div className="stat">
                <div className="value">{category.topPerformer.split('.')[0]}</div>
                <div className="label">Top Domain</div>
              </div>
            </CategoryStats>

            <TopDomains>
              <div className="title">Sample Domains</div>
              <div className="domains">
                {category.domains.slice(0, 3).map(domain => (
                  <span key={domain} className="domain">
                    {domain}
                  </span>
                ))}
                {category.domains.length > 3 && (
                  <span className="domain">+{category.domains.length - 3} more</span>
                )}
              </div>
            </TopDomains>
          </CategoryCard>
        ))}
      </CategoriesGrid>
    </Container>
  )
}

export default Categories 