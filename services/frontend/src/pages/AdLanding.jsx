import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import axios from 'axios';

const Colors = {
  crisis: '#FF3B30',
  warning: '#FF9500', 
  success: '#34C759',
  primary: '#007AFF',
  white: '#FFFFFF',
  black: '#1D1D1F',
  gray: '#8E8E93',
  background: '#F8F9FA'
};

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, ${Colors.crisis}15 0%, ${Colors.warning}15 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const LandingCard = styled(motion.div)`
  background: ${Colors.white};
  border-radius: 24px;
  max-width: 800px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  overflow: hidden;
`;

const AlertHeader = styled.div`
  background: linear-gradient(135deg, ${Colors.crisis} 0%, ${Colors.warning} 100%);
  color: ${Colors.white};
  padding: 20px 40px;
  text-align: center;
  
  .alert-badge {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: 8px;
    opacity: 0.9;
  }
  
  .crisis-headline {
    font-size: 1.8rem;
    font-weight: 800;
    line-height: 1.2;
    margin: 0;
    
    @media (min-width: 768px) {
      font-size: 2.2rem;
    }
  }
`;

const ContentSection = styled.div`
  padding: 40px;
`;

const ThreatVisualization = styled.div`
  background: ${Colors.background};
  border-radius: 16px;
  padding: 32px;
  margin: 32px 0;
  border-left: 6px solid ${Colors.crisis};
  
  .threat-title {
    font-size: 1.3rem;
    font-weight: 700;
    color: ${Colors.black};
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
`;

const CompetitorComparison = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 24px;
  align-items: center;
  margin: 24px 0;
