import { db } from './database';
import { logger } from './logger';
import type { MarketRegime, StrategyType, TradingSession } from '../types/enhanced';

export class TradingJournal {
  logEntryContext(tradeId: number, context: {
    marketRegime?: MarketRegime;
    confluenceScore?: number;
    timeframeAlignment?: string;
    session?: TradingSession;
    strategy?: StrategyType;
    economicEvents?: any[];
    newsSentiment?: 'positive' | 'negative' | 'neutral';
    aiConfidence?: number;
  }) {
    const timeOfDay = new Date().toLocaleTimeString('en-US', { hour: '2-digit', hour12: true });
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    db.run(`
      UPDATE trades SET market_regime = ?, confluence_score = ?, timeframe_alignment = ?, session = ?, strategy_used = ?, economic_events = ?
      WHERE id = ?
    `, [context.marketRegime || 'RANGING', context.confluenceScore || 0, context.timeframeAlignment || 'mixed', context.session || 'london', context.strategy || 'trend_following', JSON.stringify(context.economicEvents || []), tradeId]);

    logger.log('info', 'journal', 'Entry context logged', { tradeId });
  }

  logOutcome(tradeId: number, outcome: { rMultiple: number; maxAdverseExcursion: number; maxFavorableExcursion: number; holdTime: number; exitReason: string; profitLoss: number }) {
    db.run(`UPDATE trades SET r_multiple = ?, max_adverse_excursion = ?, max_favorable_excursion = ? WHERE id = ?`, [outcome.rMultiple, outcome.maxAdverseExcursion, outcome.maxFavorableExcursion, tradeId]);
    db.run(`INSERT INTO trading_journal (trade_id, exit_analysis) VALUES (?, ?)`, [tradeId, JSON.stringify(outcome)]);
    logger.log('info', 'journal', 'Outcome logged', { tradeId, rMultiple: outcome.rMultiple.toFixed(2), exitReason: outcome.exitReason });
  }

  addLesson(tradeId: number, lesson: string) {
    db.run(`UPDATE trading_journal SET lessons_learned = ? WHERE trade_id = ?`, [lesson, tradeId]);
  }

  addAIInsight(tradeId: number, insight: string) {
    db.run(`UPDATE trading_journal SET ai_insight = ? WHERE trade_id = ?`, [insight, tradeId]);
  }

  getJournalEntry(tradeId: number): any {
    const trade = db.query(`
      SELECT t.*, j.lessons_learned, j.ai_insight FROM trades t
      LEFT JOIN trading_journal j ON t.id = j.trade_id WHERE t.id = ?
    `).get(tradeId) as any;

    if (!trade) return null;
    return {
      ...trade,
      entry_context: { marketRegime: trade.market_regime, confluenceScore: trade.confluence_score, session: trade.session, strategy: trade.strategy_used, economicEvents: trade.economic_events ? JSON.parse(trade.economic_events) : [] },
      outcome: { rMultiple: trade.r_multiple, maxAdverseExcursion: trade.max_adverse_excursion, maxFavorableExcursion: trade.max_favorable_excursion, profitLoss: trade.profit_loss },
      lessonsLearned: trade.lessons_learned,
      aiInsight: trade.ai_insight
    };
  }

  getRecentEntries(limit: number = 20): any[] {
    const trades = db.query(`
      SELECT t.*, j.lessons_learned, j.ai_insight FROM trades t
      LEFT JOIN trading_journal j ON t.id = j.trade_id
      ORDER BY t.created_at DESC LIMIT ?
    `).all(limit) as any[];

    return trades.map(trade => ({
      id: trade.id, symbol: trade.symbol, action: trade.action, entryPrice: trade.entry_price, exitPrice: trade.exit_price,
      profitLoss: trade.profit_loss, rMultiple: trade.r_multiple, marketRegime: trade.market_regime, strategy: trade.strategy_used,
      session: trade.session, confluenceScore: trade.confluence_score, status: trade.status, createdAt: trade.created_at,
      closedAt: trade.closed_at, lessonsLearned: trade.lessons_learned, aiInsight: trade.ai_insight
    }));
  }

  searchEntries(filters: { symbol?: string; strategy?: string; regime?: string; session?: string; outcome?: 'win' | 'loss'; dateFrom?: string; dateTo?: string }): any[] {
    let query = `SELECT t.*, j.lessons_learned, j.ai_insight FROM trades t LEFT JOIN trading_journal j ON t.id = j.trade_id WHERE 1=1`;
    const params: any[] = [];

    if (filters.symbol) { query += ' AND t.symbol = ?'; params.push(filters.symbol); }
    if (filters.strategy) { query += ' AND t.strategy_used = ?'; params.push(filters.strategy); }
    if (filters.regime) { query += ' AND t.market_regime = ?'; params.push(filters.regime); }
    if (filters.session) { query += ' AND t.session = ?'; params.push(filters.session); }
    if (filters.outcome) { query += ' AND t.profit_loss ' + (filters.outcome === 'win' ? '>' : '<') + ' 0'; }
    if (filters.dateFrom) { query += ' AND t.created_at >= ?'; params.push(filters.dateFrom); }
    if (filters.dateTo) { query += ' AND t.created_at <= ?'; params.push(filters.dateTo); }

    query += ' ORDER BY t.created_at DESC LIMIT 100';
    return db.query(query).all(...params) as any[];
  }

  getContextStats(): { byRegime: Record<string, any>; bySession: Record<string, any>; byStrategy: Record<string, any> } {
    const trades = db.query(`
      SELECT market_regime, session, strategy_used, profit_loss, r_multiple
      FROM trades WHERE status = 'CLOSED' AND market_regime IS NOT NULL
    `).all() as any[];

    const byRegime: Record<string, any> = {};
    const bySession: Record<string, any> = {};
    const byStrategy: Record<string, any> = {};

    for (const trade of trades) {
      if (trade.market_regime) {
        if (!byRegime[trade.market_regime]) byRegime[trade.market_regime] = { wins: 0, losses: 0, totalR: 0, count: 0 };
        byRegime[trade.market_regime].count++;
        byRegime[trade.market_regime].totalR += trade.r_multiple || 0;
        if (trade.profit_loss > 0) byRegime[trade.market_regime].wins++; else byRegime[trade.market_regime].losses++;
      }
      if (trade.session) {
        if (!bySession[trade.session]) bySession[trade.session] = { wins: 0, losses: 0, totalR: 0, count: 0 };
        bySession[trade.session].count++;
        bySession[trade.session].totalR += trade.r_multiple || 0;
        if (trade.profit_loss > 0) bySession[trade.session].wins++; else bySession[trade.session].losses++;
      }
      if (trade.strategy_used) {
        if (!byStrategy[trade.strategy_used]) byStrategy[trade.strategy_used] = { wins: 0, losses: 0, totalR: 0, count: 0 };
        byStrategy[trade.strategy_used].count++;
        byStrategy[trade.strategy_used].totalR += trade.r_multiple || 0;
        if (trade.profit_loss > 0) byStrategy[trade.strategy_used].wins++; else byStrategy[trade.strategy_used].losses++;
      }
    }

    const formatResult = (obj: Record<string, any>) => {
      const result: Record<string, any> = {};
      for (const [key, val] of Object.entries(obj)) {
        const v = val as any;
        result[key] = { wins: v.wins, losses: v.losses, avgRMultiple: v.count > 0 ? v.totalR / v.count : 0 };
      }
      return result;
    };

    return { byRegime: formatResult(byRegime), bySession: formatResult(bySession), byStrategy: formatResult(byStrategy) };
  }
}

export const tradingJournal = new TradingJournal();
