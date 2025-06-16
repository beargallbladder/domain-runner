import React, { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const heartbeat = keyframes`
  0%, 100% { 
    opacity: 1; 
    transform: scale(1); 
    filter: brightness(1);
  }
  50% { 
    opacity: 0.8; 
    transform: scale(1.02); 
    filter: brightness(1.1);
  }
`

const digitalDeath = keyframes`
  0% { 
    opacity: 1; 
    transform: scale(1); 
    filter: brightness(1) hue-rotate(0deg);
  }
  50% { 
    opacity: 0.3; 
    transform: scale(0.95); 
    filter: brightness(0.6) hue-rotate(-20deg);
  }
  100% { 
    opacity: 0.4; 
    transform: scale(0.97); 
    filter: brightness(0.7) hue-rotate(-10deg);
  }
`

const memorySlipping = keyframes`
  0% { 
    opacity: 0.8; 
    transform: scale(1); 
  }
  25% { 
    opacity: 0.4; 
    transform: scale(0.98); 
  }
  50% { 
    opacity: 0.6; 
    transform: scale(0.99); 
  }
  75% { 
    opacity: 0.3; 
    transform: scale(0.97); 
  }
  100% { 
    opacity: 0.5; 
    transform: scale(0.98); 
  }
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
  50% { opacity: 0.3; transform: translateY(0px) rotate(0deg); }
  100% { opacity: 0.2; transform: translateY(-10px) rotate(1deg); }
`

const mathFloat = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.2; }
  50% { transform: translateY(-5px) rotate(0.5deg); opacity: 0.25; }
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

// The brand in the center - this is the soul that can slip away
const CenterBrand = styled.div`
  font-size: 2.5rem;
  font-weight: 300;
  margin-bottom: 3rem;
  text-align: center;
  position: relative;
  z-index: 10;
  
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  
  // Dynamic animation based on memory strength
  animation: ${props => {
    if (props.memoryStrength === 'strong') return `${heartbeat} 2s ease-in-out infinite`;
    if (props.memoryStrength === 'weak') return `${memorySlipping} 3s ease-in-out infinite`;
    if (props.memoryStrength === 'none') return `${digitalDeath} 4s ease-in-out infinite`;
    return 'none';
  }};
  
  // Visual state based on current memory response
  opacity: ${props => {
    if (props.memoryStrength === 'strong') return 1;
    if (props.memoryStrength === 'weak') return 0.6;
    if (props.memoryStrength === 'none') return 0.3;
    return 0.9;
  }};
  
  filter: ${props => {
    if (props.memoryStrength === 'strong') return 'brightness(1.1) saturate(1.2)';
    if (props.memoryStrength === 'weak') return 'brightness(0.8) saturate(0.7)';
    if (props.memoryStrength === 'none') return 'brightness(0.5) saturate(0.3) hue-rotate(-30deg)';
    return 'brightness(1)';
  }};
  
  transform: ${props => {
    if (props.memoryStrength === 'none') return 'scale(0.95)';
    return 'scale(1)';
  }};
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
  
  // Add subtle glow for strong memory
  ${props => props.memoryStrength === 'strong' && `
    text-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
  `}
  
  // Add red danger glow for no memory
  ${props => props.memoryStrength === 'none' && `
    text-shadow: 0 0 15px rgba(239, 68, 68, 0.7);
    color: #fecaca;
  `}
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
  
  // Change color based on memory state
  ${props => {
    if (props.memoryStrength === 'strong') return `color: #10b981;`;
    if (props.memoryStrength === 'weak') return `color: #f59e0b;`;
    if (props.memoryStrength === 'none') return `color: #ef4444;`;
    return `color: #9ca3af;`;
  }}
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
  color: rgba(255, 255, 255, 0.2);
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

// Fixed model list - technically accurate
const models = [
  { name: 'GPT-4', position: 'top' },
  { name: 'Claude', position: 'topRight' },
  { name: 'Gemini', position: 'right' },
  { name: 'Perplexity', position: 'bottomRight' },
  { name: 'Copilot', position: 'bottom' },
  { name: 'Mistral', position: 'bottomLeft' },
  { name: 'Llama', position: 'left' }
]

const memories = [
  { model: 'GPT-4', text: 'Founder of AI Brand Memory Intelligence platform, focuses on semantic analysis...', strength: 'strong' },
  { model: 'Claude', text: 'Developer working on memory tracking systems for brands...', strength: 'weak' },
  { model: 'Gemini', text: '', strength: 'none' },
  { model: 'Perplexity', text: 'Tech entrepreneur, recent work involves AI model analysis...', strength: 'strong' },
  { model: 'Copilot', text: 'Limited information available about this individual...', strength: 'weak' },
  { model: 'Mistral', text: '', strength: 'none' },
  { model: 'Llama', text: 'No relevant information found in training data.', strength: 'none' }
]

// Beautiful Mind: The Mathematical Formulas
const mathFormulas = [
  { formula: 'M(t) = M₀e^(-λt)', position: 'topLeft', delay: 0.1, size: '0.8rem' },
  { formula: '∂M/∂t = -λM + η(t)', position: 'topRight', delay: 0.5, size: '0.9rem' },
  { formula: 'σ²(t) = ∫ ψ(s)ds', position: 'midLeft', delay: 0.3, size: '0.7rem' },
  { formula: 'H = -Σp(i)log₂p(i)', position: 'midRight', delay: 0.7, size: '0.8rem' },
  { formula: 'C(τ) = E[X(t)X(t+τ)]', position: 'bottomLeft', delay: 0.2, size: '0.7rem' },
  { formula: '∇ₘS = ∂S/∂M', position: 'bottomRight', delay: 0.9, size: '0.8rem' },
  { formula: 'Ψ(x,t) = Ae^(ikx-iωt)', position: 'centerLeft', delay: 0.4, size: '0.6rem' },
  { formula: 'ρ(r₁,r₂) = |Ψ(r₁,r₂)|²', position: 'centerRight', delay: 0.6, size: '0.7rem' }
]

const DigitalMemoryHero = ({ name = "Your Brand" }) => {
  const [phase, setPhase] = useState('intro') // intro -> querying -> revealing -> complete -> mathematical
  const [activeModel, setActiveModel] = useState(0)
  const [currentMemory, setCurrentMemory] = useState(null)
  const [showCTA, setShowCTA] = useState(false)
  const [showMath, setShowMath] = useState(false)
  const [brandMemoryState, setBrandMemoryState] = useState('normal') // normal, strong, weak, none

  useEffect(() => {
    const sequence = async () => {
      // Wait 2 seconds, then start querying
      await new Promise(resolve => setTimeout(resolve, 2000))
      setPhase('querying')
      
      // Cycle through each model
      for (let i = 0; i < models.length; i++) {
        setActiveModel(i)
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Show this model's memory and update brand state
        const memory = memories[i]
        setCurrentMemory(memory)
        setBrandMemoryState(memory.strength)
        setPhase('revealing')
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        setPhase('querying')
        setBrandMemoryState('normal')
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      setPhase('complete')
      setBrandMemoryState('weak') // Final state shows overall vulnerability
      setShowCTA(true)
      
      // Beautiful Mind: Show mathematical formulas after completion
      await new Promise(resolve => setTimeout(resolve, 500))
      setPhase('mathematical')
      setShowMath(true)
    }

    sequence()
  }, [])

  return (
    <HeroContainer>
      <CenterBrand memoryStrength={brandMemoryState}>
        {name}
      </CenterBrand>
      
      <StatusText memoryStrength={brandMemoryState}>
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