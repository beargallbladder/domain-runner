import React from 'react'
import styled from 'styled-components'

const ConsensusContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0;
`

const DotsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
`

const DotGroup = styled.div`
  display: flex;
  gap: 2px;
`

const Dot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => props.color};
  opacity: 0.8;
  animation: pulse 2s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
`

const ConsensusLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${props => props.color};
  min-width: 80px;
  text-align: right;
`

const ConsensusVisualization = ({ 
  modelsPositive = 0, 
  modelsNeutral = 0, 
  modelsNegative = 0,
  size = 'normal'
}) => {
  const total = modelsPositive + modelsNeutral + modelsNegative
  if (total === 0) return null

  // Determine consensus strength
  const positiveRatio = modelsPositive / total
  const negativeRatio = modelsNegative / total
  
  let consensusText = ''
  let consensusColor = '#666'
  
  if (positiveRatio >= 0.7) {
    consensusText = 'Strong Consensus'
    consensusColor = '#34C759'
  } else if (positiveRatio >= 0.5) {
    consensusText = 'Positive Lean'
    consensusColor = '#30D158'
  } else if (negativeRatio >= 0.7) {
    consensusText = 'Weak Recognition'
    consensusColor = '#FF3B30'
  } else if (negativeRatio >= 0.5) {
    consensusText = 'Poor Memory'
    consensusColor = '#FF6B6B'
  } else {
    consensusText = 'Split Decision'
    consensusColor = '#FF9500'
  }

  const dotSize = size === 'small' ? '4px' : '6px'

  return (
    <ConsensusContainer>
      <DotsContainer>
        {/* Green dots - models that remember well */}
        <DotGroup>
          {Array.from({ length: Math.min(modelsPositive, 10) }, (_, i) => (
            <Dot 
              key={`positive-${i}`} 
              color="#34C759"
              style={{ width: dotSize, height: dotSize }}
            />
          ))}
        </DotGroup>
        
        {/* Orange dots - uncertain/neutral models */}
        <DotGroup>
          {Array.from({ length: Math.min(modelsNeutral, 10) }, (_, i) => (
            <Dot 
              key={`neutral-${i}`} 
              color="#FF9500"
              style={{ width: dotSize, height: dotSize }}
            />
          ))}
        </DotGroup>
        
        {/* Red dots - models that don't remember */}
        <DotGroup>
          {Array.from({ length: Math.min(modelsNegative, 10) }, (_, i) => (
            <Dot 
              key={`negative-${i}`} 
              color="#FF3B30"
              style={{ width: dotSize, height: dotSize }}
            />
          ))}
        </DotGroup>
      </DotsContainer>
      
      <ConsensusLabel color={consensusColor}>
        {consensusText}
      </ConsensusLabel>
    </ConsensusContainer>
  )
}

export default ConsensusVisualization 