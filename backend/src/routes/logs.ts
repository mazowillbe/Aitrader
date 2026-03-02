import { Router } from 'express';
import { logger } from '../services/logger';

export const logsRouter = Router();

/**
 * GET /api/logs
 * Get system logs with optional filtering
 */
logsRouter.get('/', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const category = req.query.category as 'trade' | 'ai' | 'system' | 'api' | undefined;

    const logs = logger.getLogs(limit, category);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * DELETE /api/logs/old
 * Clear old logs (demo mode only)
 */
logsRouter.delete('/old', (req, res) => {
  try {
    const tradingMode = process.env.TRADING_MODE || 'DEMO';

    if (tradingMode !== 'DEMO') {
      return res.status(403).json({ error: 'Log clearing only available in DEMO mode' });
    }

    const daysToKeep = Number(req.query.days) || 7;
    logger.clearOldLogs(daysToKeep);

    res.json({ success: true, message: `Cleared logs older than ${daysToKeep} days` });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
