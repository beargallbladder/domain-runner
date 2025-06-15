import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'

const Nav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #222;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  position: sticky;
  top: 0;
  z-index: 100;

  @media (min-width: 768px) {
    padding: 20px 40px;
  }
`

const Logo = styled(Link)`
  font-size: 20px;
  font-weight: 200;
  color: #fff;
  letter-spacing: -0.01em;
  
  .llm {
    color: #ccc;
    text-transform: uppercase;
    font-size: 14px;
    letter-spacing: 2px;
  }
  
  .pagerank {
    color: #fff;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    margin-left: 6px;
  }

  @media (min-width: 768px) {
    font-size: 24px;
    
    .llm {
      font-size: 16px;
    }
    
    .pagerank {
      margin-left: 8px;
    }
  }
`

const MobileMenuButton = styled.button`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  
  @media (min-width: 768px) {
    display: none;
  }
  
  span {
    width: 20px;
    height: 2px;
    background: #fff;
    margin: 2px 0;
    transition: all 0.3s ease;
    transform-origin: center;
    
    &:nth-child(1) {
      transform: ${props => props.isOpen ? 'rotate(45deg) translate(5px, 5px)' : 'rotate(0)'};
    }
    
    &:nth-child(2) {
      opacity: ${props => props.isOpen ? '0' : '1'};
    }
    
    &:nth-child(3) {
      transform: ${props => props.isOpen ? 'rotate(-45deg) translate(7px, -6px)' : 'rotate(0)'};
    }
  }
`

const NavLinks = styled.div`
  display: none;
  
  @media (min-width: 768px) {
    display: flex;
    gap: 32px;
    align-items: center;
  }
`

const MobileNavLinks = styled.div`
  position: fixed;
  top: 73px;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.98);
  backdrop-filter: blur(20px);
  padding: 20px;
  transform: ${props => props.isOpen ? 'translateY(0)' : 'translateY(-100%)'};
  opacity: ${props => props.isOpen ? '1' : '0'};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transition: all 0.3s ease;
  z-index: 99;
  
  @media (min-width: 768px) {
    display: none;
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
  
  @media (max-width: 767px) {
    display: block;
    padding: 16px 0;
    border-bottom: 1px solid #333;
    font-size: 18px;
    
    &:last-child {
      border-bottom: none;
    }
  }
`

function Navigation() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/rankings-terminal', label: 'Terminal' },
    { path: '/battles', label: 'Battles' },
    { path: '/rankings', label: 'Rankings' },
    { path: '/about', label: 'About' }
  ];

  return (
    <>
      <Nav>
        <Logo to="/" onClick={closeMobileMenu}>
          <span className="llm">llm</span><span className="pagerank">pagerank</span>
        </Logo>
        
        <MobileMenuButton 
          isOpen={mobileMenuOpen} 
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </MobileMenuButton>
        
        <NavLinks>
          {navItems.map((item) => (
            <NavLink 
              key={item.path}
              to={item.path}
              $active={location.pathname === item.path}
            >
              {item.label}
            </NavLink>
          ))}
        </NavLinks>
      </Nav>
      
      <MobileNavLinks isOpen={mobileMenuOpen}>
        {navItems.map((item) => (
          <NavLink 
            key={item.path}
            to={item.path}
            $active={location.pathname === item.path}
            onClick={closeMobileMenu}
          >
            {item.label}
          </NavLink>
        ))}
      </MobileNavLinks>
    </>
  )
}

export default Navigation 