import { Router } from 'express';
import { db } from '../services/database';

export const accountRouter = Router();

/**
 * GET /api/account/balance
 * Get current account balance and equity
 */
accountRouter.get('/balance', (req, res) => {
  try {
    const account = db.prepare('SELECT * FROM account_state ORDER BY id DESC LIMIT 1').get();
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * GET /api/account/risk-summary
 * Get current risk metrics
 */
accountRouter.get('/risk-summary', (req, res) => {
  try {
    const account = db.prepare('SELECT * FROM account_state ORDER BY id DESC LIMIT 1').get() as any;
    const maxDailyRisk = Number(process.env.MAX_DAILY_RISK) || 500;
    const maxTradeSize = Number(process.env.MAX_TRADE_SIZE) || 1000;

    const riskSummary = {
      daily_risk_used: account.daily_risk_used,
      daily_risk_limit: maxDailyRisk,
      daily_risk_remaining: maxDailyRisk - account.daily_risk_used,
      daily_trades: account.daily_trades,
      max_trade_size: maxTradeSize,
      margin_used: account.margin_used,
      margin_available: account.equity - account.margin_used
    };

    res.json(riskSummary);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/account/reset
 * Reset account to initial state (demo mode only)
 */
accountRouter.post('/reset', (req, res) => {
  try {
    const tradingMode = process.env.TRADING_MODE || 'DEMO';

    if (tradingMode !== 'DEMO') {
      return res.status(403).json({ error: 'Account reset only available in DEMO mode' });
    }

    // Reset account state
    db.prepare(`
      UPDATE account_state
      SET balance = 10000, equity = 10000, margin_used = 0, daily_trades = 0, daily_risk_used = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT MAX(id) FROM account_state)
    `).run();

    // Close all open trades
    db.prepare('UPDATE trades SET status = "CLOSED", closed_at = CURRENT_TIMESTAMP WHERE status = "OPEN"').run();

    res.json({ success: true, message: 'Account reset to initial state' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
