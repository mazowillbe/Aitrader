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
      
      // Professional features
      features: {
        multi_timeframe: process.env.ENABLE_MULTI_TIMEFRAME !== 'false',
        regime_detection: process.env.ENABLE_REGIME_DETECTION !== 'false',
        position_management: process.env.ENABLE_POSITION_MANAGEMENT !== 'false',
        economic_calendar: process.env.ENABLE_ECONOMIC_CALENDAR !== 'false',
        session_logic: process.env.ENABLE_SESSION_LOGIC !== 'false',
        self_improvement: process.env.ENABLE_SELF_IMPROVEMENT !== 'false'
      },
      
      // Risk settings
      risk: {
        kelly_fraction_max: Number(process.env.KELLY_FRACTION_MAX) || 0.25,
        max_portfolio_heat: Number(process.env.MAX_PORTFOLIO_HEAT) || 0.06,
        max_correlation: Number(process.env.MAX_CORRELATION) || 0.7,
        drawdown_protection_threshold: Number(process.env.DRAWDOWN_PROTECTION_THRESHOLD) || 0.10
      }
    };

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