`;

const CompanyCard = styled.div`
  text-align: center;
  padding: 24px;
  border-radius: 16px;
  border: 3px solid ${props => props.isWinner ? Colors.success : Colors.crisis};
  background: ${props => props.isWinner ? `${Colors.success}10` : `${Colors.crisis}10`};
  
  .company-name {
    font-size: 1.4rem;
    font-weight: 700;
    color: ${Colors.black};
    margin-bottom: 12px;
  }
  
  .score {
    font-size: 3rem;
    font-weight: 800;
    color: ${props => props.isWinner ? Colors.success : Colors.crisis};
    line-height: 1;
    margin-bottom: 8px;
  }
  
  .status {
    font-size: 0.9rem;
    font-weight: 600;
    color: ${props => props.isWinner ? Colors.success : Colors.crisis};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const VersusIndicator = styled.div`
  font-size: 1.5rem;
  font-weight: 800;
  color: ${Colors.gray};
  text-align: center;
`;

const UrgencySection = styled.div`
  background: linear-gradient(135deg, ${Colors.crisis}05 0%, ${Colors.warning}05 100%);
  border: 2px solid ${Colors.crisis};
  border-radius: 16px;
  padding: 32px;
  margin: 32px 0;
  text-align: center;
  
  .urgency-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: ${Colors.crisis};
    margin-bottom: 16px;
  }
  
  .urgency-text {
    font-size: 1.1rem;
    color: ${Colors.black};
    line-height: 1.6;
    margin-bottom: 24px;
  }
`;

const CTASection = styled.div`
  background: linear-gradient(135deg, ${Colors.primary} 0%, ${Colors.success} 100%);
  padding: 40px;
  text-align: center;
  color: ${Colors.white};
  
  .cta-title {
    font-size: 1.8rem;
    font-weight: 700;
    margin-bottom: 12px;
  }
  
  .cta-subtitle {
    font-size: 1.1rem;
    opacity: 0.9;
    margin-bottom: 32px;
    line-height: 1.5;
  }
`;

const CTAButton = styled(motion.button)`
  background: ${Colors.white};
  color: ${Colors.primary};
  border: none;
  padding: 18px 40px;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  margin: 0 12px 12px 0;
  min-width: 200px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const ReportForm = styled(motion.form)`
  background: ${Colors.white};
  border-radius: 16px;
  padding: 32px;
  margin-top: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  
  .form-title {
    font-size: 1.4rem;
    font-weight: 700;
    color: ${Colors.black};
    margin-bottom: 20px;
    text-align: center;
  }
  
  .form-group {
    margin-bottom: 20px;
    
    label {
      display: block;
      font-size: 0.9rem;
      font-weight: 600;
      color: ${Colors.black};
      margin-bottom: 8px;
    }
    
    input, select {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #E5E5E5;
      border-radius: 8px;
      font-size: 1rem;
      
      &:focus {
        outline: none;
        border-color: ${Colors.primary};
      }
    }
  }
  
  .submit-button {
    width: 100%;
    background: ${Colors.primary};
    color: ${Colors.white};
    border: none;
    padding: 16px;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    
    &:hover {
      background: ${Colors.success};
    }
  }
`;

const TrustIndicators = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 32px;
  
  .trust-item {
    text-align: center;
    padding: 16px;
    
    .trust-number {
      font-size: 1.5rem;
      font-weight: 700;
      color: ${Colors.primary};
      margin-bottom: 4px;
    }
    
    .trust-label {
      font-size: 0.9rem;
      color: ${Colors.gray};
    }
  }
`;

const AdLanding = () => {
  const { company } = useParams();
  const [searchParams] = useSearchParams();
  const competitor = searchParams.get('vs') || 'Competitor';
  const gap = searchParams.get('gap') || '23';
  const category = searchParams.get('category') || 'your industry';
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: company || '',
    role: '',
    urgency: 'immediate'
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Track conversion
    console.log('🎯 CONVERSION:', formData);
    
    // TODO: Send to API/webhook
    try {
      await axios.post('/api/lead-capture', {
        ...formData,
        source: 'facebook_ad',
        landing_page: `${company}-vs-${competitor}`,
        gap_detected: gap,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.log('Lead capture error:', error);
    }
    
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Container>
        <LandingCard
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <CTASection>
            <div className="cta-title">✅ Report Request Received!</div>
            <div className="cta-subtitle">
              Your competitive intelligence report for {company || 'your company'} will be delivered within 24 hours.
              <br/><br/>
              <strong>Next Steps:</strong><br/>
              • Check your email for the detailed analysis<br/>
              • Our team will contact you about API access<br/>
              • Review your competitive positioning strategy
            </div>
          </CTASection>
        </LandingCard>
      </Container>
    );
  }

  return (
    <Container>
      <LandingCard
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <AlertHeader>
          <div className="alert-badge">⚠️ COMPETITIVE INTELLIGENCE ALERT</div>
          <h1 className="crisis-headline">
            {competitor} appears in {gap}% more AI responses than {company || 'your company'}
          </h1>
        </AlertHeader>

        <ContentSection>
          <ThreatVisualization>
            <div className="threat-title">
              <span>🎯</span>
              AI Memory Gap Analysis - {category}
            </div>
            
            <CompetitorComparison>
              <CompanyCard isWinner={false}>
                <div className="company-name">{company || 'Your Company'}</div>
                <div className="score">{Math.max(45, 75 - parseInt(gap))}</div>
                <div className="status">At Risk</div>
              </CompanyCard>
              
              <VersusIndicator>VS</VersusIndicator>
              
              <CompanyCard isWinner={true}>
                <div className="company-name">{competitor}</div>
                <div className="score">{75 + parseInt(gap)}</div>
                <div className="status">Dominating</div>
              </CompanyCard>
            </CompetitorComparison>
          </ThreatVisualization>

          <UrgencySection>
            <div className="urgency-title">
              Your Brand is Disappearing from AI Memory
            </div>
            <div className="urgency-text">
              When customers ask AI systems about {category}, they're {gap}% more likely to hear about {competitor} first. 
              This gap is widening every day as AI models learn from new data.
              <br/><br/>
              <strong>The cost of inaction:</strong> Lost mindshare, reduced consideration, competitive disadvantage.
            </div>
          </UrgencySection>

          {!showForm ? (
            <CTASection>
              <div className="cta-title">Get Your Full Competitive Position Report</div>
              <div className="cta-subtitle">
                See exactly where you stand vs all competitors in AI model responses.
                Detailed analysis, actionable insights, API access available.
              </div>
              
              <CTAButton
                onClick={() => setShowForm(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                📊 Get My Report (Free)
              </CTAButton>
              
              <TrustIndicators>
                <div className="trust-item">
                  <div className="trust-number">1,700+</div>
                  <div className="trust-label">Companies Analyzed</div>
                </div>
                <div className="trust-item">
                  <div className="trust-number">50,000+</div>
                  <div className="trust-label">AI Responses Tracked</div>
                </div>
                <div className="trust-item">
                  <div className="trust-number">21</div>
                  <div className="trust-label">AI Models Monitored</div>
                </div>
              </TrustIndicators>
            </CTASection>
          ) : (
            <ReportForm
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="form-title">Request Your Competitive Intelligence Report</div>
              
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Your full name"
                />
              </div>
              
              <div className="form-group">
                <label>Business Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="your.email@company.com"
                />
              </div>
              
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  placeholder="Your company name"
                />
              </div>
              
              <div className="form-group">
                <label>Your Role *</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="">Select your role</option>
                  <option value="cmo">CMO / Marketing Director</option>
                  <option value="brand">Brand Manager</option>
                  <option value="strategy">Strategy / Business Development</option>
                  <option value="research">Market Research</option>
                  <option value="agency">Agency / Consultant</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Priority Level</label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                >
                  <option value="immediate">Immediate (next 24 hours)</option>
                  <option value="urgent">Urgent (this week)</option>
                  <option value="important">Important (this month)</option>
                  <option value="research">Research phase</option>
                </select>
              </div>
              
              <button type="submit" className="submit-button">
                📊 Send My Competitive Report
              </button>
            </ReportForm>
          )}
        </ContentSection>
      </LandingCard>
    </Container>
  );
};

export default AdLanding; 