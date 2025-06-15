import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
`;

const RegisterCard = styled(motion.div)`
  background: #ffffff;
  border-radius: 20px;
  padding: 48px 40px;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e7;
  width: 100%;
  max-width: 480px;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 12px;
  text-align: center;
  letter-spacing: -1px;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: #86868b;
  text-align: center;
  margin: 0 0 40px;
  font-weight: 400;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 0.95rem;
  font-weight: 600;
  color: #1d1d1f;
`;

const Input = styled.input`
  padding: 16px 20px;
  border: 2px solid #e5e5e7;
  border-radius: 12px;
  font-size: 1rem;
  background: #ffffff;
  transition: all 0.2s ease;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: #007aff;
    box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
  }
  
  &::placeholder {
    color: #86868b;
  }
`;

const SubmitButton = styled(motion.button)`
  background: #30d158;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 16px 24px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  
  &:hover {
    background: #28a745;
  }
  
  &:disabled {
    background: #86868b;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: #ffebee;
  color: #d32f2f;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  border-left: 4px solid #d32f2f;
`;

const LinkContainer = styled.div`
  text-align: center;
  margin-top: 24px;
  font-size: 0.95rem;
  color: #86868b;
  
  a {
    color: #007aff;
    text-decoration: none;
    font-weight: 600;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const CrisisAlert = styled.div`
  background: linear-gradient(135deg, #ff3b30, #ff6b6b);
  color: #ffffff;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 32px;
  text-align: center;
  
  .crisis-title {
    font-size: 1.2rem;
    font-weight: 700;
    margin-bottom: 8px;
    display: block;
  }
  
  .crisis-subtitle {
    font-size: 0.95rem;
    opacity: 0.9;
  }
`;

const FreeTierBenefits = styled.div`
  background: #f0f9ff;
  border: 2px solid #007aff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  
  .benefits-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #007aff;
    margin-bottom: 12px;
    text-align: center;
  }
  
  .benefits-list {
    list-style: none;
    padding: 0;
    margin: 0;
    
    li {
      padding: 6px 0;
      color: #1d1d1f;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      gap: 8px;
      
      &::before {
        content: '✅';
        font-size: 1rem;
      }
    }
  }
`;

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const result = await register(formData.email, formData.password, formData.fullName);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <Container>
      <RegisterCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <CrisisAlert>
          <span className="crisis-title">🚨 AI Memory Crisis Escalating</span>
          <span className="crisis-subtitle">
            Every minute you wait, competitors gain AI visibility advantage
          </span>
        </CrisisAlert>
        
        <Title>Protect Your Brand</Title>
        <Subtitle>Get instant access to AI memory monitoring - completely free</Subtitle>

        <FreeTierBenefits>
          <div className="benefits-title">🎯 What You Get Free:</div>
          <ul className="benefits-list">
            <li>Track 1 domain's AI memory score</li>
            <li>Real-time fire alarm alerts</li>
            <li>Compare against 1,700+ brands</li>
            <li>Instant crisis detection</li>
            <li>Upgrade anytime for more features</li>
          </ul>
        </FreeTierBenefits>

        <Form onSubmit={handleSubmit}>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          
          <InputGroup>
            <Label htmlFor="fullName">Your Name</Label>
            <Input
              type="text"
              id="fullName"
              name="fullName"
              placeholder="John Smith"
              value={formData.fullName}
              onChange={handleChange}
            />
          </InputGroup>
          
          <InputGroup>
            <Label htmlFor="email">Work Email *</Label>
            <Input
              type="email"
              id="email"
              name="email"
              placeholder="you@yourcompany.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="password">Password *</Label>
            <Input
              type="password"
              id="password"
              name="password"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </InputGroup>

          <SubmitButton
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Creating Account...' : '🛡️ Start Free Monitoring'}
          </SubmitButton>
        </Form>

        <LinkContainer>
          Already monitoring your brand?{' '}
          <Link to="/login">Sign in here</Link>
        </LinkContainer>
        
        <LinkContainer style={{ marginTop: '12px' }}>
          <Link to="/">← Back to home</Link>
        </LinkContainer>
      </RegisterCard>
    </Container>
  );
};

export default Register; 