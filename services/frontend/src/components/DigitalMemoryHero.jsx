import React, { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

// ULTRA slow, gentle memory breath - no more vomit
const memoryBreath = keyframes`
  0%, 100% { 
    opacity: 0.8; 
    transform: scale(1); 
    filter: brightness(1);
  }
  50% { 
    opacity: 1; 
    transform: scale(1.005); 
    filter: brightness(1.02);
  }
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
  
  @media (max-width: 768px) {
    padding: 20px 15px;
    min-height: 100vh;
  }
`

const BrandName = styled.div`
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 30px;
  color: #ffffff;
  animation: ${fadeIn} 0.8s ease-out;
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
    margin-bottom: 20px;
  }
  
  @media (max-width: 480px) {
    font-size: 1.8rem;
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
    font-size: 1.4rem;
    margin-bottom: 30px;
  }
  
  @media (max-width: 480px) {
    font-size: 1.2rem;
    margin-bottom: 25px;
  }
`

const ModelsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  max-width: 1000px;
  width: 100%;
  margin-bottom: 50px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 15px;
    margin-bottom: 30px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 12px;
    max-width: 320px;
  }
`

const ModelBubble = styled.div`
  background: ${props => props.active ? props.color : '#1a1a1a'};
  border: 2px solid ${props => props.active ? props.color : '#333'};
  border-radius: 20px;
  padding: 20px;
  transition: all 1.2s ease;
  opacity: ${props => props.active ? 1 : 0.3};
  animation: ${props => props.active ? memoryBreath : 'none'} 6s ease-in-out infinite;
  
  @media (max-width: 768px) {
    padding: 16px;
    border-radius: 16px;
  }
  
  @media (max-width: 480px) {
    padding: 14px;
  }
  
  .model-name {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 10px;
    color: ${props => props.active ? '#000000' : '#ffffff'};
    
    @media (max-width: 768px) {
      font-size: 1rem;
      margin-bottom: 8px;
    }
    
    @media (max-width: 480px) {
      font-size: 0.9rem;
    }
  }
  
  .memory-status {
    font-size: 0.9rem;
    color: ${props => props.active ? '#000000' : '#aaaaaa'};
    font-weight: 500;
    line-height: 1.3;
    
    @media (max-width: 768px) {
      font-size: 0.8rem;
    }
    
    @media (max-width: 480px) {
      font-size: 0.75rem;
    }
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
    font-size: 1.6rem;
    max-width: 600px;
  }
  
  @media (max-width: 480px) {
    font-size: 1.3rem;
    max-width: 300px;
    line-height: 1.3;
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
      
      // Step 2: Show question after 3s (slower)
      setTimeout(() => setCurrentStep(1), 3000)
      
      // Step 3: Light up models MUCH slower - no nausea
      setTimeout(() => {
        models.forEach((model, index) => {
          setTimeout(() => {
            setActiveModels(prev => [...prev, index])
          }, index * 1800) // Much slower: 1.8s between each model
        })
      }, 5000)
      
      // Step 4: Show final message after all models are lit
      setTimeout(() => {
        setShowFinal(true)
      }, 5000 + (models.length * 1800) + 3000)
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