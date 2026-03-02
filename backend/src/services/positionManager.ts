import { db } from './database';
import { logger } from './logger';

interface OpenTrade {
  id: number;
  symbol: string;
  action: string;
  volume: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  current_stop_price: number | null;
  trailing_stop_active: number;
  trailing_stop_distance: number | null;
  breakeven_triggered: number;
  partial_exits: string | null;
  max_adverse_excursion: number | null;
  max_favorable_excursion: number | null;
  created_at: string;
}

const SIMULATED_PRICES: Record<string, number> = {
  'BTC/USD': 42000,
  'ETH/USD': 2200,
  'EUR/USD': 1.085,
  'GBP/USD': 1.275,
  'USD/JPY': 148,
  AAPL: 185,
  TSLA: 240,
  GOOGL: 140,
  MSFT: 380
};

export class PositionManager {
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  start() {
    this.updateInterval = setInterval(() => {
      this.updateAllPositions();
    }, 5000);

    logger.log('info', 'system', 'Position manager started - monitoring every 5 seconds');
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private updateAllPositions() {
    try {
      const openTrades = db
        .prepare('SELECT * FROM trades WHERE status = ?')
        .all('OPEN') as OpenTrade[];

      for (const trade of openTrades) {
        this.updatePosition(trade);
      }
    } catch (error) {
      logger.log('error', 'system', 'Position manager error', { error: String(error) });
    }
  }

  private updatePosition(trade: OpenTrade) {
    const currentPrice = this.getCurrentPrice(trade.symbol);

    this.updateExcursions(trade, currentPrice);
    this.checkBreakeven(trade, currentPrice);
    this.updateTrailingStop(trade, currentPrice);
    this.checkStopLossAndTakeProfit(trade, currentPrice);
  }

  private getCurrentPrice(symbol: string): number {
    const base = SIMULATED_PRICES[symbol] || 100;
    const volatility = this.getSymbolVolatility(symbol);
    return base * (1 + (Math.random() - 0.5) * volatility);
  }

  private getSymbolVolatility(symbol: string): number {
    if (symbol.includes('BTC') || symbol.includes('ETH')) return 0.005;
    if (symbol.includes('SOL')) return 0.008;
    if (symbol.includes('USD') || symbol.includes('EUR') || symbol.includes('GBP')) return 0.001;
    return 0.003;
  }

  private updateExcursions(trade: OpenTrade, currentPrice: number) {
    const { entry_price, action } = trade;
    const unrealizedPnL =
      action === 'BUY'
        ? (currentPrice - entry_price) * trade.volume
        : (entry_price - currentPrice) * trade.volume;

    const currentMAE = trade.max_adverse_excursion || 0;
    const currentMFE = trade.max_favorable_excursion || 0;

    const newMAE = unrealizedPnL < 0 ? Math.min(currentMAE, unrealizedPnL) : currentMAE;
    const newMFE = unrealizedPnL > 0 ? Math.max(currentMFE, unrealizedPnL) : currentMFE;

    if (newMAE !== currentMAE || newMFE !== currentMFE) {
      db.prepare(`
        UPDATE trades SET max_adverse_excursion = ?, max_favorable_excursion = ?
        WHERE id = ?
      `).run(newMAE, newMFE, trade.id);
    }
  }

  private checkBreakeven(trade: OpenTrade, currentPrice: number) {
    if (trade.breakeven_triggered) return;

    const { entry_price, stop_loss, action } = trade;
    const riskDistance = Math.abs(entry_price - stop_loss);
    const breakevenTriggerDistance = riskDistance;

    const profitDistance =
      action === 'BUY'
        ? currentPrice - entry_price
        : entry_price - currentPrice;

    if (profitDistance >= breakevenTriggerDistance) {
      const newStop = action === 'BUY' ? entry_price * 1.001 : entry_price * 0.999;

      db.prepare(`
        UPDATE trades
        SET current_stop_price = ?, breakeven_triggered = 1, stop_loss = ?
        WHERE id = ?
      `).run(newStop, newStop, trade.id);

      logger.log('info', 'trade', `Breakeven stop set for trade ${trade.id}`, {
        symbol: trade.symbol,
        entry: entry_price,
        newStop
      });
    }
  }

  private updateTrailingStop(trade: OpenTrade, currentPrice: number) {
    if (!trade.trailing_stop_active || !trade.trailing_stop_distance) return;

    const { action, trailing_stop_distance } = trade;
    const trailPercent = trailing_stop_distance / 100;

    const newTrailingStop =
      action === 'BUY'
        ? currentPrice * (1 - trailPercent)
        : currentPrice * (1 + trailPercent);

    const currentStop = trade.current_stop_price || trade.stop_loss;

    const shouldUpdate =
      action === 'BUY'
        ? newTrailingStop > currentStop
        : newTrailingStop < currentStop;

    if (shouldUpdate) {
      db.prepare(`
        UPDATE trades SET current_stop_price = ?, stop_loss = ?
        WHERE id = ?
      `).run(newTrailingStop, newTrailingStop, trade.id);
    }
  }

  private checkStopLossAndTakeProfit(trade: OpenTrade, currentPrice: number) {
    const effectiveStop = trade.current_stop_price || trade.stop_loss;
    const { action, take_profit } = trade;

    const stopHit =
      action === 'BUY' ? currentPrice <= effectiveStop : currentPrice >= effectiveStop;

    const tpHit =
      take_profit > 0 &&
      (action === 'BUY' ? currentPrice >= take_profit : currentPrice <= take_profit);

    if (stopHit) {
      this.closeTrade(trade, effectiveStop, 'stop_loss');
    } else if (tpHit) {
      this.closeTrade(trade, take_profit, 'take_profit');
    }
  }

  closeTrade(trade: OpenTrade | { id: number; action: string; entry_price: number; volume: number; stop_loss: number; take_profit: number; symbol: string }, exitPrice: number, reason: string) {
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
    `).run(exitPrice, profitLoss, rMultiple, trade.id);

    this.updateAccountAfterClose(profitLoss);

    logger.log('info', 'trade', `Trade ${trade.id} closed: ${reason}`, {
      symbol: trade.symbol,
      exitPrice,
      profitLoss: profitLoss.toFixed(2),
      rMultiple: rMultiple.toFixed(2)
    });

    return profitLoss;
  }

  private updateAccountAfterClose(profitLoss: number) {
    const account = db
      .prepare('SELECT * FROM account_state ORDER BY id DESC LIMIT 1')
      .get() as any;
    if (!account) return;

    const newEquity = account.equity + profitLoss;
    const peakEquity = Math.max(account.peak_equity || account.equity, newEquity);
    const currentDrawdown =
      peakEquity > 0 ? ((peakEquity - newEquity) / peakEquity) * 100 : 0;
    const maxDrawdown = Math.max(account.max_drawdown || 0, currentDrawdown);

    db.prepare(`
      UPDATE account_state
      SET equity = ?, peak_equity = ?, current_drawdown = ?, max_drawdown = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newEquity, peakEquity, currentDrawdown, maxDrawdown, account.id);
  }
}

export const positionManager = new PositionManager();
