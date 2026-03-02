import type { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.log('error', 'api', `Unhandled error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
}
