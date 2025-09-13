import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

export class ErrorHandler {
  constructor(private logger: Logger) {}

  // Create standardized errors
  static createError(message: string, statusCode: number, code?: string, details?: any): AppError {
    const error: AppError = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    error.details = details;
    error.isOperational = true;
    return error;
  }

  // Common error types
  static badRequest(message: string, details?: any): AppError {
    return ErrorHandler.createError(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message: string = 'Unauthorized'): AppError {
    return ErrorHandler.createError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Forbidden'): AppError {
    return ErrorHandler.createError(message, 403, 'FORBIDDEN');
  }

  static notFound(resource: string): AppError {
    return ErrorHandler.createError(`${resource} not found`, 404, 'NOT_FOUND');
  }

  static conflict(message: string, details?: any): AppError {
    return ErrorHandler.createError(message, 409, 'CONFLICT', details);
  }

  static tooManyRequests(message: string = 'Too many requests'): AppError {
    return ErrorHandler.createError(message, 429, 'TOO_MANY_REQUESTS');
  }

  static internalError(message: string = 'Internal server error', details?: any): AppError {
    return ErrorHandler.createError(message, 500, 'INTERNAL_ERROR', details);
  }

  static serviceUnavailable(message: string = 'Service unavailable'): AppError {
    return ErrorHandler.createError(message, 503, 'SERVICE_UNAVAILABLE');
  }

  // Error handling middleware
  middleware() {
    return (error: AppError, req: Request, res: Response, next: NextFunction) => {
      // Default to 500 server error
      const statusCode = error.statusCode || 500;
      const isOperational = error.isOperational || false;

      // Log error
      const errorInfo = {
        message: error.message,
        statusCode,
        code: error.code,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        requestId: req.headers['x-request-id'],
        details: error.details
      };

      if (!isOperational || statusCode >= 500) {
        this.logger.error('Unhandled error', errorInfo);
      } else {
        this.logger.warn('Operational error', errorInfo);
      }

      // Don't leak error details in production
      const response: any = {
        error: {
          message: error.message,
          code: error.code || 'INTERNAL_ERROR',
          requestId: req.headers['x-request-id']
        }
      };

      // Add details in development
      if (process.env.NODE_ENV === 'development') {
        response.error.details = error.details;
        response.error.stack = error.stack;
      }

      res.status(statusCode).json(response);
    };
  }

  // Async error wrapper
  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Not found handler
  notFoundHandler() {
    return (req: Request, res: Response) => {
      const error = ErrorHandler.notFound(`Route ${req.path}`);
      res.status(404).json({
        error: {
          message: error.message,
          code: error.code,
          requestId: req.headers['x-request-id']
        }
      });
    };
  }
}

// Retry mechanism with exponential backoff
export class RetryHandler {
  constructor(
    private maxRetries: number = 3,
    private baseDelay: number = 1000,
    private maxDelay: number = 30000,
    private logger: Logger
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    context: string,
    shouldRetry: (error: any) => boolean = () => true
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        if (!shouldRetry(error) || attempt === this.maxRetries) {
          this.logger.error(`Operation failed after ${attempt} attempts`, {
            context,
            error: error.message,
            attempt
          });
          throw error;
        }
        
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt - 1),
          this.maxDelay
        );
        
        this.logger.warn(`Operation failed, retrying in ${delay}ms`, {
          context,
          error: error.message,
          attempt,
          nextAttempt: attempt + 1,
          delay
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

// Timeout wrapper
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

// Resource cleanup manager
export class ResourceCleanup {
  private cleanupFunctions: Array<() => Promise<void>> = [];

  register(cleanup: () => Promise<void>) {
    this.cleanupFunctions.push(cleanup);
  }

  async cleanup(logger: Logger) {
    for (const cleanup of this.cleanupFunctions) {
      try {
        await cleanup();
      } catch (error: any) {
        logger.error('Cleanup error', error);
      }
    }
  }
}