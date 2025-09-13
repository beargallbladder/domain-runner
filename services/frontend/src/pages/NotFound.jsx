import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  background: #ffffff;
  text-align: center;
`;

const Title = styled(motion.h1)`
  font-size: 72px;
  font-weight: 700;
  color: #000000;
  margin-bottom: 24px;
  letter-spacing: -0.02em;
`;

const Subtitle = styled(motion.h2)`
  font-size: 32px;
  font-weight: 600;
  color: #666666;
  margin-bottom: 16px;
`;

const Description = styled(motion.p)`
  font-size: 18px;
  color: #666666;
  margin-bottom: 40px;
  max-width: 500px;
  line-height: 1.6;
`;

const ButtonGroup = styled(motion.div)`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
`;

const Button = styled(Link)`
  padding: 16px 32px;
  background: ${props => props.primary ? '#007AFF' : 'transparent'};
  color: ${props => props.primary ? '#ffffff' : '#007AFF'};
  border: 2px solid #007AFF;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  text-decoration: none;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.primary ? '#0056CC' : '#007AFF'};
    color: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 122, 255, 0.3);
  }
`;

function NotFound() {
  return (
    <Container>
      <Title
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        404
      </Title>
      
      <Subtitle
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        Page Not Found
      </Subtitle>
      
      <Description
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        The page you're looking for doesn't exist or has been moved. 
        Let's get you back to exploring AI memory intelligence.
      </Description>
      
      <ButtonGroup
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <Button to="/" primary>
          Go Home
        </Button>
        <Button to="/rankings">
          View Rankings
        </Button>
        <Button to="/cohorts">
          Explore Cohorts
        </Button>
        <Button to="/death-match">
          Death Match
        </Button>
      </ButtonGroup>
    </Container>
  );
}

export default NotFound; 