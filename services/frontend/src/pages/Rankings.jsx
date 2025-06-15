import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import ConsensusVisualization from '../components/ConsensusVisualization'

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
  background: #ffffff;
  min-height: 100vh;
  
  @media (min-width: 768px) {
    padding: 80px 40px;
  }
`

const Header = styled.div`
  text-align: center;
  margin-bottom: 60px;
`

const Title = styled(motion.h1)`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
  color: #000000;
  
  @media (min-width: 768px) {
    font-size: 48px;
    margin-bottom: 24px;
  }
`

const Subtitle = styled(motion.p)`
  font-size: 1.1rem;
  color: #666666;
  font-weight: 400;
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.6;
  
  @media (min-width: 768px) {
    font-size: 20px;
  }
`

const Controls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 30px;
  
  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
    gap: 20px;
  }
`

const SearchBox = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
  
  @media (min-width: 768px) {
    flex: 1;
    max-width: 400px;
    padding: 16px 20px;
  }
  
  &:focus {
    outline: none;
    border-color: #007AFF;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
  }
  
  &::placeholder {
    color: #999999;
  }
`

const SortControls = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  
  @media (min-width: 768px) {
    gap: 12px;
    flex-wrap: nowrap;
  }
`

const SortButton = styled.button`
  padding: 10px 16px;
  border: 2px solid ${props => props.active ? '#007AFF' : '#e5e5e5'};
  background: ${props => props.active ? '#007AFF' : '#ffffff'};
  color: ${props => props.active ? '#ffffff' : '#666666'};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 13px;
  flex: 1;
  
  @media (min-width: 768px) {
    padding: 12px 20px;
    font-size: 14px;
    flex: none;
  }
  
  &:hover {
    border-color: #007AFF;
    color: ${props => props.active ? '#ffffff' : '#007AFF'};
  }
`

const Stats = styled.div`
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-bottom: 40px;
  padding: 24px;
  background: #f8f9fa;
  border-radius: 12px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .stat {
    text-align: center;
    
    .value {
      font-size: 32px;
      font-weight: 700;
      color: #007AFF;
      display: block;
      margin-bottom: 4px;
    }
    
    .label {
      font-size: 14px;
      color: #666666;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
`

const RankingsTable = styled.div`
  background: #ffffff;
  border: 2px solid #f0f0f0;
  border-radius: 16px;
  overflow: hidden;
`

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 120px 200px 120px;
  padding: 20px;
  background: #f8f9fa;
  font-weight: 600;
  color: #333333;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  @media (max-width: 768px) {
    grid-template-columns: 60px 1fr 100px;
    
    .hide-mobile {
      display: none;
    }
  }
`

const TableRow = styled(motion.div)`
  display: grid;
  grid-template-columns: 80px 1fr 120px 200px 120px;
  padding: 24px 20px;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    background: #f8f9fa;
    transform: translateX(4px);
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 60px 1fr 100px;
    
    .hide-mobile {
      display: none;
    }
  }
`

const Rank = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${props => 
    props.rank === 1 ? '#FFD700' :
    props.rank === 2 ? '#C0C0C0' :
    props.rank === 3 ? '#CD7F32' :
    '#666666'
  };
  display: flex;
  align-items: center;
  
  &::before {
    content: '${props => 
      props.rank === 1 ? '🥇' :
      props.rank === 2 ? '🥈' :
      props.rank === 3 ? '🥉' :
      ''
    }';
    margin-right: 8px;
    font-size: 16px;
  }
`

const DomainCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  .domain-name {
    font-size: 18px;
    font-weight: 600;
    color: #000000;
  }
  
  .domain-meta {
    font-size: 12px;
    color: #666666;
    font-weight: 500;
  }
`

const Score = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${props => 
    props.score >= 90 ? '#34C759' : 
    props.score >= 70 ? '#FF9500' : '#FF3B30'
  };
  display: flex;
  align-items: center;
  justify-content: center;
  
  .trend {
    font-size: 12px;
    margin-left: 8px;
    font-weight: 500;
  }
`

