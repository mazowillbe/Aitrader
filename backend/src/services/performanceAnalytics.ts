import { db } from './database';

interface ClosedTrade {
  id: number;
  symbol: string;
  action: string;
  volume: number;
  entry_price: number;
  exit_price: number;
  profit_loss: number;
  r_multiple: number | null;
  market_regime: string | null;
  strategy_used: string | null;
  session: string | null;
  confluence_score: number | null;
  created_at: string;
  closed_at: string;
}

interface PerformanceMetrics {
  period: string;
  total_trades: number;
  closed_trades: number;
  win_rate: number;
  total_pnl: number;
  avg_win: number;
  avg_loss: number;
  avg_r_multiple: number;
  expectancy: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  profit_factor: number;
  consecutive_wins: number;
  consecutive_losses: number;
  win_rate_by_regime: Record<string, number>;
  win_rate_by_session: Record<string, number>;
  win_rate_by_strategy: Record<string, number>;
  best_performing_regime: string;
  best_performing_session: string;
  pnl_by_symbol: Record<string, number>;
  recommendations: string[];
  confidence_threshold_adjustment: number;
  equity_curve: Array<{ date: string; equity: number; cumulative_pnl: number }>;
}

export class PerformanceAnalyticsService {
  getPerformanceMetrics(days = 30): PerformanceMetrics {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const trades = db
      .prepare(`
        SELECT * FROM trades
        WHERE status = 'CLOSED'
        AND closed_at >= ?
        ORDER BY closed_at ASC
      `)
      .all(cutoff.toISOString()) as ClosedTrade[];

    const account = db
      .prepare('SELECT * FROM account_state ORDER BY id DESC LIMIT 1')
      .get() as any;

    if (trades.length === 0) {
      return this.getDefaultMetrics(days);
    }

    const wins = trades.filter((t) => t.profit_loss > 0);
    const losses = trades.filter((t) => t.profit_loss < 0);

    const winRate = wins.length / trades.length;
    const totalPnL = trades.reduce((a, t) => a + t.profit_loss, 0);
    const avgWin = wins.length > 0 ? wins.reduce((a, t) => a + t.profit_loss, 0) / wins.length : 0;
    const avgLoss =
      losses.length > 0
        ? losses.reduce((a, t) => a + t.profit_loss, 0) / losses.length
        : 0;

    const rMultiples = trades.filter((t) => t.r_multiple !== null).map((t) => t.r_multiple as number);
    const avgRMultiple = rMultiples.length > 0 ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length : 0;

    const profitFactor =
      Math.abs(avgLoss) > 0 ? (avgWin * wins.length) / (Math.abs(avgLoss) * losses.length) : 1;

    const expectancy = winRate * avgWin + (1 - winRate) * avgLoss;

    const pnlArray = trades.map((t) => t.profit_loss);
    const sharpeRatio = this.calculateSharpe(pnlArray);
    const sortinoRatio = this.calculateSortino(pnlArray);

    const { consecutive_wins, consecutive_losses } = this.getConsecutiveStats(trades);

    const winRateByRegime = this.groupWinRate(trades, 'market_regime');
    const winRateBySession = this.groupWinRate(trades, 'session');
    const winRateByStrategy = this.groupWinRate(trades, 'strategy_used');

    const bestRegime = Object.entries(winRateByRegime).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
    const bestSession = Object.entries(winRateBySession).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    const pnlBySymbol: Record<string, number> = {};
    for (const trade of trades) {
      pnlBySymbol[trade.symbol] = (pnlBySymbol[trade.symbol] || 0) + trade.profit_loss;
    }

    const equityCurve = this.buildEquityCurve(trades, 10000);

    const recommendations = this.generateRecommendations({
      winRate,
      avgRMultiple,
      consecutive_losses,
      winRateByRegime,
      winRateBySession,
      profitFactor
    });

    const confidenceAdjustment = this.calculateConfidenceAdjustment({
      consecutive_losses,
      avgRMultiple,
      sharpeRatio
    });

    return {
      period: `Last ${days} days`,
      total_trades: trades.length,
      closed_trades: trades.length,
      win_rate: winRate,
      total_pnl: totalPnL,
      avg_win: avgWin,
      avg_loss: avgLoss,
      avg_r_multiple: avgRMultiple,
      expectancy,
      sharpe_ratio: sharpeRatio,
      sortino_ratio: sortinoRatio,
      max_drawdown: account?.max_drawdown || 0,
      profit_factor: profitFactor,
      consecutive_wins,
      consecutive_losses,
      win_rate_by_regime: winRateByRegime,
      win_rate_by_session: winRateBySession,
      win_rate_by_strategy: winRateByStrategy,
      best_performing_regime: bestRegime,
      best_performing_session: bestSession,
      pnl_by_symbol: pnlBySymbol,
      recommendations,
      confidence_threshold_adjustment: confidenceAdjustment,
      equity_curve: equityCurve
    };
  }

  private groupWinRate(trades: ClosedTrade[], field: keyof ClosedTrade): Record<string, number> {
    const groups: Record<string, { wins: number; total: number }> = {};

    for (const trade of trades) {
      const key = (trade[field] as string) || 'Unknown';
      if (!groups[key]) groups[key] = { wins: 0, total: 0 };
      groups[key].total++;
      if (trade.profit_loss > 0) groups[key].wins++;
    }

    return Object.fromEntries(
      Object.entries(groups).map(([k, v]) => [k, v.total > 0 ? v.wins / v.total : 0])
    );
  }

