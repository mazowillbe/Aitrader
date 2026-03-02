import { db } from './database';
import { logger } from './logger';

export interface TradeInstruction {
  action: 'BUY' | 'SELL' | 'HOLD';
  symbol: string;
  volume: number;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  reasoning?: string;
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

  /**
   * Execute a trade instruction from the AI agent
   */
  async executeTrade(instruction: TradeInstruction): Promise<TradeResult> {
    // Validate instruction
    if (instruction.action === 'HOLD') {
      logger.log('info', 'trade', 'AI decided to HOLD', { instruction });
      return { success: true };
    }

    // Check risk limits
    const account = this.getAccountState();
    if (account.daily_risk_used >= this.maxDailyRisk) {
      logger.log('warn', 'trade', 'Daily risk limit reached', { limit: this.maxDailyRisk });
      return { success: false, error: 'Daily risk limit reached' };
    }

    const tradeValue = instruction.volume;
    if (tradeValue > this.maxTradeSize) {
      logger.log('warn', 'trade', 'Trade size exceeds limit', { size: tradeValue, limit: this.maxTradeSize });
      return { success: false, error: 'Trade size exceeds maximum allowed' };
    }

    // Execute based on mode
    if (this.demoMode) {
      return this.executeDemoTrade(instruction);
    } else {
      return this.executeLiveTrade(instruction);
    }
  }

  /**
   * Execute a demo trade (simulated)
   */
  private executeDemoTrade(instruction: TradeInstruction): TradeResult {
    try {
      // Simulate current market price (in real system, fetch from market data API)
      const currentPrice = this.getSimulatedPrice(instruction.symbol);

      // Insert trade into database
      const result = db.prepare(`
        INSERT INTO trades (symbol, action, volume, entry_price, stop_loss, take_profit, confidence, status, ai_reasoning)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
      `).run(
        instruction.symbol,
        instruction.action,
        instruction.volume,
        currentPrice,
        instruction.stop_loss,
        instruction.take_profit,
        instruction.confidence,
        instruction.reasoning || 'No reasoning provided'
      );

      // Update account state
      this.updateAccountState(instruction.volume, 0);

      logger.log('info', 'trade', `Demo ${instruction.action} executed`, {
        symbol: instruction.symbol,
        volume: instruction.volume,
        price: currentPrice,
        tradeId: result.lastInsertRowid
      });

      return { success: true, tradeId: Number(result.lastInsertRowid) };
    } catch (error) {
      logger.log('error', 'trade', 'Failed to execute demo trade', { error: String(error) });
      return { success: false, error: String(error) };
    }
  }

  /**
   * Execute a live trade via broker API
   * TODO: Integrate with MT5 API or broker REST API
   */
  private async executeLiveTrade(instruction: TradeInstruction): Promise<TradeResult> {
    try {
      logger.log('warn', 'trade', 'Live trading not yet implemented - switch to DEMO mode', { instruction });

      // TODO: Implement MT5 or broker API integration
      // Example:
      // const mt5Response = await fetch('MT5_API_URL', {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${process.env.MT5_API_KEY}` },
      //   body: JSON.stringify({
      //     symbol: instruction.symbol,
      //     type: instruction.action,
      //     volume: instruction.volume,
      //     sl: instruction.stop_loss,
      //     tp: instruction.take_profit
      //   })
      // });

      return { success: false, error: 'Live trading not configured' };
    } catch (error) {
      logger.log('error', 'trade', 'Failed to execute live trade', { error: String(error) });
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get simulated price for demo mode
   */
  private getSimulatedPrice(symbol: string): number {
    // Simulated prices for demo
    const prices: Record<string, number> = {
      'BTC/USD': 42000 + Math.random() * 1000,
      'ETH/USD': 2200 + Math.random() * 100,
      'EUR/USD': 1.08 + Math.random() * 0.01,
      'GBP/USD': 1.27 + Math.random() * 0.01,
      'AAPL': 185 + Math.random() * 5,
      'TSLA': 240 + Math.random() * 10,
    };
    return prices[symbol] || 100 + Math.random() * 10;
  }

  /**
   * Get current account state
   */
  private getAccountState() {
    return db.prepare('SELECT * FROM account_state ORDER BY id DESC LIMIT 1').get() as any;
  }

  /**
   * Update account state after trade
   */
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

  /**
   * Close a trade (for stop loss or take profit)
   */
  closeTrade(tradeId: number, exitPrice: number, reason: string) {
    const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(tradeId) as any;
    if (!trade) return;

    const profitLoss = trade.action === 'BUY'
      ? (exitPrice - trade.entry_price) * trade.volume
      : (trade.entry_price - exitPrice) * trade.volume;

    db.prepare(`
      UPDATE trades
      SET status = 'CLOSED', exit_price = ?, profit_loss = ?, closed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(exitPrice, profitLoss, tradeId);

    this.updateAccountState(0, profitLoss);

    logger.log('info', 'trade', `Trade closed: ${reason}`, { tradeId, profitLoss });
  }
}

export const tradeExecutor = new TradeExecutor();
