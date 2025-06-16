import React from 'react'
import styled from 'styled-components'
import { useAuth } from '../contexts/AuthContext'

const PricingContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 20px;
`

const Header = styled.div`
  text-align: center;
  margin-bottom: 60px;
`

const Title = styled.h1`
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`

const Subtitle = styled.p`
  font-size: 24px;
  color: #666;
  margin-bottom: 40px;
`

const PricingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
  margin-bottom: 60px;
`

const PricingCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: ${props => props.popular ? '3px solid #007AFF' : '2px solid #f0f0f0'};
  position: relative;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  }
`

const PopularBadge = styled.div`
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  color: white;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
`

const PlanName = styled.h3`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #000;
`

const Price = styled.div`
  font-size: 48px;
  font-weight: 700;
  color: #007AFF;
  margin-bottom: 10px;
`

const PriceSubtext = styled.p`
  color: #666;
  margin-bottom: 30px;
`

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin-bottom: 40px;
`

const Feature = styled.li`
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  
  &:last-child {
    border-bottom: none;
  }
`

const FeatureIcon = styled.span`
  margin-right: 12px;
  font-size: 18px;
`

const CTAButton = styled.button`
  width: 100%;
  padding: 15px;
  background: ${props => props.primary ? 
    'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' : 
    'transparent'
  };
  color: ${props => props.primary ? 'white' : '#007AFF'};
  border: 2px solid #007AFF;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 122, 255, 0.3);
  }
`

const ComparisonSection = styled.div`
  margin-top: 80px;
`

const ComparisonTitle = styled.h2`
  text-align: center;
  font-size: 36px;
  margin-bottom: 40px;
`

const ComparisonTable = styled.div`
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
`

function Pricing() {
  const { user } = useAuth()

  const plans = [
    {
      name: 'Free',
      price: '$0',
      subtitle: 'Perfect for trying out',
      popular: false,
      features: [
        { icon: '✅', text: '1 domain tracking' },
        { icon: '✅', text: '10 API calls/day' },
        { icon: '✅', text: 'Basic memory scores' },
        { icon: '✅', text: 'Public leaderboard access' },
        { icon: '❌', text: 'No competitor analysis' },
        { icon: '❌', text: 'No API access' },
        { icon: '❌', text: 'Community support only' }
      ],
      cta: user ? 'Current Plan' : 'Start Free',
      ctaAction: () => window.location.href = user ? '/dashboard' : '/register'
    },
    {
      name: 'Pro',
      price: '$49',
      subtitle: 'For growing businesses',
      popular: true,
      features: [
        { icon: '✅', text: '10 domains tracking' },
        { icon: '✅', text: '1,000 API calls/day' },
        { icon: '✅', text: 'Advanced analytics' },
        { icon: '✅', text: 'Competitor analysis' },
        { icon: '✅', text: 'API access' },
        { icon: '✅', text: 'Email alerts' },
        { icon: '✅', text: 'Priority support' }
      ],
      cta: 'Start Pro Trial',
      ctaAction: () => window.location.href = '/register?plan=pro'
    },
    {
      name: 'Enterprise',
      price: '$199',
      subtitle: 'For large organizations',
      popular: false,
      features: [
        { icon: '✅', text: '100+ domains tracking' },
        { icon: '✅', text: '10,000 API calls/day' },
        { icon: '✅', text: 'White-label reports' },
        { icon: '✅', text: 'Advanced integrations' },
        { icon: '✅', text: 'Custom analytics' },
        { icon: '✅', text: 'Dedicated support' },
        { icon: '✅', text: 'SLA guarantees' }
      ],
      cta: 'Contact Sales',
      ctaAction: () => window.location.href = '/contact?plan=enterprise'
    }
  ]

  return (
    <PricingContainer>
      <Header>
        <Title>💎 Choose Your AI Intelligence Plan</Title>
        <Subtitle>Monitor AI brand perception with precision</Subtitle>
      </Header>

      <PricingGrid>
        {plans.map((plan, index) => (
          <PricingCard key={index} popular={plan.popular}>
            {plan.popular && <PopularBadge>Most Popular</PopularBadge>}
            
            <PlanName>{plan.name}</PlanName>
            <Price>{plan.price}</Price>
            <PriceSubtext>{plan.subtitle}</PriceSubtext>

            <FeatureList>
              {plan.features.map((feature, featureIndex) => (
                <Feature key={featureIndex}>
                  <FeatureIcon>{feature.icon}</FeatureIcon>
                  <span>{feature.text}</span>
                </Feature>
              ))}
            </FeatureList>

            <CTAButton 
              primary={plan.popular}
              onClick={plan.ctaAction}
            >
              {plan.cta}
            </CTAButton>
          </PricingCard>
        ))}
      </PricingGrid>

      <ComparisonSection>
        <ComparisonTitle>🔬 The Science Behind AI Brand Memory</ComparisonTitle>
        <ComparisonTable>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h3>What makes this different from traditional SEO?</h3>
            <p style={{ fontSize: '18px', color: '#666', marginTop: '15px' }}>
              We measure how AI systems actually remember and recall your brand - 
              not just search rankings. This is the first platform to correlate 
              SEO technical metrics with AI memory patterns across 17+ LLM providers.
            </p>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '30px',
            marginTop: '40px'
          }}>
            <div>
              <h4 style={{ color: '#007AFF', marginBottom: '15px' }}>🧠 Temporal Analysis</h4>
              <p>Track memory decay curves over time. Watch how AI systems forget your brand and identify patterns.</p>
            </div>
            <div>
              <h4 style={{ color: '#007AFF', marginBottom: '15px' }}>⚡ Causal Analysis</h4>
              <p>Correlate SEO changes with memory shifts. See which technical optimizations actually impact AI recall.</p>
            </div>
            <div>
              <h4 style={{ color: '#007AFF', marginBottom: '15px' }}>📊 Comparative Intelligence</h4>
              <p>Benchmark against competitors. Understand which brands dominate AI memory in your space.</p>
            </div>
          </div>
        </ComparisonTable>
      </ComparisonSection>
    </PricingContainer>
  )
}

export default Pricing 