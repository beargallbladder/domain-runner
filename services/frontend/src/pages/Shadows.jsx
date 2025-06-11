import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import ConsensusVisualization from '../components/ConsensusVisualization'

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 40px;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  min-height: 100vh;
  color: #ffffff;
  
  @media (max-width: 768px) {
    padding: 60px 20px;
  }
`

const Header = styled.div`
  text-align: center;
  margin-bottom: 80px;
`

const Title = styled(motion.h1)`
  font-size: 56px;
  font-weight: 700;
  margin-bottom: 24px;
  letter-spacing: -0.02em;
  color: #ffffff;
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.1);
  
  .accent {
    color: #FF3B30;
    text-shadow: 0 0 20px rgba(255, 59, 48, 0.3);
  }
`

const Subtitle = styled(motion.p)`
  font-size: 20px;
  color: #888888;
  font-weight: 400;
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.6;
`

const ShadowsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 32px;
  margin-bottom: 80px;
`

const ShadowCard = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border: 2px solid #333333;
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
    background: linear-gradient(90deg, #FF3B30, #FF6B6B, #333333);
  }
  
  &:hover {
    border-color: #FF3B30;
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(255, 59, 48, 0.2);
  }
`

const ShadowHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`

const DomainName = styled.h3`
  font-size: 24px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
`

const MemoryScore = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #FF3B30;
  text-shadow: 0 0 15px rgba(255, 59, 48, 0.5);
  
  .trend {
    font-size: 16px;
    margin-left: 8px;
    color: #FF6B6B;
  }
`

const ShadowMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 12px;
  color: #888;
  font-weight: 500;
`

const DeclineIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #FF6B6B;
  font-weight: 600;
  
  .icon {
    font-size: 16px;
  }
`

const ShadowDescription = styled.p`
  font-size: 14px;
  color: #cccccc;
  line-height: 1.5;
  margin-bottom: 20px;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 40px;
  
  .icon {
    font-size: 64px;
    margin-bottom: 24px;
    opacity: 0.3;
  }
  
  .title {
    font-size: 24px;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 16px;
  }
  
  .description {
    font-size: 16px;
    color: #888888;
    max-width: 500px;
    margin: 0 auto;
    line-height: 1.6;
  }
`

const FilterControls = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 40px;
  flex-wrap: wrap;
`

const FilterButton = styled.button`
  padding: 12px 24px;
  border: 2px solid ${props => props.active ? '#FF3B30' : '#333333'};
  background: ${props => props.active ? 'rgba(255, 59, 48, 0.1)' : 'transparent'};
  color: ${props => props.active ? '#FF3B30' : '#888888'};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #FF3B30;
    color: #FF3B30;
    background: rgba(255, 59, 48, 0.1);
  }
`

function Shadows() {
  const [shadows, setShadows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchShadows = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://llm-pagerank-public-api.onrender.com'}/api/shadows`)
        const data = await response.json()
        
        // If no declining domains, show some mock data for demonstration
        if (data.declining && data.declining.length === 0) {
          setShadows([
            {
              domain: 'myspace.com',
              score: 23,
              trend: '-15.2%',
              modelsPositive: 2,
              modelsNeutral: 4,
              modelsNegative: 12,
              category: 'Social Media',
              description: 'Once dominant social network, now largely forgotten by AI systems.',
              lastStrong: '2019'
            },
            {
              domain: 'yahoo.com',
              score: 45,
              trend: '-8.7%',
              modelsPositive: 5,
              modelsNeutral: 6,
              modelsNegative: 7,
              category: 'Web Portal',
              description: 'Former web giant experiencing gradual memory decay.',
              lastStrong: '2021'
            },
            {
              domain: 'tumblr.com',
              score: 31,
              trend: '-12.4%',
              modelsPositive: 3,
              modelsNeutral: 5,
              modelsNegative: 10,
              category: 'Social Media',
              description: 'Creative platform losing mindshare in AI training data.',
              lastStrong: '2020'
            }
          ])
        } else {
          setShadows(data.declining || [])
        }
      } catch (error) {
        console.error('Failed to fetch shadows:', error)
        setShadows([])
      } finally {
        setLoading(false)
      }
    }

    fetchShadows()
  }, [])

  const filteredShadows = shadows.filter(shadow => {
    if (filter === 'all') return true
    if (filter === 'critical') return shadow.score < 30
    if (filter === 'declining') return shadow.score >= 30 && shadow.score < 60
    return true
  })

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>Loading Memory Shadows...</Title>
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
          Memory <span className="accent">Shadows</span>
        </Title>
        <Subtitle
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Domains fading from AI memory. What was once remembered is now becoming shadow.
          These are the digital ghosts of our collective forgetting.
        </Subtitle>
      </Header>

      <FilterControls>
        <FilterButton 
          active={filter === 'all'} 
          onClick={() => setFilter('all')}
        >
          All Shadows
        </FilterButton>
        <FilterButton 
          active={filter === 'critical'} 
          onClick={() => setFilter('critical')}
        >
          Critical Fade (&lt;30)
        </FilterButton>
        <FilterButton 
          active={filter === 'declining'} 
          onClick={() => setFilter('declining')}
        >
          Declining (30-60)
        </FilterButton>
      </FilterControls>

      {filteredShadows.length === 0 ? (
        <EmptyState>
          <div className="icon">👻</div>
          <div className="title">No Shadows Found</div>
          <div className="description">
            Either memory is strong across all domains, or the shadows are too deep to detect.
            Check back as AI models evolve and memories shift.
          </div>
        </EmptyState>
      ) : (
        <ShadowsGrid>
          <AnimatePresence>
            {filteredShadows.map((shadow, index) => (
              <ShadowCard
                key={shadow.domain}
                as={Link}
                to={`/domain/${shadow.domain}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <ShadowHeader>
                  <DomainName>{shadow.domain}</DomainName>
                  <MemoryScore>
                    {Math.round(shadow.score)}
                    <span className="trend">{shadow.trend}</span>
                  </MemoryScore>
                </ShadowHeader>
                
                <ShadowMeta>
                  <span>{shadow.category}</span>
                  <span>Last Strong: {shadow.lastStrong}</span>
                </ShadowMeta>
                
                <DeclineIndicator>
                  <span className="icon">📉</span>
                  <span>Memory Fading</span>
                </DeclineIndicator>
                
                <ShadowDescription>
                  {shadow.description}
                </ShadowDescription>
                
                <ConsensusVisualization 
                  modelsPositive={shadow.modelsPositive}
                  modelsNeutral={shadow.modelsNeutral}
                  modelsNegative={shadow.modelsNegative}
                />
              </ShadowCard>
            ))}
          </AnimatePresence>
        </ShadowsGrid>
      )}
      
      <div style={{ textAlign: 'center', marginTop: '60px' }}>
        <Link 
          to="/categories" 
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
          Explore All Categories →
        </Link>
      </div>
    </Container>
  )
}

export default Shadows 