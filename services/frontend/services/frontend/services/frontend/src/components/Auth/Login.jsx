import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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

const LoginCard = styled(motion.div)`
  background: #ffffff;
  border-radius: 20px;
  padding: 48px 40px;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e7;
  width: 100%;
  max-width: 420px;
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
  background: #007aff;
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
    background: #0051d0;
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

const UrgentAlert = styled.div`
  background: linear-gradient(135deg, #ff3b30, #ff6b6b);
  color: #ffffff;
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
  
  .alert-title {
    font-size: 1rem;
    margin-bottom: 4px;
    display: block;
  }
`;

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect after login
  const from = location.state?.from?.pathname || '/dashboard';

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

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <Container>
      <LoginCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <UrgentAlert>
          <span className="alert-title">🚨 Your Brand Needs Protection</span>
          Monitor AI memory scores before competitors take over
        </UrgentAlert>
        
        <Title>Welcome Back</Title>
        <Subtitle>Sign in to monitor your brand's AI memory scores</Subtitle>

        <Form onSubmit={handleSubmit}>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          
          <InputGroup>
            <Label htmlFor="email">Email Address</Label>
            <Input
              type="email"
              id="email"
              name="email"
              placeholder="you@company.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="password">Password</Label>
            <Input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
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
            {loading ? 'Signing In...' : 'Sign In'}
          </SubmitButton>
        </Form>

        <LinkContainer>
          Don't have an account?{' '}
          <Link to="/register">Create free account</Link>
        </LinkContainer>
        
        <LinkContainer style={{ marginTop: '12px' }}>
          <Link to="/">← Back to home</Link>
        </LinkContainer>
      </LoginCard>
    </Container>
  );
};

export default Login; 