const LoadingState = styled.div`
  text-align: center;
  padding: 80px 40px;
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f0f0f0;
    border-top: 4px solid #007AFF;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 24px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .title {
    font-size: 24px;
    font-weight: 600;
    color: #000000;
    margin-bottom: 16px;
  }
`

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 40px;
  
  button {
    padding: 12px 20px;
    border: 2px solid #e5e5e5;
    background: #ffffff;
    color: #666666;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover:not(:disabled) {
      border-color: #007AFF;
      color: #007AFF;
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    &.active {
      border-color: #007AFF;
      background: #007AFF;
      color: #ffffff;
    }
  }
  
  .page-info {
    font-size: 14px;
    color: #666666;
    font-weight: 500;
  }
`

const ViewToggle = styled.div`
  display: flex;
  gap: 8px;
  background: #f0f0f0;
  border-radius: 8px;
  padding: 4px;
`;

const ViewButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: ${props => props.active ? '#007AFF' : 'transparent'};
  color: ${props => props.active ? '#ffffff' : '#666666'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;

  &:hover {
    background: ${props => props.active ? '#007AFF' : '#e0e0e0'};
  }
`;

const TerminalContainer = styled.div`
  background: #0D1117;
  color: #00FF87;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  min-height: 100vh;
  padding: 20px;
`;

const TerminalTable = styled.div`
  background: #161B22;
  border: 1px solid #30363D;
  border-radius: 8px;
  overflow: hidden;
`;

const TerminalHeader = styled.div`
  background: #1C2128;
  padding: 16px 20px;
  border-bottom: 1px solid #30363D;
  font-weight: 600;
  color: #58A6FF;
  font-size: 14px;
  display: grid;
  grid-template-columns: 80px 1fr 120px 200px 120px;
  
  @media (max-width: 768px) {
    grid-template-columns: 60px 1fr 100px;
    
    .hide-mobile {
      display: none;
    }
  }
`;

const TerminalRow = styled(motion.div)`
  display: grid;
  grid-template-columns: 80px 1fr 120px 200px 120px;
  padding: 20px;
  border-bottom: 1px solid #30363D;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #1C2128;
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 60px 1fr 100px;
    
    .hide-mobile {
      display: none;
    }
  }
`;

const TerminalRank = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${props => 
    props.rank === 1 ? '#FFD700' :
    props.rank === 2 ? '#C0C0C0' :
    props.rank === 3 ? '#CD7F32' :
    '#00FF87'
  };
  display: flex;
  align-items: center;
`;

const TerminalDomain = styled.div`
  .domain-name {
    font-size: 16px;
    font-weight: 600;
    color: #FFFFFF;
    margin-bottom: 4px;
  }
  
  .domain-meta {
    font-size: 12px;
    color: #8B949E;
  }
`;

const TerminalScore = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${props => 
    props.score >= 90 ? '#00FF87' : 
    props.score >= 70 ? '#58A6FF' : 
    props.score >= 50 ? '#FFD93D' : '#FF6B6B'
  };
  display: flex;
  align-items: center;
  justify-content: center;
`;

