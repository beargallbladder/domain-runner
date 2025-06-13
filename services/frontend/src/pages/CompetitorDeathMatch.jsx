import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import CompetitorStackRanking from '../components/CompetitorStackRanking';

const Colors = {
  forgotten: '#FF3B30',
  dying: '#FF9500',
  surviving: '#34C759',
  thriving: '#007AFF',
  background: '#F8F9FA',
  white: '#FFFFFF',
  black: '#1D1D1F',
  gray: '#8E8E93',
  darkGray: '#48484A'
};

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, ${Colors.background} 0%, ${Colors.white} 100%);
`;

const HeroSection = styled.section`
  padding: 80px 20px 60px;
  text-align: center;
  background: linear-gradient(135deg, ${Colors.black} 0%, ${Colors.darkGray} 100%);
  color: ${Colors.white};
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
    opacity: 0.3;
  }
`;

const HeroContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const MainTitle = styled(motion.h1)`
  font-size: 4.5rem;
  font-weight: 800;
  margin: 0 0 24px;
  line-height: 1.1;
  
  .highlight {
    background: linear-gradient(135deg, ${Colors.forgotten} 0%, ${Colors.thriving} 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  @media (max-width: 768px) {
    font-size: 3rem;
  }
`;

const Subtitle = styled(motion.p)`
  font-size: 1.8rem;
  font-weight: 400;
  margin: 0 0 40px;
  opacity: 0.9;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  
  @media (max-width: 768px) {
    font-size: 1.4rem;
  }
`;

const CTASection = styled(motion.div)`
  display: flex;
  gap: 24px;
  justify-content: center;
  align-items: center;
  margin-top: 40px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
  }
`;

const PrimaryCTA = styled(Link)`
  background: linear-gradient(135deg, ${Colors.thriving} 0%, ${Colors.surviving} 100%);
  color: ${Colors.white};
  padding: 18px 36px;
  border-radius: 12px;
  text-decoration: none;
  font-size: 1.2rem;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 8px 25px rgba(0, 122, 255, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 35px rgba(0, 122, 255, 0.4);
  }
`;

const SecondaryCTA = styled(Link)`
  background: transparent;
  color: ${Colors.white};
  padding: 18px 36px;
  border: 2px solid ${Colors.white};
  border-radius: 12px;
  text-decoration: none;
  font-size: 1.2rem;
  font-weight: 600;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${Colors.white};
    color: ${Colors.black};
  }
`;

const DemoSection = styled.section`
  padding: 80px 20px;
  max-width: 1400px;
  margin: 0 auto;
`;

const DemoHeader = styled.div`
  text-align: center;
  margin-bottom: 60px;
`;

const DemoTitle = styled.h2`
  font-size: 3rem;
  font-weight: 700;
  color: ${Colors.black};
  margin: 0 0 20px;
  
  .danger {
    color: ${Colors.forgotten};
  }
`;

const DemoSubtitle = styled.p`
  font-size: 1.3rem;
  color: ${Colors.gray};
  margin: 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 40px;
  margin-top: 60px;
`;

const CategoryCard = styled(motion.div)`
  background: ${Colors.white};
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15);
  }
`;

const CategoryHeader = styled.div`
  text-align: center;
  margin-bottom: 30px;
`;

const CategoryTitle = styled.h3`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${Colors.black};
  margin: 0 0 12px;
`;

const CategoryStats = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 30px;
`;

const Stat = styled.div`
  text-align: center;
  
  .value {
    font-size: 2rem;
    font-weight: 800;
    color: ${props => props.color || Colors.black};
    margin-bottom: 4px;
  }
  
  .label {
    font-size: 0.9rem;
    color: ${Colors.gray};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const QuickRankings = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const RankItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: ${Colors.background};
  border-radius: 8px;
  border-left: 4px solid ${props => 
    props.score >= 90 ? Colors.thriving :
    props.score >= 70 ? Colors.surviving :
    props.score >= 50 ? Colors.dying :
    Colors.forgotten
  };
  
  .domain {
    font-weight: 600;
    color: ${Colors.black};
  }
  
  .score {
    font-weight: 700;
    color: ${props => 
      props.score >= 90 ? Colors.thriving :
      props.score >= 70 ? Colors.surviving :
      props.score >= 50 ? Colors.dying :
      Colors.forgotten
    };
  }
`;

const PanicSection = styled.section`
  background: linear-gradient(135deg, ${Colors.forgotten} 0%, #FF6B6B 100%);
  color: ${Colors.white};
  padding: 80px 20px;
  text-align: center;
  margin: 80px 0;
`;

const PanicContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const PanicTitle = styled.h2`
  font-size: 3.5rem;
  font-weight: 800;
  margin: 0 0 24px;
  line-height: 1.1;
`;

