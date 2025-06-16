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

const mathFadeIn = keyframes`
  0% { opacity: 0; transform: translateY(20px) rotate(-2deg); }
  50% { opacity: 0.15; transform: translateY(0px) rotate(0deg); }
  100% { opacity: 0.08; transform: translateY(-10px) rotate(1deg); }
`

const mathFloat = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.08; }
  50% { transform: translateY(-5px) rotate(0.5deg); opacity: 0.12; }
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
  max-width: 1100px;
  height: 450px;
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
  z-index: 1;
  
  ${props => props.position === 'top' && `
    top: 5%;
    left: 50%;
    transform: translateX(-50%);
  `}
  
  ${props => props.position === 'topRight' && `
    top: 15%;
    right: 5%;
  `}
  
  ${props => props.position === 'right' && `
    top: 50%;
    right: 2%;
    transform: translateY(-50%);
  `}
  
  ${props => props.position === 'bottomRight' && `
    bottom: 15%;
    right: 8%;
  `}
  
  ${props => props.position === 'bottom' && `
    bottom: 5%;
    left: 50%;
    transform: translateX(-50%);
  `}
  
  ${props => props.position === 'bottomLeft' && `
    bottom: 15%;
    left: 8%;
  `}
  
  ${props => props.position === 'left' && `
    top: 50%;
    left: 2%;
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
  max-width: 500px;
  width: 90%;
  min-height: 120px;
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.5s ease;
  animation: ${props => props.fading ? memoryFade : 'none'} 3s ease-in;
  z-index: 2;
  
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
  z-index: 3;
  position: relative;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
  }
`

// Beautiful Mind: Mathematical Shadow Layer
const MathFormula = styled.div`
  position: absolute;
  font-family: 'Times New Roman', serif;
  font-size: ${props => props.size || '0.9rem'};
  color: rgba(255, 255, 255, 0.08);
  pointer-events: none;
  z-index: 0;
  animation: ${mathFadeIn} 3s ease-in-out ${props => props.delay || 0}s forwards,
             ${mathFloat} 8s ease-in-out infinite ${props => (props.delay || 0) + 3}s;
  
  ${props => props.position === 'topLeft' && `
    top: 10%;
    left: 5%;
    transform: rotate(-5deg);
  `}
  
  ${props => props.position === 'topRight' && `
    top: 8%;
    right: 8%;
    transform: rotate(3deg);
  `}
  
  ${props => props.position === 'midLeft' && `
    top: 40%;
    left: 3%;
    transform: rotate(-2deg);
  `}
  
  ${props => props.position === 'midRight' && `
    top: 35%;
    right: 4%;
    transform: rotate(4deg);
  `}
  
  ${props => props.position === 'bottomLeft' && `
    bottom: 20%;
    left: 6%;
    transform: rotate(2deg);
  `}
  
  ${props => props.position === 'bottomRight' && `
    bottom: 15%;
    right: 7%;
    transform: rotate(-3deg);
  `}
  
  ${props => props.position === 'centerLeft' && `
    top: 60%;
    left: 8%;
    transform: rotate(-1deg);
  `}
  
  ${props => props.position === 'centerRight' && `
    top: 65%;
    right: 6%;
    transform: rotate(2deg);
  `}
`

const models = [
  { name: 'GPT-4', position: 'top' },
  { name: 'Claude', position: 'topRight' },
  { name: 'Gemini', position: 'right' },
  { name: 'ChatGPT', position: 'bottomRight' },
  { name: 'Copilot', position: 'bottom' },
  { name: 'Perplexity', position: 'bottomLeft' },
  { name: 'Bard', position: 'left' }
]

const memories = [
  { model: 'GPT-4', text: 'Founder of AI Brand Memory Intelligence platform, focuses on semantic analysis...', strength: 'strong' },
  { model: 'Claude', text: 'Developer working on memory tracking systems for brands...', strength: 'weak' },
  { model: 'Gemini', text: '', strength: 'none' },
  { model: 'ChatGPT', text: 'Tech entrepreneur, recent work involves AI model analysis...', strength: 'strong' },
  { model: 'Copilot', text: 'Limited information available about this individual...', strength: 'weak' },
  { model: 'Perplexity', text: '', strength: 'none' },
  { model: 'Bard', text: 'No relevant information found in training data.', strength: 'none' }
]

// Beautiful Mind: The Mathematical Formulas
const mathFormulas = [
  { 
    formula: 'σ(decay) = e^(-λt) × ω_consensus', 
    position: 'topLeft', 
    delay: 0.5,
    size: '0.8rem'
  },
  { 
    formula: 'cos_sim = Σ(A·B) / (||A|| × ||B||)', 
    position: 'topRight', 
    delay: 1.2,
    size: '0.9rem'
  },
  { 
    formula: '∂S/∂t = -α∇²S + β(I - S)', 
    position: 'midLeft', 
    delay: 2.1,
    size: '0.85rem'
  },
  { 
    formula: 'H(M) = -Σp(m_i)log₂p(m_i)', 
    position: 'midRight', 
    delay: 1.8,
    size: '0.8rem'
  },
  { 
    formula: 'μ_drift = ∫₀ᵗ f(τ)·w(t-τ)dτ', 
    position: 'bottomLeft', 
    delay: 2.7,
    size: '0.85rem'
  },
  { 
    formula: 'CI = x̄ ± z_(α/2) × σ/√n', 
    position: 'bottomRight', 
    delay: 3.2,
    size: '0.8rem'
  },
  { 
    formula: 'R_consensus = Π(r_i^w_i) / Σw_i', 
    position: 'centerLeft', 
    delay: 2.9,
    size: '0.75rem'
  },
  { 
    formula: 'λ_max(C) → semantic_stability', 
    position: 'centerRight', 
    delay: 3.5,
    size: '0.8rem'
  }
]

const DigitalMemoryHero = ({ name = "Your Brand" }) => {
  const [phase, setPhase] = useState('intro') // intro -> querying -> revealing -> complete -> mathematical
  const [activeModel, setActiveModel] = useState(0)
  const [currentMemory, setCurrentMemory] = useState(null)
  const [showCTA, setShowCTA] = useState(false)
  const [showMath, setShowMath] = useState(false)

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
      
      // Beautiful Mind: Show mathematical formulas after completion
      await new Promise(resolve => setTimeout(resolve, 2000))
      setPhase('mathematical')
      setShowMath(true)
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
        {(phase === 'complete' || phase === 'mathematical') && "Some remember. Some forget. Some never knew you at all."}
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
        
        {/* Beautiful Mind: Mathematical Shadow Layer */}
        {showMath && mathFormulas.map((math, index) => (
          <MathFormula
            key={index}
            position={math.position}
            delay={math.delay}
            size={math.size}
          >
            {math.formula}
          </MathFormula>
        ))}
      </QueryContainer>

      <CTA visible={showCTA}>
        Check Your Memory
      </CTA>
    </HeroContainer>
  )
}

export default DigitalMemoryHero 