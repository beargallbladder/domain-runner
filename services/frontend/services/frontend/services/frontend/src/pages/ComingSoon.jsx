import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Colors = {
  white: '#FFFFFF',
  lightGray: '#F8F9FA',
  mediumGray: '#E5E7EB',
  darkGray: '#374151',
  black: '#111827',
  blue: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  orange: '#F59E0B',
  purple: '#8B5CF6',
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
};

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, ${Colors.white} 0%, ${Colors.lightGray} 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const HeroSection = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: ${Colors.white};
  padding: 100px 40px;
  text-align: center;
`;

const HeroTitle = styled(motion.h1)`
  font-size: 4rem;
  font-weight: 200;
  margin-bottom: 24px;
  letter-spacing: -2px;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const HeroSubtitle = styled(motion.p)`
  font-size: 1.5rem;
  margin-bottom: 50px;
  font-weight: 300;
  opacity: 0.95;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.4;
`;

const ComingSoonBadge = styled(motion.div)`
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 12px 30px;
  border-radius: 30px;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 30px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
`;

const FeaturesSection = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 100px 40px;
`;

const SectionTitle = styled.h2`
  font-size: 3rem;
  font-weight: 200;
  text-align: center;
  color: ${Colors.black};
  margin-bottom: 60px;
  letter-spacing: -1px;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 40px;
  margin-bottom: 80px;
`;

const FeatureCard = styled(motion.div)`
  background: ${Colors.white};
  border-radius: 24px;
  padding: 50px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => props.accent || Colors.blue};
  }
  
  .icon {
    font-size: 4rem;
    margin-bottom: 30px;
    display: block;
  }
  
  .title {
    font-size: 1.5rem;
    font-weight: 600;
    color: ${Colors.black};
    margin-bottom: 20px;
  }
  
  .description {
    font-size: 1rem;
    color: ${Colors.darkGray};
    line-height: 1.6;
    margin-bottom: 30px;
  }
  
  .features-list {
    list-style: none;
    padding: 0;
    margin: 0;
    text-align: left;
    
    li {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      font-size: 0.9rem;
      color: ${Colors.darkGray};
      
      &::before {
        content: '✓';
        color: ${Colors.green};
        font-weight: bold;
        margin-right: 12px;
      }
    }
  }
`;

const PricingSection = styled.div`
  background: ${Colors.white};
  padding: 100px 40px;
  text-align: center;
`;

const PricingCard = styled(motion.div)`
  max-width: 500px;
  margin: 0 auto;
  background: linear-gradient(135deg, ${Colors.orange}, ${Colors.red});
  border-radius: 30px;
  padding: 60px 50px;
  color: ${Colors.white};
  box-shadow: 0 20px 60px rgba(245, 158, 11, 0.3);
  
  .price {
    font-size: 4rem;
    font-weight: 200;
    margin-bottom: 16px;
    
    .currency {
      font-size: 2rem;
      vertical-align: top;
    }
    
    .period {
      font-size: 1.5rem;
      opacity: 0.8;
    }
  }
  
  .price-description {
    font-size: 1.1rem;
    margin-bottom: 40px;
    opacity: 0.9;
  }
`;

const CTAButton = styled(Link)`
  display: inline-block;
  background: ${Colors.white};
  color: ${Colors.orange};
  padding: 20px 40px;
  border-radius: 25px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.2rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  }
`;

const BackButton = styled(Link)`
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  color: ${Colors.white};
  padding: 12px 24px;
  border-radius: 20px;
  text-decoration: none;
  font-weight: 500;
  font-size: 1rem;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const NotifySection = styled.div`
  background: ${Colors.lightGray};
  padding: 80px 40px;
  text-align: center;
`;

const NotifyTitle = styled.h3`
  font-size: 2rem;
  font-weight: 400;
  color: ${Colors.black};
  margin-bottom: 20px;
`;

const NotifyDescription = styled.p`
  font-size: 1.2rem;
  color: ${Colors.darkGray};
  margin-bottom: 40px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const EmailForm = styled.form`
  display: flex;
  max-width: 400px;
  margin: 0 auto;
  gap: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const EmailInput = styled.input`
  flex: 1;
  padding: 16px 20px;
  border: 2px solid ${Colors.mediumGray};
  border-radius: 25px;
  font-size: 1rem;
  outline: none;
  
  &:focus {
    border-color: ${Colors.blue};
  }
`;

const NotifyButton = styled.button`
  background: ${Colors.blue};
  color: ${Colors.white};
  border: none;
  padding: 16px 32px;
  border-radius: 25px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #2563eb;
    transform: translateY(-2px);
  }
`;

