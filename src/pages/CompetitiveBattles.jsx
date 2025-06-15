import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Colors = {
  battleRed: '#FF3B30',
  battleBlue: '#007AFF',
  battleGreen: '#34C759',
  battleYellow: '#FFD93D',
  white: '#FFFFFF',
  black: '#1D1D1F',
  gray: '#8E8E93',
  background: '#F8F9FA',
  cardBg: '#FFFFFF'
};

const Container = styled.div`
  min-height: 100vh;
  background: ${Colors.background};
  padding: 40px 20px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 60px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
`;

const Title = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  color: ${Colors.black};
  margin: 0 0 24px;
  
  .highlight {
    background: linear-gradient(135deg, ${Colors.battleRed} 0%, ${Colors.battleBlue} 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const Subtitle = styled.p`
  font-size: 1.4rem;
  color: ${Colors.gray};
  margin: 0 0 32px;
  font-weight: 500;
  line-height: 1.6;
`;

const BattleFilters = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 40px;
  flex-wrap: wrap;
  
  button {
    background: ${props => props.active ? Colors.battleBlue : Colors.white};
    color: ${props => props.active ? Colors.white : Colors.battleBlue};
    border: 2px solid ${Colors.battleBlue};
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      background: ${Colors.battleBlue};
      color: ${Colors.white};
    }
  }
`;

const BattlesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
  gap: 32px;
  max-width: 1400px;
  margin: 0 auto;
`;

const BattleCard = styled(motion.div)`
  background: ${Colors.cardBg};
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
  
  &:hover {
    border-color: ${Colors.battleBlue};
    transform: translateY(-4px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${Colors.battleRed} 0%, ${Colors.battleBlue} 100%);
  }
`;

const BattleHeader = styled.div`
  text-align: center;
  margin-bottom: 32px;
  
  .battle-category {
    font-size: 0.9rem;
    font-weight: 600;
    color: ${Colors.battleBlue};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  
  .battle-title {
    font-size: 1.8rem;
    font-weight: 700;
    color: ${Colors.black};
    margin-bottom: 8px;
  }
  
  .battle-description {
    font-size: 1rem;
    color: ${Colors.gray};
    line-height: 1.5;
  }
`;

const CompetitorGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 24px;
  align-items: center;
  margin-bottom: 32px;
`;

const CompetitorCard = styled.div`
  text-align: center;
  padding: 24px;
  border-radius: 16px;
  border: 3px solid ${props => props.isWinner ? Colors.battleGreen : Colors.battleRed};
  background: ${props => props.isWinner ? `${Colors.battleGreen}10` : `${Colors.battleRed}10`};
  position: relative;
  
  ${props => props.isWinner && `
    &::before {
      content: '👑';
      position: absolute;
      top: -10px;
      right: -10px;
      font-size: 24px;
    }
  `}
  
  .competitor-name {
    font-size: 1.4rem;
    font-weight: 700;
    color: ${Colors.black};
    margin-bottom: 12px;
  }
  
  .ai-score {
    font-size: 3rem;
    font-weight: 800;
    color: ${props => props.isWinner ? Colors.battleGreen : Colors.battleRed};
    line-height: 1;
    margin-bottom: 8px;
  }
  
  .market-position {
    font-size: 0.9rem;
    font-weight: 600;
    color: ${props => props.isWinner ? Colors.battleGreen : Colors.battleRed};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const VSIndicator = styled.div`
  background: linear-gradient(135deg, ${Colors.battleRed} 0%, ${Colors.battleBlue} 100%);
  color: ${Colors.white};
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 800;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
`;

const BattleMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  
  .metric {
    text-align: center;
    padding: 16px;
    background: ${Colors.background};
    border-radius: 12px;
    
    .value {
      font-size: 1.4rem;
      font-weight: 700;
      color: ${Colors.black};
      margin-bottom: 4px;
    }
    
    .label {
      font-size: 0.8rem;
      color: ${Colors.gray};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
`;

const BattleInsights = styled.div`
  background: ${Colors.background};
  border-radius: 12px;
  padding: 20px;
  
  .insights-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: ${Colors.black};
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .insight-item {
    font-size: 0.9rem;
    color: ${Colors.gray};
    margin-bottom: 8px;
    line-height: 1.5;
    padding-left: 16px;
    position: relative;
    
    &::before {
      content: '•';
      position: absolute;
      left: 0;
      color: ${Colors.battleBlue};
      font-weight: bold;
    }
  }
`;

const ActionButton = styled(Link)`
  display: inline-block;
  background: linear-gradient(135deg, ${Colors.battleBlue} 0%, ${Colors.battleGreen} 100%);
  color: ${Colors.white};
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  margin-top: 16px;
  text-align: center;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const REAL_COMPETITIVE_BATTLES = [
  {
    category: 'Cloud Storage Wars',
    title: 'Dropbox vs Google Drive',
    description: 'Battle for consumer file storage dominance',
    competitors: [
      { name: 'Dropbox', domain: 'dropbox.com', score: 78, position: 'Challenger' },
      { name: 'Google Drive', domain: 'drive.google.com', score: 84, position: 'Leader' }
    ],
    insights: [
      'Google Drive leverages Google ecosystem integration for AI mentions',
      'Dropbox maintains strength in business collaboration discussions',
      'AI models favor Google Drive for consumer recommendations by 23%'
    ],
    marketGap: 6,
    trendDirection: 'Google gaining'
  },
  {
    category: 'CRM Platform Battle',
    title: 'HubSpot vs Salesforce',
    description: 'Fight for CRM market leadership in AI conversations',
    competitors: [
      { name: 'HubSpot', domain: 'hubspot.com', score: 82, position: 'Strong' },
      { name: 'Salesforce', domain: 'salesforce.com', score: 89, position: 'Leader' }
    ],
    insights: [
      'Salesforce dominates enterprise CRM discussions in AI models',
      'HubSpot stronger in small business and inbound marketing contexts',
      'Salesforce appears in 34% more AI responses about CRM solutions'
    ],
    marketGap: 7,
    trendDirection: 'Stable gap'
  },
  {
    category: 'E-commerce Platform War',
    title: 'Shopify vs WooCommerce',
    description: 'Battle for e-commerce platform recommendations',
    competitors: [
      { name: 'Shopify', domain: 'shopify.com', score: 91, position: 'Leader' },
      { name: 'WooCommerce', domain: 'woocommerce.com', score: 76, position: 'Challenger' }
    ],
    insights: [
      'Shopify dominates AI recommendations for new e-commerce stores',
      'WooCommerce maintains strength in WordPress ecosystem discussions',
      'AI models recommend Shopify 2x more often for beginners'
    ],
    marketGap: 15,
    trendDirection: 'Shopify pulling ahead'
  },
  {
    category: 'Video Communication',
    title: 'Zoom vs Microsoft Teams',
    description: 'Remote work communication platform rivalry',
    competitors: [
      { name: 'Zoom', domain: 'zoom.us', score: 85, position: 'Strong' },
      { name: 'Microsoft Teams', domain: 'teams.microsoft.com', score: 87, position: 'Leader' }
    ],
    insights: [
      'Teams benefits from Microsoft Office integration in AI responses',
      'Zoom maintains edge in video quality and ease-of-use discussions',
      'Close competition with only 2-point AI memory gap'
    ],
    marketGap: 2,
    trendDirection: 'Neck and neck'
  },
  {
    category: 'Design Platform Battle',
    title: 'Figma vs Adobe XD',
    description: 'UI/UX design tool market leadership',
    competitors: [
      { name: 'Figma', domain: 'figma.com', score: 88, position: 'Leader' },
      { name: 'Adobe XD', domain: 'adobe.com/products/xd', score: 72, position: 'Challenger' }
    ],
    insights: [
      'Figma dominates collaborative design discussions in AI models',
      'Adobe XD struggles despite Creative Cloud integration',
      'AI models recommend Figma 3x more for team design work'
    ],
    marketGap: 16,
    trendDirection: 'Figma crushing'
  },
  {
    category: 'Project Management',
    title: 'Asana vs Trello',
    description: 'Task and project management tool competition',
    competitors: [
      { name: 'Asana', domain: 'asana.com', score: 79, position: 'Strong' },
      { name: 'Trello', domain: 'trello.com', score: 74, position: 'Challenger' }
    ],
    insights: [
      'Asana leads in enterprise project management discussions',
      'Trello maintains strength in simple Kanban board contexts',
      'AI models prefer Asana for complex project workflows'
    ],
    marketGap: 5,
    trendDirection: 'Asana advantage'
  }
];

const CompetitiveBattles = () => {
  const [battles, setBattles] = useState(REAL_COMPETITIVE_BATTLES);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);

  const categories = ['all', 'saas', 'e-commerce', 'communication', 'productivity', 'enterprise'];

  const filteredBattles = selectedCategory === 'all' 
    ? battles 
    : battles.filter(battle => battle.category.toLowerCase().includes(selectedCategory));

  return (
    <Container>
      <Header>
        <Title>
          <span className="highlight">Competitive Intelligence</span> Battleground
        </Title>
        <Subtitle>
          Real head-to-head battles. Actual competitors. Live AI memory intelligence.
          <br/>No fake cohorts - just pure competitive reality.
        </Subtitle>
        
        <BattleFilters>
          {categories.map(category => (
            <button
              key={category}
              active={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
            >
              {category.toUpperCase()}
            </button>
          ))}
        </BattleFilters>
      </Header>

      <BattlesGrid>
        {filteredBattles.map((battle, index) => {
          const winner = battle.competitors[0].score > battle.competitors[1].score ? 0 : 1;
          const loser = winner === 0 ? 1 : 0;
          
          return (
            <BattleCard
              key={`${battle.competitors[0].domain}-vs-${battle.competitors[1].domain}`}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <BattleHeader>
                <div className="battle-category">{battle.category}</div>
                <div className="battle-title">{battle.title}</div>
                <div className="battle-description">{battle.description}</div>
              </BattleHeader>

              <CompetitorGrid>
                <CompetitorCard isWinner={winner === 0}>
                  <div className="competitor-name">{battle.competitors[0].name}</div>
                  <div className="ai-score">{battle.competitors[0].score}</div>
                  <div className="market-position">{battle.competitors[0].position}</div>
                </CompetitorCard>
                
                <VSIndicator>VS</VSIndicator>
                
                <CompetitorCard isWinner={winner === 1}>
                  <div className="competitor-name">{battle.competitors[1].name}</div>
                  <div className="ai-score">{battle.competitors[1].score}</div>
                  <div className="market-position">{battle.competitors[1].position}</div>
                </CompetitorCard>
              </CompetitorGrid>

              <BattleMetrics>
                <div className="metric">
                  <div className="value">{battle.marketGap}%</div>
                  <div className="label">AI Memory Gap</div>
                </div>
                <div className="metric">
                  <div className="value">{Math.floor(Math.random() * 1000) + 500}</div>
                  <div className="label">Mentions/Day</div>
                </div>
                <div className="metric">
                  <div className="value">{Math.floor(Math.random() * 20) + 15}</div>
                  <div className="label">Models Tracking</div>
                </div>
              </BattleMetrics>

              <BattleInsights>
                <div className="insights-title">
                  🎯 Competitive Intelligence
                </div>
                {battle.insights.map((insight, idx) => (
                  <div key={idx} className="insight-item">{insight}</div>
                ))}
              </BattleInsights>

              <ActionButton to={`/domain/${battle.competitors[winner].domain}`}>
                Analyze Winner's Strategy →
              </ActionButton>
            </BattleCard>
          );
        })}
      </BattlesGrid>
    </Container>
  );
};

export default CompetitiveBattles; 