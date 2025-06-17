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
      // For now, just validate the token exists
      // TODO: Implement proper token validation endpoint
      const userData = JSON.parse(localStorage.getItem('user') || 'null');
      if (userData) {
        setUser(userData);
      } else {
        logout();
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      logout(); // Clear invalid token
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE}/api/migrate-timeseries`, {
        action: 'login',
        email,
        password
      });

      if (response.data.success) {
        const { access_token, user: userData } = response.data;
        
        // Store token and user data
        if (access_token) {
          localStorage.setItem('token', access_token);
          setToken(access_token);
        }
        
        // Store user data
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);

        return { success: true, user: userData };
      } else {
        return { success: false, error: response.data.error || 'Login failed' };
      }
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.detail || 'Login failed';
      return { success: false, error: message };
    }
  };

  const register = async (email, password, fullName) => {
    try {
      const response = await axios.post(`${API_BASE}/api/migrate-timeseries`, {
        action: 'register',
        email,
        password,
        full_name: fullName
      });

      if (response.data.success) {
        // Auto-login after registration
        const loginResult = await login(email, password);
        return loginResult;
      } else {
        return { success: false, error: response.data.error || 'Registration failed' };
      }
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.detail || 'Registration failed';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const refreshUserData = async () => {
    if (!token) return;
    
    try {
      // For now, just get from localStorage
      // TODO: Implement proper user data refresh endpoint
      const userData = JSON.parse(localStorage.getItem('user') || 'null');
      if (userData) {
        setUser(userData);
      }
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