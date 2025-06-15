import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// API base URL - use environment variable or default to production
const API_BASE = process.env.REACT_APP_API_URL || 'https://llm-pagerank-public-api.onrender.com';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/api/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.log('Auth check failed:', error);
      logout(); // Clear invalid token
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        email,
        password
      });

      const { access_token, user: userData } = response.data;
      
      // Store token
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      return { success: false, error: message };
    }
  };

  const register = async (email, password, fullName) => {
    try {
      const response = await axios.post(`${API_BASE}/api/auth/register`, {
        email,
        password,
        full_name: fullName
      });

      // Auto-login after registration
      const loginResult = await login(email, password);
      
      return loginResult;
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const refreshUserData = async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${API_BASE}/api/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.log('Failed to refresh user data:', error);
    }
  };

  // Utility functions for subscription checks
  const hasProAccess = () => {
    return user && ['pro', 'enterprise'].includes(user.subscription_tier);
  };

  const hasEnterpriseAccess = () => {
    return user && user.subscription_tier === 'enterprise';
  };

  const canTrackMoreDomains = () => {
    return user && user.domains_tracked < user.domains_limit;
  };

  const getRemainingApiCalls = () => {
    if (!user) return 0;
    return user.api_calls_limit - user.api_calls_used;
  };

  const getSubscriptionDisplayName = () => {
    if (!user) return 'Not logged in';
    
    const tierNames = {
      'free': 'Free Tier',
      'pro': 'Pro Plan',
      'enterprise': 'Enterprise Plan'
    };
    
    return tierNames[user.subscription_tier] || user.subscription_tier;
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    refreshUserData,
    checkAuth,
    
    // Subscription utilities
    hasProAccess,
    hasEnterpriseAccess,
    canTrackMoreDomains,
    getRemainingApiCalls,
    getSubscriptionDisplayName,
    
    // User state
    isAuthenticated: !!user,
    isLoading: loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 