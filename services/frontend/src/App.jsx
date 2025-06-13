import React from 'react'
import { Routes, Route } from 'react-router-dom'
import styled, { createGlobalStyle, keyframes } from 'styled-components'
import Landing from './pages/Landing'
import Home from './pages/Home'
import About from './pages/About'
import Domain from './pages/Domain'
import ComingSoon from './pages/ComingSoon'
import Navigation from './components/Navigation'
import PlausibleScript from './components/PlausibleScript'
import Rankings from './pages/Rankings'
import DomainSEO from './pages/DomainSEO'
import Contact from './pages/Contact'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import Analysis from './pages/Analysis'
import Reports from './pages/Reports'
import Alerts from './pages/Alerts'
import Integrations from './pages/Integrations'
import Help from './pages/Help'
import CompetitorAnalysis from './pages/CompetitorAnalysis'
import CompetitiveCohorts from './pages/CompetitiveCohorts'
import CohortIntelligence from './pages/CohortIntelligence'

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

function App() {
  return (
    <AppContainer>
      <GlobalStyle />
      <PlausibleScript />
      <Navigation />
      <Main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/cohorts" element={<CompetitiveCohorts />} />
          <Route path="/cohort-intelligence" element={<CohortIntelligence />} />
          <Route path="/competitive-analysis" element={<CompetitorAnalysis />} />
          <Route path="/domain/:domain" element={<Domain />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Main>
    </AppContainer>
  )
}

export default App 