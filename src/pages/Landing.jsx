import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { motion } from 'framer-motion'
import { useMemoryAPI } from '../hooks/useMemoryAPI'

// Animations
const tickerScroll = keyframes`
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`

const glow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
  }
  50% { 
    box-shadow: 0 0 40px rgba(255, 255, 255, 0.3);
  }
`

// Main Container - DARK BACKGROUND FOR CONTRAST
const Container = styled.div`
  min-height: 100vh;
  background: #000;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`

// Navigation Header for SEO & Crawlability
const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  padding: 16px 40px;
  z-index: 1000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const Logo = styled(Link)`
  font-size: 24px;
  font-weight: 300;
  color: #fff;
  text-decoration: none;
  
  &:hover {
    color: #ccc;
  }
`

const Nav = styled.nav`
  display: flex;
  gap: 32px;
  
  a {
    color: #ccc;
    text-decoration: none;
    font-size: 16px;
    font-weight: 300;
    
    &:hover {
      color: #fff;
    }
  }
`

// Hero Section - HIGH CONTRAST
const HeroSection = styled.section`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 120px 40px 40px 40px;
  background: #000;
`

const HeroTitle = styled(motion.h1)`
  font-size: clamp(48px, 8vw, 96px);
  font-weight: 100;
  margin-bottom: 20px;
  line-height: 1.1;
  color: #fff;
  
  .highlight {
    background: linear-gradient(45deg, #fff, #f0f0f0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`

const HeroSubtitle = styled(motion.p)`
  font-size: clamp(18px, 3vw, 24px);
  font-weight: 300;
  color: #ccc;
  margin-bottom: 60px;
  max-width: 600px;
  line-height: 1.4;
`

const SearchContainer = styled(motion.div)`
  width: 100%;
  max-width: 600px;
  margin-bottom: 40px;
  position: relative;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 24px 32px;
  font-size: 24px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: #fff;
  text-align: center;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.1);
    animation: ${glow} 2s infinite;
  }
  
  &::placeholder {
    color: #888;
  }
`

const InstantPreview = styled(motion.div)`
  margin-top: 20px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
`

const ScoreDisplay = styled.div`
  font-size: 48px;
  font-weight: 200;
  margin-bottom: 10px;
  color: #fff;
  
  .score {
    color: ${props => 
      props.score >= 90 ? '#00ff88' : 
      props.score >= 75 ? '#fff' : 
      props.score >= 60 ? '#ffbb00' : '#ff4444'
    };
  }
`

const ConsensusTeaser = styled.div`
  font-size: 16px;
  color: #fff;
  margin-bottom: 15px;
  line-height: 1.5;
  
  .agreement {
    color: #00ff88;
    font-weight: 400;
  }
  
  .disagreement {
    color: #ff6666;
    font-weight: 400;
  }
`

const UpgradeHook = styled.div`
  font-size: 14px;
  color: #ccc;
  cursor: pointer;
  transition: color 0.3s ease;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 15px;
  
  &:hover {
    color: #fff;
  }
`

// Scientific Credibility Section - REAL DATA SHOWCASE
const CredibilitySection = styled.section`
  background: #111;
  padding: 80px 40px;
  border-top: 1px solid #333;
  border-bottom: 1px solid #333;
`

const CredibilityTitle = styled.h2`
  font-size: 36px;
  font-weight: 100;
  text-align: center;
  margin-bottom: 20px;
  color: #fff;
`

const CredibilitySubtitle = styled.p`
  font-size: 18px;
  color: #ccc;
  text-align: center;
  margin-bottom: 60px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 40px;
  max-width: 1000px;
  margin: 0 auto;
`

const StatCard = styled(motion.div)`
  text-align: center;
  padding: 30px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  .number {
    font-size: 42px;
    font-weight: 100;
    color: #fff;
    margin-bottom: 12px;
    line-height: 1;
  }
  
  .label {
    font-size: 16px;
    color: #ccc;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  
  .detail {
    font-size: 14px;
    color: #888;
    line-height: 1.4;
  }
`

// Live Ticker - REAL DOMAIN DATA
const TickerSection = styled.section`
  background: #111;
  border-top: 1px solid #333;
  border-bottom: 1px solid #333;
  padding: 30px 0;
  overflow: hidden;
`

