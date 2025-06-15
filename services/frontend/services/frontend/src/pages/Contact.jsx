import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const Container = styled.div`
  min-height: 100vh;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
`;

const HeroSection = styled.div`
  text-align: center;
  padding: 80px 40px 60px;
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 30px;
  letter-spacing: -2px;
  line-height: 1.1;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled(motion.p)`
  font-size: 1.4rem;
  color: #86868b;
  margin: 0 0 50px;
  font-weight: 400;
  line-height: 1.4;
`;

const ContactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 40px;
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 40px;
`;

const ContactCard = styled(motion.div)`
  background: #f5f5f7;
  border-radius: 20px;
  padding: 40px;
  text-align: center;
`;

const ContactIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 20px;
`;

const ContactTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 15px;
`;

const ContactInfo = styled.p`
  font-size: 1.1rem;
  color: #86868b;
  margin-bottom: 20px;
`;

const ContactLink = styled.a`
  display: inline-block;
  background: #007AFF;
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background: #0056CC;
    transform: translateY(-2px);
  }
`;

const Contact = () => {
  return (
    <Container>
      <HeroSection>
        <Title
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Get in Touch
        </Title>
        
        <Subtitle
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Questions about AI memory analysis? Need enterprise solutions? We're here to help.
        </Subtitle>
      </HeroSection>

      <ContactGrid>
        <ContactCard
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <ContactIcon>📧</ContactIcon>
          <ContactTitle>General Inquiries</ContactTitle>
          <ContactInfo>
            Questions about our AI memory analysis platform
          </ContactInfo>
          <ContactLink href="mailto:hello@llmpagerank.com">
            Send Email
          </ContactLink>
        </ContactCard>

        <ContactCard
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ContactIcon>🏢</ContactIcon>
          <ContactTitle>Enterprise Sales</ContactTitle>
          <ContactInfo>
            Custom solutions for large organizations
          </ContactInfo>
          <ContactLink href="mailto:enterprise@llmpagerank.com">
            Contact Sales
          </ContactLink>
        </ContactCard>

        <ContactCard
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <ContactIcon>🔧</ContactIcon>
          <ContactTitle>Technical Support</ContactTitle>
          <ContactInfo>
            API integration and technical assistance
          </ContactInfo>
          <ContactLink href="mailto:support@llmpagerank.com">
            Get Support
          </ContactLink>
        </ContactCard>

        <ContactCard
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <ContactIcon>📊</ContactIcon>
          <ContactTitle>Data Partnerships</ContactTitle>
          <ContactInfo>
            Research collaborations and data sharing
          </ContactInfo>
          <ContactLink href="mailto:partnerships@llmpagerank.com">
            Partner With Us
          </ContactLink>
        </ContactCard>
      </ContactGrid>
    </Container>
  );
};

export default Contact; 