import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Container = styled.div`
  min-height: 100vh;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Content = styled.div`
  text-align: center;
  max-width: 600px;
  padding: 40px;
`;

const ErrorCode = styled(motion.h1)`
  font-size: 8rem;
  font-weight: 700;
  color: #007AFF;
  margin: 0;
  letter-spacing: -4px;
  
  @media (max-width: 768px) {
    font-size: 6rem;
  }
`;

const Title = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 600;
  color: #1d1d1f;
  margin: 20px 0;
  letter-spacing: -1px;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Message = styled(motion.p)`
  font-size: 1.2rem;
  color: #86868b;
  margin: 0 0 40px;
  line-height: 1.5;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
`;

const Button = styled(motion(Link))`
  display: inline-block;
  background: #007AFF;
  color: white;
  padding: 15px 30px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 500;
  font-size: 1.1rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: #0056CC;
    transform: translateY(-2px);
  }
`;

const SecondaryButton = styled(motion(Link))`
  display: inline-block;
  background: #f5f5f7;
  color: #1d1d1f;
  padding: 15px 30px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 500;
  font-size: 1.1rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: #e5e5e7;
    transform: translateY(-2px);
  }
`;

const NotFound = () => {
  return (
    <Container>
      <Content>
        <ErrorCode
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        >
          404
        </ErrorCode>
        
        <Title
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Page Not Found
        </Title>
        
        <Message
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
        </Message>

        <ButtonGroup>
          <Button
            to="/"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Go Home
          </Button>
          
          <SecondaryButton
            to="/domains"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Browse Domains
          </SecondaryButton>
        </ButtonGroup>
      </Content>
    </Container>
  );
};

export default NotFound; 