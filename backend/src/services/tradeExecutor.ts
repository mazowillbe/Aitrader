import { db } from './database';
import { logger } from './logger';
import { riskManager } from './riskManager';

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
  economic_events?: string;
  trailing_stop?: boolean;
  trailing_stop_distance?: number;
  r_multiple_target?: number;
}

export interface TradeResult {
  success: boolean;
  tradeId?: number;
  error?: string;
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
      logger.log('info', 'trade', 'AI decided to HOLD', {
        regime: instruction.market_regime,
        session: instruction.session
      });
      return { success: true };
    }

    const account = this.getAccountState();
    if (account.daily_risk_used >= this.maxDailyRisk) {
      logger.log('warn', 'trade', 'Daily risk limit reached', { limit: this.maxDailyRisk });
      return { success: false, error: 'Daily risk limit reached' };
    }

    const riskAssessment = riskManager.assessTrade({
      symbol: instruction.symbol,
      volume: instruction.volume,
      stop_loss: instruction.stop_loss,
      entry_price: this.getSimulatedPrice(instruction.symbol),
      action: instruction.action
    });

    if (!riskAssessment.approved) {
      logger.log('warn', 'trade', 'Trade rejected by risk manager', {
        symbol: instruction.symbol,
        reason: riskAssessment.reason,
        kelly_fraction: riskAssessment.kelly_fraction,
        portfolio_heat: riskAssessment.portfolio_heat
      });
      return { success: false, error: `Risk manager: ${riskAssessment.reason}` };
    }

    const adjustedInstruction = {
      ...instruction,
      volume: riskAssessment.adjusted_volume
    };

    if (this.demoMode) {
      return this.executeDemoTrade(adjustedInstruction, riskAssessment);
    } else {
      return this.executeLiveTrade(adjustedInstruction);
    }
  }

  private executeDemoTrade(instruction: TradeInstruction, riskAssessment: any): TradeResult {
    try {
      const currentPrice = this.getSimulatedPrice(instruction.symbol);

      const result = db.prepare(`
        INSERT INTO trades (
          symbol, action, volume, entry_price, stop_loss, take_profit, confidence, status, ai_reasoning,
          market_regime, strategy_used, session, confluence_score, timeframe_alignment, economic_events,
          trailing_stop_active, trailing_stop_distance, current_stop_price
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        instruction.symbol,
        instruction.action,
        instruction.volume,
        currentPrice,
        instruction.stop_loss || currentPrice * (instruction.action === 'BUY' ? 0.97 : 1.03),
        instruction.take_profit || currentPrice * (instruction.action === 'BUY' ? 1.045 : 0.955),
        instruction.confidence,
        instruction.reasoning || 'No reasoning provided',
        instruction.market_regime || null,
        instruction.strategy_used || null,
        instruction.session || null,
        instruction.confluence_score || null,
        instruction.timeframe_alignment || null,
        instruction.economic_events || null,
        instruction.trailing_stop ? 1 : 0,
        instruction.trailing_stop_distance || null,
        instruction.stop_loss || null
      );

      this.updateAccountState(instruction.volume, 0);

      logger.log('info', 'trade', `Demo ${instruction.action} executed`, {
        symbol: instruction.symbol,
        volume: instruction.volume,
        price: currentPrice,
        regime: instruction.market_regime,
        strategy: instruction.strategy_used,
        session: instruction.session,
        kelly: riskAssessment.kelly_fraction,
        tradeId: result.lastInsertRowid
      });

      return { success: true, tradeId: Number(result.lastInsertRowid) };
    } catch (error) {
      logger.log('error', 'trade', 'Failed to execute demo trade', { error: String(error) });
      return { success: false, error: String(error) };
    }
  }

  private async executeLiveTrade(instruction: TradeInstruction): Promise<TradeResult> {
    logger.log('warn', 'trade', 'Live trading not yet implemented - switch to DEMO mode', {
      instruction
    });
    return { success: false, error: 'Live trading not configured' };
  }

  private getSimulatedPrice(symbol: string): number {
    const prices: Record<string, number> = {
      'BTC/USD': 42000 + Math.random() * 1000,
      'ETH/USD': 2200 + Math.random() * 100,
      'EUR/USD': 1.085 + Math.random() * 0.005,
      'GBP/USD': 1.275 + Math.random() * 0.005,
      'USD/JPY': 148 + Math.random() * 1,
      AAPL: 185 + Math.random() * 5,
      TSLA: 240 + Math.random() * 10,
      GOOGL: 140 + Math.random() * 3,
      MSFT: 380 + Math.random() * 5
    };
    return prices[symbol] || 100 + Math.random() * 10;
  }

  private getAccountState() {
    return db.prepare('SELECT * FROM account_state ORDER BY id DESC LIMIT 1').get() as any;
  }

  private updateAccountState(tradeValue: number, profitLoss: number) {
    const account = this.getAccountState();
    db.prepare(`
      UPDATE account_state
      SET
        equity = equity + ?,
        margin_used = margin_used + ?,
        daily_trades = daily_trades + 1,
        daily_risk_used = daily_risk_used + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(profitLoss, tradeValue, Math.abs(tradeValue * 0.02), account.id);
  }

  closeTrade(tradeId: number, exitPrice: number, reason: string) {
    const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(tradeId) as any;
    if (!trade) return;

    const profitLoss =
      trade.action === 'BUY'
        ? (exitPrice - trade.entry_price) * trade.volume
        : (trade.entry_price - exitPrice) * trade.volume;

    const riskDistance = Math.abs(trade.entry_price - trade.stop_loss);
    const rMultiple = riskDistance > 0 ? profitLoss / (riskDistance * trade.volume) : 0;

    db.prepare(`
      UPDATE trades
      SET status = 'CLOSED', exit_price = ?, profit_loss = ?, closed_at = CURRENT_TIMESTAMP, r_multiple = ?
      WHERE id = ?
    `).run(exitPrice, profitLoss, rMultiple, tradeId);

    this.updateAccountState(0, profitLoss);

    logger.log('info', 'trade', `Trade closed: ${reason}`, { tradeId, profitLoss, rMultiple });
  }
}

export const tradeExecutor = new TradeExecutor();