const PanicText = styled.p`
  font-size: 1.5rem;
  margin: 0 0 40px;
  opacity: 0.95;
`;

const UrgentCTA = styled(Link)`
  background: ${Colors.white};
  color: ${Colors.forgotten};
  padding: 20px 40px;
  border-radius: 12px;
  text-decoration: none;
  font-size: 1.3rem;
  font-weight: 700;
  transition: all 0.3s ease;
  display: inline-block;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 35px rgba(255, 255, 255, 0.3);
  }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  font-size: 1.2rem;
  color: ${Colors.gray};
`;

const CompetitorDeathMatch = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'https://llm-pagerank-public-api.onrender.com'}/api/categories`);
        const categoriesData = response.data.categories || [];
        
        // Add some demo categories if none exist
        if (categoriesData.length === 0) {
          const demoCategories = [
            {
              name: 'Technology Giants',
              totalDomains: 25,
              averageScore: 78.5,
              topDomains: [
                { domain: 'google.com', score: 95 },
                { domain: 'microsoft.com', score: 92 },
                { domain: 'apple.com', score: 89 },
                { domain: 'amazon.com', score: 87 },
                { domain: 'meta.com', score: 82 }
              ]
            },
            {
              name: 'Social Media',
              totalDomains: 18,
              averageScore: 71.2,
              topDomains: [
                { domain: 'instagram.com', score: 88 },
                { domain: 'twitter.com', score: 85 },
                { domain: 'linkedin.com', score: 79 },
                { domain: 'tiktok.com', score: 76 },
                { domain: 'snapchat.com', score: 68 }
              ]
            }
          ];
          setCategories(demoCategories);
        } else {
          setCategories(categoriesData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <Container>
        <LoadingState>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{ marginRight: '15px' }}
          >
            ⭕
          </motion.div>
          Loading competitive intelligence...
        </LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <HeroSection>
        <HeroContent>
          <MainTitle
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Competitive AI Memory <span className="highlight">Benchmarking</span>
          </MainTitle>
          
          <Subtitle
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Objective analysis of how AI systems remember and reference your brand compared to industry competitors. 
            Data-driven insights for strategic positioning in the AI-powered future.
          </Subtitle>
          
          <CTASection
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <PrimaryCTA to="/rankings">
              🔍 Check Your Brand's Position
            </PrimaryCTA>
            <SecondaryCTA to="/about">
              Learn How This Works
            </SecondaryCTA>
          </CTASection>
        </HeroContent>
      </HeroSection>

      <DemoSection>
        <DemoHeader>
                  <DemoTitle>
          Industry <span className="danger">Competitive Analysis</span>
        </DemoTitle>
        <DemoSubtitle>
          Scientific measurement of brand recognition across AI language models by industry sector
        </DemoSubtitle>
        </DemoHeader>

        {selectedCategory ? (
          <div>
            <CompetitorStackRanking 
              domain={selectedCategory.topDomains[0]?.domain}
              category={selectedCategory.name}
              limit={5}
            />
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button 
                onClick={() => setSelectedCategory(null)}
                style={{
                  background: Colors.gray,
                  color: Colors.white,
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ← Back to Categories
              </button>
            </div>
          </div>
        ) : (
          <CategoryGrid>
            {categories.map((category, index) => (
              <CategoryCard
                key={category.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onClick={() => setSelectedCategory(category)}
              >
                <CategoryHeader>
                  <CategoryTitle>{category.name}</CategoryTitle>
                  <CategoryStats>
                    <Stat color={Colors.thriving}>
                      <div className="value">{category.totalDomains}</div>
                      <div className="label">Brands</div>
                    </Stat>
                    <Stat color={category.averageScore >= 80 ? Colors.surviving : category.averageScore >= 60 ? Colors.dying : Colors.forgotten}>
                      <div className="value">{category.averageScore.toFixed(1)}</div>
                      <div className="label">Avg Score</div>
                    </Stat>
                  </CategoryStats>
                </CategoryHeader>

                <QuickRankings>
                  {category.topDomains?.slice(0, 5).map((domain, idx) => (
                    <RankItem key={domain.domain} score={domain.score}>
                      <span className="domain">#{idx + 1} {domain.domain}</span>
                      <span className="score">{domain.score}</span>
                    </RankItem>
                  ))}
                </QuickRankings>
              </CategoryCard>
            ))}
          </CategoryGrid>
        )}
      </DemoSection>

      <PanicSection>
        <PanicContent>
          <PanicTitle>Monitor Your Competitive Position</PanicTitle>
          <PanicText>
            AI systems are becoming the primary interface for information discovery. 
            Track your brand's recognition and competitive standing across language models.
          </PanicText>
          <UrgentCTA to="/rankings">
            📊 View Complete Analysis
          </UrgentCTA>
        </PanicContent>
      </PanicSection>
    </Container>
  );
};

export default CompetitorDeathMatch; 