import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styled from 'styled-components'

const UpgradePrompt = styled.div`
  max-width: 600px;
  margin: 100px auto;
  padding: 40px;
  text-align: center;
  background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
  color: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 122, 255, 0.2);
`

const UpgradeButton = styled.button`
  background: white;
  color: #007AFF;
  border: none;
  padding: 15px 30px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 16px;
  margin-top: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
`

const TIER_HIERARCHY = {
  'free': 0,
  'pro': 1,
  'enterprise': 2
}

function ProtectedRoute({ children, minTier = 'free' }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px' 
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check if user's tier meets minimum requirement
  const userTierLevel = TIER_HIERARCHY[user.subscription_tier] || 0
  const requiredTierLevel = TIER_HIERARCHY[minTier] || 0

  if (userTierLevel < requiredTierLevel) {
    return (
      <UpgradePrompt>
        <h2>🚀 Premium Feature</h2>
        <p>This feature requires a {minTier} subscription or higher.</p>
        <p>Your current plan: <strong>{user.subscription_tier}</strong></p>
        <UpgradeButton onClick={() => window.location.href = '/pricing'}>
          Upgrade Now
        </UpgradeButton>
      </UpgradePrompt>
    )
  }

  return children
}

export default ProtectedRoute 