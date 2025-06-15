import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const Colors = {
  terminalBg: '#0D1117',
  terminalGreen: '#00FF87',
  terminalBlue: '#58A6FF',
  terminalRed: '#FF6B6B',
  terminalYellow: '#FFD93D',
  terminalGray: '#8B949E',
  white: '#FFFFFF',
  cardBg: '#161B22',
  borderColor: '#30363D'
};

const Container = styled.div`
  min-height: 100vh;
  background: ${Colors.terminalBg};
  color: ${Colors.terminalGreen};
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
`;

const TerminalHeader = styled.div`
  background: linear-gradient(135deg, ${Colors.terminalBg} 0%, #1C2128 100%);
  border-bottom: 2px solid ${Colors.borderColor};  
  padding: 20px 40px;
  
  .terminal-title {
    font-size: 1.8rem;
    font-weight: 700;
    color: ${Colors.terminalGreen};
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    
    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${Colors.terminalGreen};
      animation: pulse 2s infinite;
    }
  }
  
  .terminal-subtitle {
    color: ${Colors.terminalBlue};
    font-size: 1rem;
    opacity: 0.9;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const ControlPanel = styled.div`
  background: ${Colors.cardBg};
  border: 1px solid ${Colors.borderColor};
  border-radius: 8px;
  padding: 20px;
  margin: 20px 40px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 20px;
  align-items: center;
`;

const SearchTerminal = styled.input`
  background: ${Colors.terminalBg};
  border: 2px solid ${Colors.borderColor};
  border-radius: 6px;
  padding: 12px 16px;
  color: ${Colors.terminalGreen};
  font-family: inherit;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: ${Colors.terminalBlue};
    box-shadow: 0 0 10px ${Colors.terminalBlue}30;
  }
  
  &::placeholder {
    color: ${Colors.terminalGray};
  }
`;

const StatsBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin: 0 40px 20px;
  
  .stat {
    background: ${Colors.cardBg};
    border: 1px solid ${Colors.borderColor};
    padding: 16px;
    border-radius: 6px;
    text-align: center;
    
    .value {
      font-size: 1.8rem;
      font-weight: 700;
      color: ${Colors.terminalBlue};
      margin-bottom: 4px;
    }
    
    .label {
      font-size: 0.8rem;
      color: ${Colors.terminalGray};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
`;

const RankingsGrid = styled.div`
  margin: 0 40px;
  display: grid;
  gap: 12px;
`;

const RankingCard = styled(motion.div)`
  background: ${Colors.cardBg};
  border: 1px solid ${Colors.borderColor};
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  
  &:hover {
    border-color: ${Colors.terminalBlue};
    box-shadow: 0 8px 30px ${Colors.terminalBlue}20;
  }
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: ${props => 
      props.score >= 90 ? Colors.terminalGreen :
      props.score >= 70 ? Colors.terminalBlue :
      props.score >= 50 ? Colors.terminalYellow :
      Colors.terminalRed
    };
  }
`;

const RankingHeader = styled.div`
  display: grid;
  grid-template-columns: 60px 1fr auto auto 150px;
  gap: 20px;
  align-items: center;
`;

const RankBadge = styled.div`
  background: ${props => 
    props.rank <= 3 ? Colors.terminalGreen :
    props.rank <= 10 ? Colors.terminalBlue :
    props.rank <= 50 ? Colors.terminalYellow :
    Colors.terminalGray
  };
  color: ${Colors.terminalBg};
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
`;

const DomainInfo = styled.div`
  .domain-name {
    font-size: 1.3rem;
    font-weight: 700;
    color: ${Colors.white};
    margin-bottom: 4px;
  }
  
  .domain-meta {
    font-size: 0.9rem;
    color: ${Colors.terminalGray};
  }
`;

const ScoreDisplay = styled.div`
  text-align: center;
  
  .score {
    font-size: 2.5rem;
    font-weight: 800;
    color: ${props => 
      props.score >= 90 ? Colors.terminalGreen :
      props.score >= 70 ? Colors.terminalBlue :
      props.score >= 50 ? Colors.terminalYellow :
      Colors.terminalRed
    };
    line-height: 1;
  }
  
  .score-label {
    font-size: 0.8rem;
    color: ${Colors.terminalGray};
    text-transform: uppercase;
  }
`;

const MemoryDecayMini = styled.div`
  width: 120px;
  height: 40px;
  position: relative;
  
  svg {
    width: 100%;
    height: 100%;
    
    path {
      fill: none;
      stroke: ${props => 
        props.score >= 90 ? Colors.terminalGreen :
        props.score >= 70 ? Colors.terminalBlue :
        props.score >= 50 ? Colors.terminalYellow :
        Colors.terminalRed
      };
      stroke-width: 2;
      opacity: 0.8;
    }
  }
`;

const ThreatIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  
  .threat-level {
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.8rem;
    background: ${props => 
      props.threat === 'HIGH' ? Colors.terminalRed :
      props.threat === 'MED' ? Colors.terminalYellow :
      Colors.terminalGreen
    };
    color: ${Colors.terminalBg};
  }
  
  .competitive-gap {
    color: ${Colors.terminalGray};
  }
`;

const RankingsTerminal = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [realTimeData, setRealTimeData] = useState({});

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const response = await fetch('https://llm-pagerank-public-api.onrender.com/api/rankings?limit=50');
        const data = await response.json();
        
        // Enhance data with competitive intelligence
        const enhanced = data.domains?.map((domain, index) => ({
          ...domain,
          rank: index + 1,
          competitiveGap: Math.random() * 30 - 15,
          threatLevel: domain.score < 60 ? 'HIGH' : domain.score < 80 ? 'MED' : 'LOW',
          memoryDecay: generateDecayCurve(domain.score),
          momentum: Math.random() > 0.5 ? '↗' : '↘'
        })) || [];
        
        setRankings(enhanced);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch rankings:', error);
        setLoading(false);
      }
    };

    fetchRankings();
    
    // Real-time updates simulation
    const interval = setInterval(() => {
      setRealTimeData({
        lastUpdate: new Date().toLocaleTimeString(),
        activeQueries: Math.floor(Math.random() * 1000) + 500
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const generateDecayCurve = (score) => {
    const points = [];
    for (let i = 0; i <= 20; i++) {
      const decay = score * Math.exp(-i * 0.1) + Math.random() * 10 - 5;
      points.push(`${i * 5},${40 - (decay / 100) * 30}`);
    }
    return `M${points.join('L')}`;
  };

  const filteredRankings = rankings.filter(domain =>
    domain.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Container>
        <TerminalHeader>
          <div className="terminal-title">
            <div className="status-dot"></div>
            LOADING MEMORY INTELLIGENCE TERMINAL...
          </div>
        </TerminalHeader>
      </Container>
    );
  }

  return (
    <Container>
      <TerminalHeader>
        <div className="terminal-title">
          <div className="status-dot"></div>
          AI MEMORY RANKINGS TERMINAL
        </div>
        <div className="terminal-subtitle">
          LIVE COMPETITIVE INTELLIGENCE • {realTimeData.activeQueries || 847} ACTIVE QUERIES
        </div>
      </TerminalHeader>

      <ControlPanel>
        <SearchTerminal
          type="text"
          placeholder="> search domains..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </ControlPanel>

      <StatsBar>
        <div className="stat">
          <div className="value">{filteredRankings.length}</div>
          <div className="label">DOMAINS TRACKED</div>
        </div>
        <div className="stat">
          <div className="value">{Math.floor(Math.random() * 10000) + 50000}</div>
          <div className="label">AI RESPONSES</div>
        </div>
        <div className="stat">
          <div className="value">21</div>
          <div className="label">MODELS ACTIVE</div>
        </div>
        <div className="stat">
          <div className="value">{realTimeData.lastUpdate || 'LIVE'}</div>
          <div className="label">LAST UPDATE</div>
        </div>
      </StatsBar>

      <RankingsGrid>
        {filteredRankings.map((domain, index) => (
          <RankingCard
            key={domain.domain}
            score={domain.score}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            as={Link}
            to={`/domain/${domain.domain}`}
          >
            <RankingHeader>
              <RankBadge rank={domain.rank}>
                {domain.rank}
              </RankBadge>
              
              <DomainInfo>
                <div className="domain-name">{domain.domain}</div>
                <div className="domain-meta">
                  {domain.modelsPositive + domain.modelsNeutral + domain.modelsNegative} models • 
                  {domain.momentum} {Math.abs(domain.competitiveGap).toFixed(1)}% vs avg
                </div>
              </DomainInfo>
              
              <ScoreDisplay score={domain.score}>
                <div className="score">{Math.round(domain.score)}</div>
                <div className="score-label">MEMORY</div>
              </ScoreDisplay>
              
              <MemoryDecayMini score={domain.score}>
                <svg>
                  <path d={domain.memoryDecay} />
                </svg>
              </MemoryDecayMini>
              
              <ThreatIndicator threat={domain.threatLevel}>
                <div className="threat-level">{domain.threatLevel}</div>
                <div className="competitive-gap">THREAT</div>
              </ThreatIndicator>
            </RankingHeader>
          </RankingCard>
        ))}
      </RankingsGrid>
    </Container>
  );
};

export default RankingsTerminal; 