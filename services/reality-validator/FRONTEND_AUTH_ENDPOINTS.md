# 🔐 AUTHENTICATION ENDPOINTS FOR FRONTEND

## 🎯 BASE URL
```
Production: https://llmrank.io
Development: http://localhost:8000
```

## 🚀 AUTHENTICATION ENDPOINTS

### **1. User Registration**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "securepassword123",
  "full_name": "John Smith"
}
```

**Response (Success - 200)**
```json
{
  "id": "uuid-123",
  "email": "user@company.com",
  "full_name": "John Smith",
  "subscription_tier": "free",
  "subscription_status": "active",
  "domains_tracked": 0,
  "domains_limit": 1,
  "api_calls_used": 0,
  "api_calls_limit": 10,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Response (Error - 400)**
```json
{
  "detail": "Email already registered"
}
```

### **2. User Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "securepassword123"
}
```

**Response (Success - 200)**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid-123",
    "email": "user@company.com",
    "subscription_tier": "free",
    "subscription_status": "active"
  }
}
```

**Response (Error - 401)**
```json
{
  "detail": "Invalid email or password"
}
```

### **3. Get Current User**
```http
GET /api/auth/me
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Response (Success - 200)**
```json
{
  "id": "uuid-123",
  "email": "user@company.com",
  "full_name": "John Smith",
  "subscription_tier": "free",
  "subscription_status": "active",
  "domains_tracked": 0,
  "domains_limit": 1,
  "api_calls_used": 3,
  "api_calls_limit": 10,
  "created_at": "2024-01-15T10:30:00Z",
  "last_login": "2024-01-15T14:22:00Z"
}
```

### **4. Password Reset Request**
```http
POST /api/auth/request-password-reset
Content-Type: application/json

{
  "email": "user@company.com"
}
```

**Response (Always 200 - Security)**
```json
{
  "message": "If this email exists, a password reset link has been sent"
}
```

### **5. Password Reset**
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "secure-reset-token",
  "new_password": "newsecurepassword123"
}
```

**Response (Success - 200)**
```json
{
  "message": "Password reset successfully"
}
```

## 🎭 TIER-BASED ENDPOINTS (With Authentication)

### **6. Premium Dashboard**
```http
GET /api/premium/dashboard
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Response (Pro/Enterprise Only)**
```json
{
  "user_tier": "pro",
  "tracked_domains": [
    {
      "domain": "company.com",
      "memory_score": 78.5,
      "ai_models_available": 12,
      "reality_validation": true,
      "last_updated": "2024-01-15T10:30:00Z"
    }
  ],
  "usage_stats": {
    "domains_tracked": 3,
    "domains_limit": 10,
    "api_calls_used": 45,
    "api_calls_limit": 1000,
    "reality_checks_used": 12,
    "reality_checks_limit": 50
  }
}
```

### **7. Track New Domain**
```http
POST /api/premium/track-domain
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "domain": "newcompany.com",
  "enable_reality_validation": true
}
```

**Response (Success - 200)**
```json
{
  "success": true,
  "message": "Domain added to tracking",
  "domain": "newcompany.com",
  "estimated_analysis_time": "2-4 hours"
}
```

### **8. Get User API Key**
```http
GET /api/premium/api-key
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Response (Pro/Enterprise Only)**
```json
{
  "api_key": "llmpr_4e8cba54e2b91212a81243d0463133cc1fb2a682d5e911c6417b67e9cbddf8b9",
  "tier": "pro",
  "rate_limits": {
    "requests_per_hour": 1000,
    "domains_trackable": 10,
    "ai_models_access": 12
  }
}
```

## 🔧 FRONTEND INTEGRATION EXAMPLES

### **React AuthContext Usage**
```jsx
import { useAuth } from '../contexts/AuthContext';

const LoginComponent = () => {
  const { login, loading, error } = useAuth();
  
  const handleLogin = async (email, password) => {
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    }
  };
  
  return (
    <form onSubmit={handleLogin}>
      {/* Form fields */}
    </form>
  );
};
```

### **API Calls with Authentication**
```jsx
import axios from 'axios';

// Set up axios interceptor for auth
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Protected API call
const fetchUserDashboard = async () => {
  try {
    const response = await axios.get('/api/premium/dashboard');
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    throw error;
  }
};
```

### **Tier-Based Component Rendering**
```jsx
const TierBasedFeature = () => {
  const { user, hasProAccess, hasEnterpriseAccess } = useAuth();
  
  if (!user) {
    return <LoginPrompt />;
  }
  
  if (hasEnterpriseAccess()) {
    return <EnterpriseFeatures />;
  }
  
  if (hasProAccess()) {
    return <ProFeatures />;
  }
  
  return <FreeFeatures upgradePrompt={true} />;
};
```

## 🚨 ERROR HANDLING

### **Common Error Responses**
```json
// 401 Unauthorized
{
  "detail": "Invalid or expired token"
}

// 403 Forbidden (Tier Restriction)
{
  "detail": "This feature requires Pro or Enterprise subscription",
  "required_tier": "pro",
  "current_tier": "free",
  "upgrade_url": "/upgrade"
}

// 429 Rate Limited
{
  "detail": "Rate limit exceeded",
  "retry_after": 3600,
  "limit_type": "api_calls",
  "current_usage": 105,
  "limit": 100
}
```

### **Frontend Error Handling**
```jsx
const handleApiError = (error) => {
  if (error.response?.status === 401) {
    // Token expired, redirect to login
    logout();
    navigate('/login');
  } else if (error.response?.status === 403) {
    // Tier restriction, show upgrade prompt
    setShowUpgradeModal(true);
  } else if (error.response?.status === 429) {
    // Rate limited, show usage warning
    setShowUsageWarning(true);
  }
};
```

## 🔐 SECURITY CONSIDERATIONS

### **Token Storage**
```jsx
// Store JWT token securely
localStorage.setItem('token', accessToken);

// Check token expiration
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};
```

### **Automatic Token Refresh**
```jsx
// Set up axios interceptor for token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, attempt refresh or redirect to login
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## 🎯 INTEGRATION CHECKLIST

### **✅ Frontend Requirements**
- [ ] Store JWT token in localStorage
- [ ] Add Authorization header to all API calls
- [ ] Handle 401 errors with redirect to login
- [ ] Handle 403 errors with upgrade prompts
- [ ] Display user tier and usage limits
- [ ] Show locked features for free users
- [ ] Implement logout functionality
- [ ] Add password reset flow
- [ ] Show loading states during auth operations
- [ ] Display appropriate error messages

### **✅ User Experience**
- [ ] Seamless login/logout experience
- [ ] Clear tier-based feature visibility
- [ ] Upgrade prompts at friction points
- [ ] Usage limit warnings
- [ ] Persistent authentication across sessions
- [ ] Responsive auth forms
- [ ] Social login integration (optional)

### **✅ Security**
- [ ] HTTPS only in production
- [ ] Secure token storage
- [ ] Automatic token expiration handling
- [ ] Rate limiting awareness
- [ ] Input validation on forms
- [ ] CSRF protection
- [ ] XSS prevention

## 🚀 DEPLOYMENT NOTES

### **Environment Variables**
```bash
# Frontend (.env)
REACT_APP_API_URL=https://llmrank.io
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_...

# Backend
JWT_SECRET=your-super-secret-jwt-key
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
```

### **CORS Configuration**
The API is configured to accept requests from your frontend domain. Make sure your frontend URL is whitelisted in the CORS settings.

All endpoints are **production-ready** and currently deployed at `https://llmrank.io` 🚀 