  private getConsecutiveStats(trades: ClosedTrade[]): { consecutive_wins: number; consecutive_losses: number } {
    let maxConsecWins = 0;
    let maxConsecLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    const sorted = [...trades].sort(
      (a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime()
    );

    for (const trade of sorted) {
      if (trade.profit_loss > 0) {
        currentWins++;
        currentLosses = 0;
        maxConsecWins = Math.max(maxConsecWins, currentWins);
      } else {
        currentLosses++;
        currentWins = 0;
        maxConsecLosses = Math.max(maxConsecLosses, currentLosses);
      }
    }

    return { consecutive_wins: maxConsecWins, consecutive_losses: currentLosses };
  }

  private calculateSharpe(pnlArray: number[]): number {
    if (pnlArray.length < 2) return 0;
    const mean = pnlArray.reduce((a, b) => a + b, 0) / pnlArray.length;
    const variance = pnlArray.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / pnlArray.length;
    const stdDev = Math.sqrt(variance);
    return stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;
  }

  private calculateSortino(pnlArray: number[]): number {
    if (pnlArray.length < 2) return 0;
    const mean = pnlArray.reduce((a, b) => a + b, 0) / pnlArray.length;
    const downsideVariance =
      pnlArray
        .filter((p) => p < 0)
        .reduce((sum, p) => sum + Math.pow(p, 2), 0) / pnlArray.length;
    const downsideDeviation = Math.sqrt(downsideVariance);
    return downsideDeviation > 0 ? (mean / downsideDeviation) * Math.sqrt(252) : 0;
  }

  private buildEquityCurve(
    trades: ClosedTrade[],
    startingEquity: number
  ): Array<{ date: string; equity: number; cumulative_pnl: number }> {
    let equity = startingEquity;
    let cumulativePnL = 0;
    const curve: Array<{ date: string; equity: number; cumulative_pnl: number }> = [
      { date: trades[0]?.created_at || new Date().toISOString(), equity, cumulative_pnl: 0 }
    ];

    for (const trade of trades) {
      equity += trade.profit_loss;
      cumulativePnL += trade.profit_loss;
      curve.push({
        date: trade.closed_at,
        equity,
        cumulative_pnl: cumulativePnL
      });
    }

    return curve;
  }

  private generateRecommendations(data: {
    winRate: number;
    avgRMultiple: number;
    consecutive_losses: number;
    winRateByRegime: Record<string, number>;
    winRateBySession: Record<string, number>;
    profitFactor: number;
  }): string[] {
    const recs: string[] = [];

    if (data.consecutive_losses >= 5) {
      recs.push('Consider pausing trading - 5+ consecutive losses detected');
    } else if (data.consecutive_losses >= 3) {
      recs.push('Reduce position sizes - 3+ consecutive losses');
    }

    if (data.winRate < 0.4) {
      recs.push('Win rate below 40% - review entry criteria and increase selectivity');
    }

    if (data.avgRMultiple < 1.0) {
      recs.push('Average R-multiple below 1.0 - improve risk/reward ratios');
    }

    const poorRegimes = Object.entries(data.winRateByRegime)
      .filter(([, wr]) => wr < 0.35)
      .map(([r]) => r);
    if (poorRegimes.length > 0) {
      recs.push(`Avoid trading in: ${poorRegimes.join(', ')} regimes`);
    }

    const bestSessions = Object.entries(data.winRateBySession)
      .filter(([, wr]) => wr > 0.6)
      .map(([s]) => s);
    if (bestSessions.length > 0) {
      recs.push(`Focus on high-performance sessions: ${bestSessions.join(', ')}`);
    }

    if (data.profitFactor > 2) {
      recs.push('Strong profit factor - consider increasing position sizes slightly');
    }

    return recs.slice(0, 5);
  }

  private calculateConfidenceAdjustment(data: {
    consecutive_losses: number;
    avgRMultiple: number;
    sharpeRatio: number;
  }): number {
    let adjustment = 0;

    if (data.consecutive_losses >= 5) adjustment -= 0.1;
    else if (data.consecutive_losses >= 3) adjustment -= 0.05;

    if (data.avgRMultiple > 2 && data.sharpeRatio > 1.5) adjustment += 0.05;
    else if (data.avgRMultiple < 0.5) adjustment -= 0.05;

    return Math.max(-0.15, Math.min(0.1, adjustment));
  }

  private getDefaultMetrics(days: number): PerformanceMetrics {
    return {
      period: `Last ${days} days`,
      total_trades: 0,
      closed_trades: 0,
      win_rate: 0,
      total_pnl: 0,
      avg_win: 0,
      avg_loss: 0,
      avg_r_multiple: 0,
      expectancy: 0,
      sharpe_ratio: 0,
      sortino_ratio: 0,
      max_drawdown: 0,
      profit_factor: 0,
      consecutive_wins: 0,
      consecutive_losses: 0,
      win_rate_by_regime: {},
      win_rate_by_session: {},
      win_rate_by_strategy: {},
      best_performing_regime: 'N/A',
      best_performing_session: 'N/A',
      pnl_by_symbol: {},
      recommendations: ['Start trading to generate performance data'],
      confidence_threshold_adjustment: 0,
      equity_curve: []
    };
  }
}

export const performanceAnalytics = new PerformanceAnalyticsService();
