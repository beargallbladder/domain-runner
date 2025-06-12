import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'

const flicker = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`

const Nav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  border-bottom: 1px solid #222;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  position: sticky;
  top: 0;
  z-index: 100;

  @media (max-width: 768px) {
    padding: 16px 20px;
  }
`

const Logo = styled(Link)`
  font-size: 24px;
  font-weight: 200;
  color: #fff;
  letter-spacing: -0.01em;
  
  .llm {
    color: #ccc;
    text-transform: uppercase;
    font-size: 16px;
    letter-spacing: 2px;
  }
  
  .pagerank {
    color: #fff;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    margin-left: 8px;
  }
`

const NavLinks = styled.div`
  display: flex;
  gap: 32px;
  align-items: center;

  @media (max-width: 768px) {
    gap: 20px;
  }
`

const NavLink = styled(Link)`
  font-size: 16px;
  font-weight: 300;
  color: ${props => props.$active ? '#fff' : '#999'};
  transition: color 0.3s ease;
  text-transform: lowercase;
  letter-spacing: 0.5px;

  &:hover {
    color: #fff;
  }
`

const LiveIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #ff6b6b;
  font-weight: 300;
  
  &::before {
    content: '🕯️';
    font-size: 16px;
    animation: ${flicker} 3s infinite;
  }
`

function Navigation() {
  const location = useLocation()

  return (
    <Nav>
      <Logo to="/">
        <span className="llm">llm</span><span className="pagerank">pagerank</span>
      </Logo>
      
      <NavLinks>
        <NavLink 
          to="/shadows" 
          $active={location.pathname.startsWith('/shadows')}
        >
          shadows
        </NavLink>
        <NavLink 
          to="/about" 
          $active={location.pathname === '/about'}
        >
          manifesto
        </NavLink>
        <LiveIndicator>
          live
        </LiveIndicator>
      </NavLinks>
    </Nav>
  )
}

export default Navigation 