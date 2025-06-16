import React, { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const pulseGlow = keyframes`
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
`

const memoryFade = keyframes`
  0% { opacity: 1; }
  100% { opacity: 0.3; }
`

const HeroContainer = styled.div`
  min-height: 80vh;
  background: #000;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
`

const CenterName = styled.div`
  font-size: 2.5rem;
  font-weight: 300;
  margin-bottom: 3rem;
  animation: ${fadeIn} 2s ease-in;
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`

const QueryContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 900px;
  height: 400px;
  margin: 2rem 0;
`

const AIModel = styled.div`
  position: absolute;
  padding: 0.5rem 1rem;
  background: ${props => props.active ? 'rgba(59, 130, 246, 0.8)' : 'rgba(75, 85, 99, 0.6)'};
  border-radius: 20px;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  animation: ${props => props.querying ? pulseGlow : 'none'} 2s infinite;
  
  ${props => props.position === 'top' && `
    top: 10%;
    left: 50%;
    transform: translateX(-50%);
  `}
  
  ${props => props.position === 'topRight' && `
    top: 20%;
    right: 10%;
  `}
  
  ${props => props.position === 'right' && `
    top: 50%;
    right: 5%;
    transform: translateY(-50%);
  `}
  
  ${props => props.position === 'bottomRight' && `
    bottom: 20%;
    right: 15%;
  `}
  
  ${props => props.position === 'bottom' && `
    bottom: 10%;
    left: 50%;
    transform: translateX(-50%);
  `}
  
  ${props => props.position === 'bottomLeft' && `
    bottom: 20%;
    left: 15%;
  `}
  
  ${props => props.position === 'left' && `
    top: 50%;
    left: 5%;
    transform: translateY(-50%);
  `}
`

const MemoryResponse = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(16, 16, 16, 0.95);
  border: 1px solid rgba(75, 85, 99, 0.3);
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 400px;
  min-height: 120px;
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.5s ease;
  animation: ${props => props.fading ? memoryFade : 'none'} 3s ease-in;
  
  .model-name {
    color: #60a5fa;
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }
  
  .memory-text {
    font-size: 0.9rem;
    line-height: 1.4;
    color: ${props => props.strength === 'strong' ? '#10b981' : 
              props.strength === 'weak' ? '#f59e0b' : '#ef4444'};
  }
  
  .no-memory {
    color: #6b7280;
    font-style: italic;
  }
`

const StatusText = styled.div`
  text-align: center;
  font-size: 1.1rem;
  margin: 2rem 0;
  color: #9ca3af;
  animation: ${fadeIn} 1s ease-in;
`

const CTA = styled.button`
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 2rem;
  opacity: ${props => props.visible ? 1 : 0};
  transform: translateY(${props => props.visible ? 0 : 20}px);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
  }
`

const models = [
  { name: 'GPT-4', position: 'top' },
  { name: 'Claude', position: 'topRight' },
  { name: 'Gemini', position: 'right' },
  { name: 'Llama', position: 'bottomRight' },
  { name: 'Perplexity', position: 'bottom' },
  { name: 'Anthropic', position: 'bottomLeft' },
  { name: 'Mistral', position: 'left' }
]

const memories = [
  { model: 'GPT-4', text: 'Founder of AI Brand Memory Intelligence platform, focuses on semantic analysis...', strength: 'strong' },
  { model: 'Claude', text: 'Developer working on memory tracking systems for brands...', strength: 'weak' },
  { model: 'Gemini', text: '', strength: 'none' },
  { model: 'Llama', text: 'Tech entrepreneur, recent work involves AI model analysis...', strength: 'strong' },
  { model: 'Perplexity', text: 'Limited information available about this individual...', strength: 'weak' },
  { model: 'Anthropic', text: '', strength: 'none' },
  { model: 'Mistral', text: 'No relevant information found in training data.', strength: 'none' }
]

const DigitalMemoryHero = ({ name = "Your Name" }) => {
  const [phase, setPhase] = useState('intro') // intro -> querying -> revealing -> complete
  const [activeModel, setActiveModel] = useState(0)
  const [currentMemory, setCurrentMemory] = useState(null)
  const [showCTA, setShowCTA] = useState(false)

  useEffect(() => {
    const sequence = async () => {
      // Wait 2 seconds, then start querying
      await new Promise(resolve => setTimeout(resolve, 2000))
      setPhase('querying')
      
      // Cycle through each model
      for (let i = 0; i < models.length; i++) {
        setActiveModel(i)
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Show this model's memory
        setCurrentMemory(memories[i])
        setPhase('revealing')
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        setPhase('querying')
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      setPhase('complete')
      setShowCTA(true)
    }

    sequence()
  }, [])

  return (
    <HeroContainer>
      <CenterName>{name}</CenterName>
      
      <StatusText>
        {phase === 'intro' && "What do AI models remember about you?"}
        {phase === 'querying' && `Asking ${models[activeModel]?.name}...`}
        {phase === 'revealing' && currentMemory && (
          currentMemory.strength === 'none' ? 
            `${currentMemory.model} has no memory of you` :
            `${currentMemory.model} remembers:`
        )}
        {phase === 'complete' && "Some remember. Some forget. Some never knew you at all."}
      </StatusText>

      <QueryContainer>
        {models.map((model, index) => (
          <AIModel
            key={model.name}
            position={model.position}
            active={activeModel === index}
            querying={phase === 'querying' && activeModel === index}
          >
            {model.name}
          </AIModel>
        ))}
        
        <MemoryResponse
          visible={phase === 'revealing' && currentMemory}
          strength={currentMemory?.strength}
          fading={currentMemory?.strength === 'weak'}
        >
          {currentMemory && (
            <>
              <div className="model-name">{currentMemory.model}</div>
              {currentMemory.text ? (
                <div className="memory-text">{currentMemory.text}</div>
              ) : (
                <div className="no-memory">No information found</div>
              )}
            </>
          )}
        </MemoryResponse>
      </QueryContainer>

      <CTA visible={showCTA}>
        Check Your Memory
      </CTA>
    </HeroContainer>
  )
}

export default DigitalMemoryHero 