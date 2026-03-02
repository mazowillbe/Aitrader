import { Router } from 'express';
import { performanceAnalytics } from '../services/performanceAnalytics';
import { riskManager } from '../services/riskManager';
import { db } from '../services/database';

export const analyticsRouter = Router();

analyticsRouter.get('/performance', (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const metrics = performanceAnalytics.getPerformanceMetrics(days);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

analyticsRouter.get('/equity-curve', (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const metrics = performanceAnalytics.getPerformanceMetrics(days);
    res.json(metrics.equity_curve);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

analyticsRouter.get('/risk', (req, res) => {
  try {
    const summary = riskManager.getRiskSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

analyticsRouter.get('/insights', (req, res) => {
  try {
    const metrics = performanceAnalytics.getPerformanceMetrics(30);

    const insights = db
      .prepare('SELECT * FROM ai_insights ORDER BY created_at DESC LIMIT 20')
      .all();

    res.json({
      recommendations: metrics.recommendations,
      confidence_adjustment: metrics.confidence_threshold_adjustment,
      performance_summary: {
        win_rate: metrics.win_rate,
        avg_r_multiple: metrics.avg_r_multiple,
        expectancy: metrics.expectancy,
        sharpe_ratio: metrics.sharpe_ratio,
        consecutive_losses: metrics.consecutive_losses
      },
      recent_insights: insights
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

analyticsRouter.get('/journal', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;

    const trades = db
      .prepare(`
        SELECT
          id, symbol, action, volume, entry_price, exit_price,
          stop_loss, take_profit, confidence, status, profit_loss,
          ai_reasoning, created_at, closed_at,
          market_regime, strategy_used, session, confluence_score,
          timeframe_alignment, economic_events, r_multiple,
          max_adverse_excursion, max_favorable_excursion,
          trailing_stop_active, breakeven_triggered
        FROM trades
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .all(limit);

    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

analyticsRouter.get('/session-stats', (req, res) => {
  try {
    const sessionStats = db
      .prepare(`
        SELECT
          session,
          COUNT(*) as total_trades,
          SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as wins,
          COALESCE(SUM(profit_loss), 0) as total_pnl,
          COALESCE(AVG(profit_loss), 0) as avg_pnl,
          COALESCE(AVG(r_multiple), 0) as avg_r_multiple
        FROM trades
        WHERE status = 'CLOSED' AND session IS NOT NULL
        GROUP BY session
      `)
      .all();

    res.json(sessionStats);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

analyticsRouter.get('/regime-stats', (req, res) => {
  try {
    const regimeStats = db
      .prepare(`
        SELECT
          market_regime,
          COUNT(*) as total_trades,
          SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as wins,
          COALESCE(SUM(profit_loss), 0) as total_pnl,
          COALESCE(AVG(r_multiple), 0) as avg_r_multiple
        FROM trades
        WHERE status = 'CLOSED' AND market_regime IS NOT NULL
        GROUP BY market_regime
      `)
      .all();

    res.json(regimeStats);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
