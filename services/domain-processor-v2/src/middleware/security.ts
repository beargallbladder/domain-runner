import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

export class SecurityMiddleware {
  private readonly logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
  }

  // Security headers
  headers() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Content-Security-Policy', "default-src 'self'");
      
      // Remove sensitive headers
      res.removeHeader('X-Powered-By');
      
      next();
    };
  }

  // CORS configuration
  cors() {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'https://llmrank.io',
      'https://app.llmrank.io',
      'https://llmpagerank.com',
      'https://www.llmpagerank.com',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;
      
      // Allow all origins for public API endpoints
      if (req.path.startsWith('/api/stats') || 
          req.path.startsWith('/api/rankings')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', 'false');
      } else if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
      res.setHeader('Access-Control-Max-Age', '86400');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
      
      next();
    };
  }

  // Input validation and sanitization
  validateInput() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Validate domain format if present
      if (req.body.domain) {
        const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
        if (!domainRegex.test(req.body.domain)) {
          return res.status(400).json({
            error: 'Invalid domain format'
          });
        }
      }
      
      // Validate domains array
      if (req.body.domains && Array.isArray(req.body.domains)) {
        if (req.body.domains.length > 1000) {
          return res.status(400).json({
            error: 'Too many domains',
            message: 'Maximum 1000 domains per request'
          });
        }
        
        // Validate each domain object
        for (const domainObj of req.body.domains) {
          if (!domainObj.domain || typeof domainObj.domain !== 'string') {
            return res.status(400).json({
              error: 'Invalid domain object',
              message: 'Each domain must have a "domain" field'
            });
          }
        }
      }
      
      // Validate numeric parameters
      if (req.query.batchSize) {
        const batchSize = parseInt(req.query.batchSize as string);
        if (isNaN(batchSize) || batchSize < 1 || batchSize > 1000) {
          return res.status(400).json({
            error: 'Invalid batch size',
            message: 'Batch size must be between 1 and 1000'
          });
        }
      }
      
      // Sanitize prompts if present
      if (req.body.prompts) {
        for (const key in req.body.prompts) {
          if (typeof req.body.prompts[key] === 'string') {
            // Remove any potential script injection
            req.body.prompts[key] = req.body.prompts[key]
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .trim();
          }
        }
      }
      
      next();
    };
  }

  // SQL injection prevention
  preventSQLInjection() {
    return (req: Request, res: Response, next: NextFunction) => {
      const suspiciousPatterns = [
        /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
        /(--|\||;|\/\*|\*\/)/,
        /(\bor\b\s*\d+\s*=\s*\d+)/i,
        /(\band\b\s*\d+\s*=\s*\d+)/i
      ];
      
      const checkValue = (value: any): boolean => {
        if (typeof value === 'string') {
          return suspiciousPatterns.some(pattern => pattern.test(value));
        }
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some(v => checkValue(v));
        }
        return false;
      };
      
      if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
        this.logger.warn('Potential SQL injection attempt', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Request contains suspicious patterns'
        });
      }
      
      next();
    };
  }

  // Error handler without information leakage
  errorHandler() {
    return (err: any, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('Request error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      // Don't leak error details in production
      if (process.env.NODE_ENV === 'production') {
        res.status(err.status || 500).json({
          error: 'Internal server error',
          requestId: req.headers['x-request-id'] || 'unknown'
        });
      } else {
        res.status(err.status || 500).json({
          error: err.message,
          stack: err.stack
        });
      }
    };
  }

  // Request logging for security monitoring
  requestLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        
        this.logger.info('Request completed', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          apiKey: req.headers['x-api-key'] ? 'present' : 'absent'
        });
      });
      
      next();
    };
  }
}

// Legacy exports for backward compatibility
export const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const security = new SecurityMiddleware(console as any);
  security.headers()(req, res, next);
};

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const security = new SecurityMiddleware(console as any);
  security.validateInput()(req, res, next);
};