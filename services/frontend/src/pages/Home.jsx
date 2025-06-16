import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import axios from 'axios';
import DigitalMemoryHero from '../components/DigitalMemoryHero';

const Container = styled.div`
  min-height: 100vh;
  background: #000000;
  color: #ffffff;
  display: flex;
  flex-direction: column;
`;

const ContentSection = styled.section`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const SearchSection = styled(motion.div)`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 48px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 600px;
  width: 100%;
`;

const SearchBox = styled.input`
  width: 100%;
  max-width: 500px;
  padding: 20px 24px;
  font-size: 1.2rem;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    background: #ffffff;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    transform: translateY(-2px);
  }
  
  &::placeholder {
    color: #666;
  }
`;

const SearchButton = styled.button`
  background: #007AFF;
  color: white;
  border: none;
  padding: 20px 40px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 12px;
  margin-top: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #0056b3;
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 122, 255, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ExampleSearches = styled.div`
  margin-top: 24px;
  
  .label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 12px;
  }
  
  .examples {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
  }
`;

const ExampleChip = styled.button`
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }
`;

const QuickStats = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 24px;
  max-width: 600px;
  margin-bottom: 48px;
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  .number {
    font-size: 2rem;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 4px;
  }
  
  .label {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.8);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const QuickLinks = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
`;

const QuickLink = styled.button`
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s ease-in-out infinite;
  margin-left: 8px;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    
    // Add a small delay for UX (shows we're "searching")
    setTimeout(() => {
      // Navigate to the domain page
      const cleanDomain = searchTerm.toLowerCase().trim().replace('https://', '').replace('http://', '').replace('www.', '');
      navigate(`/domain/${cleanDomain}`);
      setLoading(false);
    }, 800);
  };
  
  const handleExampleSearch = (domain) => {
    setSearchTerm(domain);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Container>
      {/* New Digital Memory Hero Section */}
      <DigitalMemoryHero name="Your Brand" />
      
      {/* Search and Stats Section */}
      <ContentSection>
        <SearchSection
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <SearchBox
            type="text"
            placeholder="Enter your domain (e.g., apple.com, microsoft.com)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          
          <SearchButton 
            onClick={handleSearch}
            disabled={loading || !searchTerm.trim()}
          >
            {loading ? (
              <>
                Analyzing...
                <LoadingSpinner />
              </>
            ) : (
              "Get My AI Memory Score"
            )}
          </SearchButton>
          
          <ExampleSearches>
            <div className="label">Try these examples:</div>
            <div className="examples">
              {['apple.com', 'microsoft.com', 'tesla.com', 'netflix.com', 'stripe.com'].map(domain => (
                <ExampleChip 
                  key={domain} 
                  onClick={() => handleExampleSearch(domain)}
                >
                  {domain}
                </ExampleChip>
              ))}
            </div>
          </ExampleSearches>
        </SearchSection>

        <QuickStats
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <StatCard>
            <div className="number">3,618</div>
            <div className="label">Brands Tracked</div>
          </StatCard>
          <StatCard>
            <div className="number">17</div>
            <div className="label">AI Models</div>
          </StatCard>
          <StatCard>
            <div className="number">Real-time</div>
            <div className="label">Memory Tracking</div>
          </StatCard>
        </QuickStats>

        <QuickLinks
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <QuickLink onClick={() => navigate('/rankings')}>
            🏆 See Full Rankings
          </QuickLink>
          <QuickLink onClick={() => navigate('/battles')}>
            ⚔️ Brand vs Brand
          </QuickLink>
          <QuickLink onClick={() => navigate('/api')}>
            🚀 API Access
          </QuickLink>
        </QuickLinks>
      </ContentSection>
    </Container>
  );
};

export default Home; 