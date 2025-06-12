import React from 'react'
import { Routes, Route } from 'react-router-dom'
import styled, { createGlobalStyle, keyframes } from 'styled-components'
import Landing from './pages/Landing'
import Domain from './pages/Domain'
import Categories from './pages/Categories'
import About from './pages/About'
import Navigation from './components/Navigation'
import Home from './pages/Home'
import DomainReport from './pages/DomainReport'
import DomainDirectory from './pages/DomainDirectory'
import Leaderboard from './pages/Leaderboard'
import ComingSoon from './pages/ComingSoon'
import Rankings from './pages/Rankings'
import DomainSEO from './pages/DomainSEO'
import TeslaJolt from './pages/TeslaJolt'

// Subtle drift animation for text
const textDrift = keyframes`
  0%, 100% { 
    opacity: 0.85;
    transform: translateY(0px);
  }
  50% { 
    opacity: 1;
    transform: translateY(-1px);
  }
`

const subtlePulse = keyframes`
  0%, 100% { opacity: 0.9; }
  50% { opacity: 1; }
`

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #ffffff;
    color: #000000;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Steve Jobs aesthetic - readable but elegant */
  h1, h2, h3 {
    font-weight: 600; /* Much heavier for visibility */
    letter-spacing: -0.02em;
    color: #000000;
    opacity: 1;
  }

  /* Large titles get slightly heavier weight */
  h1 {
    font-weight: 700;
    color: #000000;
    opacity: 1;
  }

  /* Force all text to be dark and visible */
  p {
    color: #000000;
    opacity: 1;
    font-weight: 500;
  }

  /* Remove problematic animations and opacity */
  .drift-text {
    font-weight: 600;
    color: #000000;
    opacity: 1;
  }

  .light-text {
    font-weight: 500;
    color: #000000;
    opacity: 1;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  /* Memory Oracle brand color - electric blue for emphasis */
  .accent {
    color: #007AFF;
  }

  .memory-strong {
    color: #34C759; /* iOS green for strong memory */
  }

  .memory-weak {
    color: #FF3B30; /* iOS red for weak memory */
  }

  .memory-neutral {
    color: #8E8E93; /* iOS gray for neutral */
  }
`

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`

const Main = styled.main`
  flex: 1;
`

// Plausible Analytics Script
const PlausibleScript = () => {
  React.useEffect(() => {
    const script = document.createElement('script');
    script.defer = true;
    script.setAttribute('data-domain', 'llmpagerank.com');
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return null;
};

function App() {
  return (
    <AppContainer>
      <GlobalStyle />
      <PlausibleScript />
      <Navigation />
      <Main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/domains" element={<DomainDirectory />} />
          <Route path="/domain/:domainName" element={<Domain />} />
          
          {/* SEO-optimized domain analysis pages */}
          <Route path="/analyze/:domainName" element={<DomainSEO />} />
          <Route path="/crisis-score/:domainName" element={<DomainSEO />} />
          <Route path="/competitive/:domainName" element={<DomainSEO />} />
          
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:category" element={<Categories />} />
          <Route path="/shadows" element={<ComingSoon />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/tesla-jolt" element={<TeslaJolt />} />
          <Route path="/crisis" element={<div style={{padding: '40px', textAlign: 'center', background: '#000', color: '#fff', minHeight: '100vh'}}><h1 style={{color: '#ff3b30'}}>🚨 Crisis Simulator Coming Soon</h1></div>} />
          <Route path="/about" element={<About />} />
          <Route path="/premium" element={<ComingSoon />} />
          <Route path="/coming-soon" element={<ComingSoon />} />
        </Routes>
      </Main>
    </AppContainer>
  )
}

export default App 