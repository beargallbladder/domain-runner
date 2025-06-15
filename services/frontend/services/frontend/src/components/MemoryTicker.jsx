import React from 'react'
import styled, { keyframes } from 'styled-components'
import { Link } from 'react-router-dom'

const scroll = keyframes`
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
`

const TickerContainer = styled.div`
  width: 100%;
  overflow: hidden;
  background: #000;
  border-radius: 8px;
  padding: 20px 0;
  position: relative;
  
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    width: 60px;
    height: 100%;
    z-index: 2;
  }
  
  &::before {
    left: 0;
    background: linear-gradient(to right, #000, transparent);
  }
  
  &::after {
    right: 0;
    background: linear-gradient(to left, #000, transparent);
  }
`

const TickerTrack = styled.div`
  display: flex;
  align-items: center;
  animation: ${scroll} 60s linear infinite;
  white-space: nowrap;
`

const TickerItem = styled(Link)`
  display: inline-flex;
  align-items: center;
  margin-right: 48px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  transition: all 0.2s ease;
  min-width: 200px;
  
  &:hover {
    background: rgba(0, 122, 255, 0.1);
    transform: scale(1.05);
  }
`

const DomainInfo = styled.div`
  display: flex;
  flex-direction: column;
  margin-right: 16px;
`

const DomainName = styled.span`
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 2px;
`

const DomainCategory = styled.span`
  color: #999;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const ScoreContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const Score = styled.span`
  color: ${props => 
    props.score >= 90 ? '#34C759' : 
    props.score >= 75 ? '#007AFF' : 
    props.score >= 60 ? '#FF9500' : '#FF3B30'
  };
  font-size: 20px;
  font-weight: 300;
  min-width: 32px;
`

const Trend = styled.span`
  font-size: 12px;
  color: ${props => 
    props.direction === 'up' ? '#34C759' : 
    props.direction === 'down' ? '#FF3B30' : '#999'
  };
`

// Get category for domain
const getCategory = (domain) => {
  const categories = {
    'openai.com': 'AI/ML',
    'google.com': 'Tech',
    'apple.com': 'Tech', 
    'microsoft.com': 'Tech',
    'tesla.com': 'EV',
    'nvidia.com': 'Semi',
    'amazon.com': 'E-comm',
    'meta.com': 'Social',
    'netflix.com': 'Stream',
    'stripe.com': 'Fintech',
    'moderna.com': 'Biotech',
    'pfizer.com': 'Pharma'
  }
  return categories[domain] || 'Other'
}

// Get trend direction
const getTrendDirection = (trend) => {
  if (!trend || trend.length < 2) return 'stable'
  const last = trend[trend.length - 1]
  const prev = trend[trend.length - 2]
  if (last > prev) return 'up'
  if (last < prev) return 'down'
  return 'stable'
}

function MemoryTicker({ domains = [] }) {
  // Duplicate domains to create continuous scroll effect
  const extendedDomains = [...domains, ...domains, ...domains]

  return (
    <TickerContainer>
      <TickerTrack>
        {extendedDomains.map((domain, index) => {
          const trendDirection = getTrendDirection(domain.trend)
          const trendSymbol = 
            trendDirection === 'up' ? '↗' : 
            trendDirection === 'down' ? '↘' : '→'
          
          return (
            <TickerItem 
              key={`${domain.name}-${index}`}
              to={`/domain/${domain.name}`}
            >
              <DomainInfo>
                <DomainName>{domain.name}</DomainName>
                <DomainCategory>{getCategory(domain.name)}</DomainCategory>
              </DomainInfo>
              <ScoreContainer>
                <Score score={domain.score}>{domain.score}</Score>
                <Trend direction={trendDirection}>{trendSymbol}</Trend>
              </ScoreContainer>
            </TickerItem>
          )
        })}
      </TickerTrack>
    </TickerContainer>
  )
}

export default MemoryTicker 