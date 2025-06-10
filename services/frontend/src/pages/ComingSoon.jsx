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
  purple: '#8B5CF6'
};

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, ${Colors.white} 0%, ${Colors.lightGray} 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
`;

const Content = styled(motion.div)`
  text-align: center;
  max-width: 600px;
`;

const Icon = styled.div`
  font-size: 6rem;
  margin-bottom: 30px;
  opacity: 0.8;
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: 400;
  color: ${Colors.black};
  margin: 0 0 20px;
  letter-spacing: -1px;
`;

const Subtitle = styled.p`
  font-size: 1.3rem;
  color: ${Colors.darkGray};
  margin: 0 0 40px;
  font-weight: 300;
  line-height: 1.6;
`;

const BackButton = styled(Link)`
  display: inline-block;
  background: ${Colors.blue};
  color: ${Colors.white};
  padding: 16px 32px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: #2563eb;
    transform: translateY(-2px);
  }
`;

const ComingSoon = () => {
  return (
    <Container>
      <Content
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Icon>🚀</Icon>
        <Title>Coming Soon</Title>
        <Subtitle>
          We're working hard to bring you premium AI intelligence features. 
          Stay tuned for advanced analytics, deeper insights, and more comprehensive domain analysis.
        </Subtitle>
        <BackButton to="/">
          Back to Dashboard
        </BackButton>
      </Content>
    </Container>
  );
};

export default ComingSoon; 