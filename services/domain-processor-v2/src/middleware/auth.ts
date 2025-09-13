import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
import crypto from 'crypto';

export interface AuthRequest extends Request {
  apiKey?: string;
  clientId?: string;
  rateLimitKey?: string;
  user?: {
    id: string;
    tier: 'free' | 'partner' | 'premium' | 'enterprise';
  };
}

export class AuthMiddleware {
  private readonly validApiKeys: Set<string>;
  private readonly logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
    
    // Load API keys from environment
    this.validApiKeys = new Set();
    
    // Internal API keys
    if (process.env.INTERNAL_API_KEY) {
      this.validApiKeys.add(process.env.INTERNAL_API_KEY);
    }
    
    // Admin API keys
    if (process.env.ADMIN_API_KEY) {
      this.validApiKeys.add(process.env.ADMIN_API_KEY);
    }
    
    // Partner API keys (could be multiple)
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`PARTNER_API_KEY_${i}`];
      if (key) this.validApiKeys.add(key);
    }
    
    this.logger.info(`Loaded ${this.validApiKeys.size} API keys`);
  }

  // Basic API key authentication
  authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Check for API key in headers
      const apiKey = req.headers['x-api-key'] as string || 
                     req.headers['authorization']?.replace('Bearer ', '');
      
      if (!apiKey) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'API key required'
        });
      }
      
      // Validate API key
      if (!this.validApiKeys.has(apiKey)) {
        this.logger.warn('Invalid API key attempt', { 
          ip: req.ip,
          path: req.path
        });
        
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Invalid API key'
        });
      }
      
      // Set client ID based on API key (for rate limiting)
      req.apiKey = apiKey;
      req.clientId = this.hashApiKey(apiKey);
      req.rateLimitKey = `api:${req.clientId}`;
      
      // Detect tier based on API key
      req.user = {
        id: req.clientId,
        tier: this.detectTier(apiKey)
      };
      
      next();
    } catch (error) {
      this.logger.error('Auth middleware error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Admin-only endpoints
  requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }
    next();
  };
  
  // Premium endpoints (brandsentiment.io)
  requirePremium = (req: AuthRequest, res: Response, next: NextFunction) => {
    const premiumKeys = [
      process.env.ADMIN_API_KEY,
      process.env.SENTIMENT_API_KEY,
      process.env.ENTERPRISE_API_KEY
    ].filter(Boolean);
    
    if (!premiumKeys.includes(req.apiKey)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Premium access required'
      });
    }
    next();
  };
  
  // Partner endpoints (llmpagerank.com and other approved sites)
  requirePartner = (req: AuthRequest, res: Response, next: NextFunction) => {
    const partnerKeys = [
      process.env.PAGERANK_API_KEY,  // llmpagerank.com
      process.env.PARTNER_API_KEY_1,
      process.env.PARTNER_API_KEY_2,
      process.env.PARTNER_API_KEY_3
    ].filter(Boolean);
    
    // Also allow premium and admin keys
    const allowedKeys = [
      ...partnerKeys,
      process.env.ADMIN_API_KEY,
      process.env.SENTIMENT_API_KEY,
      process.env.ENTERPRISE_API_KEY
    ].filter(Boolean);
    
    if (!allowedKeys.includes(req.apiKey)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Partner API key required'
      });
    }
    next();
  };
  
  // Enterprise endpoints
  requireEnterprise = (req: AuthRequest, res: Response, next: NextFunction) => {
    const enterpriseKeys = [
      process.env.ENTERPRISE_API_KEY,
      process.env.ENTERPRISE_API_KEY_2,
      process.env.ADMIN_API_KEY  // Admin counts as enterprise
    ].filter(Boolean);
    
    if (!enterpriseKeys.includes(req.apiKey)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Enterprise tier required',
        upgrade: 'https://llmrank.io/pricing'
      });
    }
    next();
  };

  // Public endpoints (still rate limited)
  public = (req: AuthRequest, res: Response, next: NextFunction) => {
    req.rateLimitKey = `public:${req.ip}`;
    next();
  };

  // Optional auth (different rate limits for authenticated vs public)
  optional = (req: AuthRequest, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string || 
                   req.headers['authorization']?.replace('Bearer ', '');
    
    if (apiKey && this.validApiKeys.has(apiKey)) {
      req.apiKey = apiKey;
      req.clientId = this.hashApiKey(apiKey);
      req.rateLimitKey = `api:${req.clientId}`;
      req.user = {
        id: req.clientId,
        tier: this.detectTier(apiKey)
      };
    } else {
      req.rateLimitKey = `public:${req.ip}`;
      req.user = {
        id: `public-${req.ip}`,
        tier: 'free'
      };
    }
    
    next();
  };

  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
  }
  
  private detectTier(apiKey: string): 'free' | 'partner' | 'premium' | 'enterprise' {
    // Enterprise tier
    if ([process.env.ENTERPRISE_API_KEY, process.env.ENTERPRISE_API_KEY_2, process.env.ADMIN_API_KEY].includes(apiKey)) {
      return 'enterprise';
    }
    
    // Premium tier
    if ([process.env.SENTIMENT_API_KEY, process.env.PREMIUM_API_KEY].includes(apiKey)) {
      return 'premium';
    }
    
    // Partner tier
    const partnerKeys = [
      process.env.PAGERANK_API_KEY,
      process.env.PARTNER_API_KEY_1,
      process.env.PARTNER_API_KEY_2,
      process.env.PARTNER_API_KEY_3
    ];
    if (partnerKeys.includes(apiKey)) {
      return 'partner';
    }
    
    // Default to free tier
    return 'free';
  }
}