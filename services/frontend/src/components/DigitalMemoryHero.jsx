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

const Container = styled.div`
  min-height: 100vh;
  background: #000000;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
`

const BrandName = styled.div`
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 30px;
  color: #ffffff;
  animation: ${fadeIn} 0.8s ease-out;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`

const Question = styled.div`
  font-size: 1.8rem;
  font-weight: 500;
  margin-bottom: 50px;
  color: #ffffff;
  opacity: 0;
  animation: ${fadeIn} 0.8s ease-out 1s forwards;
  
  @media (max-width: 768px) {
    font-size: 1.3rem;
  }
`

const ModelsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  max-width: 1000px;
  width: 100%;
  margin-bottom: 50px;
`

const ModelBubble = styled.div`
  background: ${props => props.active ? props.color : '#1a1a1a'};
  border: 2px solid ${props => props.active ? props.color : '#333'};
  border-radius: 20px;
  padding: 20px;
  transition: all 0.5s ease;
  opacity: ${props => props.active ? 1 : 0.3};
  animation: ${props => props.active ? pulseGlow : 'none'} 2s infinite;
  
  .model-name {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 10px;
    color: ${props => props.active ? '#000000' : '#ffffff'};
  }
  
  .memory-status {
    font-size: 0.9rem;
    color: ${props => props.active ? '#000000' : '#aaaaaa'};
    font-weight: 500;
  }
`

const FinalMessage = styled.div`
  font-size: 2rem;
  font-weight: 600;
  color: #ffffff;
  max-width: 800px;
  line-height: 1.4;
  opacity: 0;
  animation: ${fadeIn} 1s ease-out forwards;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`

const models = [
  { name: 'GPT-4', color: '#00d4aa', memory: 'Strong recall of your innovations' },
  { name: 'Claude 3', color: '#ff6b35', memory: 'Remembers your recent work' },
  { name: 'Gemini', color: '#4285f4', memory: 'Vague recognition' },
  { name: 'Perplexity', color: '#20b2aa', memory: 'Searches but finds little' },
  { name: 'GPT-3.5', color: '#10a37f', memory: 'Outdated information' },
  { name: 'Mistral', color: '#ff7b00', memory: 'No memory of you' },
  { name: 'LLaMA', color: '#8b5cf6', memory: 'Never knew you existed' }
]

export default function DigitalMemoryHero() {
  const [currentStep, setCurrentStep] = useState(0)
  const [activeModels, setActiveModels] = useState([])
  const [showFinal, setShowFinal] = useState(false)

  useEffect(() => {
    const sequence = async () => {
      // Step 1: Show brand name (immediate)
      
      // Step 2: Show question after 2s
      setTimeout(() => setCurrentStep(1), 2000)
      
      // Step 3: Light up models one by one starting at 4s
      setTimeout(() => {
        models.forEach((model, index) => {
          setTimeout(() => {
            setActiveModels(prev => [...prev, index])
          }, index * 800) // 0.8s delay between each model
        })
      }, 4000)
      
      // Step 4: Show final message after all models are lit (4s + 7*0.8s + 2s = ~11.6s)
      setTimeout(() => {
        setShowFinal(true)
      }, 11600)
    }

    sequence()
  }, [])

  return (
    <Container>
      <BrandName>Your Brand</BrandName>
      
      {currentStep >= 1 && (
        <Question>What do AI models remember about you?</Question>
      )}
      
      <ModelsContainer>
        {models.map((model, index) => (
          <ModelBubble
            key={model.name}
            active={activeModels.includes(index)}
            color={model.color}
          >
            <div className="model-name">{model.name}</div>
            <div className="memory-status">{model.memory}</div>
          </ModelBubble>
        ))}
      </ModelsContainer>
      
      {showFinal && (
        <FinalMessage style={{ animationDelay: '0s' }}>
          Some remember. Some forget. Some never knew you at all.
        </FinalMessage>
      )}
    </Container>
  )
} 