const ComingSoon = () => {
  const handleNotifySubmit = (e) => {
    e.preventDefault();
    // Handle email notification signup
    alert('Thanks! We\'ll notify you when premium features launch.');
  };

  return (
    <Container>
      <HeroSection>
        <ComingSoonBadge
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          🚀 Premium Features Coming Soon
        </ComingSoonBadge>
        
        <HeroTitle
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          AI Memory Intelligence Pro
        </HeroTitle>
        
        <HeroSubtitle
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Advanced AI memory tracking, crisis modeling, and competitive intelligence 
          for brands that refuse to be forgotten.
        </HeroSubtitle>
        
        <BackButton to="/">← Back to Analysis</BackButton>
      </HeroSection>

      <FeaturesSection>
        <SectionTitle>What You'll Get</SectionTitle>
        
        <FeaturesGrid>
          <FeatureCard
            accent={Colors.red}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <span className="icon">⚡</span>
            <h3 className="title">JOLT Crisis Analysis</h3>
            <p className="description">
              Advanced crisis modeling that compares your domain's memory patterns 
              to major brand disasters and transitions.
            </p>
            <ul className="features-list">
              <li>Real-time crisis correlation tracking</li>
              <li>Brand transition pattern analysis</li>
              <li>Early warning system for memory degradation</li>
              <li>Recovery pathway recommendations</li>
            </ul>
          </FeatureCard>

          <FeatureCard
            accent={Colors.purple}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <span className="icon">🎯</span>
            <h3 className="title">Competitive Benchmarking</h3>
            <p className="description">
              See exactly how your AI memory compares to competitors, 
              industry leaders, and crisis survivors.
            </p>
            <ul className="features-list">
              <li>Industry-specific AI memory rankings</li>
              <li>Competitor memory trend analysis</li>
              <li>Market position relative to benchmarks</li>
              <li>Strategic improvement recommendations</li>
            </ul>
          </FeatureCard>

          <FeatureCard
            accent={Colors.green}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <span className="icon">🔮</span>
            <h3 className="title">Predictive Memory Modeling</h3>
            <p className="description">
              AI-powered forecasting that predicts your domain's memory trajectory 
              across future AI model generations.
            </p>
            <ul className="features-list">
              <li>6-month memory score predictions</li>
              <li>Model upgrade impact analysis</li>
              <li>Trend reversal probability</li>
              <li>Strategic intervention timing</li>
            </ul>
          </FeatureCard>

          <FeatureCard
            accent={Colors.blue}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            <span className="icon">🚨</span>
            <h3 className="title">Real-Time Alerts</h3>
            <p className="description">
              Instant notifications when your AI memory health changes, 
              so you can act before it's too late.
            </p>
            <ul className="features-list">
              <li>Memory degradation alerts</li>
              <li>Competitor surge notifications</li>
              <li>Crisis pattern matches</li>
              <li>Recovery opportunity alerts</li>
            </ul>
          </FeatureCard>

          <FeatureCard
            accent={Colors.orange}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <span className="icon">🧠</span>
            <h3 className="title">Deep Model Analysis</h3>
            <p className="description">
              Detailed breakdown of how each individual AI model perceives 
              and remembers your domain.
            </p>
            <ul className="features-list">
              <li>Model-by-model memory scores</li>
              <li>Bias detection and analysis</li>
              <li>Response pattern insights</li>
              <li>Model-specific optimization tips</li>
            </ul>
          </FeatureCard>

          <FeatureCard
            accent={Colors.cyan}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
          >
            <span className="icon">📊</span>
            <h3 className="title">Executive Reporting</h3>
            <p className="description">
              Beautiful, shareable reports that communicate AI memory 
              health to stakeholders and decision makers.
            </p>
            <ul className="features-list">
              <li>Monthly AI memory health reports</li>
              <li>Executive dashboard access</li>
              <li>Branded report customization</li>
              <li>API access for integration</li>
            </ul>
          </FeatureCard>
        </FeaturesGrid>
      </FeaturesSection>

      <PricingSection>
        <SectionTitle>Early Bird Pricing</SectionTitle>
        
        <PricingCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <div className="price">
            <span className="currency">$</span>99<span className="period">/month</span>
          </div>
          <p className="price-description">
            Complete AI memory intelligence suite. Cancel anytime.
          </p>
          <CTAButton to="#notify">Reserve Your Spot</CTAButton>
        </PricingCard>
      </PricingSection>

      <NotifySection id="notify">
        <NotifyTitle>Be First to Know</NotifyTitle>
        <NotifyDescription>
          Get notified the moment premium features launch. Early subscribers get 
          50% off their first 3 months.
        </NotifyDescription>
        
        <EmailForm onSubmit={handleNotifySubmit}>
          <EmailInput 
            type="email" 
            placeholder="Enter your email address" 
            required 
          />
          <NotifyButton type="submit">
            Notify Me
          </NotifyButton>
        </EmailForm>
      </NotifySection>
    </Container>
  );
};

export default ComingSoon; 