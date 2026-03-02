import { Router } from 'express';

export const configRouter = Router();

configRouter.get('/', (req, res) => {
  try {
    const config = {
      trading_mode: process.env.TRADING_MODE || 'DEMO',
      max_trade_size: Number(process.env.MAX_TRADE_SIZE) || 1000,
      max_daily_risk: Number(process.env.MAX_DAILY_RISK) || 500,
      ai_decision_interval: Number(process.env.AI_DECISION_INTERVAL) || 60000,
      supported_symbols: (process.env.SUPPORTED_SYMBOLS || 'BTC/USD,ETH/USD,EUR/USD,GBP/USD,AAPL,TSLA').split(','),
      max_portfolio_heat: Number(process.env.MAX_PORTFOLIO_HEAT) || 0.06,
      kelly_fraction_max: Number(process.env.KELLY_FRACTION_MAX) || 0.25,
      drawdown_protection_threshold: Number(process.env.DRAWDOWN_PROTECTION_THRESHOLD) || 0.1,
      features: {
        multi_timeframe_analysis: true,
        regime_detection: true,
        session_based_trading: true,
        economic_calendar: true,
        active_position_management: true,
        kelly_criterion: true,
        portfolio_heat: true,
        self_improvement: true
      }
    };

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