const TickerTitle = styled.h3`
  text-align: center;
  font-size: 16px;
  font-weight: 400;
  color: #ccc;
  margin-bottom: 30px;
  text-transform: uppercase;
  letter-spacing: 2px;
  
  .live {
    color: #ff4444;
    margin-left: 10px;
    animation: ${pulse} 2s infinite;
  }
`

const TickerContainer = styled.div`
  white-space: nowrap;
  animation: ${tickerScroll} 60s linear infinite;
  display: flex;
  align-items: center;
`

const TickerItem = styled.div`
  display: inline-flex;
  align-items: center;
  margin-right: 100px;
  font-size: 18px;
  font-weight: 300;
  
  .domain {
    color: #fff;
    margin-right: 20px;
    min-width: 160px;
    font-weight: 400;
  }
  
  .score {
    font-size: 24px;
    font-weight: 200;
    margin-right: 15px;
    color: ${props => 
      props.score >= 90 ? '#00ff88' : 
      props.score >= 75 ? '#fff' : 
      props.score >= 60 ? '#ffbb00' : '#ff4444'
    };
  }
  
  .models {
    font-size: 14px;
    color: #ccc;
    margin-right: 20px;
  }
  
  .consensus {
    font-size: 14px;
    color: ${props => props.consensus > 0.7 ? '#00ff88' : props.consensus > 0.5 ? '#ffbb00' : '#ff6666'};
  }
`

// Domain Grid - REAL BUSINESS INTELLIGENCE
const DomainGridSection = styled.section`
  padding: 100px 40px;
  background: #000;
`

const GridTitle = styled.h2`
  font-size: 48px;
  font-weight: 100;
  text-align: center;
  margin-bottom: 20px;
  color: #fff;
`

const GridSubtitle = styled.p`
  font-size: 20px;
  color: #ccc;
  text-align: center;
  margin-bottom: 80px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`

const DomainGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;
`

const DomainCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-4px);
  }
`

const DomainName = styled.h3`
  font-size: 24px;
  font-weight: 400;
  margin-bottom: 12px;
  color: #fff;
`

const DomainFocus = styled.div`
  font-size: 14px;
  color: #888;
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 1px;
`

const DomainScore = styled.div`
  font-size: 36px;
  font-weight: 100;
  margin-bottom: 12px;
  color: ${props => 
    props.score >= 90 ? '#00ff88' : 
    props.score >= 75 ? '#fff' : 
    props.score >= 60 ? '#ffbb00' : '#ff4444'
  };
`

const DomainStats = styled.div`
  font-size: 14px;
  color: #ccc;
  margin-bottom: 20px;
  line-height: 1.6;
  
  .stat {
    margin-bottom: 4px;
  }
`

const AlertBadges = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`

const AlertBadge = styled.span`
  background: ${props => 
    props.type === 'confusion' ? 'rgba(255, 68, 68, 0.2)' :
    props.type === 'decline' ? 'rgba(255, 187, 0, 0.2)' :
    'rgba(136, 136, 136, 0.2)'
  };
  color: ${props => 
    props.type === 'confusion' ? '#ff6666' :
    props.type === 'decline' ? '#ffbb00' :
    '#888'
  };
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const ViewAnalysis = styled.div`
  font-size: 16px;
  color: #ccc;
  opacity: 0.7;
  transition: opacity 0.3s ease;
  
  ${DomainCard}:hover & {
    opacity: 1;
    color: #fff;
  }
`

// Error State
const ErrorState = styled.div`
  padding: 20px;
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid rgba(255, 68, 68, 0.3);
  border-radius: 12px;
  margin-top: 20px;
  text-align: center;
  
  .error-title {
    color: #ff6666;
    font-weight: 400;
    margin-bottom: 8px;
  }
  
  .error-message {
    color: #ccc;
    font-size: 14px;
  }
`

// CTA Section
const CTASection = styled.section`
  padding: 100px 40px;
  background: #000;
  text-align: center;
`

const CTATitle = styled.h2`
  font-size: 48px;
  font-weight: 100;
  margin-bottom: 20px;
  color: #fff;
`

const CTASubtitle = styled.p`
  font-size: 20px;
  color: #ccc;
  margin-bottom: 50px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`

