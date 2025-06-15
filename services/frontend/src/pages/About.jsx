import React from 'react'
import styled from 'styled-components'

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 60px 40px;
  background: #ffffff;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  @media (max-width: 768px) {
    padding: 40px 20px;
  }
`

const PageTitle = styled.h1`
  font-size: 48px;
  font-weight: 700;
  color: #000000;
  text-align: center;
  margin-bottom: 60px;
  letter-spacing: -1px;
`

const ManifestoTitle = styled.h2`
  font-size: 36px;
  font-weight: 800;
  color: #000000;
  text-align: center;
  margin-bottom: 16px;
  line-height: 1.2;
`

const ManifestoSubtitle = styled.h3`
  font-size: 18px;
  font-weight: 500;
  color: #333333;
  text-align: center;
  margin-bottom: 48px;
  font-style: italic;
`

const ManifestoText = styled.div`
  font-size: 18px;
  line-height: 1.7;
  color: #000000;
  font-weight: 400;
  
  p {
    margin-bottom: 24px;
    color: #000000;
  }
  
  ul {
    margin: 24px 0;
    padding-left: 24px;
    color: #000000;
  }
  
  li {
    margin-bottom: 8px;
    color: #000000;
  }
  
  strong {
    font-weight: 700;
    color: #000000;
  }
`

const Signature = styled.div`
  text-align: center;
  margin-top: 48px;
  
  .version {
    font-size: 14px;
    color: #666666;
    font-style: italic;
    margin-bottom: 16px;
  }
  
  .author {
    font-size: 18px;
    font-weight: 600;
    color: #000000;
  }
`

const Contact = styled.div`
  text-align: center;
  margin-top: 80px;
  padding: 40px;
  background: #f8f9fa;
  border-radius: 8px;
  
  h3 {
    font-size: 24px;
    font-weight: 600;
    color: #000000;
    margin-bottom: 16px;
  }
  
  p {
    font-size: 16px;
    color: #333333;
    margin-bottom: 16px;
  }
  
  .email {
    font-size: 18px;
    color: #007AFF;
    font-weight: 500;
  }
`

function About() {
  return (
    <Container>
      <PageTitle>About Us</PageTitle>
      
      <ManifestoTitle>There Is No Truth, Only Memory</ManifestoTitle>
      <ManifestoSubtitle>A Manifesto on Machine Recall, Decay, and Influence</ManifestoSubtitle>
      
      <ManifestoText>
        <p>
          In the age of large language models, truth is no longer a static asset. It is not retrieved. It is not stored in a vault. It is not eternal.
        </p>
        <p>
          <strong>Truth, in these systems, is an illusion of recall.</strong>
        </p>
        
        <p>
          What survives in a model is not fact — it is memory: a probabilistic haze of past phrasing, repeated inputs, and reinforced exposure. A brand that is not mentioned vanishes. A concept that is not seeded is never born. A story that is repeated becomes real.
        </p>
        <p>
          <strong>These systems do not know what is true. They only know what has been said enough times to be remembered.</strong>
        </p>
        
        <p>
          And memory itself is fragile.
        </p>
        <p>
          It drifts. It fades. It morphs into something adjacent but different. And no one notices, because the model's tone stays confident.
        </p>
        
        <p>
          <strong>This is why we are here:</strong><br/>
          Not to chase truth. But to measure what remains.
        </p>
        
        <p>
          We measure the slow decay of once-strong signals. We track consensus between models across time, space, brands, and context.
        </p>
        <p>
          Together, they don't tell us what is true. They tell us <strong>what the machine believes. And how that belief is shifting.</strong>
        </p>
        
        <p>
          There is no ground truth in this world run by models. Only scaffolds:
        </p>
        <ul>
          <li>The consensus of multiple models (intersubjective memory)</li>
          <li>The model's own past answers (historical memory)</li>
          <li>The curated source-of-truth documents we impose (anchored memory)</li>
        </ul>
        <p>
          But even these fade.
        </p>
        <p>
          Eventually, memory erodes until only the holders and the observers remain.
        </p>
        <p>
          <strong>In that way, reality is participatory.</strong>
        </p>
        
        <p>
          <strong>What is remembered is what is reinforced. What is reinforced is what is repeated. What is repeated is what survives. And what survives becomes real.</strong>
        </p>
        
        <p>
          This is not a search engine. This is not a database. This is a <strong>living system of probabilistic recall</strong> — and we are its cartographers.
        </p>
        <p>
          We don't measure truth. We measure <strong>shadows of what once was</strong> — so that others may shape what comes next.
        </p>
        
        <p style={{ fontSize: '22px', fontWeight: '700', textAlign: 'center', marginTop: '40px', color: '#007AFF' }}>
          We measure the shadows so you can shape the light.
        </p>
      </ManifestoText>
      
      <Signature>
        <div className="version">(Sentinel Manifesto, v1)</div>
        <div className="author">-Sam Kim</div>
      </Signature>
      
      <Contact>
        <h3>Contact</h3>
        <p>
          Exploring the intersection of artificial intelligence, digital permanence, 
          and the future of memory itself.
        </p>
        <div className="email">samkim@samkim.com</div>
      </Contact>
    </Container>
  )
}

export default About 