function Rankings() {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('score')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDomains, setTotalDomains] = useState(0)
  const [searchLoading, setSearchLoading] = useState(false)
  const [viewMode, setViewMode] = useState('clean') // 'clean' or 'terminal'

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchRankings()
    }, searchTerm ? 300 : 0) // 300ms debounce for search, immediate for no search

    return () => clearTimeout(timeoutId)
  }, [currentPage, searchTerm, sortBy])

  const fetchRankings = async () => {
    if (searchTerm && searchTerm.length < 2) return // Don't search for single characters
    
    const isSearching = Boolean(searchTerm)
    if (isSearching) {
      setSearchLoading(true)
    } else {
      setLoading(true)
    }
    
    console.log(`🔍 ${isSearching ? 'Searching' : 'Fetching'} rankings...`)
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 50,
        sort: sortBy,
        // Add cache busting
        _t: Date.now()
      })
      
      // Only add search param if there's actually a search term
      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.toLowerCase().trim())
      }
      
      const url = `https://llm-pagerank-public-api.onrender.com/api/rankings?${params}`
      console.log('📡 API URL:', url)
      
      const response = await fetch(url, {
        // Force no cache
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`)
      }
      
      const data = await response.json()
      
      console.log('✅ API Response:', data)
      console.log(`📊 Found ${data.domains?.length || 0} domains for "${searchTerm || 'all'}"`)
      
      setRankings(data.domains || [])
      setTotalPages(data.totalPages || 1)
      setTotalDomains(data.totalDomains || 0)
      
      console.log('✅ Rankings state updated')
    } catch (error) {
      console.error('❌ Failed to fetch rankings:', error)
      setRankings([])
      setTotalDomains(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
      setSearchLoading(false)
      console.log('🏁 Rankings fetch complete')
    }
  }

  const handleSearch = (e) => {
    const newSearchTerm = e.target.value
    setSearchTerm(newSearchTerm)
    setCurrentPage(1) // Reset to first page when searching
    
    // Show immediate feedback
    if (newSearchTerm && newSearchTerm.length >= 2) {
      setSearchLoading(true)
    }
  }

  const handleSort = (newSortBy) => {
    setSortBy(newSortBy)
    setCurrentPage(1)
  }

  const clearSearch = () => {
    setSearchTerm('')
    setCurrentPage(1)
  }

  const renderCleanView = () => (
    <Container>
      <Header>
        <Title
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          AI Memory Rankings
        </Title>
        <Subtitle
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Complete rankings of {totalDomains.toLocaleString()} domains by AI memory strength. Winners vs Losers in the AI memory game.
        </Subtitle>
      </Header>

      <Stats>
        <div className="stat">
          <span className="value">{totalDomains.toLocaleString()}</span>
          <span className="label">Total Domains</span>
        </div>
        <div className="stat">
          <span className="value">{rankings.length}</span>
          <span className="label">Showing</span>
        </div>
        <div className="stat">
          <span className="value">{currentPage}</span>
          <span className="label">Page</span>
        </div>
      </Stats>

      <Controls>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <SearchBox
            type="text"
            placeholder="Search domains... (try: microsoft, apple, google)"
            value={searchTerm}
            onChange={handleSearch}
            style={{ 
              borderColor: searchLoading ? '#007AFF' : searchTerm ? '#34C759' : '#e5e5e5',
              paddingRight: searchTerm ? '40px' : '16px'
            }}
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                fontSize: '18px',
                color: '#666',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          )}
          {searchLoading && (
            <div style={{
              position: 'absolute',
              right: searchTerm ? '40px' : '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              border: '2px solid #007AFF',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
        </div>
        
        <ViewToggle>
          <ViewButton 
            active={viewMode === 'clean'} 
            onClick={() => setViewMode('clean')}
          >
            📊 Clean
          </ViewButton>
          <ViewButton 
            active={viewMode === 'terminal'} 
            onClick={() => setViewMode('terminal')}
          >
            💻 Terminal
          </ViewButton>
        </ViewToggle>
        
        <SortControls>
          <SortButton 
            active={sortBy === 'score'} 
            onClick={() => handleSort('score')}
          >
            Memory Score
          </SortButton>
          <SortButton 
            active={sortBy === 'consensus'} 
            onClick={() => handleSort('consensus')}
          >
            Consensus
          </SortButton>
          <SortButton 
            active={sortBy === 'domain'} 
            onClick={() => handleSort('domain')}
          >
            Domain Name
          </SortButton>
        </SortControls>
      </Controls>

      {searchTerm && rankings.length === 0 && !searchLoading && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '12px',
          margin: '20px 0'
        }}>
          <h3 style={{ marginBottom: '8px', color: '#856404' }}>No results for "{searchTerm}"</h3>
          <p style={{ color: '#856404', marginBottom: '16px' }}>
            Try searching for: microsoft, apple, google, amazon, tesla, netflix
          </p>
          <button onClick={clearSearch} style={{
            background: '#007AFF',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            Clear Search
          </button>
        </div>
      )}

      <RankingsTable>
        <TableHeader>
          <span>Rank</span>
          <span>Domain</span>
          <span>Score</span>
          <span className="hide-mobile">Consensus</span>
          <span className="hide-mobile">Trend</span>
        </TableHeader>
        
        {rankings.map((domain, index) => {
          const globalRank = (currentPage - 1) * 50 + index + 1
          return (
            <TableRow
              key={domain.domain}
              as={Link}
              to={`/domain/${domain.domain}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <Rank rank={globalRank}>
                {globalRank}
              </Rank>
              
              <DomainCell>
                <div className="domain-name">{domain.domain}</div>
                <div className="domain-meta">
                  {domain.modelsPositive + domain.modelsNeutral + domain.modelsNegative} models tested
                </div>
              </DomainCell>
              
              <Score score={domain.score}>
                {Math.round(domain.score)}
                <span className="trend">{domain.trend}</span>
              </Score>
              
              <div className="hide-mobile">
                <ConsensusVisualization 
                  modelsPositive={domain.modelsPositive}
                  modelsNeutral={domain.modelsNeutral}
                  modelsNegative={domain.modelsNegative}
                  size="small"
                />
              </div>
              
              <div className="hide-mobile" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600',
                color: domain.trend?.startsWith('+') ? '#34C759' : '#FF3B30'
              }}>
                {domain.trend}
              </div>
            </TableRow>
          )
        })}
      </RankingsTable>

      <Pagination>
        <button 
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
        >
          First
        </button>
        <button 
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        
        <span className="page-info">
          Page {currentPage} of {totalPages}
        </span>
        
        <button 
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
        <button 
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
        >
          Last
        </button>
      </Pagination>
    </Container>
  );

  const renderTerminalView = () => (
    <TerminalContainer>
      <div style={{ 
        background: '#1C2128', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #30363D'
      }}>
        <h1 style={{ 
          color: '#00FF87', 
          margin: '0 0 8px', 
          fontSize: '1.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#00FF87',
            animation: 'pulse 2s infinite'
          }}></div>
          AI MEMORY RANKINGS TERMINAL
        </h1>
        <p style={{ color: '#58A6FF', margin: 0, fontSize: '1rem' }}>
          LIVE COMPETITIVE INTELLIGENCE • {totalDomains.toLocaleString()} DOMAINS TRACKED
        </p>
      </div>

      <div style={{ 
        background: '#161B22', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #30363D',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '20px',
        alignItems: 'center'
      }}>
        <SearchBox
          type="text"
          placeholder="> search domains..."
          value={searchTerm}
          onChange={handleSearch}
          style={{ 
            background: '#0D1117',
            border: '2px solid #30363D',
            color: '#00FF87',
            fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace'
          }}
        />
        
        <ViewToggle>
          <ViewButton 
            active={viewMode === 'clean'} 
            onClick={() => setViewMode('clean')}
          >
            📊 Clean
          </ViewButton>
          <ViewButton 
            active={viewMode === 'terminal'} 
            onClick={() => setViewMode('terminal')}
          >
            💻 Terminal
          </ViewButton>
        </ViewToggle>
      </div>

      <TerminalTable>
        <TerminalHeader>
          <span>RANK</span>
          <span>DOMAIN</span>
          <span>MEMORY</span>
          <span className="hide-mobile">CONSENSUS</span>
          <span className="hide-mobile">TREND</span>
        </TerminalHeader>
        
        {rankings.map((domain, index) => {
          const globalRank = (currentPage - 1) * 50 + index + 1
          return (
            <TerminalRow
              key={domain.domain}
              as={Link}
              to={`/domain/${domain.domain}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <TerminalRank rank={globalRank}>
                {globalRank}
              </TerminalRank>
              
              <TerminalDomain>
                <div className="domain-name">{domain.domain}</div>
                <div className="domain-meta">
                  {domain.modelsPositive + domain.modelsNeutral + domain.modelsNegative} models • 
                  LIVE DATA
                </div>
              </TerminalDomain>
              
              <TerminalScore score={domain.score}>
                {Math.round(domain.score)}
              </TerminalScore>
              
              <div className="hide-mobile" style={{ color: '#8B949E' }}>
                <ConsensusVisualization 
                  modelsPositive={domain.modelsPositive}
                  modelsNeutral={domain.modelsNeutral}
                  modelsNegative={domain.modelsNegative}
                  size="small"
                />
              </div>
              
              <div className="hide-mobile" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600',
                color: domain.trend?.startsWith('+') ? '#00FF87' : '#FF6B6B'
              }}>
                {domain.trend}
              </div>
            </TerminalRow>
          )
        })}
      </TerminalTable>
    </TerminalContainer>
  );

  if (loading && !searchLoading) {
    return (
      <Container>
        <LoadingState>
          <div className="spinner"></div>
          <div className="title">Loading Memory Rankings...</div>
        </LoadingState>
      </Container>
    )
  }

  return viewMode === 'terminal' ? renderTerminalView() : renderCleanView();
}

export default Rankings 