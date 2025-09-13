import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';

export function requestLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Log response after it's sent
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
    });

    next();
  };
}