import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import styled, { createGlobalStyle } from 'styled-components'
import Landing from './pages/Landing'
import Domain from './pages/Domain'
import Categories from './pages/Categories'
import About from './pages/About'
import Navigation from './components/Navigation'
import Home from './pages/Home'
import DomainReport from './pages/DomainReport'
import DomainDirectory from './pages/DomainDirectory'
import Leaderboard from './pages/Leaderboard'

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

  /* Steve Jobs aesthetic - minimal, purposeful */
  h1, h2, h3 {
    font-weight: 300;
    letter-spacing: -0.02em;
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
    script.setAttribute('data-domain', 'llmpagerank.com'); // Replace with your domain
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
      <Router>
        <Navigation />
        <Main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/domains" element={<DomainDirectory />} />
            <Route path="/domain/:domainName" element={<Domain />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </Main>
      </Router>
    </AppContainer>
  )
}

export default App 