import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

interface RateLimitStore {
  hits: number;
  resetTime: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitStore> = new Map();
  private readonly logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  create(options: RateLimitOptions) {
    const {
      windowMs,
      maxRequests,
      skipSuccessfulRequests = false,
      keyGenerator = (req: any) => req.rateLimitKey || req.ip
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      const key = keyGenerator(req);
      const now = Date.now();
      
      // Get or create rate limit entry
      let entry = this.store.get(key);
      
      if (!entry || entry.resetTime < now) {
        entry = {
          hits: 0,
          resetTime: now + windowMs
        };
        this.store.set(key, entry);
      }
      
      // Check if limit exceeded
      if (entry.hits >= maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        
        this.logger.warn('Rate limit exceeded', {
          key,
          hits: entry.hits,
          limit: maxRequests,
          retryAfter
        });
        
        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          'Retry-After': retryAfter.toString()
        });
        
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter
        });
      }
      
      // Increment hits
      entry.hits++;
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': (maxRequests - entry.hits).toString(),
        'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
      });
      
      // Skip counting successful requests if configured
      if (skipSuccessfulRequests) {
        res.on('finish', () => {
          if (res.statusCode < 400 && entry) {
            entry.hits = Math.max(0, entry.hits - 1);
          }
        });
      }
      
      next();
    };
  }

  // Rate limit configurations for different endpoint types
  static readonly configs = {
    // Public endpoints - strict limits
    public: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100
    },
    
    // Authenticated API - moderate limits
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000
    },
    
    // Processing endpoints - lower limits due to resource intensity
    processing: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 100
    },
    
    // Admin endpoints - high limits
    admin: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5000
    },
    
    // Health check - very high limit
    health: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60
    }
  };

  private cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`Rate limiter cleanup: removed ${cleaned} expired entries`);
    }
  }
}