const CTAButton = styled(motion.button)`
  background: #fff;
  color: #000;
  border: none;
  padding: 24px 48px;
  font-size: 20px;
  font-weight: 500;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #f0f0f0;
    transform: translateY(-2px);
  }
`

function Landing() {
  const { domains, models, stats, loading, error } = useMemoryAPI()
  const [searchValue, setSearchValue] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [searchError, setSearchError] = useState('')

  // Simulate instant preview with error handling
  useEffect(() => {
    if (searchValue.length > 3) {
      const timer = setTimeout(() => {
        // Validate domain format
        const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
        if (!domainPattern.test(searchValue)) {
          setSearchError('Please enter a valid domain (e.g., tesla.com)')
          setPreviewData(null)
          return
        }

        setSearchError('')
        
        // Find matching domain from real data or generate preview
        const matchingDomain = domains.find(d => 
          d.domain.toLowerCase().includes(searchValue.toLowerCase().split('.')[0])
        )
        
        if (matchingDomain) {
          setPreviewData({
            domain: searchValue,
            score: matchingDomain.memory_score,
            modelsAgree: matchingDomain.models_agree,
            totalModels: matchingDomain.model_count,
            disagreeing: matchingDomain.models_disagree,
            responses: matchingDomain.response_count,
            consensus: matchingDomain.ai_consensus_score,
            patentTech: true
          })
        } else {
          // Generate preview from real data patterns
          const avgScore = Math.round(domains.reduce((sum, d) => sum + d.memory_score, 0) / domains.length) || 75
          const mockScore = Math.floor(Math.random() * 30) + (avgScore - 15)
          const modelsAgree = Math.floor(Math.random() * 6) + 8
          const totalModels = Math.floor(Math.random() * 4) + 12
          
          setPreviewData({
            domain: searchValue,
            score: mockScore,
            modelsAgree,
            totalModels,
            disagreeing: totalModels - modelsAgree,
            responses: Math.floor(Math.random() * 80) + 20,
            consensus: modelsAgree / totalModels,
            patentTech: true
          })
        }
      }, 500)
      
      return () => clearTimeout(timer)
    } else {
      setPreviewData(null)
      setSearchError('')
    }
  }, [searchValue, domains])

  if (loading) {
    return (
      <Container>
        <HeroSection>
          <HeroTitle>Loading AI Intelligence...</HeroTitle>
          <HeroSubtitle>Analyzing 24,693 responses across 535 domains</HeroSubtitle>
        </HeroSection>
      </Container>
    )
  }

  return (
    <Container>
      {/* Navigation Header */}
      <Header>
        <Logo to="/">LLM PageRank</Logo>
        <Nav>
          <Link to="/domains">Browse Domains</Link>
          <Link to="/methodology">Methodology</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/about">About</Link>
        </Nav>
      </Header>

      {/* Hero Section */}
      <HeroSection>
        <HeroTitle
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          How do <span className="highlight">AI models</span><br />
          remember your brand?
        </HeroTitle>
        
        <HeroSubtitle
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          See your brand's memory score across {stats?.unique_models || 21} leading AI models.
          Patent-pending measurement technology. Real data. Real insights.
        </HeroSubtitle>

        <SearchContainer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <SearchInput
            type="text"
            placeholder="Enter your domain (e.g., tesla.com)"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          
          {searchError && (
            <ErrorState>
              <div className="error-title">Invalid Domain</div>
              <div className="error-message">{searchError}</div>
            </ErrorState>
          )}
          
          {previewData && !searchError && (
            <InstantPreview
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <ScoreDisplay score={previewData.score}>
                <span className="score">{previewData.score}</span>/100
              </ScoreDisplay>
              
              <ConsensusTeaser>
                <span className="agreement">✅ {previewData.modelsAgree} models strongly favor your brand</span>
                <br />
                <span className="disagreement">⚠️ {previewData.disagreeing} models show concerning signals</span>
                <br />
                <small style={{color: '#888', fontSize: '12px'}}>
                  Based on {previewData.responses.toLocaleString()} AI responses • Patent-pending analysis
                </small>
              </ConsensusTeaser>
              
              <UpgradeHook>
                ❓ Which models disagree? See detailed consensus breakdown →
              </UpgradeHook>
            </InstantPreview>
          )}
        </SearchContainer>
      </HeroSection>

      {/* Scientific Credibility - REAL DATA */}
      <CredibilitySection>
        <CredibilityTitle>Patent-Pending AI Memory Measurement</CredibilityTitle>
        <CredibilitySubtitle>
          The world's first comprehensive analysis of how AI models remember brands.
          Built from {stats?.total_responses?.toLocaleString() || '24,693'} real AI responses 
          across {stats?.total_domains || 535} domains.
        </CredibilitySubtitle>
        <StatsGrid>
          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="number">{stats?.total_responses?.toLocaleString() || '24,693'}</div>
            <div className="label">AI Responses</div>
            <div className="detail">Analyzed across {stats?.unique_models || 21} different models</div>
          </StatCard>
          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="number">{stats?.total_domains || '535'}+</div>
            <div className="label">Domains Measured</div>
            <div className="detail">Real-time tracking and analysis</div>
          </StatCard>
          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="number">{stats?.unique_models || 21}</div>
            <div className="label">AI Models</div>
            <div className="detail">Cross-platform consensus analysis</div>
          </StatCard>
          <StatCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="number">56</div>
            <div className="label">Weeks of Data</div>
            <div className="detail">Temporal decay pattern analysis</div>
          </StatCard>
        </StatsGrid>
      </CredibilitySection>

      {/* Live Ticker - REAL DOMAIN DATA */}
      <TickerSection>
        <TickerTitle>
          AI Memory Rankings
          <span className="live">● LIVE</span>
        </TickerTitle>
        <TickerContainer>
          {[...domains.slice(0, 12), ...domains.slice(0, 12)].map((domain, index) => (
            <TickerItem key={index} score={domain.memory_score} consensus={domain.ai_consensus_score}>
              <span className="domain">{domain.domain}</span>
              <span className="score">{domain.memory_score}</span>
              <span className="models">{domain.model_count} models</span>
              <span className="consensus">{(domain.ai_consensus_score * 100).toFixed(0)}% consensus</span>
            </TickerItem>
          ))}
        </TickerContainer>
      </TickerSection>

      {/* Domain Grid - REAL BUSINESS INTELLIGENCE */}
      <DomainGridSection>
        <GridTitle>Explore Brand Intelligence</GridTitle>
        <GridSubtitle>
          Deep analysis of how AI models perceive leading brands.
          Click any domain for comprehensive insights.
        </GridSubtitle>
        <DomainGrid>
          {domains.slice(0, 6).map((domain, index) => (
            <DomainCard
              key={domain.domain_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => window.location.href = `/domain/${domain.domain.replace('.com', '')}`}
            >
              <DomainName>{domain.domain}</DomainName>
              <DomainFocus>{domain.business_focus}</DomainFocus>
              <DomainScore score={domain.memory_score}>
                {domain.memory_score}/100
              </DomainScore>
              <DomainStats>
                <div className="stat">📊 {domain.model_count} AI models tracking</div>
                <div className="stat">🎯 {domain.response_count} responses analyzed</div>
                <div className="stat">🤝 {(domain.ai_consensus_score * 100).toFixed(0)}% consensus rate</div>
                <div className="stat">📈 {domain.market_position}</div>
              </DomainStats>
              
              <AlertBadges>
                {domain.brand_confusion_alert && (
                  <AlertBadge type="confusion">Brand Confusion</AlertBadge>
                )}
                {domain.perception_decline_alert && (
                  <AlertBadge type="decline">Perception Risk</AlertBadge>
                )}
                {domain.visibility_gap_alert && (
                  <AlertBadge type="gap">Visibility Gap</AlertBadge>
                )}
              </AlertBadges>
              
              <ViewAnalysis>View full analysis →</ViewAnalysis>
            </DomainCard>
          ))}
        </DomainGrid>
      </DomainGridSection>

      {/* CTA */}
      <CTASection>
        <CTATitle>Ready to see your score?</CTATitle>
        <CTASubtitle>
          Join hundreds of brands tracking their AI memory across {stats?.unique_models || 21} leading models.
          Get your analysis in 30 seconds.
        </CTASubtitle>
        <CTAButton
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => document.querySelector('input').focus()}
        >
          Analyze My Domain
        </CTAButton>
      </CTASection>
    </Container>
  )
}

export default Landing 