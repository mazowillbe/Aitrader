import { db } from './database';
import { logger } from './logger';
import { positionManager } from './positionManager';
import { riskManager } from './riskManager';
import { tradingJournal } from './tradingJournal';

export interface TradeInstruction {
  action: 'BUY' | 'SELL' | 'HOLD';
  symbol: string;
  volume: number;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  reasoning?: string;
  market_regime?: string;
  strategy_used?: string;
  session?: string;
  confluence_score?: number;
  timeframe_alignment?: string;
  atr?: number;
  trailing_stop_type?: 'atr' | 'percentage' | 'chandelier';
  partial_exits?: Array<{ level: number; percentage: number }>;
}

export interface TradeResult {
  success: boolean;
  tradeId?: number;
  error?: string;
  riskAdjustments?: string[];
}

class TradeExecutor {
  private demoMode: boolean;
  private maxTradeSize: number;
  private maxDailyRisk: number;

  constructor() {
    this.demoMode = process.env.TRADING_MODE !== 'LIVE';
    this.maxTradeSize = Number(process.env.MAX_TRADE_SIZE) || 1000;
    this.maxDailyRisk = Number(process.env.MAX_DAILY_RISK) || 500;
  }

  async executeTrade(instruction: TradeInstruction): Promise<TradeResult> {
    if (instruction.action === 'HOLD') {
      logger.log('info', 'trade', 'AI decided to HOLD', { instruction });
      return { success: true };
    }

    const adjustments: string[] = [];
    const account = this.getAccountState();
    
    if (account.daily_risk_used >= this.maxDailyRisk) {
      logger.log('warn', 'trade', 'Daily risk limit reached', { limit: this.maxDailyRisk });
      return { success: false, error: 'Daily risk limit reached' };
    }

    const sizing = riskManager.calculateOptimalPositionSize(instruction.symbol, this.getSimulatedPrice(instruction.symbol), instruction.stop_loss);
    let finalVolume = Math.min(instruction.volume, sizing.size);

    if (sizing.adjustments.length > 0) {
      adjustments.push(...sizing.adjustments);
      logger.log('info', 'trade', 'Position size adjusted', { original: instruction.volume, adjusted: finalVolume, adjustments: sizing.adjustments });
    }

    const riskPerUnit = Math.abs(this.getSimulatedPrice(instruction.symbol) - instruction.stop_loss);
    const riskCheck = riskManager.canTakeNewRisk(instruction.symbol, riskPerUnit * finalVolume);
    
    if (!riskCheck.allowed) {
      logger.log('warn', 'trade', 'Risk check failed', { reason: riskCheck.reason });
      return { success: false, error: riskCheck.reason, riskAdjustments: adjustments };
    }

    const correlationCheck = await riskManager.checkCorrelationRisk(instruction.symbol);
    if (correlationCheck.hasHighCorrelation) {
      adjustments.push(`High correlation with ${correlationCheck.correlatedPositions.join(', ')} - consider reducing size`);
      finalVolume *= 0.5;
    }

    const drawdownCheck = riskManager.checkDrawdownProtection();
    if (drawdownCheck.active) {
      adjustments.push(drawdownCheck.reason);
      finalVolume *= drawdownCheck.multiplier;
    }

    if (finalVolume < 1) {
      logger.log('warn', 'trade', 'Position size too small', { finalVolume });
      return { success: false, error: 'Position size too small after risk adjustments', riskAdjustments: adjustments };
    }

    if (finalVolume > this.maxTradeSize) {
      return { success: false, error: 'Trade size exceeds maximum allowed' };
    }

    return this.demoMode ? this.executeDemoTrade(instruction, finalVolume, adjustments) : this.executeLiveTrade(instruction, finalVolume, adjustments);
  }

