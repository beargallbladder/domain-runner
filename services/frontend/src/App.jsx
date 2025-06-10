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
    font-weight: 400; /* Changed from 300 to 400 for better visibility */
    letter-spacing: -0.02em;
    animation: ${textDrift} 4s ease-in-out infinite;
  }

  /* Large titles get slightly heavier weight */
  h1 {
    font-weight: 500;
  }

  /* Subtle text elements get drift animation */
  .drift-text {
    animation: ${subtlePulse} 3s ease-in-out infinite;
    font-weight: 400; /* Readable but still light */
  }

  /* Ultra-light text now has better contrast */
  .light-text {
    font-weight: 300;
    opacity: 0.9;
    animation: ${textDrift} 5s ease-in-out infinite;
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
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/about" element={<About />} />
          <Route path="/premium" element={<ComingSoon />} />
          <Route path="/coming-soon" element={<ComingSoon />} />
        </Routes>
      </Main>
    </AppContainer>
  )
}

export default App 