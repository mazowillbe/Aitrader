import { Router } from 'express';

export const configRouter = Router();

/**
 * GET /api/config
 * Get current system configuration (non-sensitive)
 */
configRouter.get('/', (req, res) => {
  try {
    const config = {
      trading_mode: process.env.TRADING_MODE || 'DEMO',
      max_trade_size: Number(process.env.MAX_TRADE_SIZE) || 1000,
      max_daily_risk: Number(process.env.MAX_DAILY_RISK) || 500,
      ai_decision_interval: Number(process.env.AI_DECISION_INTERVAL) || 60000,
      supported_symbols: (process.env.SUPPORTED_SYMBOLS || 'BTC/USD,ETH/USD,EUR/USD,GBP/USD,AAPL,TSLA').split(',')
    };

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
