import React from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 120px 40px;
  
  @media (max-width: 768px) {
    padding: 80px 20px;
  }
`

const Title = styled(motion.h1)`
  font-size: 64px;
  font-weight: 100;
  margin-bottom: 48px;
  letter-spacing: -0.03em;
  color: #fff;
  
  .llm {
    color: #ccc;
    text-transform: uppercase;
    font-size: 48px;
    letter-spacing: 2px;
  }
  
  .pagerank {
    color: #fff;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  }
`

const Manifesto = styled(motion.div)`
  font-size: 20px;
  line-height: 1.8;
  color: #666;
  margin-bottom: 80px;
  
  p {
    margin-bottom: 32px;
  }
  
  .highlight {
    color: #fff;
    font-weight: 300;
  }
  
  .accent {
    color: #ccc;
    font-weight: 300;
  }
`

const Stats = styled(motion.div)`
  background: #0a0a0a;
  border: 1px solid #222;
  border-radius: 8px;
  padding: 48px;
  margin: 80px 0;
  
  @media (max-width: 768px) {
    padding: 32px 24px;
  }
`

const StatsTitle = styled.h2`
  font-size: 32px;
  font-weight: 100;
  margin-bottom: 32px;
  text-align: center;
  color: #fff;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 32px;
  text-align: center;
`

const StatItem = styled.div`
  .number {
    font-size: 40px;
    font-weight: 100;
    color: #fff;
    margin-bottom: 8px;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
  }
  
  .label {
    font-size: 16px;
    color: #666;
    font-weight: 200;
  }
`

const Philosophy = styled(motion.div)`
  margin: 80px 0;
  
  h2 {
    font-size: 36px;
    font-weight: 100;
    margin-bottom: 32px;
    color: #fff;
  }
  
  .principle {
    margin-bottom: 32px;
    padding-left: 24px;
    border-left: 1px solid #333;
    
    h3 {
      font-size: 20px;
      font-weight: 300;
      margin-bottom: 12px;
      color: #fff;
    }
    
    p {
      font-size: 16px;
      line-height: 1.6;
      color: #666;
      font-weight: 200;
    }
  }
`

const Contact = styled(motion.div)`
  text-align: center;
  padding: 48px;
  background: #0a0a0a;
  border: 1px solid #222;
  color: #fff;
  border-radius: 8px;
  
  h2 {
    font-size: 32px;
    font-weight: 100;
    margin-bottom: 16px;
    
    .name {
      color: #ccc;
    }
  }
  
  p {
    font-size: 18px;
    color: #666;
    margin-bottom: 24px;
    font-weight: 200;
  }
  
  .email {
    color: #ccc;
    font-weight: 300;
  }
`

function About() {
  return (
    <Container>
      <Title
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <span className="llm">llm</span> <span className="pagerank">pagerank</span>
      </Title>

      <Manifesto
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <p>
          In an age where <span className="highlight">artificial intelligence</span> shapes the fabric of digital memory, 
          one question emerges above all others: <span className="accent">Will you fade, or endure?</span>
        </p>

        <p>
          LLM PageRank represents a fundamental shift in how we understand 
          <span className="highlight"> digital permanence</span>. Through the analysis of 
          thousands of AI model responses across hundreds of domains, we reveal which 
          entities will be remembered when artificial minds write tomorrow's history.
        </p>

        <p>
          This is not speculation. This is <span className="accent">consensus reality</span> — 
          the collective memory of the most advanced artificial intelligences, 
          synthesized into memory scores that predict digital immortality.
        </p>

        <p>
          Every domain casts a shadow. Every score reveals a fate. 
          The question is not whether you exist in the present, 
          but <span className="accent">whether you will endure</span> in the future.
        </p>
      </Manifesto>

      <Stats
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <StatsTitle>our intelligence network</StatsTitle>
        <StatsGrid>
          <StatItem>
            <div className="number">535+</div>
            <div className="label">domains measured</div>
          </StatItem>
          <StatItem>
            <div className="number">23,000+</div>
            <div className="label">ai judgments</div>
          </StatItem>
          <StatItem>
            <div className="number">15+</div>
            <div className="label">llm models</div>
          </StatItem>
          <StatItem>
            <div className="number">8</div>
            <div className="label">major sectors</div>
          </StatItem>
        </StatsGrid>
      </Stats>

      <Philosophy
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <h2>our principles</h2>
        
        <div className="principle">
          <h3>consensus over opinion</h3>
          <p>
            We don't guess at digital permanence — we measure it through the collective 
            intelligence of multiple AI models, creating true consensus scores.
          </p>
        </div>

        <div className="principle">
          <h3>transparency in method</h3>
          <p>
            Our memory scoring methodology is open and evolving. Every score is backed 
            by real data from real AI model responses across diverse contexts.
          </p>
        </div>

        <div className="principle">
          <h3>the future is measurable</h3>
          <p>
            Digital permanence follows patterns. By understanding how AI models process 
            and remember information today, we can predict what will endure tomorrow.
          </p>
        </div>

        <div className="principle">
          <h3>shadows reveal light</h3>
          <p>
            Every measurement of digital decay helps us understand digital permanence. 
            Know your shadows, shape your light.
          </p>
        </div>
      </Philosophy>

      <Contact
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        <h2>built by <span className="name">sam kim</span></h2>
        <p>
          exploring the intersection of artificial intelligence, digital permanence, 
          and the future of memory itself.
        </p>
        <div className="email">sam@llmpagerank.com</div>
      </Contact>
    </Container>
  )
}

export default About 