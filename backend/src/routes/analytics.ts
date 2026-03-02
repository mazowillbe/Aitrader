import { Router } from 'express';
import { performanceAnalytics } from '../services/performanceAnalytics';
import { tradingJournal } from '../services/tradingJournal';
import { riskManager } from '../services/riskManager';
import { db } from '../services/database';

export const analyticsRouter = Router();

analyticsRouter.get('/performance', (req, res) => {
  try {
    const metrics = performanceAnalytics.getPerformanceMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

analyticsRouter.get('/equity-curve', (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const curve = performanceAnalytics.getEquityCurve(days);
    res.json({ success: true, curve, days });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

analyticsRouter.get('/journal', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const entries = tradingJournal.getRecentEntries(limit);
    res.json({ success: true, entries, count: entries.length });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

analyticsRouter.get('/journal/:id', (req, res) => {
  try {
    const entry = tradingJournal.getJournalEntry(Number(req.params.id));
    if (!entry) return res.status(404).json({ success: false, error: 'Entry not found' });
    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

analyticsRouter.get('/journal/search', (req, res) => {
  try {
    const filters = { symbol: req.query.symbol as string, strategy: req.query.strategy as any, regime: req.query.regime as any, session: req.query.session as any, outcome: req.query.outcome as 'win' | 'loss', dateFrom: req.query.dateFrom as string, dateTo: req.query.dateTo as string };
    const entries = tradingJournal.searchEntries(filters);
    res.json({ success: true, entries, filters });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

analyticsRouter.get('/context-stats', (req, res) => {
  try {
    const stats = tradingJournal.getContextStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

analyticsRouter.get('/risk', (req, res) => {
  try {
    const metrics = riskManager.getRiskMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

analyticsRouter.post('/position-size', (req, res) => {
  try {
    const { symbol, entryPrice, stopLoss, accountRisk } = req.body;
    if (!symbol || !entryPrice || !stopLoss) return res.status(400).json({ success: false, error: 'symbol, entryPrice, and stopLoss are required' });

    const result = riskManager.calculateOptimalPositionSize(symbol, entryPrice, stopLoss, accountRisk || 0.02);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

analyticsRouter.get('/daily-pl', (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const dailyPL = performanceAnalytics.getDailyPL(days);
    res.json({ success: true, dailyPL, days });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

analyticsRouter.get('/distribution', (req, res) => {
  try {
    const distribution = performanceAnalytics.getTradeDistribution();
    res.json({ success: true, distribution });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

analyticsRouter.get('/ai-decisions', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const decisions = db.query(`SELECT * FROM ai_decisions ORDER BY created_at DESC LIMIT ?`).all(limit) as any[];
    res.json({ success: true, decisions, count: decisions.length });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

analyticsRouter.get('/correlations', (req, res) => {
  try {
    const correlations = db.query(`SELECT symbol1, symbol2, correlation, calculated_at FROM correlation_matrix WHERE calculated_at > datetime('now', '-1 day') ORDER BY ABS(correlation) DESC`).all() as any[];
    res.json({ success: true, correlations, count: correlations.length });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

analyticsRouter.get('/session-performance', (req, res) => {
  try {
    const stats = tradingJournal.getContextStats();
    const sessionPerformance = Object.entries(stats.bySession).map(([session, data]: [string, any]) => ({ session, trades: data.wins + data.losses, winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses) * 100).toFixed(1) + '%' : '0%', avgRMultiple: data.avgRMultiple.toFixed(2) }));
    res.json({ success: true, sessions: sessionPerformance });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

analyticsRouter.get('/strategy-performance', (req, res) => {
  try {
    const stats = tradingJournal.getContextStats();
    const strategyPerformance = Object.entries(stats.byStrategy).map(([strategy, data]: [string, any]) => ({ strategy, trades: data.wins + data.losses, winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses) * 100).toFixed(1) + '%' : '0%', avgRMultiple: data.avgRMultiple.toFixed(2) }));
    res.json({ success: true, strategies: strategyPerformance });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

analyticsRouter.get('/regime-performance', (req, res) => {
  try {
    const stats = tradingJournal.getContextStats();
    const regimePerformance = Object.entries(stats.byRegime).map(([regime, data]: [string, any]) => ({ regime, trades: data.wins + data.losses, winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses) * 100).toFixed(1) + '%' : '0%', avgRMultiple: data.avgRMultiple.toFixed(2) }));
    res.json({ success: true, regimes: regimePerformance });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
