import { Router } from 'express';
import { logger } from '../services/logger';

export const logsRouter = Router();

logsRouter.get('/', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const category = req.query.category as string | undefined;

    const logs = category ? logger.getByCategory(category, limit) : logger.getRecent(limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

logsRouter.delete('/old', (req, res) => {
  try {
    const tradingMode = process.env.TRADING_MODE || 'DEMO';
    if (tradingMode !== 'DEMO') return res.status(403).json({ error: 'Log clearing only available in DEMO mode' });

    const daysToKeep = Number(req.query.days) || 7;
    logger.cleanOldLogs(daysToKeep);
    res.json({ success: true, message: `Cleared logs older than ${daysToKeep} days` });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
