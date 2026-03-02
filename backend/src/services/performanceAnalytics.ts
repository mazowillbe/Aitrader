import { db } from './database';
import type { PerformanceMetrics } from '../types/enhanced';

export class PerformanceAnalytics {
  getPerformanceMetrics(): PerformanceMetrics {
    const trades = db.query(`
      SELECT profit_loss, r_multiple, market_regime, session, strategy_used, created_at, closed_at
      FROM trades WHERE status = 'CLOSED' AND profit_loss IS NOT NULL
      ORDER BY closed_at DESC
    `).all() as any[];

    const totalTrades = trades.length;
    if (totalTrades === 0) return this.getEmptyMetrics();

    const winningTrades = trades.filter(t => t.profit_loss > 0);
    const losingTrades = trades.filter(t => t.profit_loss <= 0);
    const totalProfit = winningTrades.reduce((sum, t) => sum + t.profit_loss, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit_loss, 0));
    const avgWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
    const winRate = winningTrades.length / totalTrades;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

    const rMultiples = trades.filter(t => t.r_multiple !== null).map(t => t.r_multiple);
    const avgRMultiple = rMultiples.length > 0 ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length : 0;
    const sharpeRatio = this.calculateSharpeRatio(trades);
    const sortinoRatio = this.calculateSortinoRatio(trades, avgRMultiple);
    const { maxConsecWins, maxConsecLosses } = this.calculateConsecutive(trades);
    const bestTrade = Math.max(...trades.map(t => t.r_multiple || 0));
    const worstTrade = Math.min(...trades.map(t => t.r_multiple || 0));
    const metrics = db.query(`SELECT max_drawdown FROM risk_metrics WHERE id = 1`).get() as any;
    const maxDrawdown = metrics?.max_drawdown || 0;

    const byRegime = this.calculateByDimension(trades, 'market_regime');
    const bySession = this.calculateByDimension(trades, 'session');
    const byStrategy = this.calculateByDimension(trades, 'strategy_used');

    return {
      totalTrades, winningTrades: winningTrades.length, losingTrades: losingTrades.length, winRate, avgWin, avgLoss,
      expectancy, profitFactor, sharpeRatio, sortinoRatio, maxConsecutiveWins: maxConsecWins, maxConsecutiveLosses: maxConsecLosses,
      avgRMultiple, bestTrade, worstTrade, maxDrawdown, recoveryFactor: maxDrawdown > 0 ? totalProfit / (maxDrawdown * 10000) : 0,
      byRegime, bySession, byStrategy
    };
  }

  private calculateSharpeRatio(trades: any[]): number {
    if (trades.length < 5) return 0;
    const returns = trades.map(t => t.r_multiple || 0);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    return stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(trades.length / 252);
  }

  private calculateSortinoRatio(trades: any[], avgReturn: number): number {
    if (trades.length < 5) return 0;
    const returns = trades.map(t => t.r_multiple || 0);
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const negativeReturns = returns.filter(r => r < 0);
    if (negativeReturns.length === 0) return Infinity;
    const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);
    return downsideDeviation === 0 ? 0 : avg / downsideDeviation;
  }

  private calculateConsecutive(trades: any[]): { maxConsecWins: number; maxConsecLosses: number } {
    let maxConsecWins = 0, maxConsecLosses = 0, currentWins = 0, currentLosses = 0;
    for (const trade of trades) {
      if (trade.profit_loss > 0) { currentWins++; currentLosses = 0; maxConsecWins = Math.max(maxConsecWins, currentWins); }
      else { currentLosses++; currentWins = 0; maxConsecLosses = Math.max(maxConsecLosses, currentLosses); }
    }
    return { maxConsecWins, maxConsecLosses };
  }

  private calculateByDimension(trades: any[], dimension: string): Record<string, any> {
    const groups: Record<string, any> = {};
    for (const trade of trades) {
      const key = trade[dimension];
      if (!key) continue;
      if (!groups[key]) groups[key] = { trades: 0, wins: 0, totalR: 0, profits: 0, losses: 0 };
      groups[key].trades++;
      groups[key].totalR += trade.r_multiple || 0;
      if (trade.profit_loss > 0) { groups[key].wins++; groups[key].profits += trade.profit_loss; }
      else groups[key].losses += Math.abs(trade.profit_loss);
    }
    const result: Record<string, any> = {};
    for (const [key, data] of Object.entries(groups)) {
      const d = data as any;
      result[key] = { session: key, trades: d.trades, winRate: d.trades > 0 ? d.wins / d.trades : 0, avgRMultiple: d.trades > 0 ? d.totalR / d.trades : 0, profitFactor: d.losses > 0 ? d.profits / d.losses : d.profits > 0 ? Infinity : 0 };
    }
    return result;
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return { totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0, avgWin: 0, avgLoss: 0, expectancy: 0, profitFactor: 0, sharpeRatio: 0, sortinoRatio: 0, maxConsecutiveWins: 0, maxConsecutiveLosses: 0, avgRMultiple: 0, bestTrade: 0, worstTrade: 0, maxDrawdown: 0, recoveryFactor: 0, byRegime: {}, bySession: {}, byStrategy: {} };
  }

  getEquityCurve(days: number = 30): Array<{ date: string; equity: number; drawdown: number }> {
    const trades = db.query(`
      SELECT profit_loss, closed_at FROM trades
      WHERE status = 'CLOSED' AND profit_loss IS NOT NULL
      AND closed_at >= datetime('now', '-' || ? || ' days')
      ORDER BY closed_at ASC
    `).all(days) as any[];

    let equity = 10000, peakEquity = 10000;
    const curve: Array<{ date: string; equity: number; drawdown: number }> = [{ date: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0], equity, drawdown: 0 }];

    for (const trade of trades) {
      equity += trade.profit_loss;
      peakEquity = Math.max(peakEquity, equity);
      curve.push({ date: trade.closed_at.split(' ')[0], equity, drawdown: peakEquity > 0 ? (peakEquity - equity) / peakEquity : 0 });
    }

    const account = db.query(`SELECT balance FROM account_state WHERE id = 1`).get() as any;
    const currentEquity = account?.balance || equity;
    curve.push({ date: new Date().toISOString().split('T')[0], equity: currentEquity, drawdown: peakEquity > 0 ? (peakEquity - currentEquity) / peakEquity : 0 });
    return curve;
  }

  getTradeDistribution(): { byHour: Record<number, number>; byDay: Record<string, number> } {
    const trades = db.query(`SELECT created_at FROM trades WHERE status = 'CLOSED'`).all() as any[];
    const byHour: Record<number, number> = {}; const byDay: Record<string, number> = {};
    for (let i = 0; i < 24; i++) byHour[i] = 0;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) byDay[day] = 0;

    for (const trade of trades) {
      const date = new Date(trade.created_at);
      byHour[date.getUTCHours()] = (byHour[date.getUTCHours()] || 0) + 1;
      byDay[days[date.getUTCDay()]] = (byDay[days[date.getUTCDay()]] || 0) + 1;
    }
    return { byHour, byDay };
  }

  getDailyPL(days: number = 30): Array<{ date: string; pl: number; trades: number }> {
    return db.query(`
      SELECT DATE(closed_at) as date, SUM(profit_loss) as pl, COUNT(*) as trades
      FROM trades WHERE status = 'CLOSED' AND profit_loss IS NOT NULL
      AND closed_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(closed_at) ORDER BY date DESC
    `).all(days) as any[];
  }
}

export const performanceAnalytics = new PerformanceAnalytics();
