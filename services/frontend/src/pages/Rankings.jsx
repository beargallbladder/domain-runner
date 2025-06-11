import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import ConsensusVisualization from '../components/ConsensusVisualization'

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 80px 40px;
  background: #ffffff;
  min-height: 100vh;
  
  @media (max-width: 768px) {
    padding: 60px 20px;
  }
`

const Header = styled.div`
  text-align: center;
  margin-bottom: 60px;
`

const Title = styled(motion.h1)`
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 24px;
  letter-spacing: -0.02em;
  color: #000000;
`

const Subtitle = styled(motion.p)`
  font-size: 20px;
  color: #666666;
  font-weight: 400;
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.6;
`

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  gap: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`

const SearchBox = styled.input`
  flex: 1;
  max-width: 400px;
  padding: 16px 20px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
  
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
  gap: 12px;
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`

const SortButton = styled.button`
  padding: 12px 20px;
  border: 2px solid ${props => props.active ? '#007AFF' : '#e5e5e5'};
  background: ${props => props.active ? '#007AFF' : '#ffffff'};
  color: ${props => props.active ? '#ffffff' : '#666666'};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  
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

function Rankings() {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('score')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDomains, setTotalDomains] = useState(0)

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: currentPage,
          limit: 50,
          search: searchTerm,
          sort: sortBy
        })
        
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://llm-pagerank-public-api.onrender.com'}/api/rankings?${params}`)
        const data = await response.json()
        
        setRankings(data.domains || [])
        setTotalPages(data.totalPages || 1)
        setTotalDomains(data.totalDomains || 0)
      } catch (error) {
        console.error('Failed to fetch rankings:', error)
        setRankings([])
      } finally {
        setLoading(false)
      }
    }

    fetchRankings()
  }, [currentPage, searchTerm, sortBy])

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleSort = (newSortBy) => {
    setSortBy(newSortBy)
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <Container>
        <LoadingState>
          <div className="spinner"></div>
          <div className="title">Loading Memory Rankings...</div>
        </LoadingState>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <Title
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Complete Memory Rankings
        </Title>
        <Subtitle
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Every domain, ranked by AI memory strength. See which sites are remembered most vividly across all models.
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
        <SearchBox
          type="text"
          placeholder="Search domains..."
          value={searchTerm}
          onChange={handleSearch}
        />
        
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
  )
}

export default Rankings 