  private executeDemoTrade(instruction: TradeInstruction, volume: number, adjustments: string[]): TradeResult {
    try {
      const currentPrice = this.getSimulatedPrice(instruction.symbol);

      const result = db.run(`
        INSERT INTO trades (symbol, action, volume, entry_price, stop_loss, take_profit, confidence, status, ai_reasoning, market_regime, strategy_used, session, confluence_score, timeframe_alignment, current_stop_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?)
      `, [instruction.symbol, instruction.action, volume, currentPrice, instruction.stop_loss, instruction.take_profit, instruction.confidence, instruction.reasoning || 'No reasoning', instruction.market_regime || null, instruction.strategy_used || null, instruction.session || null, instruction.confluence_score || null, instruction.timeframe_alignment || null, instruction.stop_loss]);

      const tradeId = Number(result.lastInsertRowid);

      positionManager.initializePositionManagement(tradeId, {
        atr: instruction.atr || currentPrice * 0.02,
        stopLoss: instruction.stop_loss,
        takeProfit: instruction.take_profit,
        trailingStopType: instruction.trailing_stop_type || 'atr',
        partialExits: instruction.partial_exits
      });

      tradingJournal.logEntryContext(tradeId, {
        marketRegime: instruction.market_regime as any,
        confluenceScore: instruction.confluence_score,
        timeframeAlignment: instruction.timeframe_alignment,
        session: instruction.session as any,
        strategy: instruction.strategy_used as any,
        aiConfidence: instruction.confidence
      });

      this.updateAccountState(volume, 0);
      logger.log('info', 'trade', `Demo ${instruction.action} executed`, { symbol: instruction.symbol, volume, price: currentPrice, tradeId, adjustments });

      return { success: true, tradeId, riskAdjustments: adjustments };
    } catch (error) {
      logger.log('error', 'trade', 'Failed to execute demo trade', { error: String(error) });
      return { success: false, error: String(error) };
    }
  }

  private async executeLiveTrade(instruction: TradeInstruction, volume: number, adjustments: string[]): Promise<TradeResult> {
    logger.log('warn', 'trade', 'Live trading not implemented', { instruction });
    return { success: false, error: 'Live trading not configured' };
  }

  private getSimulatedPrice(symbol: string): number {
    const prices: Record<string, number> = { 'BTC/USD': 42000 + Math.random() * 1000, 'ETH/USD': 2200 + Math.random() * 100, 'EUR/USD': 1.08 + Math.random() * 0.01 };
    return prices[symbol] || 100 + Math.random() * 10;
  }

  private getAccountState() {
    return db.query(`SELECT * FROM account_state ORDER BY id DESC LIMIT 1`).get() as any;
  }

  private updateAccountState(tradeValue: number, profitLoss: number) {
    const account = this.getAccountState();
    db.run(`UPDATE account_state SET equity = equity + ?, margin_used = margin_used + ?, daily_trades = daily_trades + 1, daily_risk_used = daily_risk_used + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [profitLoss, tradeValue, Math.abs(tradeValue * 0.02), account.id]);
  }

  closeTrade(tradeId: number, exitPrice: number, reason: string) {
    const trade = db.query(`SELECT * FROM trades WHERE id = ?`).get(tradeId) as any;
    if (!trade) return;

    const profitLoss = trade.action === 'BUY' ? (exitPrice - trade.entry_price) * trade.volume : (trade.entry_price - exitPrice) * trade.volume;
    const riskAmount = Math.abs(trade.entry_price - trade.stop_loss);
    const rMultiple = riskAmount > 0 ? (trade.action === 'BUY' ? (exitPrice - trade.entry_price) : (trade.entry_price - exitPrice)) / riskAmount : 0;

    db.run(`UPDATE trades SET status = 'CLOSED', exit_price = ?, profit_loss = ?, r_multiple = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?`, [exitPrice, profitLoss, rMultiple, tradeId]);
    this.updateAccountState(0, profitLoss);

    tradingJournal.logOutcome(tradeId, { rMultiple, maxAdverseExcursion: trade.max_adverse_excursion || 0, maxFavorableExcursion: trade.max_favorable_excursion || 0, holdTime: (Date.now() - new Date(trade.created_at).getTime()) / 1000, exitReason: reason, profitLoss });
    logger.log('info', 'trade', `Trade closed: ${reason}`, { tradeId, profitLoss, rMultiple: rMultiple.toFixed(2) });
  }
}

export const tradeExecutor = new TradeExecutor();
